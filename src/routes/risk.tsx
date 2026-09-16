import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Metric, Panel } from "@/components/primitives";
import { Slider } from "@/components/ui/slider";
import {
  DEMO_WALKTHROUGH_ALLOW,
  DEMO_WALKTHROUGH_QUARANTINE,
  DEFAULT_THRESHOLDS,
  type ThresholdConfig,
  type LriAction,
} from "@/lib/lri/types";
import { lriDecision } from "@/lib/lri/engine";
import { decisions } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "LRI* Risk Engine — PrivAgentShield" },
      {
        name: "description",
        content:
          "Non-compensatory minimax risk metric formulation LRI*(vi, vj, m) = max(Δij(m), Tm × Π*j) with interactive decision boundary sliders.",
      },
    ],
  }),
  component: Risk,
});

function ThresholdControls({
  thresholds,
  onChange,
}: {
  thresholds: ThresholdConfig;
  onChange: (t: ThresholdConfig) => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-mono text-foreground font-semibold">τlow (ALLOW → SANITIZE)</span>
          <span className="font-mono text-mask font-bold">{thresholds.tauLow.toFixed(2)}</span>
        </div>
        <Slider
          value={[thresholds.tauLow]}
          min={0.05}
          max={thresholds.tauHigh - 0.05}
          step={0.05}
          onValueChange={([val]) => val !== undefined && onChange({ ...thresholds, tauLow: Number(val.toFixed(2)) })}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Flows with LRI* &lt; τlow are delivered verbatim (ALLOW).
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-mono text-foreground font-semibold">τhigh (SANITIZE → QUARANTINE)</span>
          <span className="font-mono text-block font-bold">{thresholds.tauHigh.toFixed(2)}</span>
        </div>
        <Slider
          value={[thresholds.tauHigh]}
          min={thresholds.tauLow + 0.05}
          max={0.95}
          step={0.05}
          onValueChange={([val]) => val !== undefined && onChange({ ...thresholds, tauHigh: Number(val.toFixed(2)) })}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Flows with LRI* ≥ τhigh trigger mandatory QUARANTINE.
        </p>
      </div>
    </div>
  );
}

function DecisionBoundaryVisualizer({ thresholds }: { thresholds: ThresholdConfig }) {
  const lowPct = thresholds.tauLow * 100;
  const highPct = thresholds.tauHigh * 100;

  return (
    <div className="mt-4 rounded-md border border-border bg-card/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        Active Decision Boundaries
      </p>
      <div className="relative h-6 w-full overflow-hidden rounded-md bg-secondary flex">
        {/* ALLOW zone */}
        <div
          className="h-full bg-allow/20 border-r border-allow/40 flex items-center justify-center text-[11px] font-mono text-allow font-bold"
          style={{ width: `${lowPct}%` }}
        >
          ALLOW
        </div>
        {/* SANITIZE zone */}
        <div
          className="h-full bg-mask/20 border-r border-mask/40 flex items-center justify-center text-[11px] font-mono text-mask font-bold"
          style={{ width: `${highPct - lowPct}%` }}
        >
          SANITIZE
        </div>
        {/* QUARANTINE zone */}
        <div
          className="h-full bg-block/20 flex items-center justify-center text-[11px] font-mono text-block font-bold flex-1"
        >
          QUARANTINE
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
        <span>0.00</span>
        <span>τlow = {thresholds.tauLow.toFixed(2)}</span>
        <span>τhigh = {thresholds.tauHigh.toFixed(2)}</span>
        <span>1.00</span>
      </div>
    </div>
  );
}

function WalkthroughCard({
  example,
  thresholds,
}: {
  example: typeof DEMO_WALKTHROUGH_ALLOW;
  thresholds: ThresholdConfig;
}) {
  const action: LriAction = lriDecision(example.lriStar, thresholds);
  const isAllow = action === "ALLOW";
  const isSanitize = action === "SANITIZE";

  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-sm font-semibold text-foreground">{example.label}</h4>
        <span
          className={cn(
            "rounded border px-2 py-0.5 font-mono text-xs font-bold",
            isAllow ? "border-allow/40 bg-allow/10 text-allow" :
            isSanitize ? "border-mask/40 bg-mask/10 text-mask" :
            "border-block/40 bg-block/10 text-block"
          )}
        >
          {action}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{example.note}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded border border-border bg-secondary/40 p-2">
          <p className="font-mono text-[9px] text-muted-foreground">T*m (Taint)</p>
          <p className="font-mono font-semibold text-foreground">{example.tm.toFixed(2)}</p>
        </div>
        <div className="rounded border border-border bg-secondary/40 p-2">
          <p className="font-mono text-[9px] text-muted-foreground">Δ*ij (Clearance)</p>
          <p className="font-mono font-semibold text-foreground">{example.deltaIj.toFixed(2)}</p>
        </div>
        <div className="rounded border border-border bg-secondary/40 p-2">
          <p className="font-mono text-[9px] text-muted-foreground">Π*j (Reachability)</p>
          <p className="font-mono font-semibold text-foreground">{example.piJ.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-3 rounded border border-primary/20 bg-primary/5 p-2 font-mono text-xs text-primary">
        LRI* = {example.formula}
      </div>
    </div>
  );
}

