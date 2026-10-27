import { createHash, randomBytes, randomUUID } from "node:crypto";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import { parse as parseCookieHeader } from "cookie";
import {
  SEGMENTS,
  isBusinessType,
  type BusinessType,
} from "@shared/etc/segments";
import type { Segment } from "@shared/etc/types";
import {
  ensureLiveWorkspace,
  exec,
  rows,
  transaction,
  type DbRow,
  type LiveUser,
} from "../db";
import {
  buildPasswordResetUrl,
  chooseTrustedOrigin,
  getEmailConfig,
  normalizeLanguage,
  normalizeOrigin,
  publicEmailStatus,
  sendPasswordResetEmail,
  type EmailConfig,
  type Language,
} from "./email";
import {
  assertValidPassword,
  dummyPasswordHash,
  hashPassword,
  isValidPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from "./password";

export const AUTH_SESSION_COOKIE = "etc_account_session";
const ACCOUNT_TOKEN_PREFIX = "etc_acct_";
const RESET_TOKEN_PREFIX = "etc_reset_";
const ACCOUNT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_SUFFIX_RE = /^[A-Za-z0-9_-]{43}$/;

export type EmailAuthRouteOptions = {
  allowedOrigins: string[];
  trustedOrigin?: string;
};

type EmailAuthRequest = Request & {
  emailAuthOrigin?: string | null;
};

export class EmailAuthHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "EmailAuthHttpError";
  }
}

export class InvalidEmailSessionError extends Error {
  constructor() {
    super("Invalid ETC account session");
    this.name = "InvalidEmailSessionError";
  }
}

class RateLimitError extends EmailAuthHttpError {
  constructor() {
    super(429, "Demasiados intentos. Inténtalo más tarde.");
    this.name = "RateLimitError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function bodyOf(req: Request): Record<string, unknown> {
  if (!isRecord(req.body))
    throw new EmailAuthHttpError(400, "El cuerpo debe ser un objeto JSON.");
  return req.body;
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (typeof value !== "string")
    throw new EmailAuthHttpError(400, `${field} inválido.`);
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  )
    throw new EmailAuthHttpError(400, `${field} inválido.`);
  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, field, maxLength);
}

export function normalizeAccountEmail(value: unknown): string {
  const email = requiredText(value, "email", 320)
    .normalize("NFKC")
    .toLowerCase();
  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /[\u0000-\u001f\u007f]/.test(email)
  )
    throw new EmailAuthHttpError(400, "email inválido.");
  return email;
}

function readPassword(value: unknown): string {
  if (!isValidPassword(value))
    throw new EmailAuthHttpError(
      400,
      `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`
    );
  return value;
}

function validSegment(value: unknown): value is Segment {
  return typeof value === "string" && SEGMENTS.includes(value as Segment);
}

function readOptionalWorkspaceFields(body: Record<string, unknown>): {
  segment?: Segment;
  businessType?: BusinessType;
} {
  if (body.segment !== undefined && !validSegment(body.segment))
    throw new EmailAuthHttpError(400, "segment inválido.");
  if (body.businessType !== undefined && !isBusinessType(body.businessType))
    throw new EmailAuthHttpError(400, "businessType inválido.");
  return {
    segment: body.segment as Segment | undefined,
    businessType: body.businessType as BusinessType | undefined,
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newAccountSessionToken(): string {
  return `${ACCOUNT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function newPasswordResetToken(): string {
  return `${RESET_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isAccountSessionToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(ACCOUNT_TOKEN_PREFIX) &&
    TOKEN_SUFFIX_RE.test(value.slice(ACCOUNT_TOKEN_PREFIX.length))
  );
}

export function isPasswordResetToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(RESET_TOKEN_PREFIX) &&
    TOKEN_SUFFIX_RE.test(value.slice(RESET_TOKEN_PREFIX.length))
  );
}

export function hashAccountToken(value: string): string {
  return tokenHash(value);
}

function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function accountCookieOptions(origin: string | null | undefined) {
  const local = isLocalOrigin(origin);
  return {
    httpOnly: true,
    path: "/",
    sameSite: local ? ("lax" as const) : ("none" as const),
    secure: !local,
  };
}

