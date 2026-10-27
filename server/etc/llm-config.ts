import type { NextFunction, Request, Response, Router } from "express";
import { exec, type AuthContext } from "./db";
import {
  MANAGED_MODEL,
  encryptApiKeyForStorage,
  encryptionReady,
  getLlmSetting,
  isProvider,
  isValidModel,
  testConfiguredProvider,
  validateModelForProvider,
  type LlmSettingRow,
  type ProviderName,
} from "./providers";

export type LlmConfigResponse = {
  provider: ProviderName;
  model: string;
  hasKey: boolean;
  keyLast4: string | null;
  encryptionReady: boolean;
};

type EtcRequest = Request & { etc?: AuthContext };

type HttpError = Error & { status?: number };

function httpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

function sendError(res: Response, status: number, message: string) {
  if (!res.headersSent) res.status(status).json({ error: message });
}

function currentContext(req: Request, res: Response): AuthContext | null {
  const ctx = (req as EtcRequest).etc;
  if (!ctx) {
    sendError(res, 401, "Autenticación requerida");
    return null;
  }
  return ctx;
}

function requireLiveOwner(ctx: AuthContext, res: Response): boolean {
  if (
    ctx.mode !== "live" ||
    ctx.user.role !== "owner" ||
    ctx.userId == null ||
    ctx.workspace.ownerUserId !== ctx.userId
  ) {
    sendError(res, 403, "Solo el propietario del espacio puede hacer esto.");
    return false;
  }
  return true;
}

function settingHasKey(setting: LlmSettingRow | null): boolean {
  return Boolean(
    setting?.provider !== "managed" &&
      setting?.apiKeyCiphertext &&
      setting?.apiKeyNonce &&
      setting?.apiKeyTag
  );
}

function responseFromSetting(
  setting: LlmSettingRow | null,
  ctx: AuthContext
): LlmConfigResponse {
  // Public/demo contexts never expose readiness for personal-key storage.
  if (ctx.mode === "demo")
    return {
      provider: "managed",
      model: MANAGED_MODEL,
      hasKey: false,
      keyLast4: null,
      encryptionReady: false,
    };
  const provider = setting?.provider ?? "managed";
  const model = setting?.model ?? MANAGED_MODEL;
  const hasKey = settingHasKey(setting);
  return {
    provider,
    model,
    hasKey,
    keyLast4: hasKey ? (setting?.keyLast4 ?? null) : null,
    encryptionReady: encryptionReady(),
  };
}

async function readConfig(ctx: AuthContext): Promise<LlmConfigResponse> {
  let setting: LlmSettingRow | null = null;
  if (ctx.mode === "live") setting = await getLlmSetting(ctx.workspace.id);
  return responseFromSetting(setting, ctx);
}

function bodyObject(req: Request): Record<string, unknown> | null {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : null;
}

function readApiKey(body: Record<string, unknown>): string | undefined {
  if (!("apiKey" in body)) return undefined;
  if (typeof body.apiKey !== "string") throw httpError(400, "apiKey inválida.");
  const value = body.apiKey.trim();
  if (!value || value.length > 4096) throw httpError(400, "apiKey inválida.");
  return value;
}

