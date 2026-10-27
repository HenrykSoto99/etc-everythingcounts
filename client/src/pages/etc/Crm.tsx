import "./crm.css";

import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookMarked,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  GripVertical,
  Hand,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  Link2,
  ListTodo,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  UserRoundPlus,
  UsersRound,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { startLogin } from "@/const";
import { COOKIE_NAME } from "@shared/const";
import { getAccountToken, logoutAccount } from "@/lib/etc-account";
import Brand from "@/components/etc/Brand";
import BrandAttribution from "@/components/etc/BrandAttribution";
import PreferencesControl from "@/components/etc/PreferencesControl";
import { useI18n, translate } from "@/contexts/I18nContext";
import type {
  Contact,
  Conversation,
  Knowledge,
  Message,
  Priority,
  Segment,
  Session,
  Stage,
  Stats,
  Suggestion,
  Task,
  Workspace,
} from "@shared/etc/types";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_NAMES,
  SEGMENT_NAMES,
  SEGMENTS,
  type BusinessType,
} from "@shared/etc/segments";
import {
  AddButton,
  Avatar,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Modal,
  Panel,
  SearchField,
  SectionHeading,
  initials,
} from "@/components/etc/crm/CrmPrimitives";

type CrmMode = "demo" | "live";
type SectionKey =
  | "overview"
  | "inbox"
  | "pipeline"
  | "contacts"
  | "knowledge"
  | "consultations"
  | "followups"
  | "settings";

type ApiClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  download: (path: string) => Promise<Blob>;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const DEMO_TOKEN_KEY = "etc-demo-token";
let inMemoryDemoToken: string | null = null;

function getStorage(key: string) {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored) {
      if (key === DEMO_TOKEN_KEY) inMemoryDemoToken = stored;
      return stored;
    }
  } catch {
    // Fall back to the volatile token below when sessionStorage is denied.
  }
  return key === DEMO_TOKEN_KEY ? inMemoryDemoToken : null;
}

function setStorage(key: string, value: string) {
  if (key === DEMO_TOKEN_KEY) inMemoryDemoToken = value;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Keep the volatile anonymous demo token when storage is unavailable.
  }
}

function removeStorage(key: string) {
  if (key === DEMO_TOKEN_KEY) inMemoryDemoToken = null;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function useEtcApi(
  mode: CrmMode,
  segment: Segment,
  language: "es" | "en"
): ApiClient {
  const tokenKey = DEMO_TOKEN_KEY;
  const recoveryAttempted = useRef(false);
  const demoCreation = useRef<Promise<string> | null>(null);

  const createDemo = useCallback(async () => {
    const existing = getStorage(tokenKey);
    if (existing) return existing;
    if (demoCreation.current) return demoCreation.current;

    demoCreation.current = (async () => {
      const response = await fetch("/api/etc/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": language,
          "X-ETC-Intent": "workspace",
        },
        body: JSON.stringify({ segment }),
      });
      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "No se pudo iniciar la demo.";
        throw new ApiError(
          translate(message, undefined, language),
          response.status
        );
      }
      const nextToken =
        typeof payload === "object" &&
        payload &&
        "token" in payload &&
        typeof payload.token === "string"
          ? payload.token
          : "";
      if (!nextToken)
        throw new ApiError("La sesión demo no devolvió un token válido.", 502);
      setStorage(tokenKey, nextToken);
      return nextToken;
    })();

    try {
      return await demoCreation.current;
    } finally {
      demoCreation.current = null;
    }
  }, [segment]);

  const rawRequest = useCallback(
    async <T,>(
      path: string,
      init: RequestInit = {},
      asBlob = false
    ): Promise<T> => {
      const headers = new Headers(init.headers);
      headers.set(
        "Accept",
        asBlob ? "text/csv, application/octet-stream" : "application/json"
      );
      headers.set("Accept-Language", language);
      headers.set("X-ETC-Intent", "workspace");
      if (init.body && !headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
      if (mode === "demo") {
        const token = getStorage(tokenKey);
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } else {
        const accountToken = getAccountToken();
        if (accountToken)
          headers.set("Authorization", `Bearer ${accountToken}`);
        try {
          const raw = window.sessionStorage.getItem("manus-cookie");
          const prefix = `${COOKIE_NAME}=`;
          const pair = raw
            ?.split(";")
            .find(value => value.trim().startsWith(prefix));
          const previewToken = pair?.trim().slice(prefix.length);
          if (previewToken && !accountToken)
            headers.set("Authorization", `Bearer ${previewToken}`);
        } catch {
          // Cookie fallback is optional; the OAuth cookie remains the primary session.
        }
      }
      const response = await fetch(`/api/etc${path}`, {
        ...init,
        headers,
        credentials: mode === "live" ? "include" : "omit",
      });
      if (!response.ok) {
        const text = await response.text();
        let payload: unknown = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = null;
        }
        const message =
          typeof payload === "object" &&
          payload &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `La solicitud falló (${response.status}).`;
        throw new ApiError(
          translate(message, undefined, language),
          response.status
        );
      }
      if (asBlob) return (await response.blob()) as T;
      const text = await response.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    },
    [language, mode]
  );

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      if (mode === "demo" && !getStorage(tokenKey)) await createDemo();
      try {
        return await rawRequest<T>(path, init);
      } catch (error) {
        if (
          mode === "demo" &&
          isApiError(error) &&
          error.status === 401 &&
          !recoveryAttempted.current
        ) {
          recoveryAttempted.current = true;
          removeStorage(tokenKey);
          await createDemo();
          return rawRequest<T>(path, init);
        }
        throw error;
      }
    },
    [createDemo, mode, rawRequest]
  );

  const download = useCallback(
    async (path: string) => {
      if (mode === "demo" && !getStorage(tokenKey)) await createDemo();
      try {
        return await rawRequest<Blob>(path, {}, true);
      } catch (error) {
        if (
          mode === "demo" &&
          isApiError(error) &&
          error.status === 401 &&
          !recoveryAttempted.current
        ) {
          recoveryAttempted.current = true;
          removeStorage(tokenKey);
          await createDemo();
          return rawRequest<Blob>(path, {}, true);
        }
        throw error;
      }
    },
    [createDemo, mode, rawRequest]
  );

  return useMemo(() => ({ request, download }), [download, request]);
}

const NAV_ITEMS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Resumen", icon: LayoutDashboard },
  { key: "inbox", label: "Bandeja", icon: Inbox },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { key: "contacts", label: "Contactos", icon: UsersRound },
  { key: "knowledge", label: "Conocimiento", icon: BookMarked },
  { key: "consultations", label: "Consultas IA", icon: Sparkles },
  { key: "followups", label: "Seguimientos", icon: ListTodo },
  { key: "settings", label: "Ajustes", icon: Settings2 },
];

const STAGES: Stage[] = [
  "nuevo",
  "en_atencion",
  "calificado",
  "ganado",
  "perdido",
];
const STAGE_LABELS: Record<Stage, string> = {
  nuevo: "Nuevo",
  en_atencion: "En atención",
  calificado: "Calificado",
  ganado: "Ganado",
  perdido: "Perdido",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};
const SEGMENT_LABELS: Record<Segment, string> = {
  inmobiliaria: "Inmobiliaria",
  educacion: "Educación",
  retail: "Retail",
  servicios: "Servicios",
  financieros: "Servicios financieros",
  pymes: "PYMES",
};
const PALETTE = ["#1B4079", "#4D7C8A", "#7F9C96", "#8FAD88", "#CBDF90"];
const MESSAGE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  uncertain: "Estado por confirmar",
  failed: "Falló",
  demo: "Simulado",
  received: "Recibido",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
};

function formatMessageStatus(status: string) {
  return translate(MESSAGE_STATUS_LABELS[status] ?? status);
}

function getStageLabel(stage: Stage) {
  return translate(STAGE_LABELS[stage]);
}

function getPriorityLabel(priority: Priority) {
  return translate(PRIORITY_LABELS[priority]);
}

function getSegmentLabel(segment: Segment) {
  return translate(SEGMENT_LABELS[segment]);
}

function formatDate(
  value: string | null | undefined,
  withTime = false,
  language: "es" | "en" = "es"
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    language,
    withTime
      ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short" }
  ).format(date);
}

function formatRelative(value: string | null | undefined) {
  if (!value) return translate("Sin mensajes");
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 60 * 1000)
    return translate("Hace {count} min", {
      count: Math.max(1, Math.round(diff / 60000)),
    });
  if (diff < 24 * 60 * 60 * 1000)
    return translate("Hace {count} h", { count: Math.round(diff / 3600000) });
  return formatDate(value);
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

function getSection(value: string | undefined): SectionKey {
  return NAV_ITEMS.some(item => item.key === value)
    ? (value as SectionKey)
    : "overview";
}

function DemoBanner({ mode }: { mode: CrmMode }) {
  const { t } = useI18n();
  if (mode !== "demo") return null;
  return (
    <div className="crm-demo-banner">
      <span className="crm-banner-dot" />
      <strong>{t("Datos ficticios aislados")}</strong>
      <span>
        {t(
          "Este espacio demo es privado para tu visita. No se envían mensajes reales."
        )}
      </span>
      <span className="crm-banner-meta">
        <Database size={14} /> {t("Conexión real pendiente")}
      </span>
    </div>
  );
}

function ConnectionSummary({
  session,
  mode,
  onRefresh,
}: {
  session: Session;
  mode: CrmMode;
  onRefresh?: () => void;
}) {
  const { t } = useI18n();
  const configured =
    session.connection.configured && session.connection.enabled;
  const connectionLabel =
    mode === "demo"
      ? t("Conexión desactivada")
      : configured
        ? t("Conexión activa")
        : t("Conexión pendiente");
  return (
    <div className="crm-connection-card">
      <div className="crm-connection-head">
        <span
          className={`crm-status-dot ${configured ? "is-on" : "is-pending"}`}
        />
        <span>{connectionLabel}</span>
        {onRefresh && (
          <button
            className="crm-mini-icon"
            onClick={onRefresh}
            aria-label={t("Actualizar conexión")}
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
      <p>
        {mode === "demo"
          ? t("La demo no conecta canales reales.")
          : configured
            ? `${t("Canal")} ${session.connection.phoneMasked ?? t("configurado")}`
            : t("Faltan credenciales del negocio.")}
      </p>
      <div className="crm-connection-line">
        <span>
          {mode === "demo"
            ? t("Espacio aislado")
            : (session.connection.phoneMasked ?? t("Sin número"))}
        </span>
        <span className="crm-connection-badge">
          {mode === "demo"
            ? t("DESACTIVADA")
            : configured
              ? t("ACTIVA")
              : t("PENDIENTE")}
        </span>
      </div>
    </div>
  );
}

function Sidebar({
  mode,
  activeSection,
  session,
  mobileOpen,
  onClose,
}: {
  mode: CrmMode;
  activeSection: SectionKey;
  session: Session;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const base = mode === "demo" ? "/demo" : "/app";
  return (
    <aside className={`crm-sidebar ${mobileOpen ? "is-open" : ""}`}>
      <div className="crm-sidebar-top">
        <Link href={base} className="crm-brand-link" onClick={onClose}>
          <Brand light />
        </Link>
        <button
          className="crm-sidebar-close"
          onClick={onClose}
          aria-label={t("Cerrar navegación")}
        >
          <X size={18} />
        </button>
      </div>
      <div className="crm-product-label">
        <span className="crm-product-kicker">FRONTDESK</span>
        <span>{t("Operación conversacional")}</span>
      </div>
      <nav className="crm-nav" aria-label={t("Navegación principal")}>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`${base}/${key}`}
            onClick={onClose}
            className={`crm-nav-link ${activeSection === key ? "is-active" : ""}`}
            aria-current={activeSection === key ? "page" : undefined}
          >
            <Icon size={17} />
            <span>{t(label)}</span>
            {key === "inbox" && <span className="crm-nav-pulse" />}
          </Link>
        ))}
      </nav>
      <div className="crm-sidebar-bottom">
        <ConnectionSummary mode={mode} session={session} />
        <PreferencesControl />
        <Link className="crm-return-link" href="/">
          <ArrowLeft size={14} /> {t("Volver a la landing")}
        </Link>
        <p className="crm-sidebar-foot">{t("Cada conversación cuenta.")}</p>
      </div>
    </aside>
  );
}

