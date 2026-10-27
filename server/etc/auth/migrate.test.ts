import { describe, expect, it } from "vitest";
import { EMAIL_AUTH_MIGRATION_STATEMENTS } from "./migrate";

describe("ETC email auth migration", () => {
  it("owns only additive auth tables and has no destructive statements", () => {
    const all = EMAIL_AUTH_MIGRATION_STATEMENTS.join("\n").toLowerCase();
    for (const table of [
      "etc_account_credentials",
      "etc_account_sessions",
      "etc_account_reset_tokens",
      "etc_auth_rate_limits",
      "etc_auth_workspace_settings",
    ])
      expect(all).toContain(`create table if not exists ${table}`);
    expect(all).not.toMatch(/\b(drop|truncate|delete|alter)\b/);
  });
});
