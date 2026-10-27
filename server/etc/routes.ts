import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import { sdk } from "../_core/sdk";
import { resolveEmailUser } from './auth';
import { registerConsultationRoutes } from './consultation';
import { registerLlmConfigRoutes } from './llm-config';
import type {
  Contact,
  Knowledge,
  Segment,
  Stage,
  Task,
} from "@shared/etc/types";
import { isWindowOpen } from "@shared/etc/window";
import { SEGMENTS, isBusinessType } from '@shared/etc/segments';
import {
  generateSuggestion,
  faqFallback,
  type AiProfile,
  type AiTurn,
} from "./ai";
import { canPersistAiReply, isWorkspaceOwner } from "./rules";
import {
  consumeAi,
  consumeDemoCreation,
  contactFromRow,
  conversationFromRow,
  createDemo,
  ensureLiveWorkspace,
  exec,
  getDemoContext,
  getWorkspace,
  hashDemoToken,
  knowledgeFromRow,
  messageFromRow,
  publicWorkspace,
  remainingAi,
  rows,
  sessionResponse,
  taskFromRow,
  transaction,
  type AuthContext,
  type DbRow,
  type LiveUser,
  workspaceFromRow,
} from "./db";

const segments: Segment[] = SEGMENTS;
const stages: Stage[] = [
  "nuevo",
  "en_atencion",
  "calificado",
  "ganado",
  "perdido",
];
const priorities = ["baja", "media", "alta"] as const;
type EtcRequest = Request & { etc?: AuthContext };
type EtcMessageStatus =
  | "received"
  | "demo"
  | "pending"
  | "uncertain"
  | "sent"
  | "delivered"
  | "read"
  | "failed";
const HANDOFF_TEXT =
  "No tengo una respuesta aprobada para eso. Esta conversación requiere revisión humana.";

const asyncRoute =
  (
    handler: (
      req: EtcRequest,
      res: Response,
      next: NextFunction
    ) => Promise<unknown>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req as EtcRequest, res, next)
      .then(() => undefined)
      .catch(next);
  };
const error = (res: Response, status: number, message: string) => {
  if (!res.headersSent) res.status(status).json({ error: message });
};
const text = (value: unknown, max = 4000): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const validSegment = (value: unknown): value is Segment =>
  typeof value === "string" && segments.includes(value as Segment);
const validStage = (value: unknown): value is Stage =>
  typeof value === "string" && stages.includes(value as Stage);
const validPriority = (value: unknown): value is (typeof priorities)[number] =>
  typeof value === "string" && priorities.includes(value as any);
const dateValue = (value: unknown): Date | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const paramsId = (req: Request) =>
  typeof req.params.id === "string" ? req.params.id : "";
const bearer = (req: Request) => {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ")
    ? value.slice(7).trim()
    : null;
};
const normalizedPhone = (value: string) => value.replace(/[^\d+]/g, "");
const csvCell = (value: unknown) => {
  let out = String(value ?? "").replace(/"/g, '""');
  if (/^\s*[=+\-@]/.test(out)) out = `'${out}`;
  return `"${out}"`;
};
const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
const isEmail = (value: string) =>
  value === "" ||
  (value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const isPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
};
const optionalString = (
  value: unknown,
  max: number
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length <= max ? result : null;
};
const readTags = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length > 10) return null;
  const tags = value.map(tag => (typeof tag === "string" ? tag.trim() : null));
  if (tags.some(tag => tag === null || !tag || tag.length > 32)) return null;
  return tags as string[];
};
const readClientId = (
  value: unknown
): { valid: boolean; value: string | null } => {
  if (value === undefined) return { valid: true, value: null };
  if (typeof value !== "string") return { valid: false, value: null };
  const clientId = value.trim();
  return {
    valid: clientId.length > 0 && clientId.length <= 160,
    value: clientId || null,
  };
};
const graphApiVersionValid = (value: unknown): value is string =>
  typeof value === "string" && /^v[0-9]{1,3}\.0$/.test(value);

function connectionInfo(ctx: AuthContext) {
  if (ctx.mode === "demo")
    return { configured: false, enabled: false, phoneMasked: null };
  const names: Record<string, string | undefined> = {
    ETC_LIVE_WHATSAPP_ENABLED: process.env.ETC_LIVE_WHATSAPP_ENABLED,
    WA_WORKSPACE_ID: process.env.WA_WORKSPACE_ID,
    WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
    WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN,
    WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN,
    META_APP_SECRET: process.env.META_APP_SECRET,
    WA_GRAPH_API_VERSION: process.env.WA_GRAPH_API_VERSION,
  };
  const missing = Object.entries(names)
    .filter(
      ([name, value]) =>
        !value ||
        (name === "WA_GRAPH_API_VERSION" && !graphApiVersionValid(value))
    )
    .map(([name]) => name);
  const bound = names.WA_WORKSPACE_ID === ctx.workspace.id;
  const configured = missing.length === 0 && bound;
  const enabled = configured && names.ETC_LIVE_WHATSAPP_ENABLED === "true";
  const phone = process.env.WA_PHONE_NUMBER_ID ?? "";
  return {
    configured,
    enabled,
    phoneMasked: enabled ? `${phone.slice(0, 3)}…${phone.slice(-3)}` : null,
  };
}
function webhookMissing() {
  return [
    "ETC_LIVE_WHATSAPP_ENABLED",
    "WA_WORKSPACE_ID",
    "WA_PHONE_NUMBER_ID",
    "WA_ACCESS_TOKEN",
    "WA_VERIFY_TOKEN",
    "META_APP_SECRET",
    "WA_GRAPH_API_VERSION",
  ].filter(
    name =>
      !process.env[name] ||
      (name === "WA_GRAPH_API_VERSION" &&
        !graphApiVersionValid(process.env[name]))
  );
}

async function authContext(req: EtcRequest): Promise<AuthContext> {
  const token = bearer(req);
  if (token) {
    const demo = await getDemoContext(hashDemoToken(token));
    if (demo) return demo;
  }
  const user = await resolveEmailUser(req) ?? await sdk.authenticateRequest(req);
  const liveUser: LiveUser = {
    id: Number(user.id),
    name: user.name,
    email: user.email,
  };
  if (!Number.isInteger(liveUser.id) || liveUser.id < 1)
    throw new Error("Invalid authenticated owner");
  const workspace = await ensureLiveWorkspace(liveUser);
  return {
    mode: "live",
    workspace,
    user: {
      name: user.name || "Usuario",
      role: isWorkspaceOwner(workspace.ownerUserId, liveUser.id)
        ? "owner"
        : "agent",
    },
    userId: liveUser.id,
  };
}
const requireCtx = (req: EtcRequest, res: Response): AuthContext | null => {
  if (!req.etc) {
    error(res, 401, "Autenticación requerida");
    return null;
  }
  return req.etc;
};
const requireOwner = (ctx: AuthContext, res: Response) => {
  if (ctx.user.role !== "owner") {
    error(res, 403, "Se requiere rol owner");
    return false;
  }
  return true;
};
const requireWorkspaceIntent = (
  req: EtcRequest,
  res: Response,
  next: NextFunction
) => {
  if (
    req.etc?.mode === "live" &&
    ["POST", "PATCH", "DELETE"].includes(req.method) &&
    req.headers["x-etc-intent"] !== "workspace"
  )
    return error(res, 403, "Falta X-ETC-Intent: workspace");
  next();
};

