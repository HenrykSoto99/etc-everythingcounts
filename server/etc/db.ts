import { createHash, randomBytes, randomUUID } from "node:crypto";
import mysql, {
  type PoolConnection,
  type ResultSetHeader,
} from "mysql2/promise";
import type {
  Contact,
  Conversation,
  Knowledge,
  Segment,
  Session,
  Stage,
  Task,
  Workspace,
} from "@shared/etc/types";
import { isWindowOpen } from "@shared/etc/window";

export type DbRow = Record<string, any>;
export type LiveUser = {
  id: number;
  name: string | null;
  email?: string | null;
};
export type AuthContext = {
  mode: "demo" | "live";
  workspace: Workspace & { ownerUserId: number | null };
  user: { name: string; role: "owner" | "agent" };
  userId: number | null;
};

let pool: mysql.Pool | null = null;
export function getEtcPool(): mysql.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is not configured");
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 8,
      enableKeepAlive: true,
    });
  }
  return pool;
}
export async function closeEtcPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
export async function rows<T extends DbRow = DbRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [result] = await getEtcPool().query(sql, params);
  return result as T[];
}
export async function exec(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await getEtcPool().execute(sql, params);
  return result as ResultSetHeader;
}
export async function transaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getEtcPool().getConnection();
  try {
    await conn.beginTransaction();
    const value = await fn(conn);
    await conn.commit();
    return value;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export const hashDemoToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newDemoToken = () => randomBytes(32).toString("base64url");
const iso = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? new Date(0).toISOString()
    : date.toISOString();
};
const nullableIso = (value: unknown): string | null =>
  value == null ? null : iso(value);
const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((tag): tag is string => typeof tag === "string");
  if (typeof value === "string") {
    try {
      return parseTags(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
};

export function workspaceFromRow(
  row: DbRow
): Workspace & { ownerUserId: number | null } {
  return {
    id: String(row.id),
    name: String(row.name),
    segment: row.segment as Segment,
    agentName: String(row.agent_name),
    tone: String(row.tone),
    description: String(row.description),
    primaryColor: String(row.primary_color),
    autoReply: Boolean(row.auto_reply),
    ownerUserId: row.owner_user_id == null ? null : Number(row.owner_user_id),
  };
}
export function publicWorkspace(
  workspace: Workspace & { ownerUserId: number | null }
): Workspace {
  const { ownerUserId: _ownerUserId, ...publicValue } = workspace;
  return publicValue;
}
export function contactFromRow(row: DbRow): Contact {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email ?? ""),
    stage: row.stage as Stage,
    priority: row.priority,
    tags: parseTags(row.tags),
    notes: String(row.notes ?? ""),
    consent: Boolean(row.consent),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
export function messageFromRow(row: DbRow) {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: row.role,
    text: String(row.text),
    status: row.status,
    createdAt: iso(row.created_at),
  };
}
export function knowledgeFromRow(row: DbRow): Knowledge {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    approved: Boolean(row.approved),
    updatedAt: iso(row.updated_at),
  };
}
export function taskFromRow(row: DbRow): Task {
  return {
    id: String(row.id),
    contactId: row.contact_id == null ? null : String(row.contact_id),
    title: String(row.title),
    dueAt: iso(row.due_at),
    completed: Boolean(row.completed),
    contactName: row.contact_name == null ? null : String(row.contact_name),
  };
}

export async function getWorkspace(
  id: string
): Promise<(Workspace & { ownerUserId: number | null }) | null> {
  const found = await rows("SELECT * FROM etc_workspaces WHERE id=? LIMIT 1", [
    id,
  ]);
  return found[0] ? workspaceFromRow(found[0]) : null;
}
export async function getLiveWorkspace(
  ownerUserId: number
): Promise<(Workspace & { ownerUserId: number | null }) | null> {
  const found = await rows(
    "SELECT * FROM etc_workspaces WHERE owner_user_id=? AND mode='live' LIMIT 1",
    [ownerUserId]
  );
  return found[0] ? workspaceFromRow(found[0]) : null;
}

