import {
  X,
  RefreshCw,
  Inbox,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import { useI18n } from "@/contexts/I18nContext";

function translateNode(t: (source: string) => string, value: ReactNode) {
  return typeof value === "string" ? t(value) : value;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({
  name,
  size = "md",
  tone = "navy",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: string;
}) {
  return (
    <span
      className={`crm-avatar crm-avatar-${size} crm-avatar-${tone}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="crm-section-heading">
      <div>
        {eyebrow && <p className="crm-eyebrow">{t(eyebrow)}</p>}
        <h1>{t(title)}</h1>
        {description && (
          <p className="crm-section-description">{t(description)}</p>
        )}
      </div>
      {action && <div className="crm-heading-action">{action}</div>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  tone = "",
}: {
  children: ReactNode;
  className?: string;
  tone?: string;
}) {
  return (
    <section className={`crm-panel ${tone} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function LoadingBlock({
  label = "Cargando información",
}: {
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="crm-loading" role="status">
      <RefreshCw size={16} className="crm-spin" /> <span>{t(label)}</span>
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="crm-error" role="alert">
      <div>
        <strong>{t("No pudimos cargar esto.")}</strong>
        <span>{t(message)}</span>
      </div>
      <button className="crm-button crm-button-ghost" onClick={onRetry}>
        <RefreshCw size={15} /> {t("Reintentar")}
      </button>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="crm-empty">
      <span className="crm-empty-icon">
        <Icon size={21} />
      </span>
      <strong>{t(title)}</strong>
      <p>{t(description)}</p>
      {action}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className="crm-modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`crm-modal ${wide ? "crm-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t(title)}
      >
        <div className="crm-modal-head">
          <div>
            <h2>{t(title)}</h2>
            {description && <p>{t(description)}</p>}
          </div>
          <button
            className="crm-icon-button"
            aria-label={t("Cerrar")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();
  return (
    <label className="crm-search">
      <Search size={16} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={t(placeholder)}
        aria-label={t(placeholder)}
      />
    </label>
  );
}

export function AddButton({
  children = "Añadir",
  onClick,
}: {
  children?: ReactNode;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button className="crm-button crm-button-primary" onClick={onClick}>
      <Plus size={16} />
      {translateNode(t, children)}
    </button>
  );
}
