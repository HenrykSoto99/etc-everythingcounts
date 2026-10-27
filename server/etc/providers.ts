import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { rows, type DbRow } from "./db";

export const PROVIDERS = ["managed", "openai", "gemini", "anthropic"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const MANAGED_MODEL = "gpt-6-luna";
export const PROVIDER_HOSTS: Record<
  Exclude<ProviderName, "managed">,
  string
> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  anthropic: "https://api.anthropic.com/v1",
};

const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_COMPLETION_TOKENS = 700;
const COMPLETION_TIMEOUT_MS = 20_000;
const TEST_TIMEOUT_MS = 10_000;

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CallConfiguredModelOptions = {
  language?: "es" | "en";
  maxTokens?: number;
};

export type ConfiguredModelResult = {
  text: string;
  provider: ProviderName;
};

export type LlmSettingRow = {
  workspaceId: string;
  provider: ProviderName;
  model: string;
  apiKeyCiphertext: string | null;
  apiKeyNonce: string | null;
  apiKeyTag: string | null;
  keyLast4: string | null;
};

export type ProviderErrorCode =
  | "configuration_unavailable"
  | "encryption_unavailable"
  | "invalid_configuration"
  | "missing_api_key"
  | "request_failed"
  | "timeout"
  | "invalid_response";

export class ConfiguredModelError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: ProviderName | null;
  readonly status: number | null;

  constructor(
    code: ProviderErrorCode,
    message: string,
    provider: ProviderName | null = null,
    status: number | null = null
  ) {
    super(message);
    this.name = "ConfiguredModelError";
    this.code = code;
    this.provider = provider;
    this.status = status;
  }
}

export type ProviderTestResult = { ok: boolean; message: string };

export function isProvider(value: unknown): value is ProviderName {
  return typeof value === "string" && PROVIDERS.includes(value as ProviderName);
}

export function isValidModel(value: unknown): value is string {
  return typeof value === "string" && MODEL_PATTERN.test(value);
}

export function validateModelForProvider(
  provider: ProviderName,
  model: unknown
): string | null {
  if (!isValidModel(model)) return null;
  if (provider === "managed" && model !== MANAGED_MODEL) return null;
  return model;
}

export function providerListUrl(provider: ProviderName): string | null {
  if (provider === "managed") {
    const base = (process.env.MANUS_API_URL ?? "").replace(/\/$/, "");
    return base ? `${base}/v1/models` : null;
  }
  if (provider === "openai") return `${PROVIDER_HOSTS.openai}/models`;
  if (provider === "gemini") return `${PROVIDER_HOSTS.gemini}/models`;
  return `${PROVIDER_HOSTS.anthropic}/models`;
}

function decodeBase64(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0)
    throw new Error("invalid base64 key");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("invalid key length");
  return decoded;
}

/** Returns only a valid independent 32-byte root key. It never derives one. */
export function parseEncryptionKey(
  value = process.env.ETC_LLM_ENCRYPTION_KEY
): Buffer | null {
  if (!value) return null;
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  try {
    return decodeBase64(value);
  } catch {
    return null;
  }
}

export function encryptionReady(): boolean {
  return parseEncryptionKey() !== null;
}

export type EncryptedApiKey = {
  ciphertext: string;
  nonce: string;
  tag: string;
  last4: string;
};

export function encryptApiKeyForStorage(value: string): EncryptedApiKey {
  const root = parseEncryptionKey();
  if (!root)
    throw new ConfiguredModelError(
      "encryption_unavailable",
      "El almacenamiento cifrado no está disponible."
    );
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", root, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    nonce: nonce.toString("base64"),
    tag: tag.toString("base64"),
    last4: value.slice(-4),
  };
}