function requestIp(req: Request): string {
  return (
    (typeof req.ip === "string" && req.ip) ||
    req.socket.remoteAddress ||
    "unknown"
  ).slice(0, 128);
}

function rateKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const ratePolicies = {
  register: { windowMs: 15 * 60 * 1000, global: 120, ip: 12, account: 4 },
  login: { windowMs: 15 * 60 * 1000, global: 600, ip: 60, account: 20 },
  forgot: { windowMs: 15 * 60 * 1000, global: 300, ip: 30, account: 8 },
  reset: { windowMs: 15 * 60 * 1000, global: 300, ip: 30, account: 12 },
} as const;

type RateAction = keyof typeof ratePolicies;

/** Durable global, IP and account buckets. Stored keys are hashes, never email/IP PII. */
export async function consumeAuthRateLimit(
  req: Request,
  action: RateAction,
  accountKey: string
): Promise<void> {
  const policy = ratePolicies[action];
  const windowStart = new Date(
    Math.floor(Date.now() / policy.windowMs) * policy.windowMs
  );
  const buckets = [
    { scope: "global", key: "global", limit: policy.global },
    { scope: "ip", key: rateKey(requestIp(req)), limit: policy.ip },
    ...(accountKey
      ? [{ scope: "account", key: rateKey(accountKey), limit: policy.account }]
      : []),
  ];
  await transaction(async conn => {
    for (const bucket of buckets) {
      await conn.execute(
        "INSERT IGNORE INTO etc_auth_rate_limits (scope_type,scope_key,action,window_start,attempts) VALUES (?,?,?,?,0)",
        [bucket.scope, bucket.key, action, windowStart]
      );
      const [lockedRows] = await conn.query(
        "SELECT attempts FROM etc_auth_rate_limits WHERE scope_type=? AND scope_key=? AND action=? AND window_start=? FOR UPDATE",
        [bucket.scope, bucket.key, action, windowStart]
      );
      const attempts = Number((lockedRows as DbRow[])[0]?.attempts ?? 0);
      if (attempts >= bucket.limit) throw new RateLimitError();
      await conn.execute(
        "UPDATE etc_auth_rate_limits SET attempts=attempts+1 WHERE scope_type=? AND scope_key=? AND action=? AND window_start=?",
        [bucket.scope, bucket.key, action, windowStart]
      );
    }
  });
}

async function createAccountSession(userId: number): Promise<string> {
  const token = newAccountSessionToken();
  await exec(
    "INSERT INTO etc_account_sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)",
    [
      randomUUID(),
      userId,
      hashAccountToken(token),
      new Date(Date.now() + ACCOUNT_SESSION_TTL_MS),
    ]
  );
  return token;
}

async function patchRegistrationWorkspace(
  userId: number,
  segment: Segment | undefined,
  businessType: BusinessType | undefined
): Promise<void> {
  if (segment === undefined && businessType === undefined) return;
  await transaction(async conn => {
    const [workspaceRows] = await conn.query(
      "SELECT id,segment FROM etc_workspaces WHERE owner_user_id=? AND mode='live' LIMIT 1 FOR UPDATE",
      [userId]
    );
    const workspace = (workspaceRows as DbRow[])[0];
    if (!workspace) return;
    if (segment !== undefined)
      await conn.execute(
        "UPDATE etc_workspaces SET segment=? WHERE id=? AND owner_user_id=? AND mode='live'",
        [segment, workspace.id, userId]
      );
    if (businessType === undefined) return;
    try {
      await conn.execute(
        "UPDATE etc_workspaces SET business_type=? WHERE id=? AND owner_user_id=? AND mode='live'",
        [businessType, workspace.id, userId]
      );
    } catch (error: any) {
      // Existing ETC installations predate business_type. Keep the optional
      // field in an additive auth-owned table instead of altering core schema.
      if (error?.code !== "ER_BAD_FIELD_ERROR" && error?.errno !== 1054)
        throw error;
      await conn.execute(
        `INSERT INTO etc_auth_workspace_settings (user_id,workspace_id,segment,business_type)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE workspace_id=VALUES(workspace_id),segment=VALUES(segment),business_type=VALUES(business_type)`,
        [
          userId,
          workspace.id,
          segment ?? String(workspace.segment),
          businessType,
        ]
      );
    }
  });
}

