import { describe, expect, it } from "vitest";
import { consultationMigrationStatements } from "./consultation-migrate";

describe("Consultas IA migration", () => {
  it("creates workspace-scoped settings and consultation history additively", () => {
    const sql = consultationMigrationStatements.join("\n").toLowerCase();
    expect(sql).toContain("create table if not exists etc_llm_settings");
    expect(sql).toContain(
      "create table if not exists etc_consultation_messages"
    );
    expect(sql).toContain("unique key etc_consultation_scope_client_role");
    expect(sql).toContain("api_key_ciphertext");
    expect(sql).toContain("api_key_nonce");
    expect(sql).toContain("api_key_tag");
    expect(sql).not.toMatch(/\b(drop|truncate|alter\s+table)\b/);
  });
});
