import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Play, ChevronRight, RotateCcw, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Panel } from "@/components/primitives";
import { SCENARIOS, type Scenario, type ScenarioStep } from "@/data/scenarios";
import { runtimeMediationService } from "@/services/runtime/mediation";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Interactive Simulator — PrivAgentShield" },
      { name: "description", content: "Step through 8 scripted simulation scenarios and watch the three-tier inspection pipeline, LRI* calculation, and policy decision in real time." },
    ],
  }),
  component: SimulatorPage,
});

const ACTION_STYLE = {
  ALLOW:      { bg: "bg-allow/10",  border: "border-allow/40",  text: "text-allow",  icon: CheckCircle2 },
  SANITIZE:   { bg: "bg-mask/10",   border: "border-mask/40",   text: "text-mask",   icon: Zap },
  QUARANTINE: { bg: "bg-block/10",  border: "border-block/40",  text: "text-block",  icon: ShieldAlert },
};

const TIER_COLOR: Record<number, string> = {
  1: "bg-primary/10 border-primary/40 text-primary",
  2: "bg-mask/10 border-mask/40 text-mask",
  3: "bg-block/10 border-block/40 text-block",
};

function StageIcon({ stage }: { stage: ScenarioStep["stage"] }) {
  if (stage.includes("tier1")) return <span className="font-mono text-[10px] text-primary">T1</span>;
  if (stage.includes("tier2")) return <span className="font-mono text-[10px] text-mask">T2</span>;
  if (stage.includes("tier3")) return <span className="font-mono text-[10px] text-block">T3</span>;
  if (stage === "decision" || stage.startsWith("action")) return <span className="font-mono text-[10px] text-foreground">⚡</span>;
  return <span className="font-mono text-[10px] text-muted-foreground">→</span>;
}