function publicUser(name: string, email: string) {
  return { name, email, emailVerified: false };
}

async function handleRegister(req: EmailAuthRequest, res: Response) {
  const body = bodyOf(req);
  const name = requiredText(body.name, "name", 160);
  const email = normalizeAccountEmail(body.email);
  const password = readPassword(body.password);
  const workspaceFields = readOptionalWorkspaceFields(body);
  await consumeAuthRateLimit(req, "register", email);
  const passwordHash = await hashPassword(password);
  const userIdHolder = { value: 0 };
  try {
    await transaction(async conn => {
      const [existingRows] = await conn.query(
        "SELECT user_id FROM etc_account_credentials WHERE email=? LIMIT 1 FOR UPDATE",
        [email]
      );
      if ((existingRows as DbRow[])[0])
        throw new EmailAuthHttpError(409, "No se pudo crear la cuenta.");
      const [inserted] = await conn.execute(
        "INSERT INTO users (openId,name,email,loginMethod,role) VALUES (?,?,?,?,?)",
        [`etc_email_${randomUUID()}`, name, email, "email", "user"]
      );
      userIdHolder.value = Number(
        (inserted as { insertId?: unknown }).insertId
      );
      if (!Number.isInteger(userIdHolder.value) || userIdHolder.value < 1)
        throw new Error("Account insert did not return an id");
      await conn.execute(
        "INSERT INTO etc_account_credentials (user_id,email,password_hash,email_verified) VALUES (?,?,?,0)",
        [userIdHolder.value, email, passwordHash]
      );
    });
  } catch (error: any) {
    if (error instanceof EmailAuthHttpError) throw error;
    if (error?.code === "ER_DUP_ENTRY")
      throw new EmailAuthHttpError(409, "No se pudo crear la cuenta.");
    throw error;
  }

  const liveUser: LiveUser = { id: userIdHolder.value, name, email };
  await ensureLiveWorkspace(liveUser);
  await patchRegistrationWorkspace(
    liveUser.id,
    workspaceFields.segment,
    workspaceFields.businessType
  );
  const token = await createAccountSession(liveUser.id);
  const origin = req.emailAuthOrigin ?? null;
  res.cookie(AUTH_SESSION_COOKIE, token, accountCookieOptions(origin));
  res.status(201).json({ token, user: publicUser(name, email) });
}

async function handleLogin(req: EmailAuthRequest, res: Response) {
  const body = bodyOf(req);
  const email = normalizeAccountEmail(body.email);
  const password = readPassword(body.password);
  await consumeAuthRateLimit(req, "login", email);
  const found = await rows(
    `SELECT u.id,u.name,u.email,c.password_hash
     FROM etc_account_credentials c JOIN users u ON u.id=c.user_id
     WHERE c.email=? AND LEFT(u.openId,10)='etc_email_' LIMIT 1`,
    [email]
  );
  const candidate = found[0];
  const matches = await verifyPassword(
    password,
    candidate?.password_hash
      ? String(candidate.password_hash)
      : await dummyPasswordHash()
  );
  if (!candidate || !matches)
    throw new EmailAuthHttpError(401, "Credenciales inválidas.");
  const userId = Number(candidate.id);
  await exec("UPDATE users SET lastSignedIn=CURRENT_TIMESTAMP WHERE id=?", [
    userId,
  ]);
  const token = await createAccountSession(userId);
  const name = String(candidate.name ?? "");
  const userEmail = String(candidate.email ?? email);
  res.cookie(
    AUTH_SESSION_COOKIE,
    token,
    accountCookieOptions(req.emailAuthOrigin ?? null)
  );
  res.json({ token, user: publicUser(name, userEmail) });
}

function frontendOriginFor(
  req: EmailAuthRequest,
  value: unknown,
  allowedOrigins: ReadonlySet<string>,
  preferredOrigin: string | null
): string | null {
  if (value !== undefined) {
    if (typeof value !== "string")
      throw new EmailAuthHttpError(400, "frontendOrigin inválido.");
    const candidate = normalizeOrigin(value);
    if (!candidate || !allowedOrigins.has(candidate))
      throw new EmailAuthHttpError(403, "Origen no permitido.");
    return candidate;
  }
  return preferredOrigin;
}

