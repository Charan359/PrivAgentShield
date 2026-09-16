import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Chip, Panel } from "@/components/primitives";
import { LriBreakdown } from "@/components/lri-breakdown";
import { PayloadDiff } from "@/components/payload-diff";
import { agentById, decisions } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explainability")({
  head: () => ({
    meta: [
      { title: "Explainability & LRI* Calculation Tree — PrivAgentShield" },
      {
        name: "description",
        content:
          "Full decision trace and LRI* calculation tree (Tm, Δij, Πj) for any mediated inter-agent envelope.",
      },
    ],
  }),
  component: Explainability,
});

function Explainability() {
  const [id, setId] = useState(decisions[0]!.id);
  const d = decisions.find((x) => x.id === id) ?? decisions[0]!;

  const action: "ALLOW" | "SANITIZE" | "QUARANTINE" =
    d.action === "BLOCK" ? "QUARANTINE" : d.action === "MASK" || d.action === "REDACT" ? "SANITIZE" : "ALLOW";

  const tm = Number((d.lri / 100).toFixed(2));
  const deltaIj = d.action === "BLOCK" ? 1 : 0;
  const piJ = d.to === "research" ? 0.85 : 0.25;
  const lriStar = Math.max(deltaIj, tm * piJ);

  const steps = [
    { stage: "Stage 1 · Three-Tier Inspection", body: `Detector flagged: ${d.detected}`, status: "Tier 1 Pattern scan completed" },
    { stage: "Stage 2 · Taint Calculation (Tm)", body: `Calculated T*m = ${tm.toFixed(2)}`, status: "Severity levels & entropy modifiers applied" },
    { stage: "Stage 3 · Clearance Verification (Δij)", body: `Δ*ij = ${deltaIj.toFixed(2)}`, status: deltaIj === 1 ? "Clearance violation detected!" : "Clearance constraints satisfied" },
    { stage: "Stage 4 · Reachability Analysis (Πj)", body: `Π*j = ${piJ.toFixed(2)}`, status: "Markov fundamental matrix (I-Q)⁻¹ computed" },
    { stage: "Stage 5 · LRI* Risk Evaluation", body: `LRI* = max(${deltaIj.toFixed(2)}, ${tm.toFixed(2)} × ${piJ.toFixed(2)}) = ${lriStar.toFixed(2)}`, status: `Threshold check → ${action}` },
    { stage: "Stage 6 · Policy Action Gate", body: `${d.policy} (${d.policyId}) matched`, status: `${action} enforced in ${d.latencyMs} ms` },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Decision transparency"
        title="Explainability & Decision Rationale"
        subtitle="Reproducible decision traces: view the exact LRI* calculation tree, clearance check, and reachability math behind any mediated envelope."
        actions={
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="rounded border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground"
          >
            {decisions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id} · {x.action}
              </option>
            ))}
          </select>
        }
      />
      <SimulationBanner />

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Left: Decision trace steps */}
        <Panel title="Pipeline Decision Trace" description={`Step-by-step evaluation for ${d.id}.`}>
          <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
            {steps.map((s) => (
              <li key={s.stage} className="relative">
                <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  {s.stage}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">{s.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.status}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <ActionBadge action={d.action} />
            <Chip tone="primary">{d.category}</Chip>
            <span className={cn("rounded border px-2 py-0.5 font-mono text-xs font-bold",
              lriStar >= 0.7 ? "border-block/40 bg-block/10 text-block" :
              lriStar >= 0.3 ? "border-mask/40 bg-mask/10 text-mask" : "border-allow/40 bg-allow/10 text-allow"
            )}>
              LRI* {lriStar.toFixed(2)}
            </span>
          </div>

          <div className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/80 mb-1">Human-Readable Rationale</p>
            {d.explanation}
          </div>
        </Panel>

        {/* Right: Full LRI* calculation breakdown tree */}
        <div className="flex flex-col gap-4">
          <LriBreakdown
            senderId={d.from}
            recipientId={d.to}
            tm={tm}
            deltaIj={deltaIj}
            piJ={piJ}
            lriStar={lriStar}
            action={action}
          />
        </div>
      </div>

      {/* Payload Transformation side-by-side */}
      <Panel title="Payload Transformation Output" description="Original intercepted message versus sanitized/quarantined output delivered to recipient.">
        <PayloadDiff
          originalPayload={d.rawContent}
          sanitizedPayload={d.sanitizedContent}
          action={action}
        />
      </Panel>
    </Shell>
  );
}
