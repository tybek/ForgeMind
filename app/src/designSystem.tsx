import type { ButtonHTMLAttributes, ReactNode } from "react";
import brandLockup from "./assets/brand/forgemind-lockup.svg";
import brandMark from "./assets/brand/forgemind-mark.svg";
import brandWordmark from "./assets/brand/forgemind-wordmark.svg";

export type IconName =
  | "ai"
  | "book"
  | "branch"
  | "check-document"
  | "clipboard"
  | "code"
  | "copy"
  | "cube"
  | "document"
  | "folder"
  | "gauge"
  | "home"
  | "message"
  | "refresh"
  | "route"
  | "target"
  | "arrow-right";

export function LineIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.75,
  };

  const glyphs: Record<IconName, ReactNode> = {
    ai: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="4" /></>,
    "arrow-right": <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" /></>,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10M8 8c5 0 4-1 8-1" /></>,
    "check-document": <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></>,
    clipboard: <><path d="M9 5H6v16h12V5h-3" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    folder: <><path d="M3 6h7l2 2h9v11H3z" /><path d="M3 10h18" /></>,
    gauge: <><path d="M4 18a8 8 0 1 1 16 0" /><path d="m12 14 4-4M7 18h10" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>,
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.6-2L20 8M4 16l2.3 2a7 7 0 0 0 11.6-2" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h2a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></>,
  };

  return (
    <svg className="ds-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}>
      {glyphs[name]}
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand-lockup brand-lockup--compact" : "brand-lockup"} role="img" aria-label="ForgeMind, AI for Game Development">
      {compact ? (
        <>
          <img className="brand-mark" src={brandMark} alt="" aria-hidden="true" data-brand-asset="mark" />
          <img className="brand-wordmark" src={brandWordmark} alt="" aria-hidden="true" data-brand-asset="wordmark" />
        </>
      ) : (
        <span className="brand-copy" aria-hidden="true">
          <img className="brand-lockup-art" src={brandLockup} alt="" data-brand-asset="lockup" />
          <span className="brand-descriptor">AI for Game Development</span>
        </span>
      )}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  children,
  className = "",
  disabled,
  icon,
  loading = false,
  loadingLabel = "Working...",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`ds-button ds-button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="inline-spinner" aria-hidden="true" /> : icon ? <LineIcon name={icon} /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  icon: IconName;
  label: string;
}) {
  return (
    <button {...props} className={`ds-icon-button ${className}`.trim()} type={props.type ?? "button"} aria-label={label} title={props.title ?? label}>
      <LineIcon name={icon} />
    </button>
  );
}

const statusTones: Record<string, string> = {
  ALIGNED: "success",
  APPROVED: "success",
  VERIFIED_FROM_GIT: "success",
  VERIFIED_FROM_UNITY: "success",
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  UNVERIFIED: "warning",
  CONFLICT: "danger",
  OUT_OF_SYNC: "danger",
  DEPRECATED: "danger",
  SUPERSEDED: "neutral",
  AI_GENERATED: "ai",
  AI_PROPOSAL: "ai",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const normalized = status.trim().toUpperCase().replaceAll(" ", "_");
  const visibleLabel = label ?? normalized.replaceAll("_", " ");
  return <span className="status-badge" data-tone={statusTones[normalized] ?? "neutral"}>{visibleLabel}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  status?: string;
}) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        {eyebrow ? <span className="type-eyebrow">{eyebrow}</span> : null}
        <h1 className="type-page-title">{title}</h1>
        <p className="type-secondary">{description}</p>
      </div>
      {status ? <span className="page-header__status">{status}</span> : null}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div>
        <h2 className="type-card-title">{title}</h2>
        <p className="type-secondary">{description}</p>
      </div>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