const presets: Record<
  Segment,
  {
    name: string;
    agentName: string;
    tone: string;
    description: string;
    color: string;
    faq: [string, string];
  }
> = {
  inmobiliaria: {
    name: "Casa Norte Demo",
    agentName: "Clara",
    tone: "Cercana y profesional",
    description: "Atención ficticia para una agencia inmobiliaria local.",
    color: "#1B4079",
    faq: [
      "Horarios de visita",
      "Coordinamos visitas de lunes a sábado con confirmación previa.",
    ],
  },
  educacion: {
    name: "Aula Abierta Demo",
    agentName: "Nora",
    tone: "Clara y paciente",
    description: "Perfil ficticio para una institución educativa.",
    color: "#4D7C8A",
    faq: [
      "Información de inscripción",
      "Compartimos requisitos y próximos pasos después de confirmar el programa.",
    ],
  },
  retail: {
    name: "Tienda Centro Demo",
    agentName: "Iris",
    tone: "Ágil y útil",
    description: "Perfil ficticio para un comercio.",
    color: "#8FAD88",
    faq: [
      "Cambios y devoluciones",
      "Revisamos cada caso con el comprobante y las condiciones vigentes.",
    ],
  },
  servicios: {
    name: "Servicios Punto Demo",
    agentName: "Leo",
    tone: "Directa y tranquila",
    description: "Perfil ficticio para un negocio de servicios.",
    color: "#7F9C96",
    faq: [
      "Solicitud de presupuesto",
      "Recogemos los datos básicos y una persona confirma el alcance.",
    ],
  },
};

export async function createDemo(
  segment: Segment
): Promise<{
  token: string;
  workspace: Workspace & { ownerUserId: number | null };
}> {
  const token = newDemoToken();
  const tokenHash = hashDemoToken(token);
  const preset = presets[segment];
  const workspaceId = randomUUID();
  const sessionId = randomUUID();
  const now = new Date();
  await transaction(async conn => {
    await conn.execute(
      "INSERT INTO etc_workspaces (id,owner_user_id,mode,segment,name,agent_name,tone,description,primary_color,auto_reply) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        workspaceId,
        null,
        "demo",
        segment,
        preset.name,
        preset.agentName,
        preset.tone,
        preset.description,
        preset.color,
        1,
      ]
    );
    await conn.execute(
      "INSERT INTO etc_demo_sessions (id,token_hash,workspace_id,expires_at) VALUES (?,?,?,?)",
      [
        sessionId,
        tokenHash,
        workspaceId,
        new Date(now.getTime() + 8 * 60 * 60 * 1000),
      ]
    );
    await seedDemo(conn, workspaceId, segment, preset);
  });
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Demo workspace was not created");
  return { token, workspace };
}

