import { describe, expect, it } from "vitest";
import {
  accountCookieOptions,
  hashAccountToken,
  isAccountSessionToken,
  isPasswordResetToken,
  newAccountSessionToken,
  newPasswordResetToken,
  resetPasswordInTransaction,
} from "./index";

describe("ETC account sessions", () => {
  it("uses opaque 32-byte-prefixed tokens and stores only hashes", () => {
    const token = newAccountSessionToken();
    expect(isAccountSessionToken(token)).toBe(true);
    expect(token).toMatch(/^etc_acct_[A-Za-z0-9_-]{43}$/);
    expect(hashAccountToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAccountToken(token)).not.toContain(token);
    expect(isAccountSessionToken("etc_acct_short")).toBe(false);
  });

  it("uses cross-site secure cookies publicly and explicit local handling", () => {
    expect(accountCookieOptions("https://preview.example")).toMatchObject({
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });
    expect(accountCookieOptions("http://localhost:3000")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
  });

  it("locks a reset token and invalidates password, token and every session", async () => {
    const token = newPasswordResetToken();
    const calls: string[] = [];
    const conn = {
      query: async (sql: string) => {
        calls.push(`query:${sql}`);
        return [[{ id: "reset-1", user_id: 42 }], []] as [unknown, unknown];
      },
      execute: async (sql: string) => {
        calls.push(`execute:${sql}`);
        return [{ affectedRows: 1 }, []] as [unknown, unknown];
      },
    };

    await resetPasswordInTransaction(conn, token, "scrypt$test-hash");

    expect(isPasswordResetToken(token)).toBe(true);
    expect(calls[0]).toContain("FOR UPDATE");
    expect(calls[1]).toContain("etc_account_credentials");
    expect(calls[2]).toContain("etc_account_reset_tokens");
    expect(calls[3]).toContain("DELETE FROM etc_account_sessions");
  });

  it("rejects a missing or already-used token in the transaction", async () => {
    const conn = {
      query: async () => [[], []] as [unknown, unknown],
      execute: async () => [{ affectedRows: 0 }, []] as [unknown, unknown],
    };
    await expect(
      resetPasswordInTransaction(conn, newPasswordResetToken(), "hash")
    ).rejects.toMatchObject({ status: 400 });
  });
});