async function handleForgot(
  req: EmailAuthRequest,
  res: Response,
  allowedOrigins: ReadonlySet<string>,
  preferredOrigin: string | null
) {
  const body = bodyOf(req);
  const email = normalizeAccountEmail(body.email);
  const language = normalizeLanguage(
    body.language,
    req.headers["accept-language"]
  );
  const resetOrigin = frontendOriginFor(
    req,
    body.frontendOrigin,
    allowedOrigins,
    preferredOrigin
  );
  await consumeAuthRateLimit(req, "forgot", email);
  const config = getEmailConfig();
  // With no actual adapter or trusted URL there is no recovery outcome to fake.
  const delivery =
    config.enabled && resetOrigin
      ? await transaction(async conn => {
          const [accountRows] = await conn.query(
            `SELECT u.id,u.name,c.email
         FROM etc_account_credentials c JOIN users u ON u.id=c.user_id
         WHERE c.email=? AND LEFT(u.openId,10)='etc_email_' LIMIT 1 FOR UPDATE`,
            [email]
          );
          const account = (accountRows as DbRow[])[0];
          if (!account) return null;
          const token = newPasswordResetToken();
          await conn.execute(
            "UPDATE etc_account_reset_tokens SET used_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND used_at IS NULL",
            [account.id]
          );
          await conn.execute(
            "INSERT INTO etc_account_reset_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)",
            [
              randomUUID(),
              account.id,
              hashAccountToken(token),
              new Date(Date.now() + RESET_TOKEN_TTL_MS),
            ]
          );
          return {
            email: String(account.email),
            name: String(account.name ?? ""),
            token,
          };
        })
      : null;
  if (delivery && config.enabled && resetOrigin) {
    try {
      await sendPasswordResetEmail({
        config,
        to: delivery.email,
        name: delivery.name,
        language,
        resetUrl: buildPasswordResetUrl(resetOrigin, delivery.token),
      });
    } catch {
      // Do not log recipient, reset URL, token, provider response or credentials.
      // The response intentionally remains generic and never says it was sent.
    }
  }
  res.status(200).json({ ok: true, emailEnabled: config.enabled });
}

export async function resetPasswordInTransaction(
  conn: {
    query: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
    execute: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
  },
  token: string,
  passwordHash: string
): Promise<void> {
  const [tokenRows] = await conn.query(
    `SELECT t.id,t.user_id,c.user_id AS credential_user_id
     FROM etc_account_reset_tokens t
     JOIN users u ON u.id=t.user_id AND LEFT(u.openId,10)='etc_email_'
     JOIN etc_account_credentials c ON c.user_id=t.user_id
     WHERE t.token_hash=? AND t.used_at IS NULL AND t.expires_at>CURRENT_TIMESTAMP(3)
     LIMIT 1 FOR UPDATE`,
    [hashAccountToken(token)]
  );
  const reset = (tokenRows as DbRow[])[0];
  if (!reset) throw new EmailAuthHttpError(400, "Token inválido o expirado.");
  await conn.execute(
    "UPDATE etc_account_credentials SET password_hash=?,updated_at=CURRENT_TIMESTAMP(3) WHERE user_id=?",
    [passwordHash, reset.user_id]
  );
  await conn.execute(
    "UPDATE etc_account_reset_tokens SET used_at=CURRENT_TIMESTAMP(3) WHERE id=? AND used_at IS NULL",
    [reset.id]
  );
  await conn.execute("DELETE FROM etc_account_sessions WHERE user_id=?", [
    reset.user_id,
  ]);
}

async function handleReset(req: EmailAuthRequest, res: Response) {
  const body = bodyOf(req);
  const token = requiredText(body.token, "token", 128);
  if (!isPasswordResetToken(token))
    throw new EmailAuthHttpError(400, "Token inválido o expirado.");
  const password = readPassword(body.password);
  await consumeAuthRateLimit(req, "reset", token);
  const passwordHash = await hashPassword(password);
  await transaction(conn =>
    resetPasswordInTransaction(conn, token, passwordHash)
  );
  res.status(200).json({ ok: true });
}

