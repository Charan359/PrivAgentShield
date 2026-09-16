import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ActionType, Sensitivity } from "@/data/mock";
import { riskBand } from "@/data/mock";

export function Panel({
  title,
  description,
  children,
  className,
  right,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <section className={cn("panel p-4 sm:p-5", className)}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const actionStyles: Record<ActionType, string> = {
  ALLOW: "border-allow/40 bg-allow/12 text-allow",
  MASK: "border-mask/40 bg-mask/12 text-mask",
  REDACT: "border-redact/40 bg-redact/12 text-redact",
  BLOCK: "border-block/50 bg-block/15 text-block",
};

export function ActionBadge({
  action,
  className,
}: {
  action: ActionType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider",
        actionStyles[action],
        className,
      )}
    >
      {action}
    </span>
  );
}

const sensStyles: Record<Sensitivity, string> = {
  LOW: "border-border bg-muted text-muted-foreground",
  MEDIUM: "border-mask/40 bg-mask/10 text-mask",
  HIGH: "border-redact/40 bg-redact/10 text-redact",
  CRITICAL: "border-block/50 bg-block/15 text-block",
};

export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px]",
        tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
        tone === "danger" && "border-block/50 bg-block/12 text-block",
        tone === "default" && "border-border bg-secondary text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SensitivityBadge({ level }: { level: Sensitivity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px]",
        sensStyles[level],
      )}
    >
      {level}
    </span>
  );
}

export function RiskBadge({ lri }: { lri: number }) {
  const band = riskBand(lri);
  const tone =
    band === "CRITICAL"
      ? "border-block/50 bg-block/15 text-block"
      : band === "HIGH"
        ? "border-redact/40 bg-redact/12 text-redact"
        : band === "MODERATE"
          ? "border-mask/40 bg-mask/12 text-mask"
          : "border-allow/40 bg-allow/12 text-allow";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px]",
        tone,
      )}
    >
      LRI {lri} · {band}
    </span>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "allow" | "mask" | "redact" | "block" | "primary";
}) {
  const toneClass = {
    default: "text-foreground",
    allow: "text-allow",
    mask: "text-mask",
    redact: "text-redact",
    block: "text-block",
    primary: "text-primary",
  }[tone];

  return (
    <div className="panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Bar({ value, tone = "primary" }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full", `bg-${tone}`)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