async function conversationRow(
  workspaceId: string,
  id: string
): Promise<{
  conversation: ReturnType<typeof conversationFromRow>;
  raw: DbRow;
} | null> {
  const found = await rows(
    `SELECT c.id,c.workspace_id,c.contact_id,c.last_inbound_at,c.unread_count,c.ai_paused,c.status,c.assigned_to,c.version,
      ct.id AS contact_row_id,ct.name AS contact_name,ct.phone AS contact_phone,ct.email AS contact_email,ct.stage AS contact_stage,ct.priority AS contact_priority,ct.tags AS contact_tags,ct.notes AS contact_notes,ct.consent AS contact_consent,ct.created_at AS contact_created_at,ct.updated_at AS contact_updated_at,
      (SELECT m.text FROM etc_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT m.created_at FROM etc_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
    FROM etc_conversations c JOIN etc_contacts ct ON ct.id=c.contact_id AND ct.workspace_id=c.workspace_id WHERE c.workspace_id=? AND c.id=? LIMIT 1`,
    [workspaceId, id]
  );
  if (!found[0]) return null;
  const r = found[0];
  const contact = contactFromRow({
    id: r.contact_row_id,
    name: r.contact_name,
    phone: r.contact_phone,
    email: r.contact_email,
    stage: r.contact_stage,
    priority: r.contact_priority,
    tags: r.contact_tags,
    notes: r.contact_notes,
    consent: r.contact_consent,
    created_at: r.contact_created_at,
    updated_at: r.contact_updated_at,
  });
  return { conversation: conversationFromRow(r, contact), raw: r };
}
async function knowledgeFor(workspaceId: string): Promise<Knowledge[]> {
  return (
    await rows(
      "SELECT * FROM etc_knowledge WHERE workspace_id=? ORDER BY updated_at DESC",
      [workspaceId]
    )
  ).map(knowledgeFromRow);
}
async function conversationMessages(
  id: string
): Promise<ReturnType<typeof messageFromRow>[]> {
  return (
    await rows(
      "SELECT * FROM etc_messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 500",
      [id]
    )
  ).map(messageFromRow);
}
async function saveMessage(
  conversationId: string,
  role: string,
  value: string,
  status: EtcMessageStatus,
  clientId?: string | null,
  externalId?: string | null,
  createdAt?: Date
): Promise<ReturnType<typeof messageFromRow>> {
  const id = randomUUID();
  await exec(
    "INSERT INTO etc_messages (id,conversation_id,role,text,status,client_id,external_id,created_at) VALUES (?,?,?,?,?,?,?,?)",
    [
      id,
      conversationId,
      role,
      value.slice(0, 12000),
      status,
      clientId ?? null,
      externalId ?? null,
      createdAt ?? new Date(),
    ]
  );
  const found = await rows("SELECT * FROM etc_messages WHERE id=?", [id]);
  return messageFromRow(found[0]);
}
async function scopedClientMessage(
  workspaceId: string,
  conversationId: string,
  clientId: string
): Promise<DbRow | null> {
  const found = await rows(
    "SELECT m.* FROM etc_messages m JOIN etc_conversations c ON c.id=m.conversation_id WHERE c.workspace_id=? AND c.id=? AND m.client_id=? LIMIT 1",
    [workspaceId, conversationId, clientId]
  );
  return found[0] ?? null;
}
async function demoQuotaReached(
  ctx: AuthContext,
  table: "etc_contacts" | "etc_knowledge" | "etc_tasks",
  max: number,
  conversationId?: string
): Promise<boolean> {
  if (ctx.mode !== "demo") return false;
  const found = conversationId
    ? await rows(
        `SELECT COUNT(*) AS count FROM ${table} m JOIN etc_conversations c ON c.id=? AND c.workspace_id=? WHERE m.conversation_id=c.id`,
        [conversationId, ctx.workspace.id]
      )
    : await rows(
        `SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id=?`,
        [ctx.workspace.id]
      );
  return Number(found[0]?.count ?? 0) >= max;
}

async function handleDemo(req: Request, res: Response) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const segment = body.segment === undefined ? "inmobiliaria" : body.segment;
  if (!validSegment(segment)) return error(res, 400, "Segmento inválido");
  if (body.businessType !== undefined && !isBusinessType(body.businessType)) return error(res, 400, 'Tipo de negocio inválido');
  if (!(await consumeDemoCreation()))
    return error(res, 429, "Límite diario de demos alcanzado");
  const result = await createDemo(segment, body.businessType ?? 'general');
  res.status(201).json({ token: result.token });
}