async function seedDemo(
  conn: PoolConnection,
  workspaceId: string,
  segment: Segment,
  preset: (typeof presets)[Segment]
) {
  const names = [
    "Lucía Martín",
    "Diego Rojas",
    "Marta Soler",
    "Álvaro Gil",
    "Sofía Peña",
    "Bruno Costa",
    "Elena Vidal",
    "Pablo Serra",
  ];
  const stages: Stage[] = [
    "nuevo",
    "en_atencion",
    "calificado",
    "ganado",
    "perdido",
    "calificado",
    "en_atencion",
    "nuevo",
  ];
  const contacts: string[] = [];
  const now = Date.now();
  for (let i = 0; i < names.length; i++) {
    const id = randomUUID();
    contacts.push(id);
    await conn.execute(
      "INSERT INTO etc_contacts (id,workspace_id,name,phone,email,stage,priority,tags,notes,consent) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        workspaceId,
        names[i],
        `+34600000${String(101 + i).padStart(3, "0")}`,
        `${names[i].toLowerCase().replaceAll(" ", ".")}@demo.example`,
        stages[i],
        i % 3 === 0 ? "alta" : "media",
        JSON.stringify(i % 2 ? ["web"] : ["referido", "nuevo"]),
        "Registro ficticio de demostración.",
        1,
      ]
    );
  }
  for (let i = 0; i < 6; i++) {
    const conversationId = randomUUID();
    const inbound = new Date(now - (i + 1) * 60 * 60 * 1000);
    await conn.execute(
      "INSERT INTO etc_conversations (id,workspace_id,contact_id,last_inbound_at,unread_count,ai_paused,status,assigned_to,version) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        conversationId,
        workspaceId,
        contacts[i],
        inbound,
        i % 2,
        i === 4 ? 1 : 0,
        "abierta",
        preset.agentName,
        0,
      ]
    );
    await conn.execute(
      "INSERT INTO etc_messages (id,conversation_id,role,text,status,created_at) VALUES (?,?,?,?,?,?)",
      [
        randomUUID(),
        conversationId,
        "customer",
        i % 2
          ? "¿Podemos revisar disponibilidad y próximos pasos?"
          : "Hola, me gustaría recibir información.",
        "received",
        inbound,
      ]
    );
    await conn.execute(
      "INSERT INTO etc_messages (id,conversation_id,role,text,status,created_at) VALUES (?,?,?,?,?,?)",
      [
        randomUUID(),
        conversationId,
        "human",
        "Claro, te ayudo con eso. ¿Qué necesitas priorizar?",
        "demo",
        new Date(inbound.getTime() + 5 * 60 * 1000),
      ]
    );
  }
  const faq = preset.faq;
  for (const [title, content] of [
    faq,
    [
      "Atención humana",
      "Si una consulta requiere revisión, la derivamos a una persona del equipo.",
    ],
  ]) {
    await conn.execute(
      "INSERT INTO etc_knowledge (id,workspace_id,title,content,approved) VALUES (?,?,?,?,?)",
      [randomUUID(), workspaceId, title, content, 1]
    );
  }
  for (let i = 0; i < 3; i++) {
    await conn.execute(
      "INSERT INTO etc_tasks (id,workspace_id,contact_id,title,due_at,completed) VALUES (?,?,?,?,?,?)",
      [
        randomUUID(),
        workspaceId,
        contacts[i],
        ["Confirmar visita", "Enviar información", "Revisar seguimiento"][i],
        new Date(now + (i + 1) * 24 * 60 * 60 * 1000),
        i === 2 ? 1 : 0,
      ]
    );
  }
}

export async function getDemoContext(
  tokenHash: string
): Promise<AuthContext | null> {
  const found = await rows(
    `SELECT s.workspace_id, s.expires_at, w.* FROM etc_demo_sessions s JOIN etc_workspaces w ON w.id=s.workspace_id WHERE s.token_hash=? AND w.mode='demo' LIMIT 1`,
    [tokenHash]
  );
  if (!found[0] || new Date(found[0].expires_at).getTime() <= Date.now())
    return null;
  return {
    mode: "demo",
    workspace: workspaceFromRow(found[0]),
    user: { name: "Visitante demo", role: "owner" },
    userId: null,
  };
}

export async function ensureLiveWorkspace(
  user: LiveUser
): Promise<Workspace & { ownerUserId: number | null }> {
  const existing = await getLiveWorkspace(user.id);
  if (existing) return existing;
  const preset = presets.inmobiliaria;
  try {
    await exec(
      "INSERT INTO etc_workspaces (id,owner_user_id,mode,segment,name,agent_name,tone,description,primary_color,auto_reply) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        randomUUID(),
        user.id,
        "live",
        "servicios",
        user.name ? `${user.name} · ETC` : "Mi espacio ETC",
        preset.agentName,
        preset.tone,
        "Configura aquí el perfil de tu negocio.",
        preset.color,
        0,
      ]
    );
  } catch (error: any) {
    if (error?.code !== "ER_DUP_ENTRY") throw error;
  }
  const created = await getLiveWorkspace(user.id);
  if (!created) throw new Error("Live workspace was not created");
  return created;
}

