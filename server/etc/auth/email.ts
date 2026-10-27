export type EmailProvider = "resend" | "smtp" | "none";
export type Language = "es" | "en";

export type EmailConfig =
  | { provider: "none"; enabled: false }
  | {
      provider: "resend";
      enabled: true;
      apiKey: string;
      from: string;
    }
  | {
      provider: "smtp";
      enabled: true;
      host: string;
      port: number;
      user: string;
      password: string;
      secure: boolean;
      from: string;
    };

const isLocalHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "[::1]";

/** Accepts only an origin, never an arbitrary redirect URL. */
export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      return null;
    if (parsed.protocol === "https:") return parsed.origin;
    if (parsed.protocol === "http:" && isLocalHost(parsed.hostname))
      return parsed.origin;
    return null;
  } catch {
    return null;
  }
}

export function normalizeLanguage(
  value: unknown,
  acceptLanguage?: string | undefined
): Language {
  const candidate =
    typeof value === "string" && value.trim()
      ? value.trim().toLowerCase()
      : typeof acceptLanguage === "string"
        ? acceptLanguage.trim().toLowerCase()
        : "";
  return candidate.startsWith("en") ? "en" : "es";
}

export function getEmailConfig(
  env: NodeJS.ProcessEnv = process.env
): EmailConfig {
  const provider = env.ETC_EMAIL_PROVIDER;
  if (provider === "resend" && env.RESEND_API_KEY && env.ETC_EMAIL_FROM) {
    return {
      provider: "resend",
      enabled: true,
      apiKey: env.RESEND_API_KEY,
      from: env.ETC_EMAIL_FROM,
    };
  }
  if (provider === "smtp") {
    const port = Number(env.SMTP_PORT);
    if (
      env.SMTP_HOST &&
      Number.isInteger(port) &&
      port > 0 &&
      port <= 65_535 &&
      env.SMTP_USER &&
      env.SMTP_PASSWORD
    ) {
      const secure = env.SMTP_SECURE
        ? env.SMTP_SECURE.toLowerCase() === "true"
        : port === 465;
      return {
        provider: "smtp",
        enabled: true,
        host: env.SMTP_HOST,
        port,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        secure,
        from: env.ETC_EMAIL_FROM || env.SMTP_USER,
      };
    }
  }
  return { provider: "none", enabled: false };
}

export function publicEmailStatus(env: NodeJS.ProcessEnv = process.env) {
  const config = getEmailConfig(env);
  return {
    emailEnabled: config.enabled,
    provider: config.provider,
  } as const;
}

export function chooseTrustedOrigin(
  allowedOrigins: readonly string[],
  preferred?: string | null
): string | null {
  const candidates = [
    preferred,
    process.env.ETC_PUBLIC_ORIGIN,
    ...allowedOrigins,
  ]
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));
  return (
    candidates.find(value => value.startsWith("https://")) ??
    candidates[0] ??
    null
  );
}

export function buildPasswordResetUrl(origin: string, token: string): string {
  const normalized = normalizeOrigin(origin);
  if (!normalized) throw new Error("Trusted reset origin is invalid");
  const url = new URL("/reset-password", normalized);
  url.searchParams.set("token", token);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!
  );
}

function messageFor(language: Language, name: string, resetUrl: string) {
  const safeName = escapeHtml(name || (language === "en" ? "there" : "ahí"));
  const safeUrl = escapeHtml(resetUrl);
  if (language === "en") {
    return {
      subject: "Reset your ETC password",
      text: `Hi ${name || "there"},\n\nUse this link to reset your ETC password. It expires in 30 minutes and can only be used once:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Hi ${safeName},</p><p>Use this link to reset your ETC password. It expires in 30 minutes and can only be used once:</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    };
  }
  return {
    subject: "Restablece tu contraseña de ETC",
    text: `Hola ${name || "ahí"},\n\nUsa este enlace para restablecer tu contraseña de ETC. Expira en 30 minutos y solo puede usarse una vez:\n${resetUrl}\n\nSi no lo solicitaste, puedes ignorar este correo.`,
    html: `<p>Hola ${safeName},</p><p>Usa este enlace para restablecer tu contraseña de ETC. Expira en 30 minutos y solo puede usarse una vez:</p><p><a href="${safeUrl}">Restablecer contraseña</a></p><p>Si no lo solicitaste, puedes ignorar este correo.</p>`,
  };
}

async function sendWithResend(
  config: Extract<EmailConfig, { provider: "resend" }>,
  to: string,
  message: ReturnType<typeof messageFor>
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Email provider rejected request");
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWithSmtp(
  config: Extract<EmailConfig, { provider: "smtp" }>,
  to: string,
  message: ReturnType<typeof messageFor>
): Promise<void> {
  // Avoid a static import so this module remains usable when SMTP is not selected.
  const load = new Function("return import('nodemailer')") as () => Promise<{
    default?: any;
    createTransport?: (...args: any[]) => any;
  }>;
  const loaded = await load();
  const nodemailer = loaded.default ?? loaded;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
  try {
    await transport.sendMail({
      from: config.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } finally {
    if (typeof transport.close === "function") transport.close();
  }
}

export async function sendPasswordResetEmail(input: {
  config?: EmailConfig;
  to: string;
  name: string;
  language: Language;
  resetUrl: string;
}): Promise<void> {
  const config = input.config ?? getEmailConfig();
  if (!config.enabled) return;
  const message = messageFor(input.language, input.name, input.resetUrl);
  if (config.provider === "resend")
    return sendWithResend(config, input.to, message);
  return sendWithSmtp(config, input.to, message);
}
