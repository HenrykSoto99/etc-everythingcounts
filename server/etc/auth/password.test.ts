import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isValidPassword,
  verifyPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./password";

describe("ETC email auth password KDF", () => {
  it("hashes with a random salt and verifies without storing plaintext", async () => {
    const password = "correct-horse-battery-12";
    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(first).not.toContain(password);
    expect(first).not.toBe(second);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password-12", first)).resolves.toBe(
      false
    );
  });

  it("enforces the documented password bounds before KDF work", () => {
    expect(isValidPassword("a".repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(isValidPassword("a".repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(isValidPassword("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
    expect(isValidPassword("a".repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
    expect(isValidPassword(123)).toBe(false);
  });

  it("rejects malformed encoded hashes without throwing", async () => {
    await expect(
      verifyPassword("correct-horse-12", "not-a-scrypt-hash")
    ).resolves.toBe(false);
  });
});