function Risk() {
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);

  return (
    <Shell>
      <PageHeader
        eyebrow="Non-compensatory minimax risk metric"
        title="LRI* Risk Calculation Engine"
        subtitle="LRI*(vi, vj, m) = max(Δij(m), Tm × Π*j). Combines Message Sensitivity (Tm), Clearance Dominance (Δij), and Downstream Reachability (Πj) into a unified risk decision."
      />
      <SimulationBanner />

      {/* Notice */}
      <div className="rounded-md border border-mask/40 bg-mask/10 p-3 text-xs text-mask">
        ⚠ <strong>Demonstration Defaults Notice:</strong> τlow = {thresholds.tauLow.toFixed(2)} and τhigh = {thresholds.tauHigh.toFixed(2)} are clearly labeled as configurable demonstration defaults, not experimentally calibrated values. Adjusting the sliders below updates the action decision immediately.
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Metric Type" value="Minimax LRI*" tone="primary" hint="Non-compensatory formulation" />
        <Metric label="Active τlow" value={thresholds.tauLow.toFixed(2)} tone="allow" hint="ALLOW boundary" />
        <Metric label="Active τhigh" value={thresholds.tauHigh.toFixed(2)} tone="block" hint="QUARANTINE boundary" />
        <Metric label="Paper Reference" value="Eq. (4)" hint="PrivAgentShield formulation" />
      </div>

      {/* Interactive Threshold Configuration Panel */}
      <Panel
        title="Interactive Threshold Configuration"
        description="Adjust decision boundaries in real time. Changes immediately update downstream evaluation logic."
        right={
          <button
            onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Defaults
          </button>
        }
      >
        <ThresholdControls thresholds={thresholds} onChange={setThresholds} />
        <DecisionBoundaryVisualizer thresholds={thresholds} />
      </Panel>

      {/* Paper Walkthrough Examples */}
      <Panel
        title="Paper Demonstration Walkthroughs"
        description="Explicit demonstration examples from the PrivAgentShield paper showing how LRI* combines Tm, Δij, and Πj."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <WalkthroughCard example={DEMO_WALKTHROUGH_ALLOW} thresholds={thresholds} />
          <WalkthroughCard example={DEMO_WALKTHROUGH_QUARANTINE} thresholds={thresholds} />
        </div>
      </Panel>

      {/* Three Components Detailed Explanation */}
      <Panel
        title="The Three Components of LRI*"
        description="Why PrivAgentShield uses a non-compensatory minimax metric instead of a generic additive risk score."
      >
        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-md border border-border bg-card/60 p-4">
            <h4 className="font-mono text-sm font-semibold text-primary">① T*m — Message Taint</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Quantifies payload sensitivity: <code>Tm = min(1.0, Σ s(ek) × ω(ek))</code>.
              Uses paper severity weights L1=0.1, L2=0.3, L3=0.7, L4=1.0. For secrets, entropy modifier <code>ω = H/Hmax</code> is applied.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/60 p-4">
            <h4 className="font-mono text-sm font-semibold text-primary">② Δ*ij — Clearance Dominance</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Lattice clearance check: <code>Δij = 1.0</code> if any payload sensitivity level exceeds recipient's clearance in that category, else <code>0.0</code>.
              When <code>Δij = 1</code>, LRI* is automatically maximized to 1.0 (non-compensatory).
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/60 p-4">
            <h4 className="font-mono text-sm font-semibold text-primary">③ Π*j — Downstream Reachability</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Markov absorption probability: <code>Π*j = max_s B[j,s]</code> where <code>B = (I−Q)⁻¹ × R</code>.
              Measures recipient agent's maximum probability of routing data to an external sink.
            </p>
          </div>
        </div>
      </Panel>

      {/* Recent decisions with LRI* re-evaluated */}
      <Panel
        title="Sample Flow Evaluations"
        description="Recomputed decisions based on current threshold configuration."
      >
        <ul className="divide-y divide-border text-xs">
          {decisions.map((d) => {
            const simulatedLri = d.lri / 100;
            const currentAction = lriDecision(simulatedLri, thresholds);
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-mono text-muted-foreground">{d.id}</span>
                <span className="text-foreground flex-1 truncate px-2">{d.detected}</span>
                <span className="font-mono text-muted-foreground">LRI* {simulatedLri.toFixed(2)}</span>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[10px] font-semibold",
                    currentAction === "ALLOW" ? "border-allow/40 bg-allow/10 text-allow" :
                    currentAction === "SANITIZE" ? "border-mask/40 bg-mask/10 text-mask" :
                    "border-block/40 bg-block/10 text-block"
                  )}
                >
                  {currentAction}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </Shell>
  );
}
