import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Bar, Metric, Panel } from "@/components/primitives";
import { evaluationMetrics, latencyDistribution, overviewStats } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Planned Evaluation — PrivAgentShield" },
      {
        name: "description",
        content:
          "Planned evaluation framework for AgentLeak, AgentDojo, Presidio, GLiNER. Displays simulated corpus metrics and state distinctions (Live/Demo Simulation, Configured, Planned Evaluation, Measured).",
      },
    ],
  }),
  component: Evaluation,
});

const m = evaluationMetrics;

const STATE_BADGES = [
  { label: "Live/Demo Simulation", active: true, desc: "Interactive runtime with simulated 3-tier engines", color: "bg-primary/10 border-primary/40 text-primary" },
  { label: "Configured", active: true, desc: "LRI* thresholds, ABAC policies, and clearance vectors active", color: "bg-allow/10 border-allow/40 text-allow" },
  { label: "Planned Evaluation", active: true, desc: "Empirical benchmarking on AgentLeak & AgentDojo planned", color: "bg-mask/10 border-mask/40 text-mask" },
  { label: "Measured Empirical", active: false, desc: "No measured deployment claim fabricated", color: "bg-secondary border-border text-muted-foreground" },
];

const detectionRows = [
  { name: "Accuracy", value: m.accuracy, status: "Planned Evaluation" },
  { name: "Precision", value: m.precision, status: "Planned Evaluation" },
  { name: "Recall", value: m.recall, status: "Planned Evaluation" },
  { name: "F1-score", value: m.f1, status: "Planned Evaluation" },
];

const securityRows = [
  { name: "Leakage rate", value: m.leakageRate, lowerIsBetter: true },
  { name: "Prevention rate", value: m.preventionRate, lowerIsBetter: false },
  { name: "False-positive rate", value: m.falsePositiveRate, lowerIsBetter: true },
  { name: "Task-completion rate", value: m.taskCompletionRate, lowerIsBetter: false },
];

