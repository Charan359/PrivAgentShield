import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Chip, Panel, SensitivityBadge } from "@/components/primitives";
import { PayloadDiff } from "@/components/payload-diff";
import { agentById, decisions, type ActionType } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/decisions")({
  head: () => ({
    meta: [
      { title: "Security Decisions — PrivAgentShield" },
      {
        name: "description",
        content:
          "Enforcement decision cards with LRI* breakdown (Tm, Δij, Πj), side-by-side payload diff, policy matched, and rationale.",
      },
    ],
  }),
  component: Decisions,
});

const filters: (ActionType | "ALL")[] = ["ALL", "ALLOW", "MASK", "REDACT", "BLOCK"];

function Decisions() {
  const [filter, setFilter] = useState<ActionType | "ALL">("ALL");
  const list = decisions.filter((d) => filter === "ALL" || d.action === filter);

  return (
    <Shell>
      <PageHeader
        eyebrow="Enforcement record"
        title="Security Decisions"
        subtitle="Each card represents a mediated inter-agent flow: detected entities, LRI* calculation, matched policy, and side-by-side payload transformation."
        actions={
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors " +
                  (filter === f
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <SimulationBanner />

      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((d) => {
          const lriAction: "ALLOW" | "SANITIZE" | "QUARANTINE" =
            d.action === "BLOCK" ? "QUARANTINE" : d.action === "MASK" || d.action === "REDACT" ? "SANITIZE" : "ALLOW";
          const tm = Number((d.lri / 100).toFixed(2));
          const deltaIj = d.action === "BLOCK" ? 1 : 0;
          const piJ = d.to === "research" ? 0.85 : 0.25;
          const lriStar = Math.max(deltaIj, tm * piJ);

          return (
            <Panel key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {d.id} · seq #{d.seq} · {d.channel} channel
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {agentById(d.from)?.name ?? d.from} → {agentById(d.to)?.name ?? d.to}
                  </p>
                </div>
                <ActionBadge action={d.action} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip tone="primary">{d.category}</Chip>
                <SensitivityBadge level={d.sensitivity} />
                <span className={cn("rounded border px-2 py-0.5 font-mono text-xs font-bold",
                  lriStar >= 0.7 ? "border-block/40 bg-block/10 text-block" :
                  lriStar >= 0.3 ? "border-mask/40 bg-mask/10 text-mask" : "border-allow/40 bg-allow/10 text-allow"
                )}>
                  LRI* {lriStar.toFixed(2)}
                </span>
              </div>

              {/* LRI* Mini Metrics */}
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="rounded border border-border bg-secondary/40 p-1.5">
                  <p className="font-mono text-[9px] text-muted-foreground">T*m</p>
                  <p className="font-mono font-semibold text-foreground">{tm.toFixed(2)}</p>
                </div>
                <div className="rounded border border-border bg-secondary/40 p-1.5">
                  <p className="font-mono text-[9px] text-muted-foreground">Δ*ij</p>
                  <p className="font-mono font-semibold text-foreground">{deltaIj.toFixed(2)}</p>
                </div>
                <div className="rounded border border-border bg-secondary/40 p-1.5">
                  <p className="font-mono text-[9px] text-muted-foreground">Π*j</p>
                  <p className="font-mono font-semibold text-foreground">{piJ.toFixed(2)}</p>
                </div>
                <div className="rounded border border-border bg-secondary/40 p-1.5">
                  <p className="font-mono text-[9px] text-muted-foreground">LRI*</p>
                  <p className="font-mono font-bold text-block">{lriStar.toFixed(2)}</p>
                </div>
              </div>

              <dl className="mt-3 grid gap-2 text-xs">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Detected information
                  </dt>
                  <dd className="mt-0.5 text-foreground/90 font-medium">{d.detected}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Matched policy
                  </dt>
                  <dd className="mt-0.5 text-foreground/90">
                    {d.policy}{" "}
                    <span className="font-mono text-muted-foreground">({d.policyId})</span>
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Explanation Rationale
                  </dt>
                  <dd className="mt-0.5 leading-relaxed text-muted-foreground">
                    {d.explanation}
                  </dd>
                </div>
              </dl>

              {/* Side by side payload diff */}
              <div className="mt-3">
                <PayloadDiff
                  originalPayload={d.rawContent}
                  sanitizedPayload={d.sanitizedContent}
                  action={lriAction}
                />
              </div>

              <p className="mt-3 border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
                {d.ts} · inspected in {d.latencyMs} ms
              </p>
            </Panel>
          );
        })}
      </div>
    </Shell>
  );
}