export async function remainingAi(workspaceId: string): Promise<number> {
  const found = await rows(
    "SELECT scope_type,scope_id,used_count FROM etc_usage_counters WHERE metric='ai' AND usage_date=CURRENT_DATE() AND ((scope_type='global' AND scope_id='global') OR (scope_type='workspace' AND scope_id=?))",
    [workspaceId]
  );
  const globalUsed = Number(
    found.find(row => row.scope_type === "global")?.used_count ?? 0
  );
  const localUsed = Number(
    found.find(row => row.scope_type === "workspace")?.used_count ?? 0
  );
  return Math.max(0, Math.min(100 - globalUsed, 20 - localUsed));
}

export async function consumeAi(workspaceId: string): Promise<boolean> {
  return transaction(async conn => {
    await conn.execute(
      "INSERT IGNORE INTO etc_usage_counters (scope_type,scope_id,metric,usage_date,used_count) VALUES ('global','global','ai',CURRENT_DATE(),0),('workspace',?,'ai',CURRENT_DATE(),0)",
      [workspaceId]
    );
    const [locked] = await conn.query(
      "SELECT scope_type,used_count FROM etc_usage_counters WHERE metric='ai' AND usage_date=CURRENT_DATE() AND ((scope_type='global' AND scope_id='global') OR (scope_type='workspace' AND scope_id=?)) FOR UPDATE",
      [workspaceId]
    );
    const values = locked as DbRow[];
    if (
      Number(
        values.find(row => row.scope_type === "global")?.used_count ?? 0
      ) >= 100 ||
      Number(
        values.find(row => row.scope_type === "workspace")?.used_count ?? 0
      ) >= 20
    )
      return false;
    await conn.execute(
      "UPDATE etc_usage_counters SET used_count=used_count+1 WHERE metric='ai' AND usage_date=CURRENT_DATE() AND scope_type='global' AND scope_id='global'"
    );
    await conn.execute(
      "UPDATE etc_usage_counters SET used_count=used_count+1 WHERE metric='ai' AND usage_date=CURRENT_DATE() AND scope_type='workspace' AND scope_id=?",
      [workspaceId]
    );
    return true;
  });
}

export async function consumeDemoCreation(): Promise<boolean> {
  return transaction(async conn => {
    await conn.execute(
      "INSERT IGNORE INTO etc_usage_counters (scope_type,scope_id,metric,usage_date,used_count) VALUES ('global','global','demo_create',CURRENT_DATE(),0)"
    );
    const [locked] = await conn.query(
      "SELECT used_count FROM etc_usage_counters WHERE scope_type='global' AND scope_id='global' AND metric='demo_create' AND usage_date=CURRENT_DATE() FOR UPDATE"
    );
    const used = Number((locked as DbRow[])[0]?.used_count ?? 0);
    if (used >= 100) return false;
    await conn.execute(
      "UPDATE etc_usage_counters SET used_count=used_count+1 WHERE scope_type='global' AND scope_id='global' AND metric='demo_create' AND usage_date=CURRENT_DATE()"
    );
    return true;
  });
}

export function conversationFromRow(
  row: DbRow,
  contact: Contact
): Conversation {
  return {
    id: String(row.id),
    contactId: contact.id,
    contact,
    lastMessage: String(row.last_message ?? ""),
    lastMessageAt: iso(row.last_message_at),
    lastInboundAt: nullableIso(row.last_inbound_at),
    unreadCount: Number(row.unread_count),
    aiPaused: Boolean(row.ai_paused),
    status: row.status,
    assignedTo: String(row.assigned_to ?? ""),
    windowOpen: isWindowOpen(row.last_inbound_at),
  };
}

export function sessionResponse(
  ctx: AuthContext,
  remainingAI: number,
  connection: Session["connection"]
): Session {
  return {
    mode: ctx.mode,
    workspace: publicWorkspace(ctx.workspace),
    user: ctx.user,
    connection,
    limits: { remainingAI },
  };
}