function ScenarioCard({ scenario, selected, onSelect }: { scenario: Scenario; selected: boolean; onSelect: () => void }) {
  const style = ACTION_STYLE[scenario.expectedAction];
  const Icon = style.icon;
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        selected ? `${style.bg} ${style.border}` : "border-border hover:bg-secondary"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{scenario.id}</span>
        <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${style.bg} ${style.border} ${style.text}`}>
          <Icon className="size-2.5" />
          {scenario.expectedAction}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">{scenario.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{scenario.description}</p>
    </button>
  );
}

function PipelineStep({
  step,
  active,
  completed,
  index,
}: {
  step: ScenarioStep;
  active: boolean;
  completed: boolean;
  index: number;
}) {
  return (
    <div className={`flex gap-3 rounded-md border p-3 transition-all ${
      active
        ? "border-primary/50 bg-primary/8 shadow-sm"
        : completed
        ? "border-border bg-secondary/40"
        : "border-border/50 opacity-40"
    }`}>
      <div className="flex w-6 shrink-0 flex-col items-center">
        <div className={`grid size-6 place-items-center rounded-full border text-[10px] font-mono ${
          active ? "border-primary bg-primary/20 text-primary" :
          completed ? "border-allow/40 bg-allow/10 text-allow" :
          "border-border text-muted-foreground"
        }`}>
          {completed && !active ? "✓" : index + 1}
        </div>
        {index < 9 && <div className="mt-1 flex-1 w-px bg-border" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StageIcon stage={step.stage} />
          <p className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground/70"}`}>
            {step.label}
          </p>
          {step.tierId && (
            <span className={`rounded border px-1 py-px font-mono text-[9px] font-semibold ${TIER_COLOR[step.tierId]}`}>
              Tier {step.tierId}
            </span>
          )}
        </div>
        {(active || completed) && (
          <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
        )}
        {(active || completed) && step.value && (
          <p className={`mt-1 font-mono text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
            {step.value}
          </p>
        )}
      </div>
    </div>
  );
}

function SimulatorPage() {
  const [selectedId, setSelectedId] = useState<string>(SCENARIOS[0]!.id);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [running, setRunning] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === selectedId)!;
  const steps = scenario.steps;

  const selectScenario = useCallback((id: string) => {
    setSelectedId(id);
    setCurrentStep(-1);
    setRunning(false);
  }, []);

  const advance = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length]);

  const runAll = useCallback(async () => {
    setRunning(true);
    setCurrentStep(-1);
    runtimeMediationService.processMessage({
      sessionId: `sim-${scenario.id}-${Date.now().toString().slice(-4)}`,
      senderId: scenario.senderId,
      recipientId: scenario.recipientId,
      content: scenario.payload,
    });
    for (let i = 0; i < steps.length; i++) {
      await new Promise<void>((res) => setTimeout(res, 400));
      setCurrentStep(i);
    }
    setRunning(false);
  }, [scenario, steps.length]);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setRunning(false);
  }, []);

  const style = ACTION_STYLE[scenario.expectedAction];

  return (
    <Shell>
      <PageHeader
        eyebrow="Simulation engine"
        title="Interactive Simulator"
        subtitle="Step through 8 scripted scenarios and observe the three-tier inspection pipeline, LRI* calculation, and policy decision in real time."
      />
      <SimulationBanner />

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Scenario list */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Scenarios
          </p>
          {SCENARIOS.map((sc) => (
            <ScenarioCard
              key={sc.id}
              scenario={sc}
              selected={sc.id === selectedId}
              onSelect={() => selectScenario(sc.id)}
            />
          ))}
        </div>

        {/* Simulation panel */}
        <div className="flex flex-col gap-4">
          {/* Scenario header */}
          <Panel
            title={scenario.name}
            description={scenario.description}
            right={
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={running}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="size-3" /> Reset
                </button>
                <button
                  onClick={advance}
                  disabled={running || currentStep >= steps.length - 1}
                  className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary disabled:opacity-40"
                >
                  <ChevronRight className="size-3" /> Step
                </button>
                <button
                  onClick={runAll}
                  disabled={running}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                >
                  <Play className="size-3" /> Run All
                </button>
              </div>
            }
          >
            {/* Metadata row */}
            <div className="mb-4 flex flex-wrap gap-4 text-xs">
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">Sender:</span>{" "}
                <span className="font-mono">{scenario.senderName}</span>
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">Recipient:</span>{" "}
                <span className="font-mono">{scenario.recipientName}</span>
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">Category:</span>{" "}
                {scenario.category}
              </span>
            </div>

            {/* Payload preview */}
            <div className="mb-4 rounded-md border border-border bg-secondary/40 p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Message Payload
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">{scenario.payload}</p>
              {scenario.highlightEntities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scenario.highlightEntities.map((e, i) => (
                    <span
                      key={i}
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${TIER_COLOR[e.tier]}`}
                    >
                      {e.text} — {e.type}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Expected LRI* values */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "T*m", value: scenario.expectedTm.toFixed(2) },
                { label: "Δ*ij", value: scenario.expectedDeltaIj.toFixed(2) },
                { label: "Π*j", value: scenario.expectedPiJ.toFixed(2) },
                { label: "LRI*", value: scenario.expectedLriStar.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md border border-border bg-card/60 p-2 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Decision */}
            {currentStep >= steps.length - 1 && (
              <div className={`mb-4 rounded-md border p-3 ${style.bg} ${style.border}`}>
                <p className={`font-mono text-sm font-bold ${style.text}`}>
                  Decision: {scenario.expectedAction}
                </p>
                {scenario.sanitizedPayload && (
                  <div className="mt-2">
                    <p className="font-mono text-[10px] text-muted-foreground">Sanitized output:</p>
                    <p className="mt-1 font-mono text-xs text-foreground/80">{scenario.sanitizedPayload}</p>
                  </div>
                )}
                {scenario.quarantineReason && (
                  <p className="mt-1 text-xs text-muted-foreground">{scenario.quarantineReason}</p>
                )}
              </div>
            )}
          </Panel>

          {/* Pipeline steps */}
          <Panel title="Pipeline Execution" description="Three-tier inspection → LRI* calculation → policy decision">
            {currentStep === -1 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Press <kbd className="mx-1.5 rounded border border-border px-1.5 py-0.5 font-mono text-xs">Step</kbd> or{" "}
                <kbd className="mx-1.5 rounded border border-border px-1.5 py-0.5 font-mono text-xs">Run All</kbd> to begin.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {steps.map((step, i) => (
                  <PipelineStep
                    key={step.stage + i}
                    step={step}
                    index={i}
                    active={i === currentStep}
                    completed={i < currentStep}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
