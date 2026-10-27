import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConfiguredModelError,
  MANAGED_MODEL,
  PROVIDER_HOSTS,
  decryptApiKeyFromStorage,
  encryptApiKeyForStorage,
  encryptionReady,
  isValidModel,
  parseEncryptionKey,
  providerListUrl,
  validateModelForProvider,
} from "./providers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ETC provider security", () => {
  it("round-trips an API key with a valid independent 32-byte root", () => {
    vi.stubEnv("ETC_LLM_ENCRYPTION_KEY", "11".repeat(32));
    const encrypted = encryptApiKeyForStorage("unit-test-key-not-production");
    expect(encrypted.last4).toBe("tion");
    expect(decryptApiKeyFromStorage(encrypted)).toBe(
      "unit-test-key-not-production"
    );
    expect(encryptionReady()).toBe(true);
  });

  it("rejects tampered ciphertext and a different root key", () => {
    vi.stubEnv("ETC_LLM_ENCRYPTION_KEY", "22".repeat(32));
    const encrypted = encryptApiKeyForStorage("unit-test-key-not-production");
    const tampered = {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext[0] === "A" ? "B" : "A"}${encrypted.ciphertext.slice(1)}`,
    };
    expect(() => decryptApiKeyFromStorage(tampered)).toThrow(
      ConfiguredModelError
    );
    vi.stubEnv("ETC_LLM_ENCRYPTION_KEY", "33".repeat(32));
    expect(() => decryptApiKeyFromStorage(encrypted)).toThrow(
      ConfiguredModelError
    );
  });

  it("does not accept absent, derived, or incorrectly sized root keys", () => {
    expect(parseEncryptionKey("")).toBeNull();
    expect(parseEncryptionKey("platform-secret")).toBeNull();
    expect(parseEncryptionKey("11".repeat(31))).toBeNull();
    expect(
      parseEncryptionKey(Buffer.alloc(32, 1).toString("base64"))
    ).toHaveLength(32);
  });

  it("keeps provider hosts fixed and models bounded", () => {
    expect(PROVIDER_HOSTS.openai).toBe("https://api.openai.com/v1");
    expect(PROVIDER_HOSTS.gemini).toBe(
      "https://generativelanguage.googleapis.com/v1beta"
    );
    expect(PROVIDER_HOSTS.anthropic).toBe("https://api.anthropic.com/v1");
    expect(providerListUrl("openai")).toBe("https://api.openai.com/v1/models");
    expect(validateModelForProvider("managed", MANAGED_MODEL)).toBe(
      MANAGED_MODEL
    );
    expect(validateModelForProvider("managed", "gpt-5-mini")).toBeNull();
    expect(isValidModel("gemini-2.5-flash")).toBe(true);
    expect(isValidModel("https://arbitrary.example/model")).toBe(false);
  });
});