function ownCredentialFromRequest(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token.startsWith(ACCOUNT_TOKEN_PREFIX)) return token;
  }
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  if (Object.prototype.hasOwnProperty.call(cookies, AUTH_SESSION_COOKIE))
    return cookies[AUTH_SESSION_COOKIE] ?? "";
  return null;
}

export async function resolveEmailUser(req: Request): Promise<LiveUser | null> {
  const token = ownCredentialFromRequest(req);
  if (token === null) return null;
  if (!isAccountSessionToken(token)) throw new InvalidEmailSessionError();
  const found = await rows(
    `SELECT u.id,u.name,c.email AS account_email
     FROM etc_account_sessions s
     JOIN users u ON u.id=s.user_id AND LEFT(u.openId,10)='etc_email_'
     JOIN etc_account_credentials c ON c.user_id=u.id
     WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP(3)
     LIMIT 1`,
    [hashAccountToken(token)]
  );
  if (!found[0]) throw new InvalidEmailSessionError();
  return {
    id: Number(found[0].id),
    name: String(found[0].name ?? ""),
    email: String(found[0].account_email),
  };
}

async function handleLogout(req: EmailAuthRequest, res: Response) {
  const token = ownCredentialFromRequest(req);
  if (token && isAccountSessionToken(token))
    await exec("DELETE FROM etc_account_sessions WHERE token_hash=?", [
      hashAccountToken(token),
    ]);
  res.clearCookie(AUTH_SESSION_COOKIE, {
    ...accountCookieOptions(req.emailAuthOrigin ?? null),
    maxAge: 0,
  });
  res.status(200).json({ ok: true });
}

function originGuard(
  allowedOrigins: ReadonlySet<string>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const header = req.headers.origin;
    if (header === undefined) {
      (req as EmailAuthRequest).emailAuthOrigin = null;
      return next();
    }
    const origin = normalizeOrigin(header);
    if (!origin || !allowedOrigins.has(origin))
      return next(new EmailAuthHttpError(403, "Origen no permitido."));
    (req as EmailAuthRequest).emailAuthOrigin = origin;
    next();
  };
}

function writeIntentGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.headers["x-etc-intent"] !== "workspace"
  )
    return next(new EmailAuthHttpError(403, "Falta X-ETC-Intent: workspace."));
  next();
}

function asyncRoute(
  handler: (req: EmailAuthRequest, res: Response) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as EmailAuthRequest, res).catch(next);
  };
}

function sanitizedErrorHandler(
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) return next(error);
  if (error?.type === "entity.too.large" || error?.status === 413)
    return res.status(413).json({ error: "Solicitud demasiado grande." });
  if (error instanceof SyntaxError || error?.type === "entity.parse.failed")
    return res.status(400).json({ error: "JSON inválido." });
  if (error instanceof EmailAuthHttpError)
    return res.status(error.status).json({ error: error.message });
  if (error?.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: "No se pudo completar la operación." });
  return res.status(500).json({ error: "No se pudo completar la solicitud." });
}

export function registerEmailAuthRoutes(
  app: Express,
  options: EmailAuthRouteOptions
): void {
  const normalizedAllowed = new Set(
    [
      ...(options.allowedOrigins ?? []),
      options.trustedOrigin,
      process.env.ETC_PUBLIC_ORIGIN,
    ]
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value))
  );
  const preferredOrigin = chooseTrustedOrigin(
    [...normalizedAllowed],
    options.trustedOrigin
  );
  const router = Router();
  router.use(express.json({ limit: "16kb" }));
  router.use(originGuard(normalizedAllowed));
  router.use(writeIntentGuard);
  router.get("/status", (_req, res) => {
    const status = publicEmailStatus();
    res.status(200).json({
      ...status,
      passwordMinLength: PASSWORD_MIN_LENGTH,
    });
  });
  router.post("/register", asyncRoute(handleRegister));
  router.post("/login", asyncRoute(handleLogin));
  router.post(
    "/forgot-password",
    asyncRoute((req, res) =>
      handleForgot(req, res, normalizedAllowed, preferredOrigin)
    )
  );
  router.post("/reset-password", asyncRoute(handleReset));
  router.post("/logout", asyncRoute(handleLogout));
  router.use(sanitizedErrorHandler);
  app.use("/api/etc/auth", router);
}

export { normalizeLanguage };
