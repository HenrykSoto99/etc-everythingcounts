import { describe, expect, it } from "vitest";
import {
  buildPasswordResetUrl,
  chooseTrustedOrigin,
  getEmailConfig,
  normalizeLanguage,
  normalizeOrigin,
  publicEmailStatus,
} from "./email";

describe("ETC email provider configuration", () => {
  it("does not enable a provider without an explicit complete configuration", () => {
    expect(getEmailConfig({})).toEqual({ provider: "none", enabled: false });
    expect(
      getEmailConfig({
        ETC_EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "key",
      })
    ).toEqual({ provider: "none", enabled: false });
    expect(
      publicEmailStatus({
        ETC_EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "key",
        ETC_EMAIL_FROM: "ETC <no-reply@example.com>",
      })
    ).toEqual({ emailEnabled: true, provider: "resend" });
  });

  it("accepts SMTP only with complete credentials and no secret in status", () => {
    const config = getEmailConfig({
      ETC_EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "mailer@example.com",
      SMTP_PASSWORD: "secret",
      SMTP_SECURE: "true",
    });
    expect(config).toMatchObject({
      provider: "smtp",
      enabled: true,
      secure: true,
    });
    expect(
      publicEmailStatus({
        ETC_EMAIL_PROVIDER: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "mailer@example.com",
        SMTP_PASSWORD: "secret",
        SMTP_SECURE: "true",
      })
    ).toEqual({
      emailEnabled: true,
      provider: "smtp",
    });
  });

  it("sanitizes language and permits only HTTPS or local HTTP origins", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage(undefined, "es-MX, en;q=0.8")).toBe("es");
    expect(normalizeOrigin("https://preview.example/path")).toBeNull();
    expect(normalizeOrigin("https://preview.example/")).toBe(
      "https://preview.example"
    );
    expect(normalizeOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
    expect(normalizeOrigin("http://attacker.example")).toBeNull();
  });

  it("builds recovery URLs from a trusted fixed origin only", () => {
    const url = buildPasswordResetUrl(
      chooseTrustedOrigin([
        "http://localhost:3000",
        "https://preview.example",
      ])!,
      "etc_reset_opaque"
    );
    expect(url).toBe(
      "https://preview.example/reset-password?token=etc_reset_opaque"
    );
    expect(() =>
      buildPasswordResetUrl("https://preview.example/app", "x")
    ).toThrow();
  });
});