async function handleSession(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  res.json(
    sessionResponse(
      ctx,
      await remainingAi(ctx.workspace.id),
      connectionInfo(ctx)
    )
  );
}
async function handleStats(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const id = ctx.workspace.id;
  const [counts, stagesRows, activity] = await Promise.all([
    rows(
      "SELECT COUNT(*) AS contacts,(SELECT COUNT(*) FROM etc_conversations WHERE workspace_id=? AND status='abierta') AS open_conversations,(SELECT COUNT(*) FROM etc_contacts WHERE workspace_id=? AND stage='calificado') AS qualified,(SELECT COUNT(*) FROM etc_tasks WHERE workspace_id=? AND completed=0) AS pending_tasks FROM etc_contacts WHERE workspace_id=?",
      [id, id, id, id]
    ),
    rows(
      "SELECT stage,COUNT(*) AS count FROM etc_contacts WHERE workspace_id=? GROUP BY stage",
      [id]
    ),
    rows(
      "SELECT m.id,CONCAT(CASE WHEN m.role='customer' THEN 'Entrada de ' ELSE 'Actividad: ' END,m.text) AS text,m.created_at FROM etc_messages m JOIN etc_conversations c ON c.id=m.conversation_id WHERE c.workspace_id=? ORDER BY m.created_at DESC LIMIT 8",
      [id]
    ),
  ]);
  const byStage: Record<Stage, number> = {
    nuevo: 0,
    en_atencion: 0,
    calificado: 0,
    ganado: 0,
    perdido: 0,
  };
  for (const row of stagesRows)
    if (row.stage in byStage) byStage[row.stage as Stage] = Number(row.count);
  res.json({
    contacts: Number(counts[0]?.contacts ?? 0),
    openConversations: Number(counts[0]?.open_conversations ?? 0),
    qualified: Number(counts[0]?.qualified ?? 0),
    pendingTasks: Number(counts[0]?.pending_tasks ?? 0),
    byStage,
    activity: activity.map(row => ({
      id: String(row.id),
      text: String(row.text).slice(0, 240),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  });
}

async function handleContacts(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const search =
    typeof req.query.search === "string"
      ? req.query.search.trim().slice(0, 120)
      : "";
  const found = await rows(
    "SELECT * FROM etc_contacts WHERE workspace_id=? AND (?='' OR name LIKE CONCAT('%',?,'%') OR phone LIKE CONCAT('%',?,'%') OR email LIKE CONCAT('%',?,'%')) ORDER BY updated_at DESC",
    [ctx.workspace.id, search, search, search, search]
  );
  res.json(found.map(contactFromRow));
}
async function handleCreateContact(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const body = req.body ?? {};
  const name = text(body.name, 160);
  const phone = text(body.phone, 40);
  const email = body.email === undefined ? "" : optionalString(body.email, 320);
  if (
    !name ||
    !phone ||
    email === null ||
    !isPhone(phone) ||
    !isEmail(email ?? "")
  )
    return error(res, 400, "name, phone o email inválidos");
  if (body.consent !== undefined && typeof body.consent !== "boolean")
    return error(res, 400, "consent inválido");
  const tags = body.tags === undefined ? [] : readTags(body.tags);
  if (!tags) return error(res, 400, "tags inválidos");
  if (await demoQuotaReached(ctx, "etc_contacts", 100))
    return error(res, 429, "Límite de contactos demo alcanzado");
  const stage = body.stage === undefined ? "nuevo" : body.stage;
  const priority = body.priority === undefined ? "media" : body.priority;
  if (!validStage(stage) || !validPriority(priority))
    return error(res, 400, "stage o priority inválido");
  const id = randomUUID();
  await exec(
    "INSERT INTO etc_contacts (id,workspace_id,name,phone,email,stage,priority,tags,notes,consent) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      id,
      ctx.workspace.id,
      name,
      phone,
      email ?? "",
      stage,
      priority,
      JSON.stringify(tags),
      text(body.notes, 4000) ?? "",
      body.consent === true ? 1 : 0,
    ]
  );
  const found = await rows(
    "SELECT * FROM etc_contacts WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.status(201).json(contactFromRow(found[0]));
}
async function handlePatchContact(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const id = paramsId(req);
  const current = await rows(
    "SELECT * FROM etc_contacts WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  if (!current[0]) return error(res, 404, "Contacto no encontrado");
  const body = req.body ?? {};
  const fields: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    fields.push(`${column}=?`);
    values.push(value);
  };
  if (body.name !== undefined && !text(body.name, 160))
    return error(res, 400, "name inválido");
  if (
    body.phone !== undefined &&
    (!text(body.phone, 40) || !isPhone(text(body.phone, 40)!))
  )
    return error(res, 400, "phone inválido");
  if (body.stage !== undefined && !validStage(body.stage))
    return error(res, 400, "stage inválido");
  if (body.priority !== undefined && !validPriority(body.priority))
    return error(res, 400, "priority inválido");
  if (body.consent !== undefined && typeof body.consent !== "boolean")
    return error(res, 400, "consent inválido");
  const email =
    body.email === undefined ? undefined : optionalString(body.email, 320);
  if (email === null || (email !== undefined && !isEmail(email)))
    return error(res, 400, "email inválido");
  const tags = body.tags === undefined ? undefined : readTags(body.tags);
  if (tags === null) return error(res, 400, "tags inválidos");
  assign("name", body.name === undefined ? undefined : text(body.name, 160));
  assign("phone", body.phone === undefined ? undefined : text(body.phone, 40));
  assign("email", email);
  assign("stage", body.stage);
  assign("priority", body.priority);
  if (body.notes !== undefined) {
    const note = optionalString(body.notes, 4000);
    if (note === null) return error(res, 400, "notes inválidas");
    assign("notes", note ?? "");
  }
  if (body.consent !== undefined)
    assign("consent", body.consent === true ? 1 : 0);
  if (tags !== undefined) assign("tags", JSON.stringify(tags));
  const actualFields = fields.filter((_, index) => values[index] !== undefined);
  const actualValues = values.filter(value => value !== undefined);
  if (!actualFields.length) return res.json(contactFromRow(current[0]));
  await exec(
    `UPDATE etc_contacts SET ${actualFields.join(",")} WHERE id=? AND workspace_id=?`,
    [...actualValues, id, ctx.workspace.id]
  );
  const found = await rows(
    "SELECT * FROM etc_contacts WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.json(contactFromRow(found[0]));
}
async function handleExport(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const found = await rows(
    "SELECT * FROM etc_contacts WHERE workspace_id=? ORDER BY name",
    [ctx.workspace.id]
  );
  const lines = [
    [
      "id",
      "name",
      "phone",
      "email",
      "stage",
      "priority",
      "tags",
      "notes",
      "consent",
      "createdAt",
      "updatedAt",
    ].join(","),
  ];
  for (const contact of found.map(contactFromRow))
    lines.push(
      [
        contact.id,
        contact.name,
        contact.phone,
        contact.email,
        contact.stage,
        contact.priority,
        contact.tags.join(" "),
        contact.notes,
        contact.consent ? "true" : "false",
        contact.createdAt,
        contact.updatedAt,
      ]
        .map(csvCell)
        .join(",")
    );
  res
    .type("text/csv")
    .set("Content-Disposition", "attachment; filename=etc-contacts.csv")
    .send(`\ufeff${lines.join("\r\n")}\r\n`);
}

async function listConversations(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const found = await rows(
    `SELECT c.id,c.workspace_id,c.contact_id,c.last_inbound_at,c.unread_count,c.ai_paused,c.status,c.assigned_to,c.version,
    ct.id AS contact_row_id,ct.name AS contact_name,ct.phone AS contact_phone,ct.email AS contact_email,ct.stage AS contact_stage,ct.priority AS contact_priority,ct.tags AS contact_tags,ct.notes AS contact_notes,ct.consent AS contact_consent,ct.created_at AS contact_created_at,ct.updated_at AS contact_updated_at,
    (SELECT m.text FROM etc_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,(SELECT m.created_at FROM etc_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
    FROM etc_conversations c JOIN etc_contacts ct ON ct.id=c.contact_id AND ct.workspace_id=c.workspace_id WHERE c.workspace_id=? ORDER BY COALESCE(c.last_inbound_at,c.updated_at) DESC`,
    [ctx.workspace.id]
  );
  res.json(
    found.map(r => {
      const contact = contactFromRow({
        id: r.contact_row_id,
        name: r.contact_name,
        phone: r.contact_phone,
        email: r.contact_email,
        stage: r.contact_stage,
        priority: r.contact_priority,
        tags: r.contact_tags,
        notes: r.contact_notes,
        consent: r.contact_consent,
        created_at: r.contact_created_at,
        updated_at: r.contact_updated_at,
      });
      return conversationFromRow(r, contact);
    })
  );
}
async function getConversation(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const found = await conversationRow(ctx.workspace.id, paramsId(req));
  if (!found) return error(res, 404, "Conversación no encontrada");
  res.json({
    conversation: found.conversation,
    messages: await conversationMessages(found.conversation.id),
  });
}

type DemoMessageResult = {
  kind: "saved" | "existing" | "conflict" | "quota" | "closed";
  row?: DbRow;
};
async function persistDemoMessage(
  workspaceId: string,
  conversationId: string,
  source: "human" | "customer",
  value: string,
  clientId: string | null
): Promise<DemoMessageResult> {
  return transaction(async conn => {
    const [conversationRows] = await conn.query(
      "SELECT id,status FROM etc_conversations WHERE id=? AND workspace_id=? FOR UPDATE",
      [conversationId, workspaceId]
    );
    const conversation = (conversationRows as DbRow[])[0];
    if (!conversation) return { kind: "closed" };
    if (clientId) {
      const [existingRows] = await conn.query(
        "SELECT * FROM etc_messages WHERE conversation_id=? AND client_id=? LIMIT 1 FOR UPDATE",
        [conversationId, clientId]
      );
      const existing = (existingRows as DbRow[])[0];
      if (existing)
        return existing.role === source && String(existing.text) === value
          ? { kind: "existing", row: existing }
          : { kind: "conflict" };
    }
    if (conversation.status === "cerrada") return { kind: "closed" };
    const [countRows] = await conn.query(
      "SELECT COUNT(*) AS count FROM etc_messages WHERE conversation_id=?",
      [conversationId]
    );
    if (Number((countRows as DbRow[])[0]?.count ?? 0) >= 200)
      return { kind: "quota" };
    const id = randomUUID();
    const now = new Date();
    await conn.execute(
      "INSERT INTO etc_messages (id,conversation_id,role,text,status,client_id,created_at) VALUES (?,?,?,?,?,?,?)",
      [id, conversationId, source, value.slice(0, 12000), "demo", clientId, now]
    );
    if (source === "customer")
      await conn.execute(
        "UPDATE etc_conversations SET last_inbound_at=?,unread_count=unread_count+1,version=version+1 WHERE id=? AND workspace_id=?",
        [now, conversationId, workspaceId]
      );
    else
      await conn.execute(
        "UPDATE etc_conversations SET ai_paused=1,version=version+1 WHERE id=? AND workspace_id=?",
        [conversationId, workspaceId]
      );
    const [savedRows] = await conn.query(
      "SELECT * FROM etc_messages WHERE id=?",
      [id]
    );
    return { kind: "saved", row: (savedRows as DbRow[])[0] };
  });
}

type LiveReservation = {
  kind: "reserved" | "existing" | "blocked" | "conflict" | "closed" | "missing";
  row?: DbRow;
};
async function reserveLiveMessage(
  workspaceId: string,
  conversationId: string,
  value: string,
  clientId: string
): Promise<LiveReservation> {
  return transaction(async conn => {
    const [conversationRows] = await conn.query(
      "SELECT id,status FROM etc_conversations WHERE id=? AND workspace_id=? FOR UPDATE",
      [conversationId, workspaceId]
    );
    if (!(conversationRows as DbRow[])[0]) return { kind: "missing" };
    const conversation = (conversationRows as DbRow[])[0];
    if (conversation.status === "cerrada") return { kind: "closed" };
    const [existingRows] = await conn.query(
      "SELECT * FROM etc_messages WHERE conversation_id=? AND client_id=? LIMIT 1 FOR UPDATE",
      [conversationId, clientId]
    );
    const existing = (existingRows as DbRow[])[0];
    if (existing) {
      if (existing.role !== "human" || String(existing.text) !== value)
        return { kind: "conflict" };
      if (["sent", "delivered", "read"].includes(String(existing.status)))
        return { kind: "existing", row: existing };
      return { kind: "blocked", row: existing };
    }
    const id = randomUUID();
    await conn.execute(
      "INSERT INTO etc_messages (id,conversation_id,role,text,status,client_id) VALUES (?,?,?,?,?,?)",
      [id, conversationId, "human", value.slice(0, 12000), "pending", clientId]
    );
    await conn.execute(
      "UPDATE etc_conversations SET ai_paused=1,version=version+1 WHERE id=? AND workspace_id=?",
      [conversationId, workspaceId]
    );
    const [savedRows] = await conn.query(
      "SELECT * FROM etc_messages WHERE id=?",
      [id]
    );
    return { kind: "reserved", row: (savedRows as DbRow[])[0] };
  });
}
async function updateReservedMessage(
  workspaceId: string,
  conversationId: string,
  clientId: string,
  status: "sent" | "uncertain" | "failed",
  externalId: string | null
): Promise<DbRow | null> {
  return transaction(async conn => {
    const [messageRows] = await conn.query(
      "SELECT m.* FROM etc_messages m JOIN etc_conversations c ON c.id=m.conversation_id WHERE c.workspace_id=? AND c.id=? AND m.client_id=? LIMIT 1 FOR UPDATE",
      [workspaceId, conversationId, clientId]
    );
    const message = (messageRows as DbRow[])[0];
    if (!message) return null;
    if (String(message.status) === "pending")
      await conn.execute(
        "UPDATE etc_messages SET status=?,external_id=? WHERE id=?",
        [status, externalId, message.id]
      );
    const [updatedRows] = await conn.query(
      "SELECT * FROM etc_messages WHERE id=?",
      [message.id]
    );
    return (updatedRows as DbRow[])[0] ?? null;
  });
}

async function postLiveMessage(
  ctx: AuthContext,
  found: { conversation: ReturnType<typeof conversationFromRow>; raw: DbRow },
  value: string,
  clientId: string,
  res: Response
) {
  if (
    ctx.user.role !== "owner" ||
    process.env.WA_WORKSPACE_ID !== ctx.workspace.id ||
    !connectionInfo(ctx).enabled
  )
    return error(
      res,
      409,
      "La conexión real no está habilitada para este espacio"
    );
  if (!found.conversation.contact.consent)
    return error(res, 403, "El contacto no tiene consentimiento");
  if (!isWindowOpen(found.raw.last_inbound_at))
    return error(res, 409, "La ventana de atención de 24 horas está cerrada");
  const reservation = await reserveLiveMessage(
    ctx.workspace.id,
    found.conversation.id,
    value,
    clientId
  );
  if (reservation.kind === "missing")
    return error(res, 404, "Conversación no encontrada");
  if (reservation.kind === "conflict")
    return error(res, 409, "clientId ya fue usado con otro contenido");
  if (reservation.kind === "closed")
    return error(res, 409, "La conversación está cerrada");
  if (reservation.kind === "blocked")
    return error(
      res,
      409,
      "El mensaje ya está en proceso o tiene entrega incierta"
    );
  if (reservation.kind === "existing")
    return res.json(messageFromRow(reservation.row!));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let response: globalThis.Response;
  try {
    const version = process.env.WA_GRAPH_API_VERSION!;
    response = await fetch(
      `https://graph.facebook.com/${version}/${process.env.WA_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: found.conversation.contact.phone,
          type: "text",
          text: { body: value },
        }),
        signal: controller.signal,
      }
    );
  } catch {
    await updateReservedMessage(
      ctx.workspace.id,
      found.conversation.id,
      clientId,
      "uncertain",
      null
    );
    return error(res, 502, "No se pudo confirmar la entrega del mensaje");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const definitive = response.status >= 400 && response.status < 500;
    await updateReservedMessage(
      ctx.workspace.id,
      found.conversation.id,
      clientId,
      definitive ? "failed" : "uncertain",
      null
    );
    return error(
      res,
      502,
      definitive
        ? "El proveedor no aceptó el mensaje"
        : "No se pudo confirmar la entrega del mensaje"
    );
  }
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    await updateReservedMessage(
      ctx.workspace.id,
      found.conversation.id,
      clientId,
      "uncertain",
      null
    );
    return error(res, 502, "La respuesta del proveedor no pudo confirmarse");
  }
  const providerId = text(payload?.messages?.[0]?.id, 160);
  if (!providerId) {
    await updateReservedMessage(
      ctx.workspace.id,
      found.conversation.id,
      clientId,
      "uncertain",
      null
    );
    return error(res, 502, "La respuesta del proveedor no pudo confirmarse");
  }
  const externalId = createHash("sha256")
    .update(`${ctx.workspace.id}:${providerId}`)
    .digest("hex");
  const sent = await updateReservedMessage(
    ctx.workspace.id,
    found.conversation.id,
    clientId,
    "sent",
    externalId
  );
  if (!sent) return error(res, 502, "No se pudo guardar el estado del mensaje");
  return res.status(201).json(messageFromRow(sent));
}

async function postMessage(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const found = await conversationRow(ctx.workspace.id, paramsId(req));
  if (!found) return error(res, 404, "Conversación no encontrada");
  const body = req.body ?? {};
  const value = text(body.text, 12000);
  const source = body.source;
  if (!value || (source !== "human" && source !== "customer"))
    return error(res, 400, "text y source válido son obligatorios");
  if (source === "customer" && ctx.mode !== "demo")
    return error(res, 403, "Solo la demo puede simular entradas");
  const parsedClientId = readClientId(body.clientId);
  if (!parsedClientId.valid) return error(res, 400, "clientId inválido");
  if (source === "human" && ctx.mode === "live") {
    if (!parsedClientId.value)
      return error(res, 400, "clientId es obligatorio para mensajes reales");
    const existing = await scopedClientMessage(
      ctx.workspace.id,
      found.conversation.id,
      parsedClientId.value
    );
    if (existing) {
      if (existing.role !== "human" || String(existing.text) !== value)
        return error(res, 409, "clientId ya fue usado con otro contenido");
      if (["sent", "delivered", "read"].includes(String(existing.status)))
        return res.json(messageFromRow(existing));
      return error(
        res,
        409,
        "El mensaje ya está en proceso o tiene entrega incierta"
      );
    }
    return postLiveMessage(ctx, found, value, parsedClientId.value, res);
  }
  const result = await persistDemoMessage(
    ctx.workspace.id,
    found.conversation.id,
    source,
    value,
    parsedClientId.value
  );
  if (result.kind === "conflict")
    return error(res, 409, "clientId ya fue usado con otro contenido");
  if (result.kind === "quota")
    return error(res, 429, "Límite de mensajes demo alcanzado");
  if (result.kind === "closed")
    return error(res, 409, "La conversación está cerrada");
  return res
    .status(result.kind === "existing" ? 200 : 201)
    .json(messageFromRow(result.row!));
}

async function patchConversation(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const id = paramsId(req);
  const found = await conversationRow(ctx.workspace.id, id);
  if (!found) return error(res, 404, "Conversación no encontrada");
  const body = req.body ?? {};
  const fields: string[] = [];
  const values: unknown[] = [];
  let nextPaused = Boolean(found.raw.ai_paused);
  let nextStatus = String(found.raw.status);
  let changed = false;
  if (body.aiPaused !== undefined) {
    if (typeof body.aiPaused !== "boolean")
      return error(res, 400, "aiPaused inválido");
    nextPaused = body.aiPaused;
  }
  if (body.status !== undefined) {
    if (body.status !== "abierta" && body.status !== "cerrada")
      return error(res, 400, "status inválido");
    nextStatus = body.status;
  }
  if (nextStatus === "cerrada") nextPaused = true;
  if (nextPaused !== Boolean(found.raw.ai_paused)) {
    fields.push("ai_paused=?");
    values.push(nextPaused ? 1 : 0);
    changed = true;
  }
  if (nextStatus !== String(found.raw.status)) {
    fields.push("status=?");
    values.push(nextStatus);
    changed = true;
  }
  if (body.assignedTo !== undefined) {
    const assigned = optionalString(body.assignedTo, 160);
    if (assigned === null || !assigned)
      return error(res, 400, "assignedTo inválido");
    if (assigned !== String(found.raw.assigned_to ?? "")) {
      fields.push("assigned_to=?");
      values.push(assigned);
      changed = true;
    }
  }
  if (changed) fields.push("version=version+1");
  if (!fields.length) return res.json(found.conversation);
  await exec(
    `UPDATE etc_conversations SET ${fields.join(",")} WHERE id=? AND workspace_id=?`,
    [...values, id, ctx.workspace.id]
  );
  const current = await conversationRow(ctx.workspace.id, id);
  res.json(current!.conversation);
}

async function ingestSimulation(
  workspaceId: string,
  conversationId: string,
  input: string,
  clientId: string | null
): Promise<DemoMessageResult> {
  return transaction(async conn => {
    const [conversationRows] = await conn.query(
      "SELECT id,status FROM etc_conversations WHERE id=? AND workspace_id=? FOR UPDATE",
      [conversationId, workspaceId]
    );
    const conversation = (conversationRows as DbRow[])[0];
    if (!conversation) return { kind: "closed" };
    if (conversation.status === "cerrada") return { kind: "closed" };
    if (clientId) {
      const [existingRows] = await conn.query(
        "SELECT * FROM etc_messages WHERE conversation_id=? AND client_id=? LIMIT 1 FOR UPDATE",
        [conversationId, clientId]
      );
      const existing = (existingRows as DbRow[])[0];
      if (existing)
        return existing.role === "customer" && String(existing.text) === input
          ? { kind: "existing", row: existing }
          : { kind: "conflict" };
    }
    const [countRows] = await conn.query(
      "SELECT COUNT(*) AS count FROM etc_messages WHERE conversation_id=?",
      [conversationId]
    );
    if (Number((countRows as DbRow[])[0]?.count ?? 0) >= 200)
      return { kind: "quota" };
    const id = randomUUID();
    const now = new Date();
    await conn.execute(
      "INSERT INTO etc_messages (id,conversation_id,role,text,status,client_id,created_at) VALUES (?,?,?,?,?,?,?)",
      [
        id,
        conversationId,
        "customer",
        input.slice(0, 12000),
        "demo",
        clientId,
        now,
      ]
    );
    await conn.execute(
      "UPDATE etc_conversations SET last_inbound_at=?,unread_count=unread_count+1,version=version+1 WHERE id=? AND workspace_id=?",
      [now, conversationId, workspaceId]
    );
    const [savedRows] = await conn.query(
      "SELECT * FROM etc_messages WHERE id=?",
      [id]
    );
    return { kind: "saved", row: (savedRows as DbRow[])[0] };
  });
}

async function suggestion(req: EtcRequest, res: Response, simulate: boolean) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  if (simulate && ctx.mode !== "demo")
    return error(res, 403, "La simulación solo está disponible en demo");
  let found = await conversationRow(ctx.workspace.id, paramsId(req));
  if (!found) return error(res, 404, "Conversación no encontrada");
  if (simulate && found.conversation.status === "cerrada")
    return error(res, 409, "La conversación está cerrada");
  const body = req.body ?? {};
  const parsedClientId = readClientId(body.clientId);
  if (!parsedClientId.valid) return error(res, 400, "clientId inválido");
  const input = simulate
    ? text(body.text, 12000)
    : ((await conversationMessages(found.conversation.id))
        .filter(m => m.role === "customer")
        .at(-1)?.text ?? "");
  if (!input) return error(res, 400, "text es obligatorio");
  if (simulate) {
    const ingested = await ingestSimulation(
      ctx.workspace.id,
      found.conversation.id,
      input,
      parsedClientId.value
    );
    if (ingested.kind === "conflict")
      return error(res, 409, "clientId ya fue usado con otro contenido");
    if (ingested.kind === "quota")
      return error(res, 429, "Límite de mensajes demo alcanzado");
    if (ingested.kind === "closed")
      return error(res, 409, "La conversación está cerrada");
    if (ingested.kind === "existing")
      return res.json({
        messages: await conversationMessages(found.conversation.id),
        suggestion: null,
      });
    found = (await conversationRow(ctx.workspace.id, found.conversation.id))!;
    if (found.conversation.aiPaused || !ctx.workspace.autoReply)
      return res.json({
        messages: await conversationMessages(found.conversation.id),
        suggestion: null,
      });
  }
  const startVersion = Number(found.raw.version);
  if (!(await consumeAi(ctx.workspace.id))) {
    const fallback = faqFallback(
      input,
      await knowledgeFor(ctx.workspace.id),
      "Límite diario de IA alcanzado; se usa contenido aprobado."
    );
    return res.json(
      simulate
        ? {
            messages: await conversationMessages(found.conversation.id),
            suggestion: { ...fallback, remainingAI: 0 },
          }
        : { ...fallback, remainingAI: 0 }
    );
  }
  const messages = await conversationMessages(found.conversation.id);
  const history: AiTurn[] = messages
    .slice(-8)
    .filter(
      message =>
        message.role === "customer" ||
        message.role === "human" ||
        message.role === "ai"
    )
    .map(message => ({
      role: message.role as AiTurn["role"],
      text: message.text,
    }));
  const profile: AiProfile = {
    name: ctx.workspace.name,
    agentName: ctx.workspace.agentName,
    tone: ctx.workspace.tone,
    description: ctx.workspace.description,
  };
  const result = await generateSuggestion(
    input,
    history,
    await knowledgeFor(ctx.workspace.id),
    profile,
    ctx.workspace.id,
    req.headers['accept-language']?.toString().startsWith('en') ? 'en' : 'es'
  );
  if (simulate) {
    const persisted = await transaction(async conn => {
      const [lockedRows] = await conn.query(
        "SELECT ai_paused,version,status FROM etc_conversations WHERE id=? AND workspace_id=? FOR UPDATE",
        [found!.conversation.id, ctx.workspace.id]
      );
      const row = (lockedRows as DbRow[])[0];
      if (
        !row ||
        !canPersistAiReply(
          startVersion,
          Number(row.version),
          Boolean(row.ai_paused),
          String(row.status)
        )
      )
        return false;
      const persistedText = result.handoff ? (req.headers['accept-language']?.toString().startsWith('en') ? 'I do not have an approved answer for that. This conversation needs human review.' : HANDOFF_TEXT) : result.text;
      await conn.execute(
        "INSERT INTO etc_messages (id,conversation_id,role,text,status) VALUES (?,?,?,?,?)",
        [randomUUID(), found!.conversation.id, "ai", persistedText, "demo"]
      );
      if (result.handoff)
        await conn.execute(
          "UPDATE etc_conversations SET ai_paused=1,version=version+1 WHERE id=? AND workspace_id=?",
          [found!.conversation.id, ctx.workspace.id]
        );
      else
        await conn.execute(
          "UPDATE etc_conversations SET version=version+1 WHERE id=? AND workspace_id=?",
          [found!.conversation.id, ctx.workspace.id]
        );
      return true;
    });
    if (!persisted)
      return res.json({
        messages: await conversationMessages(found.conversation.id),
        suggestion: null,
      });
    const responseResult = result.handoff
      ? { ...result, text: HANDOFF_TEXT }
      : result;
    return res.json({
      messages: await conversationMessages(found.conversation.id),
      suggestion: {
        ...responseResult,
        remainingAI: await remainingAi(ctx.workspace.id),
      },
    });
  }
  res.json({ ...result, remainingAI: await remainingAi(ctx.workspace.id) });
}

async function knowledgeList(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  res.json(await knowledgeFor(ctx.workspace.id));
}
async function knowledgeCreate(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const title = text(req.body?.title, 200);
  const content = text(req.body?.content, 12000);
  if (!title || !content || typeof req.body?.approved !== "boolean")
    return error(res, 400, "title, content y approved son obligatorios");
  if (await demoQuotaReached(ctx, "etc_knowledge", 30))
    return error(res, 429, "Límite de conocimiento demo alcanzado");
  const id = randomUUID();
  await exec(
    "INSERT INTO etc_knowledge (id,workspace_id,title,content,approved) VALUES (?,?,?,?,?)",
    [id, ctx.workspace.id, title, content, req.body.approved ? 1 : 0]
  );
  const found = await rows(
    "SELECT * FROM etc_knowledge WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.status(201).json(knowledgeFromRow(found[0]));
}
async function knowledgePatch(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const id = paramsId(req);
  const current = await rows(
    "SELECT * FROM etc_knowledge WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  if (!current[0]) return error(res, 404, "Conocimiento no encontrado");
  const body = req.body ?? {};
  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.title !== undefined) {
    const value = text(body.title, 200);
    if (!value) return error(res, 400, "title inválido");
    fields.push("title=?");
    values.push(value);
  }
  if (body.content !== undefined) {
    const value = text(body.content, 12000);
    if (!value) return error(res, 400, "content inválido");
    fields.push("content=?");
    values.push(value);
  }
  if (body.approved !== undefined) {
    if (typeof body.approved !== "boolean")
      return error(res, 400, "approved inválido");
    fields.push("approved=?");
    values.push(body.approved ? 1 : 0);
  }
  if (fields.length)
    await exec(
      `UPDATE etc_knowledge SET ${fields.join(",")} WHERE id=? AND workspace_id=?`,
      [...values, id, ctx.workspace.id]
    );
  const found = await rows(
    "SELECT * FROM etc_knowledge WHERE id=? AND workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.json(knowledgeFromRow(found[0]));
}
async function knowledgeDelete(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const result = await exec(
    "DELETE FROM etc_knowledge WHERE id=? AND workspace_id=?",
    [paramsId(req), ctx.workspace.id]
  );
  if (!result.affectedRows)
    return error(res, 404, "Conocimiento no encontrado");
  res.json({ ok: true });
}

async function listTasks(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const found = await rows(
    "SELECT t.*,c.name AS contact_name FROM etc_tasks t LEFT JOIN etc_contacts c ON c.id=t.contact_id AND c.workspace_id=t.workspace_id WHERE t.workspace_id=? ORDER BY t.completed,t.due_at",
    [ctx.workspace.id]
  );
  res.json(found.map(taskFromRow));
}
async function createTask(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const title = text(req.body?.title, 240);
  const dueAt = dateValue(req.body?.dueAt);
  if (!title || !dueAt)
    return error(res, 400, "title y dueAt son obligatorios");
  if (await demoQuotaReached(ctx, "etc_tasks", 100))
    return error(res, 429, "Límite de tareas demo alcanzado");
  const contactId =
    req.body?.contactId == null ? null : text(req.body.contactId, 64);
  if (
    contactId &&
    !(
      await rows("SELECT id FROM etc_contacts WHERE id=? AND workspace_id=?", [
        contactId,
        ctx.workspace.id,
      ])
    ).length
  )
    return error(res, 404, "Contacto no encontrado");
  const id = randomUUID();
  await exec(
    "INSERT INTO etc_tasks (id,workspace_id,contact_id,title,due_at,completed) VALUES (?,?,?,?,?,0)",
    [id, ctx.workspace.id, contactId, title, dueAt]
  );
  const found = await rows(
    "SELECT t.*,c.name AS contact_name FROM etc_tasks t LEFT JOIN etc_contacts c ON c.id=t.contact_id AND c.workspace_id=t.workspace_id WHERE t.id=? AND t.workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.status(201).json(taskFromRow(found[0]));
}
async function patchTask(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const id = paramsId(req);
  const current = await rows(
    "SELECT t.*,c.name AS contact_name FROM etc_tasks t LEFT JOIN etc_contacts c ON c.id=t.contact_id AND c.workspace_id=t.workspace_id WHERE t.id=? AND t.workspace_id=?",
    [id, ctx.workspace.id]
  );
  if (!current[0]) return error(res, 404, "Tarea no encontrada");
  const body = req.body ?? {};
  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean")
      return error(res, 400, "completed inválido");
    fields.push("completed=?");
    values.push(body.completed ? 1 : 0);
  }
  if (body.title !== undefined) {
    const value = text(body.title, 240);
    if (!value) return error(res, 400, "title inválido");
    fields.push("title=?");
    values.push(value);
  }
  if (body.dueAt !== undefined) {
    const value = dateValue(body.dueAt);
    if (!value) return error(res, 400, "dueAt inválido");
    fields.push("due_at=?");
    values.push(value);
  }
  if (fields.length)
    await exec(
      `UPDATE etc_tasks SET ${fields.join(",")} WHERE id=? AND workspace_id=?`,
      [...values, id, ctx.workspace.id]
    );
  const found = await rows(
    "SELECT t.*,c.name AS contact_name FROM etc_tasks t LEFT JOIN etc_contacts c ON c.id=t.contact_id AND c.workspace_id=t.workspace_id WHERE t.id=? AND t.workspace_id=?",
    [id, ctx.workspace.id]
  );
  res.json(taskFromRow(found[0]));
}

async function patchWorkspace(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx || !requireOwner(ctx, res)) return;
  const body = req.body ?? {};
  const fields: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    fields.push(`${column}=?`);
    values.push(value);
  };
  if (body.name !== undefined) {
    const v = text(body.name, 160);
    if (!v) return error(res, 400, "name inválido");
    assign("name", v);
  }
  if (body.segment !== undefined) {
    if (!validSegment(body.segment)) return error(res, 400, "segment inválido");
    assign("segment", body.segment);
  }
  if (body.businessType !== undefined) {
    if (!isBusinessType(body.businessType)) return error(res, 400, 'Tipo de negocio inválido');
    assign('business_type', body.businessType);
  }
  if (body.agentName !== undefined) {
    const v = text(body.agentName, 120);
    if (!v) return error(res, 400, "agentName inválido");
    assign("agent_name", v);
  }
  if (body.tone !== undefined) {
    const v = text(body.tone, 120);
    if (!v) return error(res, 400, "tone inválido");
    assign("tone", v);
  }
  if (body.description !== undefined) {
    const v = optionalString(body.description, 2000);
    if (v === null) return error(res, 400, "description inválida");
    assign("description", v ?? "");
  }
  if (body.primaryColor !== undefined) {
    const v = text(body.primaryColor, 16);
    if (!isHexColor(v)) return error(res, 400, "primaryColor inválido");
    assign("primary_color", v!.trim());
  }
  if (body.autoReply !== undefined) {
    if (typeof body.autoReply !== "boolean")
      return error(res, 400, "autoReply inválido");
    assign("auto_reply", body.autoReply ? 1 : 0);
  }
  if (fields.length)
    await exec(
      `UPDATE etc_workspaces SET ${fields.join(",")} WHERE id=? AND (mode='demo' OR owner_user_id=?)`,
      [...values, ctx.workspace.id, ctx.userId]
    );
  const found = await getWorkspace(ctx.workspace.id);
  if (!found) return error(res, 404, "Workspace no encontrado");
  res.json(publicWorkspace(found));
}
async function workspacePreset(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx || !requireOwner(ctx, res)) return;
  const segment = req.body?.segment;
  if (!validSegment(segment)) return error(res, 400, "segment inválido");
  const profile: Record<
    Segment,
    {
      name: string;
      agentName: string;
      tone: string;
      description: string;
      color: string;
      title: string;
      content: string;
    }
  > = {
    inmobiliaria: {
      name: "Casa Norte",
      agentName: "Clara",
      tone: "Cercana y profesional",
      description: "Atención para una agencia inmobiliaria.",
      color: "#1B4079",
      title: "Horarios de visita",
      content: "Coordinamos visitas de lunes a sábado con confirmación previa.",
    },
    educacion: {
      name: "Aula Abierta",
      agentName: "Nora",
      tone: "Clara y paciente",
      description: "Perfil para una institución educativa.",
      color: "#4D7C8A",
      title: "Información de inscripción",
      content:
        "Compartimos requisitos y próximos pasos después de confirmar el programa.",
    },
    retail: {
      name: "Tienda Centro",
      agentName: "Iris",
      tone: "Ágil y útil",
      description: "Perfil para un comercio.",
      color: "#8FAD88",
      title: "Cambios y devoluciones",
      content:
        "Revisamos cada caso con el comprobante y las condiciones vigentes.",
    },
    servicios: {
      name: "Servicios Punto",
      agentName: "Leo",
      tone: "Directa y tranquila",
      description: "Perfil para un negocio de servicios.",
      color: "#7F9C96",
      title: "Solicitud de presupuesto",
      content: "Recogemos los datos básicos y una persona confirma el alcance.",
    },
    financieros: {
      name: 'Servicios Financieros', agentName: 'Sara', tone: 'Clara, prudente y profesional', description: 'Atención y seguimiento administrativo de solicitudes. Sin asesoría de inversión ni decisiones crediticias.', color: '#4D7C8A', title: 'Seguimiento de solicitudes', content: 'Una persona autorizada confirma los requisitos y próximos pasos. No se aprueban créditos ni se recomiendan inversiones automáticamente.',
    },
    pymes: {
      name: 'Mi Negocio', agentName: 'Alex', tone: 'Cercana y práctica', description: 'Configura el tipo de PYME para organizar clientes, citas y seguimientos.', color: '#8FAD88', title: 'Atención de tu negocio', content: 'Los horarios, servicios y políticas deben revisarse y aprobarse por el negocio antes de responder.',
    },
  };
  const p = profile[segment];
  await exec(
    "UPDATE etc_workspaces SET segment=?,name=?,agent_name=?,tone=?,description=?,primary_color=? WHERE id=? AND (mode='demo' OR owner_user_id=?)",
    [
      segment,
      p.name,
      p.agentName,
      p.tone,
      p.description,
      p.color,
      ctx.workspace.id,
      ctx.userId,
    ]
  );
  const existing = await rows(
    "SELECT id FROM etc_knowledge WHERE workspace_id=? AND title=? LIMIT 1",
    [ctx.workspace.id, p.title]
  );
  if (!existing.length)
    await exec(
      "INSERT INTO etc_knowledge (id,workspace_id,title,content,approved) VALUES (?,?,?,?,?)",
      [
        randomUUID(),
        ctx.workspace.id,
        p.title,
        p.content,
        ctx.mode === "demo" ? 1 : 0,
      ]
    );
  const updated = await getWorkspace(ctx.workspace.id);
  if (!updated) return error(res, 404, "Workspace no encontrado");
  res.json(publicWorkspace(updated));
}
async function connection(req: EtcRequest, res: Response) {
  const ctx = requireCtx(req, res);
  if (!ctx) return;
  const missing = ctx.mode === "demo" ? [] : webhookMissing();
  res.json({
    ...connectionInfo(ctx),
    missing,
    workspaceId: ctx.workspace.id,
    webhookPath: "/api/etc/whatsapp/webhook",
  });
}

function validSignature(raw: Buffer, signature: unknown, secret: string) {
  if (typeof signature !== "string" || !signature.startsWith("sha256="))
    return false;
  const actual = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(raw).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const webhookWorkspace = async () => {
  const id = process.env.WA_WORKSPACE_ID;
  if (
    !id ||
    webhookMissing().length ||
    process.env.ETC_LIVE_WHATSAPP_ENABLED !== "true"
  )
    return null;
  const workspace = await getWorkspace(id);
  return workspace?.ownerUserId != null && workspace ? workspace : null;
};
function inboundDate(message: any): Date | null {
  const raw = message?.timestamp;
  if (
    (typeof raw !== "number" && typeof raw !== "string") ||
    String(raw).trim() === ""
  )
    return null;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now())
    return null;
  return date;
}
async function storeInbound(
  workspaceId: string,
  message: any
): Promise<"stored" | "duplicate" | "ignored"> {
  const externalId = text(message?.id, 160);
  const from = text(message?.from, 40);
  const createdAt = inboundDate(message);
  if (!externalId || !from || !createdAt) return "ignored";
  const externalKey = createHash("sha256")
    .update(`${workspaceId}:${externalId}`)
    .digest("hex");
  const body =
    text(message?.text?.body, 12000) ??
    `[Mensaje recibido: ${text(message?.type, 40) ?? "desconocido"}]`;
  try {
    await transaction(async conn => {
      const [duplicate] = await conn.query(
        "SELECT m.id FROM etc_messages m JOIN etc_conversations c ON c.id=m.conversation_id WHERE m.external_id=? AND c.workspace_id=? LIMIT 1",
        [externalKey, workspaceId]
      );
      if ((duplicate as DbRow[]).length) return;
      const [existingContact] = await conn.query(
        "SELECT * FROM etc_contacts WHERE workspace_id=? ORDER BY created_at",
        [workspaceId]
      );
      const contacts = existingContact as DbRow[];
      let contact = contacts.find(
        row => normalizedPhone(String(row.phone)) === normalizedPhone(from)
      );
      let contactId = contact?.id as string | undefined;
      if (!contactId) {
        contactId = randomUUID();
        await conn.execute(
          "INSERT INTO etc_contacts (id,workspace_id,name,phone,email,stage,priority,tags,notes,consent) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            contactId,
            workspaceId,
            from,
            from,
            "",
            "nuevo",
            "media",
            "[]",
            "Contacto creado por entrada recibida.",
            0,
          ]
        );
      }
      const [existingConversation] = await conn.query(
        "SELECT id FROM etc_conversations WHERE workspace_id=? AND contact_id=? LIMIT 1",
        [workspaceId, contactId]
      );
      let conversationId = (existingConversation as DbRow[])[0]?.id as
        | string
        | undefined;
      if (!conversationId) {
        conversationId = randomUUID();
        await conn.execute(
          "INSERT INTO etc_conversations (id,workspace_id,contact_id,last_inbound_at,unread_count,ai_paused,status,assigned_to,version) VALUES (?,?,?,?,?,?,?,?,0)",
          [
            conversationId,
            workspaceId,
            contactId,
            createdAt,
            1,
            0,
            "abierta",
            "",
          ]
        );
      } else
        await conn.execute(
          "UPDATE etc_conversations SET last_inbound_at=CASE WHEN last_inbound_at IS NULL OR last_inbound_at < ? THEN ? ELSE last_inbound_at END,unread_count=unread_count+1,version=version+1 WHERE id=? AND workspace_id=?",
          [createdAt, createdAt, conversationId, workspaceId]
        );
      await conn.execute(
        "INSERT INTO etc_messages (id,conversation_id,role,text,status,external_id,created_at) VALUES (?,?,?,?,?,?,?)",
        [
          randomUUID(),
          conversationId,
          "customer",
          body,
          "received",
          externalKey,
          createdAt,
        ]
      );
    });
    return "stored";
  } catch (caught: any) {
    if (caught?.code === "ER_DUP_ENTRY") return "duplicate";
    throw caught;
  }
}
const statusRank: Record<string, number> = { sent: 1, delivered: 2, read: 3 };
function statusDate(value: unknown): Date | null {
  if (value === undefined || value === null) return new Date();
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const date = new Date(n * 1000);
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now()
    ? date
    : null;
}
async function updateOutboundStatus(
  workspaceId: string,
  providerId: unknown,
  status: unknown,
  timestamp: unknown
) {
  const id = text(providerId, 160);
  if (
    !id ||
    typeof status !== "string" ||
    !["sent", "delivered", "read", "failed"].includes(status) ||
    !statusDate(timestamp)
  )
    return;
  const externalKey = createHash("sha256")
    .update(`${workspaceId}:${id}`)
    .digest("hex");
  await transaction(async conn => {
    const [foundRows] = await conn.query(
      "SELECT m.id,m.status FROM etc_messages m JOIN etc_conversations c ON c.id=m.conversation_id WHERE c.workspace_id=? AND m.external_id=? LIMIT 1 FOR UPDATE",
      [workspaceId, externalKey]
    );
    const found = (foundRows as DbRow[])[0];
    if (!found) return;
    const current = String(found.status);
    const allowed =
      status === "failed"
        ? ["sent", "delivered"]
        : status === "sent"
          ? []
          : ["sent", "delivered"];
    if (
      allowed.includes(current) &&
      (status === "failed" ||
        (statusRank[status] ?? 0) > (statusRank[current] ?? 0))
    )
      await conn.execute("UPDATE etc_messages SET status=? WHERE id=?", [
        status,
        found.id,
      ]);
  });
}
async function webhookGet(req: Request, res: Response) {
  const missing = webhookMissing();
  if (missing.length || process.env.ETC_LIVE_WHATSAPP_ENABLED !== "true")
    return error(res, 503, "Conexión pendiente");
  const query = req.query as Record<string, string>;
  if (
    query["hub.verify_token"] !== process.env.WA_VERIFY_TOKEN ||
    query["hub.mode"] !== "subscribe" ||
    !query["hub.challenge"]
  )
    return error(res, 403, "Verificación rechazada");
  res.type("text/plain").send(query["hub.challenge"]);
}
async function webhookPost(req: Request, res: Response) {
  const missing = webhookMissing();
  if (missing.length || process.env.ETC_LIVE_WHATSAPP_ENABLED !== "true")
    return error(res, 503, "Conexión pendiente");
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  if (
    !validSignature(
      raw,
      req.headers["x-hub-signature-256"],
      process.env.META_APP_SECRET!
    )
  )
    return error(res, 403, "Firma inválida");
  let payload: any;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return error(res, 400, "JSON inválido");
  }
  const workspace = await webhookWorkspace();
  if (!workspace) return error(res, 409, "Workspace de conexión inválido");
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : [])
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value;
      if (value?.metadata?.phone_number_id !== process.env.WA_PHONE_NUMBER_ID)
        return error(res, 403, "Origen no autorizado");
      for (const status of Array.isArray(value?.statuses) ? value.statuses : [])
        await updateOutboundStatus(
          workspace.id,
          status?.id,
          status?.status,
          status?.timestamp
        );
      for (const message of Array.isArray(value?.messages)
        ? value.messages
        : [])
        await storeInbound(workspace.id, message);
    }
  res.status(200).json({ received: true });
}

export function registerEtcRoutes(app: Express): void {
  const router = Router();
  router.post("/demo", express.json({ limit: "64kb" }), asyncRoute(handleDemo));
  router.get("/whatsapp/webhook", asyncRoute(webhookGet as any));
  router.post(
    "/whatsapp/webhook",
    express.raw({ type: "*/*", limit: "2mb" }),
    asyncRoute(webhookPost as any)
  );
  router.use(express.json({ limit: "1mb" }));
  router.use(
    asyncRoute(async (req, res, next) => {
      try {
        req.etc = await authContext(req);
        next();
      } catch {
        error(res, 401, "Autenticación requerida");
      }
    })
  );
  router.use(requireWorkspaceIntent);
  registerConsultationRoutes(router);
  registerLlmConfigRoutes(router);
  router.get("/session", asyncRoute(handleSession));
  router.get("/stats", asyncRoute(handleStats));
  router.get("/connection", asyncRoute(connection));
  router.get("/contacts/export", asyncRoute(handleExport));
  router.get("/contacts", asyncRoute(handleContacts));
  router.post("/contacts", asyncRoute(handleCreateContact));
  router.patch("/contacts/:id", asyncRoute(handlePatchContact));
  router.get("/conversations", asyncRoute(listConversations));
  router.get("/conversations/:id", asyncRoute(getConversation));
  router.post("/conversations/:id/messages", asyncRoute(postMessage));
  router.patch("/conversations/:id", asyncRoute(patchConversation));
  router.post(
    "/conversations/:id/suggest",
    asyncRoute((req, res) => suggestion(req, res, false))
  );
  router.post(
    "/conversations/:id/simulate",
    asyncRoute((req, res) => suggestion(req, res, true))
  );
  router.get("/knowledge", asyncRoute(knowledgeList));
  router.post("/knowledge", asyncRoute(knowledgeCreate));
  router.patch("/knowledge/:id", asyncRoute(knowledgePatch));
  router.delete("/knowledge/:id", asyncRoute(knowledgeDelete));
  router.get("/tasks", asyncRoute(listTasks));
  router.post("/tasks", asyncRoute(createTask));
  router.patch("/tasks/:id", asyncRoute(patchTask));
  router.patch("/workspace", asyncRoute(patchWorkspace));
  router.post("/workspace/preset", asyncRoute(workspacePreset));
  router.use(
    (caught: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) return next(caught);
      const status =
        typeof caught === "object" && caught !== null && "status" in caught
          ? Number((caught as { status?: unknown }).status)
          : 0;
      if (
        status === 413 ||
        (typeof caught === "object" &&
          caught !== null &&
          "type" in caught &&
          (caught as { type?: unknown }).type === "entity.too.large")
      )
        return res.status(413).json({ error: "Solicitud demasiado grande." });
      if (caught instanceof SyntaxError || status === 400)
        return res.status(400).json({ error: "JSON inválido." });
      return res
        .status(500)
        .json({ error: "No se pudo completar la solicitud." });
    }
  );
  app.use("/api/etc", router);
}