function Topbar({
  mode,
  section,
  session,
  onMenu,
}: {
  mode: CrmMode;
  section: SectionKey;
  session: Session;
  onMenu: () => void;
}) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const item = NAV_ITEMS.find(entry => entry.key === section);
  const profile = initials(session.user.name);
  const logout = async () => {
    await logoutAccount();
    navigate("/login");
  };
  return (
    <header className="crm-topbar">
      <button
        className="crm-menu-button"
        onClick={onMenu}
        aria-label={t("Abrir navegación")}
      >
        <Menu size={20} />
      </button>
      <div className="crm-breadcrumb">
        <span>Frontdesk</span>
        <span>/</span>
        <strong>{item ? t(item.label) : null}</strong>
      </div>
      <div className="crm-topbar-actions">
        <span
          className={`crm-mode-badge ${mode === "demo" ? "is-demo" : "is-live"}`}
        >
          <span />
          {mode === "demo" ? t("DEMO") : t("ESPACIO PRIVADO")}
        </span>
        <PreferencesControl />
        {mode === "live" && (
          <button
            className="crm-mini-icon crm-topbar-logout"
            onClick={() => void logout()}
            aria-label={t("Cerrar sesión")}
            title={t("Cerrar sesión")}
          >
            <LogOut size={15} />
          </button>
        )}
        <div className="crm-user">
          <span className="crm-user-avatar">{profile}</span>
          <span className="crm-user-copy">
            <strong>{session.user.name}</strong>
            <small>
              {session.user.role === "owner" ? t("Propietario") : t("Equipo")}
            </small>
          </span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`crm-stat-card crm-stat-${tone}`}>
      <div className="crm-stat-top">
        <span>{t(label)}</span>
        <span className="crm-stat-icon">
          <Icon size={17} />
        </span>
      </div>
      <strong>{value.toLocaleString("es")}</strong>
      <small>{t(detail)}</small>
    </div>
  );
}