export function decryptApiKeyFromStorage(
  encrypted: Pick<EncryptedApiKey, "ciphertext" | "nonce" | "tag">
): string {
  const root = parseEncryptionKey();
  if (!root)
    throw new ConfiguredModelError(
      "encryption_unavailable",
      "El almacenamiento cifrado no está disponible."
    );
  try {
    const nonce = Buffer.from(encrypted.nonce, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    if (nonce.length !== 12 || tag.length !== 16)
      throw new Error("invalid cipher metadata");
    const decipher = createDecipheriv("aes-256-gcm", root, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ConfiguredModelError(
      "invalid_configuration",
      "La clave configurada no se puede descifrar."
    );
  }
}

function settingFromRow(row: DbRow): LlmSettingRow {
  if (!isProvider(row.provider))
    throw new ConfiguredModelError(
      "invalid_configuration",
      "La configuración del proveedor no es válida."
    );
  const model = String(row.model ?? "");
  if (!validateModelForProvider(row.provider, model))
    throw new ConfiguredModelError(
      "invalid_configuration",
      "La configuración del modelo no es válida.",
      row.provider
    );
  return {
    workspaceId: String(row.workspace_id),
    provider: row.provider,
    model,
    apiKeyCiphertext:
      row.api_key_ciphertext == null ? null : String(row.api_key_ciphertext),
    apiKeyNonce: row.api_key_nonce == null ? null : String(row.api_key_nonce),
    apiKeyTag: row.api_key_tag == null ? null : String(row.api_key_tag),
    keyLast4: row.key_last4 == null ? null : String(row.key_last4),
  };
}

export async function getLlmSetting(
  workspaceId: string
): Promise<LlmSettingRow | null> {
  const found = await rows(
    "SELECT workspace_id,provider,model,api_key_ciphertext,api_key_nonce,api_key_tag,key_last4 FROM etc_llm_settings WHERE workspace_id=? LIMIT 1",
    [workspaceId]
  );
  return found[0] ? settingFromRow(found[0]) : null;
}

function maxTokens(value: number | undefined): number {
  if (!Number.isFinite(value)) return MAX_COMPLETION_TOKENS;
  return Math.max(
    1,
    Math.min(MAX_COMPLETION_TOKENS, Math.floor(value as number))
  );
}

function textContent(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map(part => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part)
        return typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "";
      return "";
    })
    .join("")
    .trim();
}

function providerFailure(
  provider: ProviderName,
  status?: number
): ConfiguredModelError {
  return new ConfiguredModelError(
    "request_failed",
    status
      ? "El proveedor no está disponible."
      : "No se pudo contactar al proveedor.",
    provider,
    status ?? null
  );
}

async function requestJson(
  provider: ProviderName,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        throw new ConfiguredModelError(
          "timeout",
          "El proveedor tardó demasiado en responder.",
          provider
        );
      throw providerFailure(provider);
    }
    const raw = await response.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function managedBaseUrl(): string {
  const value = (process.env.MANUS_API_URL ?? "").replace(/\/$/, "");
  if (!value)
    throw new ConfiguredModelError(
      "missing_api_key",
      "El proveedor administrado no está configurado.",
      "managed"
    );
  return value;
}

function managedApiKey(): string {
  const value = process.env.MANUS_API_KEY;
  if (!value)
    throw new ConfiguredModelError(
      "missing_api_key",
      "El proveedor administrado no está configurado.",
      "managed"
    );
  return value;
}

async function callManaged(
  messages: ProviderMessage[],
  limit: number
): Promise<string> {
  const { response, body } = await requestJson(
    "managed",
    `${managedBaseUrl()}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${managedApiKey()}`,
      },
      body: JSON.stringify({
        model: MANAGED_MODEL,
        messages,
        reasoning: { effort: "none" },
        max_completion_tokens: limit,
      }),
    },
    COMPLETION_TIMEOUT_MS
  );
  if (!response.ok) throw providerFailure("managed", response.status);
  const text = textContent(
    (body as { choices?: Array<{ message?: { content?: unknown } }> } | null)
      ?.choices?.[0]?.message?.content
  );
  if (!text)
    throw new ConfiguredModelError(
      "invalid_response",
      "El proveedor devolvió una respuesta vacía.",
      "managed"
    );
  return text;
}

function geminiContents(messages: ProviderMessage[]) {
  return messages
    .filter(message => message.role !== "system")
    .map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

async function callGemini(
  model: string,
  apiKey: string,
  messages: ProviderMessage[],
  limit: number
): Promise<string> {
  const system = messages
    .filter(message => message.role === "system")
    .map(message => message.content)
    .join("\n\n");
  const url = `${PROVIDER_HOSTS.gemini}/models/${encodeURIComponent(model)}:generateContent`;
  const { response, body } = await requestJson(
    "gemini",
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: geminiContents(messages),
        generationConfig: { maxOutputTokens: limit },
      }),
    },
    COMPLETION_TIMEOUT_MS
  );
  if (!response.ok) throw providerFailure("gemini", response.status);
  const text = textContent(
    (
      body as {
        candidates?: Array<{ content?: { parts?: unknown[] } }>;
      } | null
    )?.candidates?.[0]?.content?.parts
  );
  if (!text)
    throw new ConfiguredModelError(
      "invalid_response",
      "El proveedor devolvió una respuesta vacía.",
      "gemini"
    );
  return text;
}

