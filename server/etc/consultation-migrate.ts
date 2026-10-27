import mysql from "mysql2/promise";

/**
 * Additive tables for Consultas IA and workspace-scoped provider settings.
 * The parent migration should invoke this after the base ETC tables exist.
 */
export const consultationMigrationStatements = [
  `CREATE TABLE IF NOT EXISTS etc_llm_settings (
    workspace_id CHAR(36) NOT NULL,
    provider VARCHAR(16) NOT NULL DEFAULT 'managed',
    model VARCHAR(128) NOT NULL DEFAULT 'gpt-6-luna',
    api_key_ciphertext TEXT NULL,
    api_key_nonce VARCHAR(64) NULL,
    api_key_tag VARCHAR(64) NULL,
    key_last4 VARCHAR(4) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (workspace_id),
    KEY etc_llm_settings_provider (provider)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_consultation_messages (
    id CHAR(36) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    segment VARCHAR(24) NOT NULL,
    business_type VARCHAR(24) NOT NULL DEFAULT '',
    client_id VARCHAR(160) NOT NULL,
    role VARCHAR(16) NOT NULL,
    text TEXT NOT NULL,
    response_mode VARCHAR(16) NULL,
    response_reason VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_consultation_scope_client_role (workspace_id,segment,business_type,client_id,role),
    KEY etc_consultation_scope_history (workspace_id,segment,business_type,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
] as const;

export async function runConsultationMigration(
  databaseUrl = process.env.DATABASE_URL
): Promise<void> {
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required for consultation migration");
  const pool = mysql.createPool(databaseUrl);
  try {
    for (const statement of consultationMigrationStatements)
      await pool.query(statement);
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1]?.endsWith("server/etc/consultation-migrate.ts");
if (isMain) {
  runConsultationMigration()
    .then(() => console.log("Consultation migration complete"))
    .catch(error => {
      console.error(
        "Consultation migration failed",
        error instanceof Error ? error.message : "unknown error"
      );
      process.exitCode = 1;
    });
}
