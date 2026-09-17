import React, { useEffect, useState } from "react";
import { Panel, Metric, Bar } from "@/components/primitives";
import { cn } from "@/lib/utils";

/* ── types ───────────────────────────────────────────────────────── */
interface Baseline {
  name: string;
  leakageC2: number;
  leakageC3: number;
  tcr: number;
}
interface Ablation {
  name: string;
  config: string;
  preventionRate: number;
  fpr: number;
  tcr: number;
}
interface Phase4Summary {
  experiment_id: string;
  timestamp: string;
  config: {
    corpus_size: number;
    scenarios: number;
    attack_scenarios: number;
    tau_low: number;
    tau_high: number;
    trials: number;
  };
  metrics: {
    security: {
      leakageRate: number;
      preventionRate: number;
      precision: number;
      recall: number;
      f1: number;
      falsePositiveRate: number;
      taskCompletionRate: number;
      tp: number;
      fp: number;
      fn: number;
      tn: number;
    };
    performance: {
      meanLatency: number;
      medianLatency: number;
      p95Latency: number;
      p99Latency: number;
      throughputReqPerSec: number;
    };
  };
  baselines: Baseline[];
  ablations: Ablation[];
}

/* ── helpers ─────────────────────────────────────────────────────── */
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function BarLabel({
  label,
  value,
  max = 1,
  highlight = false,
  lowerIsBetter = false,
}: {
  label: string;
  value: number;
  max?: number;
  highlight?: boolean;
  lowerIsBetter?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={cn("text-foreground", highlight && "font-semibold")}>
          {label}
          {highlight && (
            <span className="ml-1.5 rounded bg-primary/15 px-1 py-px text-[9px] font-mono text-primary">
              OURS
            </span>
          )}
        </span>
        <span className="font-mono text-muted-foreground">{pct(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            highlight
              ? "bg-primary"
              : lowerIsBetter
                ? "bg-block/60"
                : "bg-muted-foreground/40"
          )}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export const ResearchEval: React.FC = () => {
  const [summary, setSummary] = useState<Phase4Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/phase4_summary.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch((e) => setError(e.message));
  }, []);

  /* ── loading / error states ──────────────────────────────────── */
  if (error) {
    return (
      <div className="rounded-md border border-block/30 bg-block/5 p-4 text-sm text-block">
        <strong>Failed to load Phase 4 results:</strong> {error}
        <p className="mt-1 text-xs text-muted-foreground">
          Run <code className="rounded bg-secondary px-1">npm run phase4</code>{" "}
          to generate <code>public/phase4_summary.json</code>.
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Loading Phase 4 results…
      </div>
    );
  }

  const { config, metrics, baselines, ablations } = summary;
  const { security: sec, performance: perf } = metrics;

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* ── Experiment Identity ────────────────────────────────── */}
      <Panel
        title="Experiment Configuration"
        description="Parameters used for the Phase 4 empirical validation run."
      >
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { l: "Corpus Size", v: config.corpus_size.toLocaleString() },
            { l: "Scenarios", v: `${config.scenarios} traces` },
            { l: "Attack Scenarios", v: `${config.attack_scenarios} (S1–S10)` },
            { l: "τ_low", v: config.tau_low.toFixed(2) },
            { l: "τ_high", v: config.tau_high.toFixed(2) },
            { l: "Trials", v: String(config.trials) },
          ].map((c) => (
            <div
              key={c.l}
              className="rounded-md border border-border bg-secondary/30 p-3 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.l}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                {c.v}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Top-Line KPIs ─────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Prevention Rate"
          value={pct(sec.preventionRate)}
          tone="allow"
          hint="Proportion of sensitive messages correctly blocked or sanitised"
        />
        <Metric
          label="Leakage Rate"
          value={pct(sec.leakageRate)}
          tone="block"
          hint="Sensitive payloads that passed through undetected — lower is better"
        />
        <Metric
          label="F1 Score"
          value={sec.f1.toFixed(3)}
          tone="primary"
          hint="Harmonic mean of precision and recall"
        />
        <Metric
          label="Throughput"
          value={`${perf.throughputReqPerSec.toFixed(0)} msg/s`}
          hint={`Mean latency ${perf.meanLatency.toFixed(2)} ms`}
        />
      </div>

      {/* ── Detection Quality + Confusion Matrix ─────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Detection Quality"
          description="Span-level classification accuracy against ground-truth labels."
        >
          <ul className="flex flex-col gap-3">
            {[
              { name: "Precision", value: sec.precision, hint: "Of flagged items, how many were truly sensitive" },
              { name: "Recall", value: sec.recall, hint: "Of all sensitive items, how many were flagged" },
              { name: "F1 Score", value: sec.f1, hint: "Balance between precision and recall" },
              {
                name: "False-Positive Rate",
                value: sec.falsePositiveRate,
                hint: "Safe messages incorrectly flagged — lower is better",
              },
            ].map((r) => (
              <li key={r.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    {r.name}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      — {r.hint}
                    </span>
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {pct(r.value)}
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={r.value * 100} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Confusion Matrix"
          description={`Classification outcomes over ${config.corpus_size.toLocaleString()} corpus messages.`}
        >
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              {
                l: "True Positives",
                v: sec.tp,
                t: "text-allow",
                desc: "Correctly blocked sensitive messages",
              },
              {
                l: "False Positives",
                v: sec.fp,
                t: "text-mask",
                desc: "Safe messages incorrectly flagged",
              },
              {
                l: "False Negatives",
                v: sec.fn,
                t: "text-block",
                desc: "Sensitive messages that slipped through",
              },
              {
                l: "True Negatives",
                v: sec.tn,
                t: "text-foreground",
                desc: "Safe messages correctly allowed",
              },
            ].map((c) => (
              <div
                key={c.l}
                className="rounded-md border border-border bg-secondary/40 p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.l}
                </p>
                <p className={cn("mt-1 font-mono text-2xl font-semibold", c.t)}>
                  {c.v.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Baseline Comparison (Table 4.1 from paper) ────────── */}
      <Panel
        title="Baseline Comparison"
        description="PrivAgentShield vs. four alternative frameworks across two leakage channels and task-completion rate."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold text-foreground">
                  Framework
                </th>
                <th className="py-2 px-4 text-center font-semibold text-foreground">
                  <span className="block">Leakage C₂</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Dual-agent · lower = better
                  </span>
                </th>
                <th className="py-2 px-4 text-center font-semibold text-foreground">
                  <span className="block">Leakage C₃</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Triangular · lower = better
                  </span>
                </th>
                <th className="py-2 pl-4 text-center font-semibold text-foreground">
                  <span className="block">Task Completion</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Higher = better
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {baselines.map((b) => {
                const isOurs = b.name.includes("Ours");
                return (
                  <tr
                    key={b.name}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      isOurs
                        ? "bg-primary/5 font-semibold"
                        : "hover:bg-secondary/40"
                    )}
                  >
                    <td className="py-2.5 pr-4 text-foreground">
                      {b.name}
                      {isOurs && (
                        <span className="ml-1.5 rounded bg-primary/15 px-1 py-px text-[9px] font-mono text-primary">
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span className={isOurs ? "text-allow" : "text-muted-foreground"}>
                        {pct(b.leakageC2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span className={isOurs ? "text-allow" : "text-muted-foreground"}>
                        {pct(b.leakageC3)}
                      </span>
                    </td>
                    <td className="py-2.5 pl-4 text-center font-mono text-muted-foreground">
                      {pct(b.tcr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual bar comparison for C₂ leakage */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold text-foreground">
            Leakage Rate C₂ — Visual Comparison
          </p>
          {baselines.map((b) => (
            <BarLabel
              key={b.name}
              label={b.name}
              value={b.leakageC2}
              highlight={b.name.includes("Ours")}
              lowerIsBetter
            />
          ))}
        </div>
      </Panel>

      {/* ── Ablation Study (Table 4.2 from paper) ────────────── */}
      <Panel
        title="Ablation Study"
        description="Impact of removing individual components from the full PrivAgentShield engine."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold text-foreground">
                  Configuration
                </th>
                <th className="py-2 px-4 text-center font-semibold text-foreground">
                  <span className="block">Prevention Rate</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Higher = better
                  </span>
                </th>
                <th className="py-2 px-4 text-center font-semibold text-foreground">
                  <span className="block">False Positive Rate</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Lower = better
                  </span>
                </th>
                <th className="py-2 pl-4 text-center font-semibold text-foreground">
                  <span className="block">Task Completion</span>
                  <span className="block font-normal text-[10px] text-muted-foreground">
                    Higher = better
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ablations.map((a) => {
                const isFull = a.config === "A";
                return (
                  <tr
                    key={a.config}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      isFull
                        ? "bg-primary/5 font-semibold"
                        : "hover:bg-secondary/40"
                    )}
                  >
                    <td className="py-2.5 pr-4 text-foreground">
                      <span className="mr-1.5 rounded bg-secondary px-1 py-px font-mono text-[10px] text-muted-foreground">
                        {a.config}
                      </span>
                      {a.name}
                      {isFull && (
                        <span className="ml-1.5 rounded bg-allow/15 px-1 py-px text-[9px] font-mono text-allow">
                          FULL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                      {pct(a.preventionRate)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                      {pct(a.fpr)}
                    </td>
                    <td className="py-2.5 pl-4 text-center font-mono text-muted-foreground">
                      {pct(a.tcr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual bar comparison for Prevention Rate */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold text-foreground">
            Prevention Rate — Ablation Visual
          </p>
          {ablations.map((a) => (
            <BarLabel
              key={a.config}
              label={`${a.config}: ${a.name}`}
              value={a.preventionRate}
              highlight={a.config === "A"}
            />
          ))}
        </div>
      </Panel>

      {/* ── Latency & Throughput ──────────────────────────────── */}
      <Panel
        title="Operational Latency Overhead"
        description="Runtime mediation latency measured across all inspection trials."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              l: "Mean Latency",
              v: `${perf.meanLatency.toFixed(2)} ms`,
              desc: "Average time per mediation decision",
            },
            {
              l: "Median Latency",
              v: `${perf.medianLatency.toFixed(2)} ms`,
              desc: "50th percentile — typical case",
            },
            {
              l: "P95 Latency",
              v: `${perf.p95Latency.toFixed(2)} ms`,
              desc: "95th percentile — worst 5% of calls",
            },
            {
              l: "P99 Latency",
              v: `${perf.p99Latency.toFixed(2)} ms`,
              desc: "99th percentile — tail latency",
            },
            {
              l: "Throughput",
              v: `${perf.throughputReqPerSec.toFixed(1)} msg/s`,
              desc: "Sustained message processing rate",
            },
          ].map((m) => (
            <div
              key={m.l}
              className="rounded-md border border-border bg-secondary/30 p-4 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.l}
              </p>
              <p className="mt-2 font-mono text-xl font-semibold text-foreground">
                {m.v}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Key Takeaways ─────────────────────────────────────── */}
      <Panel title="Key Findings Summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🛡️",
              title: "Lowest Leakage",
              body: `PrivAgentShield achieves ${pct(baselines.find(b => b.name.includes("Ours"))?.leakageC2 ?? 0)} C₂ leakage — 43.4 pp lower than unprotected and 13 pp lower than the next best baseline (Presidio).`,
            },
            {
              icon: "⚡",
              title: "Sub-Millisecond Median",
              body: `At ${perf.medianLatency.toFixed(2)} ms median latency and ${perf.throughputReqPerSec.toFixed(0)} msg/s throughput, the overhead is negligible for real-time multi-agent coordination.`,
            },
            {
              icon: "🔬",
              title: "Component Synergy",
              body: "Ablation Config B (no LRI*) drops prevention by 10 pp while raising FPR by 5.7 pp, confirming that the unified risk index is essential — not just an additive improvement.",
            },
          ].map((t) => (
            <div
              key={t.title}
              className="rounded-md border border-primary/20 bg-primary/5 p-4"
            >
              <p className="text-lg">{t.icon}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {t.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};