async function callAnthropic(
  model: string,
  apiKey: string,
  messages: ProviderMessage[],
  limit: number
): Promise<string> {
  const system = messages
    .filter(message => message.role === "system")
    .map(message => message.content)
    .join("\n\n");
  const conversation = messages
    .filter(message => message.role !== "system")
    .map(message => ({ role: message.role, content: message.content }));
  const { response, body } = await requestJson(
    "anthropic",
    `${PROVIDER_HOSTS.anthropic}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: limit,
        ...(system ? { system } : {}),
        messages: conversation,
      }),
    },
    COMPLETION_TIMEOUT_MS
  );
  if (!response.ok) throw providerFailure("anthropic", response.status);
  const text = textContent((body as { content?: unknown[] } | null)?.content);
  if (!text)
    throw new ConfiguredModelError(
      "invalid_response",
      "El proveedor devolvió una respuesta vacía.",
      "anthropic"
    );
  return text;
}

function storedApiKey(setting: LlmSettingRow): string {
  if (!setting.apiKeyCiphertext || !setting.apiKeyNonce || !setting.apiKeyTag)
    throw new ConfiguredModelError(
      "missing_api_key",
      "No hay una clave configurada para el proveedor seleccionado.",
      setting.provider
    );
  return decryptApiKeyFromStorage({
    ciphertext: setting.apiKeyCiphertext,
    nonce: setting.apiKeyNonce,
    tag: setting.apiKeyTag,
  });
}

export async function callConfiguredModel(
  workspaceId: string,
  messages: ProviderMessage[],
  options: CallConfiguredModelOptions = {}
): Promise<ConfiguredModelResult> {
  let setting: LlmSettingRow | null;
  try {
    setting = await getLlmSetting(workspaceId);
  } catch {
    throw new ConfiguredModelError(
      "configuration_unavailable",
      "No se pudo leer la configuración del proveedor."
    );
  }
  const provider = setting?.provider ?? "managed";
  const model = setting?.model ?? MANAGED_MODEL;
  const limit = maxTokens(options.maxTokens);
  if (!validateModelForProvider(provider, model))
    throw new ConfiguredModelError(
      "invalid_configuration",
      "La configuración del modelo no es válida.",
      provider
    );
  if (provider === "managed")
    return { text: await callManaged(messages, limit), provider };
  const key = setting ? storedApiKey(setting) : "";
  const text =
    provider === "openai"
      ? await callOpenAi(model, key, messages, limit)
      : provider === "gemini"
        ? await callGemini(model, key, messages, limit)
        : await callAnthropic(model, key, messages, limit);
  return { text, provider };
}

async function callOpenAi(
  model: string,
  apiKey: string,
  messages: ProviderMessage[],
  limit: number
): Promise<string> {
  const { response, body } = await requestJson(
    "openai",
    `${PROVIDER_HOSTS.openai}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_completion_tokens: limit }),
    },
    COMPLETION_TIMEOUT_MS
  );
  if (!response.ok) throw providerFailure("openai", response.status);
  const text = textContent(
    (body as { choices?: Array<{ message?: { content?: unknown } }> } | null)
      ?.choices?.[0]?.message?.content
  );
  if (!text)
    throw new ConfiguredModelError(
      "invalid_response",
      "El proveedor devolvió una respuesta vacía.",
      "openai"
    );
  return text;
}

async function configuredProviderCredentials(
  workspaceId: string
): Promise<{ provider: ProviderName; model: string; key: string }> {
  let setting: LlmSettingRow | null;
  try {
    setting = await getLlmSetting(workspaceId);
  } catch {
    throw new ConfiguredModelError(
      "configuration_unavailable",
      "No se pudo leer la configuración del proveedor."
    );
  }
  const provider = setting?.provider ?? "managed";
  const model = setting?.model ?? MANAGED_MODEL;
  if (!validateModelForProvider(provider, model))
    throw new ConfiguredModelError(
      "invalid_configuration",
      "La configuración del modelo no es válida.",
      provider
    );
  if (provider === "managed") return { provider, model, key: managedApiKey() };
  return { provider, model, key: setting ? storedApiKey(setting) : "" };
}

export async function testConfiguredProvider(
  workspaceId: string
): Promise<ProviderTestResult> {
  let credentials: { provider: ProviderName; model: string; key: string };
  try {
    credentials = await configuredProviderCredentials(workspaceId);
  } catch (error) {
    if (error instanceof ConfiguredModelError)
      return { ok: false, message: error.message };
    return { ok: false, message: "No se pudo probar el proveedor." };
  }
  const { provider, key } = credentials;
  const url = providerListUrl(provider);
  if (!url) return { ok: false, message: "El proveedor no está configurado." };
  const headers: Record<string, string> = {};
  let requestUrl = url;
  if (provider === "managed" || provider === "openai") {
    headers.authorization = `Bearer ${key}`;
  } else if (provider === "gemini") {
    headers["x-goog-api-key"] = key;
  } else {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  }
  try {
    const { response } = await requestJson(
      provider,
      requestUrl,
      { method: "GET", headers },
      TEST_TIMEOUT_MS
    );
    return response.ok
      ? { ok: true, message: "Proveedor disponible." }
      : { ok: false, message: "El proveedor rechazó la prueba." };
  } catch (error) {
    if (error instanceof ConfiguredModelError)
      return { ok: false, message: error.message };
    return { ok: false, message: "No se pudo probar el proveedor." };
  }
}