function Overview({ api, mode }: { api: ApiClient; mode: CrmMode }) {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState("");
  const [simulateText, setSimulateText] = useState(
    "Quisiera conocer más detalles, ¿me pueden ayudar?"
  );
  const [simulationOpening, setSimulationOpening] = useState(false);
  const [simulationPending, setSimulationPending] = useState(false);
  const simulationClientRef = useRef<{ text: string; id: string } | null>(null);
  const simulateTextRef = useRef(simulateText);
  simulateTextRef.current = simulateText;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.request<Stats>("/stats"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Error desconocido"));
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const openSimulation = async () => {
    if (mode !== "demo" || simulationOpening || simulationPending) return;
    setSimulationOpening(true);
    try {
      const items = await api.request<Conversation[]>("/conversations");
      setConversations(items);
      setSelectedConversation(
        items.find(item => item.status !== "cerrada")?.id ?? ""
      );
      setSimulateOpen(true);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudieron cargar las conversaciones.")
      );
    } finally {
      setSimulationOpening(false);
    }
  };
  const simulate = async (event: FormEvent) => {
    event.preventDefault();
    const text = simulateText.trim();
    const selected = conversations.find(
      item => item.id === selectedConversation
    );
    if (
      !selectedConversation ||
      !text ||
      selected?.status === "cerrada" ||
      simulationPending ||
      simulationOpening
    )
      return;
    const current = simulationClientRef.current;
    const clientId = current?.text === text ? current.id : crypto.randomUUID();
    simulationClientRef.current = { text, id: clientId };
    setSimulationPending(true);
    try {
      await api.request(
        `/conversations/${selectedConversation}/simulate`,
        jsonInit("POST", { text, clientId })
      );
      toast.success(t("Mensaje de prueba ingresado en la bandeja."));
      simulationClientRef.current = null;
      if (simulateTextRef.current.trim() === text) setSimulateText("");
      setSimulateOpen(false);
      void load();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo simular el mensaje.")
      );
    } finally {
      setSimulationPending(false);
    }
  };

  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow="Vista general"
        title="Buenos días, equipo."
        description="Una lectura rápida de lo que necesita atención hoy."
        action={
          mode === "demo" ? (
            <button
              className="crm-button crm-button-primary"
              onClick={() => void openSimulation()}
              disabled={simulationOpening || simulationPending}
            >
              <Zap size={16} />
              {simulationOpening ? t("Cargando...") : t("Probar cliente")}
            </button>
          ) : undefined
        }
      />
      <DemoBanner mode={mode} />
      {loading ? (
        <LoadingBlock label="Cargando actividad del espacio" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : stats ? (
        <>
          <div className="crm-stat-grid">
            <StatCard
              label="Contactos"
              value={stats.contacts}
              detail="en tu espacio"
              icon={UsersRound}
              tone="navy"
            />
            <StatCard
              label="Conversaciones abiertas"
              value={stats.openConversations}
              detail="requieren seguimiento"
              icon={MessageCircle}
              tone="teal"
            />
            <StatCard
              label="Calificados"
              value={stats.qualified}
              detail="en pipeline"
              icon={BarChart3}
              tone="sage"
            />
            <StatCard
              label="Tareas pendientes"
              value={stats.pendingTasks}
              detail="registradas en tu espacio"
              icon={ClipboardList}
              tone="lime"
            />
          </div>
          <div className="crm-overview-grid">
            <Panel className="crm-pipeline-summary">
              <div className="crm-panel-head">
                <div>
                  <p className="crm-eyebrow">{t("Pipeline")}</p>
                  <h2>{t("Movimiento por etapa")}</h2>
                </div>
                <Link
                  href={`${mode === "demo" ? "/demo" : "/app"}/pipeline`}
                  className="crm-text-link"
                >
                  {t("Ver pipeline")} <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="crm-stage-bars">
                {STAGES.map(stage => {
                  const count = stats.byStage[stage] ?? 0;
                  const max = Math.max(...Object.values(stats.byStage), 1);
                  return (
                    <div className="crm-stage-row" key={stage}>
                      <span>{getStageLabel(stage)}</span>
                      <div className="crm-stage-track">
                        <span
                          className={`crm-stage-fill stage-${stage}`}
                          style={{
                            width: `${Math.max(count ? 8 : 0, (count / max) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel className="crm-activity-panel">
              <div className="crm-panel-head">
                <div>
                  <p className="crm-eyebrow">{t("Actividad reciente")}</p>
                  <h2>{t("Lo último")}</h2>
                </div>
                <Clock3 size={17} className="crm-muted-icon" />
              </div>
              {stats.activity.length ? (
                <div className="crm-activity-list">
                  {stats.activity.slice(0, 5).map(activity => (
                    <div className="crm-activity-item" key={activity.id}>
                      <span className="crm-activity-dot" />
                      <div>
                        <p>{activity.text}</p>
                        <small>{formatRelative(activity.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="Sin actividad todavía"
                  description="Los cambios del espacio aparecerán aquí."
                />
              )}
            </Panel>
          </div>
        </>
      ) : null}
      {simulateOpen && (
        <Modal
          title="Probar un mensaje entrante"
          description="Solo demo: no se conecta a ningún canal real."
          onClose={() => setSimulateOpen(false)}
        >
          <form className="crm-form" onSubmit={simulate}>
            <label>
              {t("Conversación")}
              <select
                value={selectedConversation}
                onChange={event => setSelectedConversation(event.target.value)}
                required
              >
                <option value="">{t("Selecciona una conversación")}</option>
                {conversations.map(item => (
                  <option
                    value={item.id}
                    key={item.id}
                    disabled={item.status === "cerrada"}
                  >
                    {item.contact.name}
                    {item.status === "cerrada" ? ` · ${t("Cerrada")}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Mensaje del cliente")}
              <textarea
                value={simulateText}
                onChange={event => setSimulateText(event.target.value)}
                rows={4}
                required
              />
            </label>
            <div className="crm-modal-actions">
              <button
                type="button"
                className="crm-button crm-button-ghost"
                onClick={() => setSimulateOpen(false)}
              >
                {t("Cancelar")}
              </button>
              <button type="submit" className="crm-button crm-button-primary">
                <Send size={15} />
                {simulationPending ? t("Ingresando...") : t("Ingresar prueba")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function InboxView({ api, mode }: { api: ApiClient; mode: CrmMode }) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<{
    conversation: Conversation;
    messages: Message[];
  } | null>(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [simulateText, setSimulateText] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [sendPendingId, setSendPendingId] = useState<string | null>(null);
  const [suggestPendingId, setSuggestPendingId] = useState<string | null>(null);
  const [simulatePendingId, setSimulatePendingId] = useState<string | null>(
    null
  );
  const [conversationActionPending, setConversationActionPending] =
    useState(false);
  const selectedIdRef = useRef(selectedId);
  const selectionGenerationRef = useRef(0);
  const previousSelectedIdRef = useRef(selectedId);
  const detailRequestRef = useRef(0);
  const sendRequestRef = useRef<string | null>(null);
  const suggestRequestRef = useRef(0);
  const simulateRequestRef = useRef<string | null>(null);
  const sendClientRef = useRef<{ text: string; id: string } | null>(null);
  const simulateClientRef = useRef<{ text: string; id: string } | null>(null);
  const draftRef = useRef(draft);
  const simulateTextRef = useRef(simulateText);
  draftRef.current = draft;
  simulateTextRef.current = simulateText;
  selectedIdRef.current = selectedId;
  const sendPending = Boolean(
    detail && sendPendingId === detail.conversation.id
  );
  const suggestPending = Boolean(
    detail && suggestPendingId === detail.conversation.id
  );
  const simulatePending = Boolean(
    detail && simulatePendingId === detail.conversation.id
  );

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const items = await api.request<Conversation[]>("/conversations");
        setConversations(items);
        setSelectedId(current => current || items[0]?.id || "");
      } catch (cause) {
        if (!silent) {
          setError(
            cause instanceof Error
              ? cause.message
              : t("No se pudo cargar la bandeja.")
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api]
  );
  const loadDetail = useCallback(
    async (id: string, silent = false) => {
      if (!id) {
        setDetail(null);
        return;
      }
      const requestId = ++detailRequestRef.current;
      const selectionGeneration = selectionGenerationRef.current;
      if (!silent) setDetailLoading(true);
      try {
        const next = await api.request<{
          conversation: Conversation;
          messages: Message[];
        }>(`/conversations/${id}`);
        if (
          selectedIdRef.current === id &&
          selectionGenerationRef.current === selectionGeneration &&
          detailRequestRef.current === requestId
        ) {
          setDetail(next);
        }
      } catch (cause) {
        if (!silent && selectedIdRef.current === id) {
          toast.error(
            cause instanceof Error
              ? cause.message
              : t("No se pudo cargar la conversación.")
          );
        }
      } finally {
        if (!silent && detailRequestRef.current === requestId)
          setDetailLoading(false);
      }
    },
    [api]
  );
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    if (previousSelectedIdRef.current !== selectedId) {
      previousSelectedIdRef.current = selectedId;
      selectionGenerationRef.current += 1;
      setDraft("");
      setSuggestion(null);
      sendClientRef.current = null;
      simulateClientRef.current = null;
    }
  }, [selectedId]);
  useEffect(() => {
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const refreshConversationState = useCallback(
    async (id: string) => {
      await Promise.all([
        selectedIdRef.current === id ? loadDetail(id, true) : Promise.resolve(),
        loadConversations(true),
      ]);
    },
    [loadConversations, loadDetail]
  );

  const filtered = conversations.filter(
    item =>
      (!search ||
        `${item.contact.name} ${item.lastMessage}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!unreadOnly || item.unreadCount > 0)
  );
  const updateConversation = async (
    body: Partial<Pick<Conversation, "aiPaused" | "status" | "assignedTo">>
  ) => {
    if (!detail || conversationActionPending) return;
    const id = detail.conversation.id;
    setConversationActionPending(true);
    try {
      const updated = await api.request<Conversation>(
        `/conversations/${id}`,
        jsonInit("PATCH", body)
      );
      if (selectedIdRef.current === id) {
        setDetail(current =>
          current && current.conversation.id === id
            ? { ...current, conversation: updated }
            : current
        );
      }
      setConversations(items =>
        items.map(item => (item.id === updated.id ? updated : item))
      );
      const message =
        body.status === "cerrada"
          ? t("Conversación cerrada.")
          : body.status === "abierta"
            ? t("Conversación reabierta.")
            : body.aiPaused === false
              ? t("Copiloto reactivado.")
              : body.aiPaused === true
                ? t("Copiloto pausado.")
                : t("Conversación actualizada.");
      toast.success(message);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo actualizar la conversación.")
      );
    } finally {
      setConversationActionPending(false);
    }
  };
  const sendHuman = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !detail ||
      !draft.trim() ||
      !detail.conversation.windowOpen ||
      detail.conversation.status === "cerrada" ||
      sendPending
    )
      return;
    const id = detail.conversation.id;
    const text = draft.trim();
    const selectionGeneration = selectionGenerationRef.current;
    if (sendRequestRef.current === id) return;
    const current = sendClientRef.current;
    const clientId = current?.text === text ? current.id : crypto.randomUUID();
    sendClientRef.current = { text, id: clientId };
    sendRequestRef.current = id;
    setSendPendingId(id);
    try {
      const message = await api.request<Message>(
        `/conversations/${id}/messages`,
        jsonInit("POST", {
          text,
          source: "human",
          clientId,
        })
      );
      if (
        selectedIdRef.current === id &&
        selectionGenerationRef.current === selectionGeneration
      ) {
        setDetail(current => {
          if (!current || current.conversation.id !== id) return current;
          return current.messages.some(item => item.id === message.id)
            ? current
            : { ...current, messages: [...current.messages, message] };
        });
        if (draftRef.current.trim() === text) setDraft("");
        sendClientRef.current = null;
      }
      await refreshConversationState(id);
      toast.success(t("Mensaje guardado en la conversación."));
    } catch (cause) {
      toast.error(
        isApiError(cause) && cause.status === 409
          ? t(
              "Estado por confirmar. No se reintentó automáticamente; revisa la conversación."
            )
          : cause instanceof Error
            ? cause.message
            : t("No se pudo enviar el mensaje.")
      );
      await refreshConversationState(id);
    } finally {
      if (sendRequestRef.current === id) {
        sendRequestRef.current = null;
        setSendPendingId(null);
      }
    }
  };
  const suggest = async () => {
    if (!detail || suggestPending) return;
    const id = detail.conversation.id;
    const requestId = ++suggestRequestRef.current;
    const selectionGeneration = selectionGenerationRef.current;
    setSuggestPendingId(id);
    try {
      const result = await api.request<Suggestion>(
        `/conversations/${id}/suggest`,
        { method: "POST" }
      );
      if (
        selectedIdRef.current === id &&
        selectionGenerationRef.current === selectionGeneration &&
        suggestRequestRef.current === requestId
      ) {
        setSuggestion(result);
      }
    } catch (cause) {
      if (
        selectedIdRef.current === id &&
        selectionGenerationRef.current === selectionGeneration
      ) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : t("No se pudo generar una sugerencia.")
        );
      }
    } finally {
      if (suggestRequestRef.current === requestId) setSuggestPendingId(null);
    }
  };
  const simulate = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !detail ||
      mode !== "demo" ||
      !simulateText.trim() ||
      detail.conversation.status === "cerrada" ||
      simulatePending
    )
      return;
    const id = detail.conversation.id;
    const text = simulateText.trim();
    if (simulateRequestRef.current === id) return;
    const current = simulateClientRef.current;
    const clientId = current?.text === text ? current.id : crypto.randomUUID();
    simulateClientRef.current = { text, id: clientId };
    simulateRequestRef.current = id;
    const selectionGeneration = selectionGenerationRef.current;
    setSimulatePendingId(id);
    try {
      const result = await api.request<{
        messages: Message[];
        suggestion: Suggestion | null;
      }>(`/conversations/${id}/simulate`, jsonInit("POST", { text, clientId }));
      if (
        selectedIdRef.current === id &&
        selectionGenerationRef.current === selectionGeneration
      ) {
        setDetail(current =>
          current && current.conversation.id === id
            ? { ...current, messages: result.messages }
            : current
        );
        setSuggestion(result.suggestion);
        if (simulateTextRef.current.trim() === text) setSimulateText("");
        simulateClientRef.current = null;
      }
      await refreshConversationState(id);
      toast.success(t("Prueba ingresada: no se envió a ningún canal real."));
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo ejecutar la prueba.")
      );
      await refreshConversationState(id);
    } finally {
      if (simulateRequestRef.current === id) {
        simulateRequestRef.current = null;
        setSimulatePendingId(null);
      }
    }
  };

  return (
    <div className="crm-page crm-inbox-page">
      <SectionHeading
        eyebrow="Bandeja"
        title="Conversaciones"
        description="Responde con contexto y deja que tu equipo decida."
        action={
          <button
            className="crm-button crm-button-secondary"
            onClick={() => setShowTest(value => !value)}
            disabled={mode !== "demo" || simulatePending}
          >
            <WandSparkles size={16} />
            {simulatePending ? t("Simulando...") : t("Probar cliente")}
          </button>
        }
      />
      <DemoBanner mode={mode} />
      {showTest && mode === "demo" && (
        <form className="crm-test-strip" onSubmit={simulate}>
          <span>
            <Zap size={15} /> {t("Simulación explícita")}
          </span>
          <input
            value={simulateText}
            onChange={event => setSimulateText(event.target.value)}
            placeholder={t("Escribe un mensaje entrante de prueba")}
            disabled={
              !detail ||
              detail.conversation.status === "cerrada" ||
              simulatePending
            }
          />
          <button
            className="crm-button crm-button-primary"
            type="submit"
            disabled={
              !detail ||
              detail.conversation.status === "cerrada" ||
              !simulateText.trim() ||
              simulatePending
            }
          >
            <Send size={14} />{" "}
            {simulatePending ? t("Simulando...") : t("Simular")}
          </button>
        </form>
      )}
      {loading ? (
        <LoadingBlock label="Cargando bandeja" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void loadConversations()} />
      ) : (
        <div className="crm-inbox-layout">
          <section className="crm-inbox-list">
            <div className="crm-list-toolbar">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder={t("Buscar conversaciones")}
              />
              <button
                className={`crm-filter-chip ${unreadOnly ? "is-active" : ""}`}
                onClick={() => setUnreadOnly(value => !value)}
              >
                <CircleAlert size={14} /> {t("No leídas")}
              </button>
            </div>
            {filtered.length ? (
              <div className="crm-conversation-items">
                {filtered.map(item => (
                  <button
                    className={`crm-conversation-item ${selectedId === item.id ? "is-selected" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <Avatar
                      name={item.contact.name}
                      tone={item.contact.priority}
                    />
                    <span className="crm-conversation-copy">
                      <span className="crm-conversation-line">
                        <strong>{item.contact.name}</strong>
                        {item.unreadCount > 0 && <b>{item.unreadCount}</b>}
                      </span>
                      <span className="crm-conversation-preview">
                        {item.lastMessage || t("Sin mensajes")}
                      </span>
                      <span className="crm-conversation-meta">
                        <span>{formatRelative(item.lastMessageAt)}</span>
                        <span
                          className={`crm-priority crm-priority-${item.contact.priority}`}
                        >
                          {getPriorityLabel(item.contact.priority)}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Inbox}
                title="No hay coincidencias"
                description="Prueba con otro nombre o filtro."
              />
            )}
          </section>
          <section className="crm-thread-panel">
            {detailLoading ? (
              <LoadingBlock label="Cargando conversación" />
            ) : detail ? (
              <>
                <div className="crm-thread-head">
                  <div className="crm-thread-customer">
                    <Avatar name={detail.conversation.contact.name} size="lg" />
                    <div>
                      <h2>{detail.conversation.contact.name}</h2>
                      <p>
                        {detail.conversation.contact.phone} ·{" "}
                        {detail.conversation.contact.email || t("Sin correo")}
                      </p>
                    </div>
                  </div>
                  <div className="crm-thread-actions">
                    <span
                      className={`crm-conversation-status ${detail.conversation.status === "cerrada" ? "is-closed" : "is-open"}`}
                    >
                      {detail.conversation.status === "cerrada"
                        ? t("Conversación cerrada")
                        : t("Conversación abierta")}
                    </span>
                    <span
                      className={`crm-window-badge ${detail.conversation.windowOpen ? "is-open" : "is-closed"}`}
                    >
                      <Clock3 size={13} />
                      {detail.conversation.windowOpen
                        ? t("Ventana 24 h abierta")
                        : t("Ventana cerrada")}
                    </span>
                    <button
                      className="crm-icon-button"
                      aria-label={
                        detail.conversation.status === "cerrada"
                          ? t("Reabrir conversación")
                          : t("Cerrar conversación")
                      }
                      title={
                        detail.conversation.status === "cerrada"
                          ? t("Reabrir conversación")
                          : t("Cerrar conversación")
                      }
                      disabled={conversationActionPending}
                      onClick={() =>
                        void updateConversation({
                          status:
                            detail.conversation.status === "cerrada"
                              ? "abierta"
                              : "cerrada",
                        })
                      }
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>
                <div className="crm-thread-body">
                  {detail.messages.length ? (
                    detail.messages.map(message => (
                      <div
                        className={`crm-message-row message-${message.role}`}
                        key={message.id}
                      >
                        <div className="crm-message-bubble">
                          <span className="crm-message-author">
                            {message.role === "customer"
                              ? detail.conversation.contact.name
                              : message.role === "ai"
                                ? t("Copiloto")
                                : message.role === "human"
                                  ? t("Equipo")
                                  : t("Sistema")}
                          </span>
                          <p>{message.text}</p>
                          <small>
                            {formatDate(message.createdAt, true)} ·{" "}
                            {formatMessageStatus(message.status)}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={MessageCircle}
                      title="Sin mensajes"
                      description="Usa una prueba demo o espera un mensaje entrante."
                    />
                  )}
                </div>
                <div className="crm-thread-compose">
                  <div className="crm-thread-tools">
                    <button
                      className={`crm-handoff-button ${detail.conversation.aiPaused ? "is-paused" : ""}`}
                      onClick={() =>
                        void updateConversation({
                          aiPaused: !detail.conversation.aiPaused,
                        })
                      }
                      disabled={conversationActionPending}
                    >
                      {detail.conversation.aiPaused ? (
                        <>
                          <Play size={14} /> {t("Reactivar copiloto")}
                        </>
                      ) : (
                        <>
                          <Hand size={14} /> {t("Tomar conversación")}
                        </>
                      )}
                    </button>
                    <button
                      className="crm-suggest-button"
                      onClick={() => void suggest()}
                      disabled={suggestPending}
                    >
                      <Sparkles size={14} />
                      {suggestPending
                        ? t("Generando...")
                        : t("Sugerir respuesta")}
                    </button>
                  </div>
                  {suggestion && (
                    <div className="crm-suggestion">
                      <div>
                        <Sparkles size={14} />
                        <strong>{t("Borrador del copiloto")}</strong>
                        <span className="crm-suggestion-mode">
                          {suggestion.mode === "llm"
                            ? t("IA real")
                            : t("Respuesta de respaldo")}
                        </span>
                      </div>
                      <p>{suggestion.text}</p>
                      <button onClick={() => setDraft(suggestion.text)}>
                        {t("Usar en editor")}
                      </button>
                      <small>
                        {suggestion.mode === "fallback"
                          ? t(
                              suggestion.reason ||
                                "Se utilizó una respuesta de respaldo con contenido aprobado."
                            )
                          : t("Usos de IA restantes: {count}", {
                              count: suggestion.remainingAI,
                            })}
                        {suggestion.mode === "fallback" &&
                          ` · ${t("Usos de IA restantes: {count}", {
                            count: suggestion.remainingAI,
                          })}`}
                      </small>
                    </div>
                  )}
                  {detail.conversation.status === "cerrada" ? (
                    <div className="crm-compose-note">
                      <LockKeyhole size={14} />{" "}
                      {t(
                        "Conversación cerrada. Reábrela para habilitar simulación y envío."
                      )}
                    </div>
                  ) : !detail.conversation.windowOpen ? (
                    <div className="crm-compose-note">
                      <LockKeyhole size={14} />{" "}
                      {t(
                        "Fuera de la ventana de 24 h. El envío está bloqueado hasta un nuevo mensaje entrante."
                      )}
                    </div>
                  ) : null}
                  <form className="crm-composer" onSubmit={sendHuman}>
                    <textarea
                      value={draft}
                      onChange={event => setDraft(event.target.value)}
                      placeholder={
                        detail.conversation.aiPaused
                          ? t("Escribe como equipo...")
                          : t("Toma la conversación para responder...")
                      }
                      rows={2}
                      disabled={
                        detail.conversation.status === "cerrada" ||
                        !detail.conversation.windowOpen ||
                        sendPending
                      }
                    />
                    <button
                      className="crm-send-button"
                      type="submit"
                      disabled={
                        !draft.trim() ||
                        !detail.conversation.windowOpen ||
                        detail.conversation.status === "cerrada" ||
                        sendPending
                      }
                      aria-label={t("Enviar mensaje")}
                    >
                      <Send size={17} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <EmptyState
                icon={MessageCircle}
                title="Selecciona una conversación"
                description="Elige un contacto para abrir su hilo."
              />
            )}
          </section>
          {detail && (
            <ContactDetails
              api={api}
              contact={detail.conversation.contact}
              onUpdated={contact => {
                setDetail(current =>
                  current
                    ? {
                        ...current,
                        conversation: { ...current.conversation, contact },
                      }
                    : current
                );
                setConversations(items =>
                  items.map(item =>
                    item.id === detail.conversation.id
                      ? { ...item, contact }
                      : item
                  )
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ContactDetails({
  api,
  contact,
  onUpdated,
}: {
  api: ApiClient;
  contact: Contact;
  onUpdated: (contact: Contact) => void;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = useState(contact.notes);
  const [stage, setStage] = useState(contact.stage);
  const [priority, setPriority] = useState(contact.priority);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setNotes(contact.notes);
    setStage(contact.stage);
    setPriority(contact.priority);
  }, [contact]);
  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.request<Contact>(
        `/contacts/${contact.id}`,
        jsonInit("PATCH", { notes, stage, priority })
      );
      onUpdated(updated);
      toast.success(t("Datos del contacto actualizados."));
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo actualizar el contacto.")
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <aside className="crm-contact-details">
      <div className="crm-details-head">
        <p className="crm-eyebrow">{t("Ficha")}</p>
        <h3>{t("Detalles del contacto")}</h3>
      </div>
      <div className="crm-detail-profile">
        <Avatar name={contact.name} size="lg" tone={contact.priority} />
        <h3>{contact.name}</h3>
        <p>{contact.phone}</p>
        {contact.email && <p>{contact.email}</p>}
      </div>
      <div className="crm-detail-fields">
        <label>
          {t("Etapa")}
          <select
            value={stage}
            onChange={event => setStage(event.target.value as Stage)}
          >
            {STAGES.map(item => (
              <option key={item} value={item}>
                {getStageLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Prioridad")}
          <select
            value={priority}
            onChange={event => setPriority(event.target.value as Priority)}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {translate(label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Notas")}
          <textarea
            rows={5}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder={t("Añade contexto para el equipo")}
          />
        </label>
        <button
          className="crm-button crm-button-primary crm-full-button"
          onClick={() => void save()}
          disabled={saving}
        >
          <Save size={15} /> {saving ? t("Guardando...") : t("Guardar cambios")}
        </button>
      </div>
      <div className="crm-detail-tags">
        {contact.tags.map(tag => (
          <span key={tag}>
            <Tag size={12} />
            {tag}
          </span>
        ))}
      </div>
    </aside>
  );
}

function ContactForm({
  api,
  initial,
  onSaved,
  onClose,
}: {
  api: ApiClient;
  initial?: Contact;
  onSaved: (contact: Contact) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [stage, setStage] = useState<Stage>(initial?.stage ?? "nuevo");
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? "media"
  );
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [consent, setConsent] = useState(initial?.consent ?? false);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        stage,
        priority,
        tags: tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        notes,
        consent,
      };
      const result = await api.request<Contact>(
        initial ? `/contacts/${initial.id}` : "/contacts",
        jsonInit(initial ? "PATCH" : "POST", body)
      );
      onSaved(result);
      toast.success(
        initial ? t("Contacto actualizado.") : t("Contacto creado.")
      );
      onClose();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo guardar el contacto.")
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="crm-form" onSubmit={submit}>
      <div className="crm-form-grid">
        <label>
          {t("Nombre completo")}
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            required
            placeholder={t("Nombre del contacto")}
          />
        </label>
        <label>
          {t("Teléfono")}
          <input
            value={phone}
            onChange={event => setPhone(event.target.value)}
            required
            placeholder="+52 ..."
          />
        </label>
        <label>
          {t("Correo electrónico")}
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </label>
        <label>
          {translate("Etapa")}
          <select
            value={stage}
            onChange={event => setStage(event.target.value as Stage)}
          >
            {STAGES.map(item => (
              <option key={item} value={item}>
                {getStageLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translate("Prioridad")}
          <select
            value={priority}
            onChange={event => setPriority(event.target.value as Priority)}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {translate(label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translate("Etiquetas")}
          <input
            value={tags}
            onChange={event => setTags(event.target.value)}
            placeholder={t("vip, seguimiento")}
          />
        </label>
      </div>
      <label>
        {t("Notas")}
        <textarea
          rows={4}
          value={notes}
          onChange={event => setNotes(event.target.value)}
        />
      </label>
      <label className="crm-checkbox">
        <input
          type="checkbox"
          checked={consent}
          onChange={event => setConsent(event.target.checked)}
        />
        <span>{t("Consentimiento para contacto")}</span>
      </label>
      <div className="crm-modal-actions">
        <button
          type="button"
          className="crm-button crm-button-ghost"
          onClick={onClose}
        >
          {t("Cancelar")}
        </button>
        <button
          className="crm-button crm-button-primary"
          type="submit"
          disabled={saving}
        >
          <Save size={15} />
          {saving ? t("Guardando...") : t("Guardar contacto")}
        </button>
      </div>
    </form>
  );
}

function PipelineView({ api, mode }: { api: ApiClient; mode: CrmMode }) {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | Contact | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setContacts(await api.request<Contact[]>("/contacts"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("No se pudo cargar el pipeline.")
      );
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );
  const move = async (contact: Contact, nextStage: Stage) => {
    if (contact.stage === nextStage) return;
    const previous = contact.stage;
    setContacts(items =>
      items.map(item =>
        item.id === contact.id ? { ...item, stage: nextStage } : item
      )
    );
    try {
      const updated = await api.request<Contact>(
        `/contacts/${contact.id}`,
        jsonInit("PATCH", { stage: nextStage })
      );
      setContacts(items =>
        items.map(item => (item.id === updated.id ? updated : item))
      );
      toast.success(
        t("Movido a {stage}.", { stage: getStageLabel(nextStage) })
      );
    } catch (cause) {
      setContacts(items =>
        items.map(item =>
          item.id === contact.id ? { ...item, stage: previous } : item
        )
      );
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo mover el contacto.")
      );
      await load();
    }
  };
  const onDragStart = ({ active }: DragStartEvent) =>
    setActiveDragId(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const contact = contacts.find(item => item.id === String(active.id));
    const nextStage =
      (over?.data.current?.stage as Stage | undefined) ??
      (typeof over?.id === "string" && over.id.startsWith("stage:")
        ? (over.id.slice(6) as Stage)
        : undefined);
    setActiveDragId(null);
    if (contact && nextStage && STAGES.includes(nextStage))
      void move(contact, nextStage);
  };
  const saved = (contact: Contact) => {
    setContacts(items =>
      items.some(item => item.id === contact.id)
        ? items.map(item => (item.id === contact.id ? contact : item))
        : [contact, ...items]
    );
  };
  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow="Pipeline"
        title="Oportunidades en movimiento"
        description="Arrastra las tarjetas o usa el selector para actualizar su etapa."
        action={
          <AddButton onClick={() => setModal("create")}>
            {translate("Nuevo contacto")}
          </AddButton>
        }
      />
      {loading ? (
        <LoadingBlock label="Cargando pipeline" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={onDragEnd}
        >
          <div className="crm-pipeline-board">
            {STAGES.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                contacts={contacts.filter(item => item.stage === stage)}
                activeDragId={activeDragId}
                onEdit={setModal}
                onMove={move}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragId ? (
              <PipelineCardGhost
                contact={contacts.find(item => item.id === activeDragId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      {activeDragId && (
        <span className="crm-drag-hint">
          {t("Suelta la tarjeta en una etapa para guardar el cambio.")}
        </span>
      )}
      {modal && (
        <Modal
          title={modal === "create" ? "Nuevo contacto" : "Editar contacto"}
          description="Los cambios quedan guardados en tu espacio."
          onClose={() => setModal(null)}
        >
          <ContactForm
            api={api}
            initial={modal === "create" ? undefined : modal}
            onSaved={saved}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function PipelineColumn({
  stage,
  contacts,
  activeDragId,
  onEdit,
  onMove,
}: {
  stage: Stage;
  contacts: Contact[];
  activeDragId: string | null;
  onEdit: (contact: Contact) => void;
  onMove: (contact: Contact, stage: Stage) => Promise<void>;
}) {
  const { t } = useI18n();
  const { isOver, setNodeRef } = useDroppable({
    id: `stage:${stage}`,
    data: { stage },
  });
  return (
    <div
      ref={setNodeRef}
      className={`crm-pipeline-column ${isOver ? "is-over" : ""}`}
    >
      <div className={`crm-column-head stage-${stage}`}>
        <div>
          <span>{getStageLabel(stage)}</span>
          <strong>{contacts.length}</strong>
        </div>
        <span className="crm-column-dot" />
      </div>
      <div className="crm-column-cards">
        {contacts.map(contact => (
          <DraggablePipelineCard
            key={contact.id}
            contact={contact}
            isDragging={activeDragId === contact.id}
            onEdit={onEdit}
            onMove={onMove}
          />
        ))}
        {!contacts.length && (
          <div className="crm-column-empty">{t("Suelta contactos aquí")}</div>
        )}
      </div>
    </div>
  );
}

function PipelineCardContent({
  contact,
  onEdit,
  onMove,
}: {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onMove?: (contact: Contact, stage: Stage) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="crm-lead-card-top">
        <Avatar name={contact.name} size="sm" tone={contact.priority} />
        {onEdit && (
          <button
            className="crm-icon-button"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              onEdit(contact);
            }}
            aria-label={`${t("Editar")} ${contact.name}`}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      <h3>{contact.name}</h3>
      <p>{contact.email || contact.phone}</p>
      <div className="crm-lead-tags">
        {contact.tags.slice(0, 2).map(tag => (
          <span key={tag}>{tag}</span>
        ))}
        <span className={`crm-priority crm-priority-${contact.priority}`}>
          {getPriorityLabel(contact.priority)}
        </span>
      </div>
      {onMove && (
        <div className="crm-lead-card-foot">
          <span>{formatDate(contact.updatedAt)}</span>
          <select
            value={contact.stage}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
            onChange={event =>
              void onMove(contact, event.target.value as Stage)
            }
            aria-label={`${t("Etapa de")} ${contact.name}`}
          >
            <option value={contact.stage}>{t("Mover etapa")}</option>
            {STAGES.filter(item => item !== contact.stage).map(item => (
              <option value={item} key={item}>
                {getStageLabel(item)}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

function DraggablePipelineCard({
  contact,
  isDragging,
  onEdit,
  onMove,
}: {
  contact: Contact;
  isDragging: boolean;
  onEdit: (contact: Contact) => void;
  onMove: (contact: Contact, stage: Stage) => Promise<void>;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: contact.id,
    data: { type: "contact", contactId: contact.id, stage: contact.stage },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`crm-lead-card ${isDragging ? "is-dragging" : ""}`}
    >
      <button
        type="button"
        className="crm-drag-handle"
        aria-label={t("Mover {name}", { name: contact.name })}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={14} />
      </button>
      <PipelineCardContent contact={contact} onEdit={onEdit} onMove={onMove} />
    </article>
  );
}

function PipelineCardGhost({ contact }: { contact?: Contact }) {
  if (!contact) return null;
  return (
    <div className="crm-lead-card crm-lead-card-overlay">
      <PipelineCardContent contact={contact} />
    </div>
  );
}

function ContactsView({ api }: { api: ApiClient }) {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | Contact | null>(null);
  const [exporting, setExporting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setContacts(
        await api.request<Contact[]>(
          `/contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`
        )
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("No se pudieron cargar los contactos.")
      );
    } finally {
      setLoading(false);
    }
  }, [api, search]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = contacts.filter(
    item => !stageFilter || item.stage === stageFilter
  );
  const saveContact = (contact: Contact) =>
    setContacts(items =>
      items.some(item => item.id === contact.id)
        ? items.map(item => (item.id === contact.id ? contact : item))
        : [contact, ...items]
    );
  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.download("/contacts/export");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "contactos.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("CSV descargado."));
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t("No se pudo exportar el CSV.")
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow="Contactos"
        title="Tu directorio"
        description="La información comercial que ayuda a cada conversación."
        action={
          <div className="crm-heading-buttons">
            <button
              className="crm-button crm-button-secondary"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              <Download size={15} />
              {exporting ? "Preparando..." : "Exportar CSV"}
            </button>
            <AddButton onClick={() => setModal("create")}>
              {translate("Añadir contacto")}
            </AddButton>
          </div>
        }
      />
      <div className="crm-toolbar-row">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t("Buscar nombre, teléfono o correo")}
        />
        <select
          value={stageFilter}
          onChange={event => setStageFilter(event.target.value as Stage | "")}
          aria-label={t("Filtrar por etapa")}
        >
          <option value="">{t("Todas las etapas")}</option>
          {STAGES.map(stage => (
            <option value={stage} key={stage}>
              {getStageLabel(stage)}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <LoadingBlock label="Cargando contactos" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : (
        <Panel className="crm-table-panel">
          <div className="crm-table-scroll">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>{t("Contacto")}</th>
                  <th>{t("Etapa")}</th>
                  <th>{t("Prioridad")}</th>
                  <th>{t("Consentimiento")}</th>
                  <th>{t("Actualizado")}</th>
                  <th aria-label={t("Acciones")} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id}>
                    <td>
                      <div className="crm-table-person">
                        <Avatar
                          name={contact.name}
                          size="sm"
                          tone={contact.priority}
                        />
                        <span>
                          <strong>{contact.name}</strong>
                          <small>{contact.email || contact.phone}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`crm-stage-pill stage-pill-${contact.stage}`}
                      >
                        {getStageLabel(contact.stage)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`crm-priority crm-priority-${contact.priority}`}
                      >
                        {getPriorityLabel(contact.priority)}
                      </span>
                    </td>
                    <td>
                      {contact.consent ? (
                        <span className="crm-consent yes">
                          <CheckCircle2 size={14} /> {t("Sí")}
                        </span>
                      ) : (
                        <span className="crm-consent">{t("No")}</span>
                      )}
                    </td>
                    <td>{formatDate(contact.updatedAt)}</td>
                    <td>
                      <button
                        className="crm-icon-button"
                        onClick={() => setModal(contact)}
                        aria-label={`${t("Editar")} ${contact.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <EmptyState
              icon={UsersRound}
              title="No hay contactos"
              description="Crea el primero para iniciar tu pipeline."
              action={
                <AddButton onClick={() => setModal("create")}>
                  {translate("Añadir contacto")}
                </AddButton>
              }
            />
          )}
        </Panel>
      )}
      {modal && (
        <Modal
          title={modal === "create" ? "Añadir contacto" : "Editar contacto"}
          description="Guarda los datos que tu equipo necesita."
          onClose={() => setModal(null)}
        >
          <ContactForm
            api={api}
            initial={modal === "create" ? undefined : modal}
            onSaved={saveContact}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function KnowledgeForm({
  api,
  initial,
  onSaved,
  onClose,
}: {
  api: ApiClient;
  initial?: Knowledge;
  onSaved: (item: Knowledge) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [approved, setApproved] = useState(initial?.approved ?? false);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.request<Knowledge>(
        initial ? `/knowledge/${initial.id}` : "/knowledge",
        jsonInit(initial ? "PATCH" : "POST", {
          title: title.trim(),
          content,
          approved,
        })
      );
      onSaved(result);
      toast.success(initial ? "Artículo actualizado." : "Artículo añadido.");
      onClose();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el artículo."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="crm-form" onSubmit={submit}>
      <label>
        {translate("Título")}
        <input
          required
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Ej. Horarios de atención"
        />
      </label>
      <label>
        {translate("Contenido autorizado")}
        <textarea
          required
          rows={8}
          value={content}
          onChange={event => setContent(event.target.value)}
          placeholder="Información que el copiloto puede usar..."
        />
      </label>
      <label className="crm-checkbox">
        <input
          type="checkbox"
          checked={approved}
          onChange={event => setApproved(event.target.checked)}
        />
        <span>{translate("Artículo aprobado para el copiloto")}</span>
      </label>
      <div className="crm-modal-actions">
        <button
          type="button"
          className="crm-button crm-button-ghost"
          onClick={onClose}
        >
          {translate("Cancelar")}
        </button>
        <button
          className="crm-button crm-button-primary"
          type="submit"
          disabled={saving}
        >
          <Save size={15} />
          {saving ? "Guardando..." : "Guardar artículo"}
        </button>
      </div>
    </form>
  );
}

function KnowledgeView({ api }: { api: ApiClient }) {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | Knowledge | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.request<Knowledge[]>("/knowledge"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el conocimiento."
      );
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = (item: Knowledge) =>
    setItems(current =>
      current.some(entry => entry.id === item.id)
        ? current.map(entry => (entry.id === item.id ? item : entry))
        : [item, ...current]
    );
  const toggleApproved = async (item: Knowledge) => {
    try {
      const updated = await api.request<Knowledge>(
        `/knowledge/${item.id}`,
        jsonInit("PATCH", { approved: !item.approved })
      );
      save(updated);
      toast.success(
        updated.approved
          ? "Artículo aprobado."
          : "Artículo retirado de respuestas."
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar la aprobación."
      );
    }
  };
  const remove = async (item: Knowledge) => {
    if (
      !window.confirm(
        `¿Eliminar “${item.title}”? Esta acción no se puede deshacer.`
      )
    )
      return;
    try {
      await api.request(`/knowledge/${item.id}`, { method: "DELETE" });
      setItems(current => current.filter(entry => entry.id !== item.id));
      toast.success("Artículo eliminado.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el artículo."
      );
    }
  };
  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow="Conocimiento"
        title="Lo que el copiloto puede saber"
        description="Mantén una base breve y aprobada por tu equipo."
        action={
          <AddButton onClick={() => setModal("create")}>
            {translate("Añadir contenido")}
          </AddButton>
        }
      />
      <div className="crm-info-callout">
        <ShieldCheck size={18} />
        <div>
          <strong>{translate("Solo contenido aprobado")}</strong>
          <p>
            {translate(
              "El copiloto recibe únicamente los artículos que marques como aprobados."
            )}
          </p>
        </div>
      </div>
      {loading ? (
        <LoadingBlock label="Cargando artículos" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : (
        <div className="crm-knowledge-grid">
          {items.map(item => (
            <Panel className="crm-knowledge-card" key={item.id}>
              <div className="crm-knowledge-head">
                <span
                  className={item.approved ? "crm-approved" : "crm-pending"}
                >
                  {item.approved ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <CircleAlert size={14} />
                  )}
                  {item.approved ? "Aprobado" : "Borrador pendiente"}
                </span>
                <div className="crm-inline-actions">
                  <button
                    className="crm-icon-button"
                    onClick={() => setModal(item)}
                    aria-label={`Editar ${item.title}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="crm-icon-button danger"
                    onClick={() => void remove(item)}
                    aria-label={`Eliminar ${item.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h2>{item.title}</h2>
              <p>{item.content}</p>
              <div className="crm-knowledge-foot">
                <small>
                  {translate("Actualizado")}
                  {formatDate(item.updatedAt)}
                </small>
                <button
                  className="crm-switch"
                  aria-pressed={item.approved}
                  onClick={() => void toggleApproved(item)}
                >
                  <span />
                  {item.approved ? "Activo" : "Aprobar"}
                </button>
              </div>
            </Panel>
          ))}
          {!items.length && (
            <EmptyState
              icon={BookMarked}
              title="Tu base está vacía"
              description="Añade el primer artículo autorizado para tu equipo."
              action={
                <AddButton onClick={() => setModal("create")}>
                  {translate("Añadir contenido")}
                </AddButton>
              }
            />
          )}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "create" ? "Añadir conocimiento" : "Editar conocimiento"
          }
          description="Contenido visible para tu equipo y copiloto."
          onClose={() => setModal(null)}
          wide
        >
          <KnowledgeForm
            api={api}
            initial={modal === "create" ? undefined : modal}
            onSaved={save}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function TaskForm({
  api,
  contacts,
  onSaved,
  onClose,
}: {
  api: ApiClient;
  contacts: Contact[];
  onSaved: (task: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const task = await api.request<Task>(
        "/tasks",
        jsonInit("POST", {
          title: title.trim(),
          dueAt: new Date(dueAt).toISOString(),
          contactId: contactId || undefined,
        })
      );
      onSaved(task);
      toast.success("Seguimiento creado.");
      onClose();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear el seguimiento."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="crm-form" onSubmit={submit}>
      <label>
        {translate("Tarea")}
        <input
          required
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Ej. Llamar para confirmar visita"
        />
      </label>
      <div className="crm-form-grid">
        <label>
          {translate("Fecha y hora")}
          <input
            required
            type="datetime-local"
            value={dueAt}
            onChange={event => setDueAt(event.target.value)}
          />
        </label>
        <label>
          {translate("Contacto")}
          <select
            value={contactId}
            onChange={event => setContactId(event.target.value)}
          >
            <option value="">{translate("Sin contacto")}</option>
            {contacts.map(contact => (
              <option value={contact.id} key={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="crm-modal-actions">
        <button
          type="button"
          className="crm-button crm-button-ghost"
          onClick={onClose}
        >
          {translate("Cancelar")}
        </button>
        <button
          className="crm-button crm-button-primary"
          type="submit"
          disabled={saving}
        >
          <Save size={15} />
          {saving ? "Guardando..." : "Crear seguimiento"}
        </button>
      </div>
    </form>
  );
}

function FollowupsView({ api }: { api: ApiClient }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskItems, contactItems] = await Promise.all([
        api.request<Task[]>("/tasks"),
        api.request<Contact[]>("/contacts"),
      ]);
      setTasks(taskItems);
      setContacts(contactItems);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los seguimientos."
      );
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const toggle = async (task: Task) => {
    setTasks(items =>
      items.map(item =>
        item.id === task.id ? { ...item, completed: !item.completed } : item
      )
    );
    try {
      const updated = await api.request<Task>(
        `/tasks/${task.id}`,
        jsonInit("PATCH", { completed: !task.completed })
      );
      setTasks(items =>
        items.map(item => (item.id === updated.id ? updated : item))
      );
    } catch (cause) {
      setTasks(items => items.map(item => (item.id === task.id ? task : item)));
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la tarea."
      );
    }
  };
  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow="Seguimientos"
        title="Tareas que no se pierden"
        description="Convierte cada conversación en un siguiente paso claro."
        action={
          <AddButton onClick={() => setModal(true)}>
            {translate("Nueva tarea")}
          </AddButton>
        }
      />
      {loading ? (
        <LoadingBlock label="Cargando seguimientos" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : (
        <Panel className="crm-task-panel">
          <div className="crm-panel-head">
            <div>
              <p className="crm-eyebrow">{translate("Próximos pasos")}</p>
              <h2>
                {tasks.filter(task => !task.completed).length}
                {translate("pendientes")}
              </h2>
            </div>
            <ListTodo size={18} className="crm-muted-icon" />
          </div>
          {tasks.length ? (
            <div className="crm-task-list">
              {tasks.map(task => (
                <div
                  className={`crm-task-row ${task.completed ? "is-completed" : ""}`}
                  key={task.id}
                >
                  <button
                    className="crm-task-check"
                    onClick={() => void toggle(task)}
                    aria-label={
                      task.completed ? "Marcar pendiente" : "Marcar completada"
                    }
                  >
                    {task.completed && <Check size={14} />}
                  </button>
                  <div className="crm-task-copy">
                    <strong>{task.title}</strong>
                    <span>{task.contactName || "Sin contacto"}</span>
                  </div>
                  <time>
                    <Clock3 size={13} />
                    {formatDate(task.dueAt, true)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ListTodo}
              title="Sin tareas pendientes"
              description="Crea un seguimiento desde aquí para mantener el ritmo."
              action={
                <AddButton onClick={() => setModal(true)}>
                  {translate("Nueva tarea")}
                </AddButton>
              }
            />
          )}
        </Panel>
      )}
      {modal && (
        <Modal
          title="Nueva tarea"
          description="Define el próximo paso y su fecha."
          onClose={() => setModal(false)}
        >
          <TaskForm
            api={api}
            contacts={contacts}
            onSaved={task => setTasks(items => [task, ...items])}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}

type ConsultationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type ConsultationsPayload = {
  messages: ConsultationMessage[];
  segment: Segment;
  businessType: BusinessType | null;
};

type ConsultationReply = {
  message: ConsultationMessage;
  reply: ConsultationMessage;
  mode: "llm" | "fallback" | "blocked";
  remainingAI: number;
  reason?: string;
  scope: { segment: Segment; businessType: BusinessType | null };
};

function consultationMessageId(message: ConsultationMessage) {
  return (
    message.id ||
    `${message.role}:${message.createdAt}:${message.text.slice(0, 80)}`
  );
}

function mergeConsultationMessages(
  current: ConsultationMessage[],
  next: ConsultationMessage[]
) {
  const merged = new Map<string, ConsultationMessage>();
  [...current, ...next].forEach(message => {
    const id = consultationMessageId(message);
    if (!merged.has(id)) merged.set(id, { ...message, id });
  });
  return [...merged.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function ConsultationStatus({
  mode,
  reason,
}: {
  mode: ConsultationReply["mode"];
  reason?: string;
}) {
  const { t } = useI18n();
  const label =
    mode === "llm"
      ? t("Respuesta IA")
      : mode === "fallback"
        ? t("Respuesta de respaldo")
        : t("Respuesta bloqueada");
  return (
    <span className={`crm-consultation-badge is-${mode}`}>
      {label}
      {reason ? ` · ${t(reason)}` : ""}
    </span>
  );
}

function ConsultationQuickPrompts({
  businessType,
  onSelect,
}: {
  businessType?: BusinessType;
  onSelect: (prompt: string) => void;
}) {
  const { t } = useI18n();
  const prompts =
    businessType === "dental" || businessType === "medico"
      ? [
          "¿Cómo puedo reducir ausencias y ordenar confirmaciones?",
          "¿Qué rutina diaria ayuda a que recepción no pierda seguimientos?",
        ]
      : businessType === "veterinario" ||
          businessType === "estetica" ||
          businessType === "barberia"
        ? [
            "¿Cómo organizo reservas, cancelaciones y seguimientos?",
            "¿Qué operación debería documentar primero para mi equipo?",
          ]
        : businessType === "fonda" ||
            businessType === "restaurante" ||
            businessType === "cafeteria"
          ? [
              "¿Cómo ordeno reservas, turnos y confirmaciones?",
              "¿Qué rutina ayuda a responder pedidos sin perder contexto?",
            ]
          : [
              "¿Qué proceso operativo debería ordenar primero?",
              "¿Cómo puedo convertir consultas en próximos pasos claros?",
            ];
  return (
    <div
      className="crm-consultation-prompts"
      aria-label={t("Sugerencias de consulta")}
    >
      {prompts.map(prompt => (
        <button
          className="crm-consultation-prompt"
          type="button"
          key={prompt}
          onClick={() => onSelect(prompt)}
        >
          {t(prompt)}
        </button>
      ))}
    </div>
  );
}

function ConsultationsView({
  api,
  session,
}: {
  api: ApiClient;
  session: Session;
}) {
  const { language, t } = useI18n();
  const segment = session.workspace.segment;
  const businessType = session.workspace.businessType;
  const scopeKey = `${segment}:${businessType ?? "general"}`;
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<ConsultationReply | null>(null);
  const scopeGenerationRef = useRef(0);
  const attemptRef = useRef<{ text: string; id: string } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const loadHistory = useCallback(async () => {
    const generation = ++scopeGenerationRef.current;
    setLoading(true);
    setError(null);
    setMessages([]);
    setLastReply(null);
    setPending(false);
    attemptRef.current = null;
    try {
      const payload = await api.request<ConsultationsPayload>(
        `/consultations?segment=${encodeURIComponent(segment)}&businessType=${encodeURIComponent(businessType ?? "general")}`
      );
      if (scopeGenerationRef.current !== generation) return;
      if (
        payload.segment !== segment ||
        (payload.businessType ?? "general") !== (businessType ?? "general")
      )
        return;
      setMessages(mergeConsultationMessages([], payload.messages ?? []));
    } catch (cause) {
      if (scopeGenerationRef.current === generation) {
        setError(
          cause instanceof Error
            ? cause.message
            : t("No se pudo cargar la conversación.")
        );
      }
    } finally {
      if (scopeGenerationRef.current === generation) setLoading(false);
    }
  }, [api, businessType, segment, t]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, scopeKey]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || pending || loading) return;
    const currentAttempt = attemptRef.current;
    const clientId =
      currentAttempt?.text === text ? currentAttempt.id : crypto.randomUUID();
    if (currentAttempt?.text === text && pending) return;
    attemptRef.current = { text, id: clientId };
    const generation = scopeGenerationRef.current;
    const optimistic: ConsultationMessage = {
      id: `client:${clientId}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(current => mergeConsultationMessages(current, [optimistic]));
    setPending(true);
    setError(null);
    try {
      const result = await api.request<ConsultationReply>(
        "/consultations",
        jsonInit("POST", {
          text,
          clientId,
          segment,
          businessType: segment === "pymes" ? businessType : null,
          language,
        })
      );
      if (scopeGenerationRef.current !== generation) return;
      if (
        result.scope.segment !== segment ||
        (result.scope.businessType ?? "general") !== (businessType ?? "general")
      )
        return;
      setMessages(current =>
        mergeConsultationMessages(
          current.filter(item => item.id !== optimistic.id),
          [result.message, result.reply]
        )
      );
      setLastReply(result);
      if (draftRef.current.trim() === text) setDraft("");
      attemptRef.current = null;
    } catch (cause) {
      if (scopeGenerationRef.current === generation) {
        setError(
          cause instanceof Error
            ? cause.message
            : t("No se pudo enviar la consulta.")
        );
      }
    } finally {
      if (scopeGenerationRef.current === generation) setPending(false);
    }
  };

  const scopeLabel =
    SEGMENT_NAMES[segment][language] +
    (segment === "pymes" && businessType
      ? ` · ${BUSINESS_TYPE_NAMES[businessType][language]}`
      : "");

  return (
    <div className="crm-page crm-consultations-page">
      <SectionHeading
        eyebrow={t("Consultas IA")}
        title={t("Ordena la operación de tu negocio")}
        description={t(
          "Consulta ideas prácticas para tu sector y convierte la respuesta en un siguiente paso."
        )}
      />
      <div className="crm-consultation-scope">
        <div>
          <span className="crm-eyebrow">{t("Alcance activo")}</span>
          <strong>{scopeLabel}</strong>
          <p>
            {t(
              "Las respuestas se limitan a operaciones del sector seleccionado; no ejecutan acciones ni sustituyen asesoría profesional."
            )}
          </p>
        </div>
        <Link
          className="crm-text-link"
          href={`${session.mode === "demo" ? "/demo" : "/app"}/settings`}
        >
          {t("Cambiar alcance")} <ArrowUpRight size={14} />
        </Link>
      </div>
      <Panel className="crm-consultation-panel">
        <div className="crm-panel-head">
          <div>
            <p className="crm-eyebrow">{t("Espacio de consulta")}</p>
            <h2>{t("Operaciones, no respuestas genéricas")}</h2>
          </div>
          <span className="crm-consultation-icon">
            <Sparkles size={17} />
          </span>
        </div>
        {loading ? (
          <LoadingBlock label={t("Cargando historial de este alcance")} />
        ) : error && !messages.length ? (
          <div className="crm-consultation-error" role="alert">
            <CircleAlert size={16} />
            <span>{error}</span>
            <button
              className="crm-button crm-button-ghost"
              type="button"
              onClick={() => void loadHistory()}
            >
              <RefreshCw size={14} /> {t("Reintentar")}
            </button>
          </div>
        ) : (
          <>
            <div className="crm-consultation-thread" aria-live="polite">
              {!messages.length ? (
                <EmptyState
                  icon={MessageCircle}
                  title={t("Empieza una consulta")}
                  description={t(
                    "Pregunta por procesos, seguimiento, reservas o atención de tu negocio."
                  )}
                />
              ) : (
                messages.map(message => (
                  <div
                    className={`crm-consultation-message is-${message.role}`}
                    key={message.id}
                  >
                    <span className="crm-consultation-author">
                      {message.role === "user" ? t("Tú") : t("Asistente")}
                    </span>
                    <p>{message.text}</p>
                    <time>{formatDate(message.createdAt, true, language)}</time>
                  </div>
                ))
              )}
              {pending && (
                <div
                  className="crm-consultation-message is-assistant is-pending"
                  role="status"
                >
                  <span className="crm-consultation-author">
                    {t("Asistente")}
                  </span>
                  <p>{t("Pensando una respuesta para este alcance…")}</p>
                </div>
              )}
            </div>
            {lastReply && (
              <div className="crm-consultation-result-note">
                <ConsultationStatus
                  mode={lastReply.mode}
                  reason={lastReply.reason}
                />
                <span>
                  {t(
                    "Respuesta informativa; revisa el contexto antes de decidir."
                  )}
                </span>
                <small>
                  {t("IA restante")}: {lastReply.remainingAI}
                </small>
              </div>
            )}
            {error && messages.length > 0 && (
              <p className="crm-consultation-inline-error" role="alert">
                {error}
              </p>
            )}
            <ConsultationQuickPrompts
              businessType={businessType}
              onSelect={setDraft}
            />
            <form
              className="crm-consultation-compose"
              onSubmit={event => void send(event)}
            >
              <textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder={t(
                  "Escribe una consulta sobre la operación de tu negocio…"
                )}
                rows={3}
                maxLength={2000}
                disabled={pending}
                aria-label={t("Consulta")}
              />
              <div className="crm-consultation-compose-foot">
                <span>
                  {t(
                    "No se traducen nombres, notas ni contenido de tu espacio."
                  )}
                </span>
                <button
                  className="crm-button crm-button-primary"
                  type="submit"
                  disabled={!draft.trim() || pending}
                >
                  <Send size={15} /> {pending ? t("Enviando…") : t("Consultar")}
                </button>
              </div>
            </form>
          </>
        )}
      </Panel>
    </div>
  );
}

type LlmProvider = "managed" | "openai" | "gemini" | "anthropic";
type LlmConfig = {
  provider: LlmProvider;
  model: string;
  hasKey: boolean;
  keyLast4?: string | null;
  encryptionReady: boolean;
};

function LlmPanel({
  api,
  mode,
  role,
}: {
  api: ApiClient;
  mode: CrmMode;
  role: Session["user"]["role"];
}) {
  const { t } = useI18n();
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [provider, setProvider] = useState<LlmProvider>("managed");
  const [model, setModel] = useState("gpt-6-luna");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const canManage = mode === "live" && role === "owner";

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await api.request<LlmConfig>("/llm/config");
      setConfig(next);
      setProvider(next.provider);
      setModel(next.model || "gpt-6-luna");
      setApiKey("");
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : t("No se pudo cargar la configuración de IA.")
      );
    } finally {
      setLoading(false);
    }
  }, [api, canManage, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !canManage ||
      saving ||
      (apiKey.trim() && config && !config.encryptionReady)
    )
      return;
    setSaving(true);
    setStatus(null);
    try {
      const body: { provider: LlmProvider; model: string; apiKey?: string } = {
        provider,
        model: model.trim() || "gpt-6-luna",
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const next = await api.request<LlmConfig>(
        "/llm/config",
        jsonInit("PATCH", body)
      );
      setConfig(next);
      setProvider(next.provider);
      setModel(next.model);
      setApiKey("");
      setShowKey(false);
      setStatus(t("Configuración guardada. La clave no se vuelve a mostrar."));
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : t("No se pudo guardar la configuración.")
      );
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!canManage || testing) return;
    setTesting(true);
    setStatus(null);
    try {
      const result = await api.request<{ ok: boolean; message: string }>(
        "/llm/test",
        jsonInit("POST", {})
      );
      setStatus(
        result.ok
          ? `${t("Prueba correcta")}: ${result.message}`
          : `${t("Prueba no disponible")}: ${result.message}`
      );
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : t("No se pudo probar el proveedor.")
      );
    } finally {
      setTesting(false);
    }
  };

  const removeKey = async () => {
    if (
      !canManage ||
      removing ||
      !window.confirm(
        t(
          "¿Eliminar la credencial propia de este espacio? Esta acción no se puede deshacer."
        )
      )
    )
      return;
    setRemoving(true);
    setStatus(null);
    try {
      const next = await api.request<LlmConfig>("/llm/config", {
        method: "DELETE",
      });
      setConfig(next);
      setApiKey("");
      setStatus(
        t(
          "Credencial eliminada. Se conserva el proveedor administrado si corresponde."
        )
      );
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : t("No se pudo eliminar la credencial.")
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Panel className="crm-llm-panel">
      <div className="crm-panel-head">
        <div>
          <p className="crm-eyebrow">{t("Configuración de IA")}</p>
          <h2>{t("Proveedor y modelo")}</h2>
        </div>
        <Bot size={18} className="crm-muted-icon" />
      </div>
      {!canManage ? (
        <p className="crm-llm-notice">
          {t(
            "Solo el propietario puede configurar un proveedor en el espacio privado. La demo no guarda credenciales."
          )}
        </p>
      ) : loading ? (
        <LoadingBlock label={t("Consultando configuración segura")} />
      ) : (
        <form className="crm-form" onSubmit={save}>
          <div className="crm-form-grid">
            <label>
              {t("Proveedor")}
              <select
                value={provider}
                onChange={event =>
                  setProvider(event.target.value as LlmProvider)
                }
              >
                <option value="managed">{t("Administrado por ETC")}</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label>
              {t("ID del modelo")}
              <input
                value={model}
                onChange={event => setModel(event.target.value)}
                placeholder="gpt-6-luna"
              />
            </label>
          </div>
          <label>
            {t("Nueva clave API")}
            <span className="crm-secret-input">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={event => setApiKey(event.target.value)}
                placeholder={
                  config?.hasKey && config.keyLast4
                    ? `${t("Clave guardada")}: ••••${config.keyLast4}`
                    : t("Pega una clave solo para actualizarla")
                }
                autoComplete="new-password"
              />
              <button
                type="button"
                className="crm-mini-icon"
                onClick={() => setShowKey(value => !value)}
                aria-label={showKey ? t("Ocultar clave") : t("Mostrar clave")}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
            <small className="crm-field-help">
              {config?.hasKey && config.keyLast4
                ? `${t("Solo se muestra el final")}: ••••${config.keyLast4}. `
                : ""}
              {config?.encryptionReady
                ? t(
                    "La nueva clave nunca se prellena ni se guarda en el navegador."
                  )
                : t(
                    "Falta la clave maestra del servidor; no se marcó una credencial como configurada."
                  )}
            </small>
          </label>
          {status && (
            <p className="crm-llm-status" role="status">
              {status}
            </p>
          )}
          <div className="crm-llm-actions">
            <button
              className="crm-button crm-button-primary"
              type="submit"
              disabled={
                saving || (Boolean(apiKey.trim()) && !config?.encryptionReady)
              }
            >
              <Save size={15} />{" "}
              {saving ? t("Guardando…") : t("Guardar proveedor")}
            </button>
            <button
              className="crm-button crm-button-secondary"
              type="button"
              onClick={() => void test()}
              disabled={testing}
            >
              <CheckCircle2 size={15} />{" "}
              {testing ? t("Probando…") : t("Probar conexión")}
            </button>
            <button
              className="crm-button crm-button-ghost"
              type="button"
              onClick={() => void removeKey()}
              disabled={removing || !config?.hasKey}
            >
              <Trash2 size={15} />{" "}
              {removing ? t("Eliminando…") : t("Eliminar clave")}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function SettingsView({
  api,
  session,
  mode,
  onSession,
}: {
  api: ApiClient;
  session: Session;
  mode: CrmMode;
  onSession: (session: Session) => void;
}) {
  const { language, t } = useI18n();
  const [workspace, setWorkspace] = useState<Workspace>(session.workspace);
  const [connection, setConnection] = useState<{
    missing: string[];
    workspaceId: string;
    webhookPath: string;
  } | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preset, setPreset] = useState<Segment>(session.workspace.segment);
  const [presetApplying, setPresetApplying] = useState(false);
  const connectionActive =
    mode !== "demo" &&
    session.connection.configured &&
    session.connection.enabled;
  const canApplyPreset = session.user.role === "owner";
  useEffect(() => {
    setWorkspace(session.workspace);
    setPreset(session.workspace.segment);
  }, [session.workspace]);
  const loadConnection = useCallback(async () => {
    setLoadingConnection(true);
    try {
      setConnection(
        await api.request<{
          missing: string[];
          workspaceId: string;
          webhookPath: string;
        }>("/connection")
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo consultar la conexión."
      );
    } finally {
      setLoadingConnection(false);
    }
  }, [api]);
  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.request<Workspace>(
        "/workspace",
        jsonInit("PATCH", workspace)
      );
      onSession({ ...session, workspace: updated });
      toast.success("Ajustes guardados.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudieron guardar los ajustes."
      );
    } finally {
      setSaving(false);
    }
  };
  const applyPreset = async () => {
    if (
      !window.confirm(
        `Aplicar la configuración de ${SEGMENT_LABELS[preset]} y añadir su contenido sugerido? No se borrarán datos existentes.`
      )
    )
      return;
    setPresetApplying(true);
    try {
      const updated = await api.request<Workspace>(
        "/workspace/preset",
        jsonInit("POST", { segment: preset })
      );
      setWorkspace(updated);
      onSession({ ...session, workspace: updated });
      toast.success("Perfil aplicado sin borrar tu contenido.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No se pudo aplicar el perfil."
      );
    } finally {
      setPresetApplying(false);
    }
  };
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };
  return (
    <div className="crm-page">
      <SectionHeading
        eyebrow={t("Ajustes")}
        title={t("El espacio, a tu manera")}
        description={t(
          "Configura la voz y el contexto que tu equipo necesita."
        )}
      />
      <div className="crm-settings-grid">
        <Panel className="crm-settings-form-panel">
          <div className="crm-panel-head">
            <div>
              <p className="crm-eyebrow">{t("Identidad del negocio")}</p>
              <h2>{t("Perfil del espacio")}</h2>
            </div>
            <Settings2 size={18} className="crm-muted-icon" />
          </div>
          <form className="crm-form" onSubmit={save}>
            <label>
              {t("Nombre del negocio")}
              <input
                value={workspace.name}
                onChange={event =>
                  setWorkspace({ ...workspace, name: event.target.value })
                }
                required
              />
            </label>
            <div className="crm-form-grid">
              <label>
                {t("Segmento")}
                <select
                  value={workspace.segment}
                  onChange={event =>
                    setWorkspace({
                      ...workspace,
                      segment: event.target.value as Segment,
                      businessType:
                        event.target.value === "pymes"
                          ? (workspace.businessType ?? "general")
                          : undefined,
                    })
                  }
                >
                  {SEGMENTS.map(value => (
                    <option key={value} value={value}>
                      {SEGMENT_NAMES[value][language]}
                    </option>
                  ))}
                </select>
              </label>
              {workspace.segment === "pymes" && (
                <label>
                  {t("Tipo de negocio")}
                  <select
                    value={workspace.businessType ?? "general"}
                    onChange={event =>
                      setWorkspace({
                        ...workspace,
                        businessType: event.target.value as BusinessType,
                      })
                    }
                  >
                    {BUSINESS_TYPES.map(value => (
                      <option key={value} value={value}>
                        {BUSINESS_TYPE_NAMES[value][language]}
                      </option>
                    ))}
                  </select>
                  <small className="crm-field-help">
                    {t("Este subtipo ajusta el alcance de Consultas IA.")}
                  </small>
                </label>
              )}
              <label>
                {t("Nombre del agente")}
                <input
                  value={workspace.agentName}
                  onChange={event =>
                    setWorkspace({
                      ...workspace,
                      agentName: event.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>
            <label>
              {t("Tono de comunicación")}
              <input
                value={workspace.tone}
                onChange={event =>
                  setWorkspace({ ...workspace, tone: event.target.value })
                }
                placeholder={t("Claro, cercano y profesional")}
              />
            </label>
            <label>
              {t("Descripción")}
              <textarea
                rows={4}
                value={workspace.description}
                onChange={event =>
                  setWorkspace({
                    ...workspace,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <div>
              <span className="crm-field-label">{t("Color primario")}</span>
              <div className="crm-color-options">
                {PALETTE.map(color => (
                  <button
                    type="button"
                    key={color}
                    className={`crm-color-option ${workspace.primaryColor === color ? "is-selected" : ""}`}
                    style={{ background: color }}
                    onClick={() =>
                      setWorkspace({ ...workspace, primaryColor: color })
                    }
                    aria-label={`${t("Usar color")} ${color}`}
                  />
                ))}
              </div>
            </div>
            <label className="crm-checkbox crm-toggle-label">
              <input
                type="checkbox"
                checked={workspace.autoReply}
                onChange={event =>
                  setWorkspace({
                    ...workspace,
                    autoReply: event.target.checked,
                  })
                }
              />
              <span>
                <strong>{t("Respuesta automática en demo")}</strong>
                <small>
                  {translate(
                    "Simula comportamiento para probar el flujo; nunca envía mensajes reales."
                  )}
                </small>
              </span>
            </label>
            <button
              className="crm-button crm-button-primary"
              type="submit"
              disabled={saving}
            >
              <Save size={15} />
              {saving ? t("Guardando…") : t("Guardar ajustes")}
            </button>
          </form>
        </Panel>
        <Panel className="crm-connection-panel">
          <div className="crm-panel-head">
            <div>
              <p className="crm-eyebrow">{t("Canal real")}</p>
              <h2>
                {mode === "demo"
                  ? t("Conexión desactivada")
                  : connectionActive
                    ? t("Conexión activa")
                    : t("Conexión pendiente")}
              </h2>
            </div>
            <span className="crm-pending-icon">
              <Link2 size={17} />
            </span>
          </div>
          <p className="crm-connection-intro">
            {mode === "demo"
              ? t(
                  "La demo no conecta canales reales ni envía mensajes fuera de este espacio."
                )
              : t(
                  "La conexión se habilita cuando tu negocio complete la configuración del canal. No pedimos secretos en este panel."
                )}
          </p>
          {loadingConnection ? (
            <LoadingBlock label="Consultando estado" />
          ) : connection ? (
            <div className="crm-setup-list">
              <div className="crm-setup-status">
                <span
                  className={`crm-status-dot ${connectionActive ? "is-on" : "is-pending"}`}
                />
                <div>
                  <strong>
                    {mode === "demo"
                      ? "Desactivada"
                      : connectionActive
                        ? "Conexión activa"
                        : "Conexión pendiente"}
                  </strong>
                  <small>
                    {mode === "demo"
                      ? "La demo permanece aislada."
                      : connection.missing.length
                        ? connection.missing.join(" · ")
                        : connectionActive
                          ? "Canal configurado y habilitado."
                          : "Pendiente de validar el canal."}
                  </small>
                </div>
                <button
                  className="crm-mini-icon"
                  onClick={() => void loadConnection()}
                  aria-label="Actualizar estado"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="crm-setup-item">
                <div>
                  <span>Workspace ID</span>
                  <strong>{connection.workspaceId}</strong>
                </div>
                <button
                  className="crm-mini-icon"
                  onClick={() =>
                    void copy(connection.workspaceId, "Workspace ID")
                  }
                  aria-label="Copiar Workspace ID"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="crm-setup-item">
                <div>
                  <span>Webhook relativo</span>
                  <strong>{connection.webhookPath}</strong>
                </div>
                <button
                  className="crm-mini-icon"
                  onClick={() => void copy(connection.webhookPath, "Webhook")}
                  aria-label="Copiar webhook"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="crm-setup-check">
                <CheckCircle2 size={15} />
                <span>
                  {mode === "demo"
                    ? "El envío real permanece desactivado en la demo."
                    : "El envío permanece desactivado hasta validar credenciales y consentimiento."}
                </span>
              </div>
            </div>
          ) : null}
          <div className="crm-connection-callout">
            <ShieldCheck size={16} />
            <span>
              {translate(
                "Estado visible y auditable. Los valores secretos nunca se muestran aquí."
              )}
            </span>
          </div>
        </Panel>
      </div>
      <Panel className="crm-preset-panel">
        <div>
          <p className="crm-eyebrow">{t("Acelerador opcional")}</p>
          <h2>{t("Aplicar un perfil de segmento")}</h2>
          <p>
            {t(
              "Añade una sugerencia inicial sin reemplazar contactos, mensajes ni conocimiento existente."
            )}
          </p>
          <small className="crm-preset-note">
            {canApplyPreset
              ? t(
                  "Solo el propietario puede aplicar un perfil y añadir su FAQ inicial."
                )
              : t("Solo el propietario del espacio puede aplicar perfiles.")}
          </small>
        </div>
        <div className="crm-preset-action">
          <select
            value={preset}
            onChange={event => setPreset(event.target.value as Segment)}
            aria-label={t("Segmento para perfil")}
          >
            {SEGMENTS.map(value => (
              <option key={value} value={value}>
                {SEGMENT_NAMES[value][language]}
              </option>
            ))}
          </select>
          <button
            className="crm-button crm-button-secondary"
            onClick={() => void applyPreset()}
            disabled={presetApplying || !canApplyPreset}
          >
            <Sparkles size={15} />
            {presetApplying ? t("Aplicando…") : t("Aplicar perfil")}
          </button>
        </div>
      </Panel>
      <LlmPanel api={api} mode={mode} role={session.user.role} />
    </div>
  );
}

function LiveLogin() {
  const login = () => {
    try {
      startLogin();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No se pudo iniciar sesión."
      );
    }
  };
  return (
    <main className="crm-auth-screen">
      <div className="crm-auth-card">
        <Brand />
        <span className="crm-auth-lock">
          <LockKeyhole size={22} />
        </span>
        <p className="crm-eyebrow">{translate("Espacio privado")}</p>
        <h1>{translate("Inicia sesión para continuar.")}</h1>
        <p>
          {translate(
            "Este espacio usa tu cuenta real y no comparte datos con la demo."
          )}
        </p>
        <Link
          href="/login"
          className="crm-button crm-button-primary crm-full-button"
        >
          <LogIn size={16} />
          {translate("Iniciar sesión con email")}
        </Link>
        <button className="crm-auth-alt-login" onClick={login}>
          {translate("Continuar con Manus")}
        </button>
        <Link href="/" className="crm-auth-back">
          <ArrowLeft size={14} />
          {translate("Volver a la landing")}
        </Link>
      </div>
    </main>
  );
}

function BootError({
  message,
  mode,
  onRetry,
}: {
  message: string;
  mode: CrmMode;
  onRetry: () => void;
}) {
  return (
    <main className="crm-auth-screen">
      <div className="crm-auth-card">
        <Brand />
        <span className="crm-auth-lock crm-auth-error">
          <CircleAlert size={22} />
        </span>
        <p className="crm-eyebrow">
          {mode === "demo" ? "Demo" : "Espacio privado"}
        </p>
        <h1>{translate("Algo detuvo la carga.")}</h1>
        <p>{message}</p>
        <button
          className="crm-button crm-button-primary crm-full-button"
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          {translate("Reintentar")}
        </button>
        <Link href="/" className="crm-auth-back">
          <ArrowLeft size={14} />
          {translate("Volver a la landing")}
        </Link>
      </div>
    </main>
  );
}

export default function Crm({
  section,
  mode,
}: {
  section?: string;
  mode?: CrmMode;
}) {
  const inferredMode: CrmMode =
    mode ??
    (typeof window !== "undefined" &&
    window.location.pathname.startsWith("/app")
      ? "live"
      : "demo");
  const activeSection = getSection(
    section ??
      (typeof window !== "undefined"
        ? window.location.pathname.split("/")[2]
        : undefined)
  );
  const { language } = useI18n();
  const api = useEtcApi(inferredMode, "servicios", language);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsLogin(false);
    try {
      setSession(await api.request<Session>("/session"));
    } catch (cause) {
      if (inferredMode === "live" && isApiError(cause) && cause.status === 401)
        setNeedsLogin(true);
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo iniciar el espacio."
        );
    } finally {
      setLoading(false);
    }
  }, [api, inferredMode]);
  useEffect(() => {
    void loadSession();
  }, [loadSession]);
  if (loading)
    return (
      <main className="crm-auth-screen">
        <div className="crm-auth-card crm-boot-card">
          <Brand />
          <LoadingBlock
            label={
              inferredMode === "demo"
                ? "Preparando tu espacio demo"
                : "Comprobando tu sesión"
            }
          />
        </div>
      </main>
    );
  if (needsLogin) return <LiveLogin />;
  if (error || !session)
    return (
      <BootError
        mode={inferredMode}
        message={error ?? "No encontramos una sesión válida."}
        onRetry={() => void loadSession()}
      />
    );
  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <InboxView api={api} mode={inferredMode} />;
      case "pipeline":
        return <PipelineView api={api} mode={inferredMode} />;
      case "contacts":
        return <ContactsView api={api} />;
      case "knowledge":
        return <KnowledgeView api={api} />;
      case "consultations":
        return <ConsultationsView api={api} session={session} />;
      case "followups":
        return <FollowupsView api={api} />;
      case "settings":
        return (
          <SettingsView
            api={api}
            session={session}
            mode={inferredMode}
            onSession={setSession}
          />
        );
      default:
        return <Overview api={api} mode={inferredMode} />;
    }
  };
  return (
    <div className={`crm-shell crm-mode-${inferredMode}`}>
      <Sidebar
        mode={inferredMode}
        activeSection={activeSection}
        session={session}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="crm-mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}
      <div className="crm-main">
        <Topbar
          mode={inferredMode}
          section={activeSection}
          session={session}
          onMenu={() => setMobileOpen(true)}
        />
        {renderSection()}
        <BrandAttribution />
      </div>
    </div>
  );
}