async function patchConfig(req: Request, res: Response) {
  const ctx = currentContext(req, res);
  if (!ctx || !requireLiveOwner(ctx, res)) return;
  const body = bodyObject(req);
  if (!body) return sendError(res, 400, "Cuerpo inválido.");
  if (!isProvider(body.provider))
    return sendError(res, 400, "provider inválido.");
  const provider = body.provider as ProviderName;
  if (typeof body.model !== "string" || !body.model.trim())
    return sendError(res, 400, "model es obligatorio.");
  const model = body.model.trim();
  if (!validateModelForProvider(provider, model))
    return sendError(
      res,
      400,
      provider === "managed"
        ? `El proveedor administrado solo permite ${MANAGED_MODEL}.`
        : "model inválido."
    );

  let apiKey: string | undefined;
  try {
    apiKey = readApiKey(body);
  } catch (error) {
    if (error instanceof Error)
      return sendError(res, (error as HttpError).status ?? 400, error.message);
    return sendError(res, 400, "apiKey inválida.");
  }

  if (provider === "managed" && apiKey !== undefined)
    return sendError(res, 400, "El proveedor administrado no acepta apiKey.");

  const existing = await getLlmSetting(ctx.workspace.id);
  let encrypted = {
    ciphertext: null as string | null,
    nonce: null as string | null,
    tag: null as string | null,
    last4: null as string | null,
  };
  if (provider !== "managed") {
    if (!encryptionReady())
      return sendError(
        res,
        503,
        "El almacenamiento cifrado no está disponible."
      );
    if (apiKey !== undefined) {
      try {
        const value = encryptApiKeyForStorage(apiKey);
        encrypted = {
          ciphertext: value.ciphertext,
          nonce: value.nonce,
          tag: value.tag,
          last4: value.last4,
        };
      } catch (error) {
        return sendError(
          res,
          503,
          error instanceof Error
            ? error.message
            : "El almacenamiento cifrado no está disponible."
        );
      }
    } else if (
      existing &&
      existing.provider === provider &&
      settingHasKey(existing)
    ) {
      encrypted = {
        ciphertext: existing.apiKeyCiphertext,
        nonce: existing.apiKeyNonce,
        tag: existing.apiKeyTag,
        last4: existing.keyLast4,
      };
    } else {
      return sendError(
        res,
        400,
        "apiKey es obligatoria para configurar un proveedor propio."
      );
    }
  }

  try {
    await exec(
      `INSERT INTO etc_llm_settings
        (workspace_id,provider,model,api_key_ciphertext,api_key_nonce,api_key_tag,key_last4)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        provider=VALUES(provider),model=VALUES(model),
        api_key_ciphertext=VALUES(api_key_ciphertext),api_key_nonce=VALUES(api_key_nonce),
        api_key_tag=VALUES(api_key_tag),key_last4=VALUES(key_last4)`,
      [
        ctx.workspace.id,
        provider,
        model,
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.tag,
        encrypted.last4,
      ]
    );
  } catch {
    return sendError(res, 500, "No se pudo guardar la configuración.");
  }
  res.json(await readConfig(ctx));
}

async function testConfig(req: Request, res: Response) {
  const ctx = currentContext(req, res);
  if (!ctx || !requireLiveOwner(ctx, res)) return;
  const result = await testConfiguredProvider(ctx.workspace.id);
  // The provider helper deliberately returns only a boolean and generic message.
  res.json({ ok: Boolean(result.ok), message: String(result.message) });
}

async function deleteConfig(req: Request, res: Response) {
  const ctx = currentContext(req, res);
  if (!ctx || !requireLiveOwner(ctx, res)) return;
  try {
    await exec("DELETE FROM etc_llm_settings WHERE workspace_id=?", [
      ctx.workspace.id,
    ]);
  } catch {
    return sendError(res, 500, "No se pudo eliminar la configuración.");
  }
  res.json(await readConfig(ctx));
}

const route =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(error => {
      if (res.headersSent) return next(error);
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : 500;
      res.status(status >= 400 && status <= 599 ? status : 500).json({
        error:
          status === 500
            ? "No se pudo completar la solicitud."
            : error instanceof Error
              ? error.message
              : "No se pudo completar la solicitud.",
      });
    });
  };

/** Register after the existing ETC auth-context middleware has populated req.etc. */
export function registerLlmConfigRoutes(router: Router): void {
  router.get(
    "/llm/config",
    route(async (req, res) => {
      const ctx = currentContext(req, res);
      if (!ctx) return;
      res.json(await readConfig(ctx));
    })
  );
  router.patch("/llm/config", route(patchConfig));
  router.post("/llm/test", route(testConfig));
  router.delete("/llm/config", route(deleteConfig));
}

// Keep these exports explicit for parent integration and unit tests.
export { isProvider, isValidModel };
