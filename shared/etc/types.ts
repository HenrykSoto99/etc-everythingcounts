import type { BusinessType } from './segments';

export type Segment = "inmobiliaria" | "educacion" | "retail" | "servicios" | "financieros" | "pymes";
export type Stage =
  | "nuevo"
  | "en_atencion"
  | "calificado"
  | "ganado"
  | "perdido";
export type Priority = "baja" | "media" | "alta";
export type Workspace = {
  id: string;
  name: string;
  segment: Segment;
  businessType?: BusinessType;
  agentName: string;
  tone: string;
  description: string;
  primaryColor: string;
  autoReply: boolean;
};
export type Session = {
  mode: "demo" | "live";
  workspace: Workspace;
  user: { name: string; role: "owner" | "agent" };
  connection: {
    configured: boolean;
    enabled: boolean;
    phoneMasked: string | null;
  };
  limits: { remainingAI: number };
};
export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  stage: Stage;
  priority: Priority;
  tags: string[];
  notes: string;
  consent: boolean;
  createdAt: string;
  updatedAt: string;
};
export type Conversation = {
  id: string;
  contactId: string;
  contact: Contact;
  lastMessage: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  aiPaused: boolean;
  status: "abierta" | "cerrada";
  assignedTo: string;
  windowOpen: boolean;
};
export type Message = {
  id: string;
  conversationId: string;
  role: "customer" | "human" | "ai" | "system";
  text: string;
  status:
    | "received"
    | "demo"
    | "pending"
    | "uncertain"
    | "sent"
    | "delivered"
    | "read"
    | "failed";
  createdAt: string;
};
export type Knowledge = {
  id: string;
  title: string;
  content: string;
  approved: boolean;
  updatedAt: string;
};
export type Task = {
  id: string;
  contactId: string | null;
  title: string;
  dueAt: string;
  completed: boolean;
  contactName: string | null;
};
export type Stats = {
  contacts: number;
  openConversations: number;
  qualified: number;
  pendingTasks: number;
  byStage: Record<Stage, number>;
  activity: { id: string; text: string; createdAt: string }[];
};
export type Suggestion = {
  text: string;
  mode: "llm" | "fallback";
  handoff: boolean;
  remainingAI: number;
  reason?: string;
};
