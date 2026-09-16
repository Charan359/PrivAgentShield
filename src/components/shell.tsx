import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Lock,
  Menu,
  ScrollText,
  ScanSearch,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DATA_MODE } from "@/data/mock";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/payload-inspector", label: "Payload Inspector", icon: ScanSearch },
  { to: "/simulator", label: "Simulator", icon: FlaskConical },
  { to: "/topology", label: "Topology Graph", icon: Activity },
  { to: "/risk", label: "LRI* Risk Engine", icon: Gauge },
  { to: "/monitor", label: "Runtime Monitor", icon: Activity },
  { to: "/decisions", label: "Security Decisions", icon: ShieldCheck },
  { to: "/quarantine", label: "Quarantine Queue", icon: ShieldCheck },
  { to: "/detection", label: "Detection Engines", icon: ScanSearch },
  { to: "/policies", label: "Policy Management", icon: ScrollText },
  { to: "/permissions", label: "Agent Permissions", icon: Lock },
  { to: "/audit", label: "Audit Logs", icon: BadgeCheck },
  { to: "/compliance", label: "Compliance Mapping", icon: BookOpenCheck },
  { to: "/sensitivity-config", label: "Sensitivity Config", icon: Settings },
  { to: "/explainability", label: "Explainability", icon: BookOpenCheck },
  { to: "/evaluation", label: "Evaluation", icon: FlaskConical },
  { to: "/enforcement-verification", label: "Enforcement Verification", icon: ShieldCheck },
  { to: "/status", label: "System Status", icon: Activity },
  { to: "/settings", label: "System Settings", icon: Settings },
] as const;

export function SimulationBanner() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-mask/40 bg-mask/10 px-3 py-2 text-xs text-mask">
      <span className="rounded-sm bg-mask/20 px-1.5 py-0.5 font-mono font-semibold tracking-wide">
        {DATA_MODE}
      </span>
      <span className="text-muted-foreground">
        Figures below come from scripted mock agents, not from a deployed system or a
        real LLM. They demonstrate the interface, not measured security performance.
      </span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[264px] overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-sidebar-foreground">
              PrivAgentShield
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Runtime security gateway
            </p>
          </div>
          <button
            className="ml-auto text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className: "bg-sidebar-accent text-primary border-primary/40",
              }}
              className="flex items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-6">
          <div className="rounded-md border border-border bg-card/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Runtime mode
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-mask">
              <span className="size-2 animate-pulse rounded-full bg-mask" />
              Simulation / mock
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              No LLM provider connected. Gateway decisions are produced by the
              deterministic rule pipeline over scripted agents.
            </p>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <span className="font-mono text-sm font-semibold">PrivAgentShield</span>
        </header>
        <main className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
