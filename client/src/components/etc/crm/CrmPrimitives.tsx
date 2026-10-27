import {
  X,
  RefreshCw,
  Inbox,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

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
  return (
    <div className="crm-section-heading">
      <div>
        {eyebrow && <p className="crm-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="crm-section-description">{description}</p>
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
  return (
    <div className="crm-loading" role="status">
      <RefreshCw size={16} className="crm-spin" /> <span>{label}</span>
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
  return (
    <div className="crm-error" role="alert">
      <div>
        <strong>No pudimos cargar esto.</strong>
        <span>{message}</span>
      </div>
      <button className="crm-button crm-button-ghost" onClick={onRetry}>
        <RefreshCw size={15} /> Reintentar
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
  return (
    <div className="crm-empty">
      <span className="crm-empty-icon">
        <Icon size={21} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
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
        aria-label={title}
      >
        <div className="crm-modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="crm-icon-button"
            aria-label="Cerrar"
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
  return (
    <label className="crm-search">
      <Search size={16} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
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
  return (
    <button className="crm-button crm-button-primary" onClick={onClick}>
      <Plus size={16} />
      {children}
    </button>
  );
}
