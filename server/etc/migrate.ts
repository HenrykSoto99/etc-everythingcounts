import mysql from "mysql2/promise";
import { runEmailAuthMigration } from './auth/migrate';
import { runConsultationMigration } from './consultation-migrate';

const statements = [
  `CREATE TABLE IF NOT EXISTS etc_workspaces (
    id CHAR(36) NOT NULL,
    owner_user_id INT NULL,
    mode VARCHAR(8) NOT NULL,
    segment VARCHAR(24) NOT NULL,
    business_type VARCHAR(32) NOT NULL DEFAULT 'general',
    name VARCHAR(160) NOT NULL,
    agent_name VARCHAR(120) NOT NULL,
    tone VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    primary_color VARCHAR(16) NOT NULL,
    auto_reply TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_workspace_owner_live (owner_user_id, mode),
    KEY etc_workspace_mode (mode)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_demo_sessions (
    id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_demo_token_hash (token_hash),
    KEY etc_demo_workspace (workspace_id),
    KEY etc_demo_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_contacts (
    id CHAR(36) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(320) NOT NULL DEFAULT '',
    stage VARCHAR(24) NOT NULL DEFAULT 'nuevo',
    priority VARCHAR(16) NOT NULL DEFAULT 'media',
    tags JSON NOT NULL,
    notes TEXT NOT NULL,
    consent TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY etc_contacts_workspace (workspace_id),
    KEY etc_contacts_phone (workspace_id, phone)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_conversations (
    id CHAR(36) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    contact_id CHAR(36) NOT NULL,
    last_inbound_at DATETIME(3) NULL,
    unread_count INT NOT NULL DEFAULT 0,
    ai_paused TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(12) NOT NULL DEFAULT 'abierta',
    assigned_to VARCHAR(160) NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_conversation_contact (workspace_id, contact_id),
    KEY etc_conversations_workspace (workspace_id),
    KEY etc_conversations_inbound (workspace_id, last_inbound_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_messages (
    id CHAR(36) NOT NULL,
    conversation_id CHAR(36) NOT NULL,
    role VARCHAR(16) NOT NULL,
    text TEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    client_id VARCHAR(160) NULL,
    external_id VARCHAR(160) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY etc_message_external (external_id),
    UNIQUE KEY etc_message_client (conversation_id, client_id),
    KEY etc_messages_conversation (conversation_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_knowledge (
    id CHAR(36) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    approved TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY etc_knowledge_workspace (workspace_id, approved)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_tasks (
    id CHAR(36) NOT NULL,
    workspace_id CHAR(36) NOT NULL,
    contact_id CHAR(36) NULL,
    title VARCHAR(240) NOT NULL,
    due_at DATETIME(3) NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY etc_tasks_workspace (workspace_id, completed, due_at),
    KEY etc_tasks_contact (workspace_id, contact_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS etc_usage_counters (
    scope_type VARCHAR(16) NOT NULL,
    scope_id VARCHAR(64) NOT NULL,
    metric VARCHAR(32) NOT NULL,
    usage_date DATE NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (scope_type, scope_id, metric, usage_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function runEtcMigration(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for ETC migration");
  const pool = mysql.createPool(databaseUrl);
  try {
    for (const statement of statements) await pool.query(statement);
    const [columns] = await pool.query("SHOW COLUMNS FROM etc_workspaces LIKE 'business_type'");
    if (!(columns as unknown[]).length) {
      try { await pool.query("ALTER TABLE etc_workspaces ADD COLUMN business_type VARCHAR(32) NOT NULL DEFAULT 'general'"); }
      catch (error: any) { if (error?.code !== 'ER_DUP_FIELDNAME') throw error; }
    }
  } finally {
    await pool.end();
  }
  await runEmailAuthMigration(databaseUrl);
  await runConsultationMigration(databaseUrl);
}

const isMain = process.argv[1]?.endsWith("server/etc/migrate.ts");
if (isMain) {
  runEtcMigration()
    .then(() => console.log("ETC migration complete"))
    .catch(error => {
      console.error("ETC migration failed", error instanceof Error ? error.message : "unknown error");
      process.exitCode = 1;
    });
}
