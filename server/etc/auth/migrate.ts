import mysql from "mysql2/promise";

export const EMAIL_AUTH_MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS etc_account_credentials (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_account_credentials_user (user_id),
    UNIQUE KEY etc_account_credentials_email (email),
    KEY etc_account_credentials_email_lookup (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_account_sessions (
    id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_account_sessions_token (token_hash),
    KEY etc_account_sessions_user (user_id),
    KEY etc_account_sessions_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_account_reset_tokens (
    id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_account_reset_token_hash (token_hash),
    KEY etc_account_reset_user (user_id, used_at, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_auth_rate_limits (
    scope_type VARCHAR(16) NOT NULL,
    scope_key VARCHAR(128) NOT NULL,
    action VARCHAR(32) NOT NULL,
    window_start DATETIME(3) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    PRIMARY KEY (scope_type, scope_key, action, window_start),
    KEY etc_auth_rate_limit_expiry (window_start)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_auth_workspace_settings (
    user_id INT NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    segment VARCHAR(24) NOT NULL,
    business_type VARCHAR(32) NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id),
    UNIQUE KEY etc_auth_workspace_settings_workspace (workspace_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
] as const;

export async function runEmailAuthMigration(
  databaseUrl = process.env.DATABASE_URL
): Promise<void> {
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required for email auth migration");
  const pool = mysql.createPool(databaseUrl);
  try {
    for (const statement of EMAIL_AUTH_MIGRATION_STATEMENTS)
      await pool.query(statement);
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1]?.endsWith("server/etc/auth/migrate.ts");
if (isMain) {
  runEmailAuthMigration()
    .then(() => console.log("ETC email auth migration complete"))
    .catch(error => {
      console.error(
        "ETC email auth migration failed",
        error instanceof Error ? error.message : "unknown error"
      );
      process.exitCode = 1;
    });
}