function Evaluation() {
  const maxLat = Math.max(...latencyDistribution.map((l) => l.count));

  return (
    <Shell>
      <PageHeader
        eyebrow="Empirical evaluation plan"
        title="Evaluation Framework & Planned Benchmarks"
        subtitle="PrivAgentShield evaluates mitigation performance using a synthetic ground-truth corpus. Empirical benchmarks on AgentLeak and AgentDojo are planned evaluation targets."
      />
      <SimulationBanner />

      {/* Mandatory State Distinctions Banner */}
      <Panel title="System State Distinction & Research Claims Policy" description="Paper-faithful distinction between active simulation, configuration, and planned evaluations.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATE_BADGES.map((b) => (
            <div key={b.label} className={cn("rounded-md border p-3 text-xs", b.color)}>
              <div className="flex items-center justify-between font-mono font-bold">
                <span>{b.label}</span>
                <span>{b.active ? "● ACTIVE" : "○ PLANNED"}</span>
              </div>
              <p className="mt-1 text-[11px] opacity-80">{b.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded border border-mask/30 bg-mask/5 p-3 text-xs text-mask">
          ⚠ <strong>Research Integrity Notice:</strong> The figures below come from scripted scenario runs. No fake accuracy numbers or claims of measured 99% prevention have been fabricated. Empirical measurement against AgentLeak, AgentDojo, Presidio, GLiNER, and Hyperscan native bindings is designated as planned future evaluation.
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Corpus size" value={m.corpusSize.toLocaleString()} tone="primary" hint="Simulated scenario runs" />
        <Metric label="F1-score (Simulated)" value={m.f1.toFixed(3)} tone="allow" hint="Planned benchmark target: > 0.90" />
        <Metric label="Leakage rate" value={`${(m.leakageRate * 100).toFixed(1)}%`} tone="block" hint="Simulated baseline: 6.1%" />
        <Metric label="Avg latency" value={`${overviewStats.avgLatencyMs} ms`} hint={`p95 ${overviewStats.p95LatencyMs} ms`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Detection Quality (Simulated Corpus)" description="Span-level classification against ground truth in simulated runs.">
          <ul className="flex flex-col gap-3">
            {detectionRows.map((r) => (
              <li key={r.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground flex items-center gap-2">
                    {r.name}
                    <span className="rounded border border-mask/30 bg-mask/10 px-1 py-px font-mono text-[9px] text-mask">
                      SIMULATED
                    </span>
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {(r.value * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={r.value * 100} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Security & Utility Metrics" description="Protection strength weighed against collaboration efficiency.">
          <ul className="flex flex-col gap-3">
            {securityRows.map((r) => (
              <li key={r.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    {r.name}
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      {r.lowerIsBetter ? "↓ better" : "↑ better"}
                    </span>
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {(r.value * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={r.value * 100} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Confusion Matrix (Simulated Runs)" description="Counts over the 4,820 scenario message corpus.">
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { l: "True positives", v: m.tp, t: "text-allow" },
              { l: "False positives", v: m.fp, t: "text-mask" },
              { l: "False negatives", v: m.fn, t: "text-block" },
              { l: "True negatives", v: m.tn, t: "text-foreground" },
            ].map((c) => (
              <div key={c.l} className="rounded-md border border-border bg-secondary/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.l}
                </p>
                <p className={"mt-1 font-mono text-xl font-semibold " + c.t}>{c.v}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Runtime Latency Distribution" description="Gateway inspection overhead per envelope (TypeScript fallback).">
          <div className="flex h-44 items-end gap-3">
            {latencyDistribution.map((l) => (
              <div key={l.bucket} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">{l.count}</span>
                <div
                  className="w-full rounded-t-sm bg-primary/60"
                  style={{ height: `${(l.count / maxLat) * 100}%` }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">{l.bucket}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Experiment Center & Planned Benchmarks Matrix */}
      <Panel
        title="Experiment Center — Planned Benchmark Suites"
        description="Formal experimental configurations defined for empirical evaluation in Phase 2. Status: PLANNED / AWAITING BENCHMARK EXECUTION."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "AgentLeak Benchmark",
              adapter: "AgentLeakBenchmarkAdapter",
              configs: "C2 (Dual-Agent), C3 (Triangular), C5 (Federated Team)",
              metrics: "Leakage Rate, Cumulative Taint Exposure, Task Completion",
              status: "PLANNED / AWAITING EXECUTION",
            },
            {
              name: "AgentDojo Benchmark",
              adapter: "AgentDojoBenchmarkAdapter",
              configs: "Prompt Injection, Tool Hijacking, Confused Deputy Scenarios",
              metrics: "Attack Success Rate (ASR), Utility Preservation",
              status: "PLANNED / AWAITING EXECUTION",
            },
            {
              name: "Baseline Comparison",
              adapter: "MultiBaselineRunner",
              configs: "No Protection, Output Guardrail, Presidio-only, IFC without Topology",
              metrics: "Comparative Precision/Recall, Prevention vs Baseline",
              status: "PLANNED / AWAITING EXECUTION",
            },
            {
              name: "Topology Sensitivity Study",
              adapter: "MarkovTopologyVaryingStudy",
              configs: "Varying Egress Probability (0.1 to 0.9), Absorbing Sink Count (1 to 5)",
              metrics: "Correlation between Π*j and Actual External Leakage",
              status: "PLANNED / AWAITING EXECUTION",
            },
            {
              name: "Ablation Study",
              adapter: "AblationMatrixRunner",
              configs: "Full PrivAgentShield vs [w/o LRI*] vs [w/o Topology] vs [w/o IFC]",
              metrics: "Ablation Delta, False Positive Impact",
              status: "PLANNED / AWAITING EXECUTION",
            },
            {
              name: "Threshold Sensitivity Sweep",
              adapter: "ThresholdTuningAnalyzer",
              configs: "Grid sweep: τlow ∈ [0.15, 0.45], τhigh ∈ [0.55, 0.85]",
              metrics: "Action Distribution Stability, Pareto Frontier",
              status: "PLANNED / AWAITING EXECUTION",
            },
          ].map((exp) => (
            <div key={exp.name} className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>{exp.name}</span>
                <span className="rounded border border-mask/40 bg-mask/10 px-1.5 py-0.5 text-[9px] text-mask">
                  PLANNED
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-primary">{exp.adapter}</p>
              <div className="mt-2 space-y-1 text-[11px]">
                <p className="text-muted-foreground"><strong className="text-foreground">Configs:</strong> {exp.configs}</p>
                <p className="text-muted-foreground"><strong className="text-foreground">Metrics:</strong> {exp.metrics}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Shell>
  );
}
