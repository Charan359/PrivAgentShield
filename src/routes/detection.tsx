import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Bar, Chip, Metric, Panel, SensitivityBadge } from "@/components/primitives";
import { categoryBreakdown, detectors, overviewStats } from "@/data/mock";
import { INSPECTION_TIERS, type InspectionTier } from "@/lib/detection/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/detection")({
  head: () => ({
    meta: [
      { title: "Three-Tier Detection Engines — PrivAgentShield" },
      {
        name: "description",
        content: "Overview of Tier 1 (Hyperscan-compatible pattern/entropy), Tier 2 (Presidio/GLiNER NER), and Tier 3 (Transformer semantic probe) inspection engines.",
      },
    ],
  }),
  component: Detection,
});

const TIER_STATS = [
  { tier: 1, name: "Tier 1: Regex & Entropy", hits: 824, avgTimeMs: 1.2, fallbackState: "Native/TypeScript Active", status: "active" as const },
  { tier: 2, name: "Tier 2: NER / PII", hits: 254, avgTimeMs: 4.8, fallbackState: "Simulated Fallback", status: "fallback" as const },
  { tier: 3, name: "Tier 3: Semantic Security", hits: 85, avgTimeMs: 12.4, fallbackState: "Simulated Fallback", status: "fallback" as const },
];

function TierCard({ tierInfo, stat }: { tierInfo: InspectionTier; stat: typeof TIER_STATS[0] }) {
  return (
    <div className={cn(
      "rounded-md border p-4 flex flex-col justify-between",
      tierInfo.tier === 1 ? "border-primary/40 bg-primary/5" :
      tierInfo.tier === 2 ? "border-mask/40 bg-mask/5" :
      "border-block/40 bg-block/5"
    )}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "rounded border px-2 py-0.5 font-mono text-xs font-bold",
            tierInfo.tier === 1 ? "border-primary/40 text-primary" :
            tierInfo.tier === 2 ? "border-mask/40 text-mask" :
            "border-block/40 text-block"
          )}>
            TIER {tierInfo.tier}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider",
            tierInfo.status === "active" ? "bg-allow/20 text-allow border border-allow/30" : "bg-mask/20 text-mask border border-mask/30"
          )}>
            {tierInfo.status}
          </span>
        </div>
        <h3 className="mt-2 font-mono text-base font-semibold text-foreground">{tierInfo.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tierInfo.description}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Detection Count</p>
          <p className="font-mono text-base font-semibold text-foreground">{stat.hits}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Avg Latency</p>
          <p className="font-mono text-base font-semibold text-foreground">{stat.avgTimeMs} ms</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">State</p>
          <p className="font-mono text-[10px] font-semibold text-mask">{stat.fallbackState}</p>
        </div>
      </div>
    </div>
  );
}

function Detection() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Three-tier inspection pipeline"
        title="Detection Engines & Inspection Pipeline"
        subtitle="PrivAgentShield operates a modular 3-tier inspection architecture. Every message passes through Tier 1 (Pattern/Entropy), Tier 2 (NER), and Tier 3 (Semantic Security Probe)."
      />
      <SimulationBanner />

      {/* KPI Row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Inspection Tiers" value={3} tone="primary" />
        <Metric label="Active Detectors" value={detectors.length} tone="primary" />
        <Metric
          label="Total Spans Flagged"
          value={overviewStats.sensitiveDetected.toLocaleString()}
          tone="mask"
        />
        <Metric
          label="Avg Pipeline Latency"
          value={`${overviewStats.avgLatencyMs} ms`}
        />
      </div>

      {/* 3-Tier Overview Cards */}
      <Panel title="Three-Tier Inspection Engine Status" description="Architecture allows connection to Hyperscan, Presidio, GLiNER, and real Transformer classifiers.">
        <div className="grid gap-4 md:grid-cols-3">
          {INSPECTION_TIERS.map((tier) => {
            const stat = TIER_STATS.find((s) => s.tier === tier.tier)!;
            return <TierCard key={tier.tier} tierInfo={tier} stat={stat} />;
          })}
        </div>
      </Panel>

      {/* Detector Inventory Table (Tier 1) */}
      <Panel
        title="Tier 1 Detector Inventory"
        description="Compiled patterns, regex automata, checksum validation, and Shannon entropy analysis."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Detector</th>
                <th className="py-2 pr-3">Technique</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Sensitivity</th>
                <th className="py-2 pr-3">Hits</th>
                <th className="py-2 pr-3">Precision</th>
                <th className="py-2">Sample match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {detectors.map((d) => (
                <tr key={d.name} className="hover:bg-secondary/40">
                  <td className="py-2.5 pr-3 font-mono text-foreground">{d.name}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{d.technique}</td>
                  <td className="py-2.5 pr-3">
                    <Chip tone="primary">{d.category}</Chip>
                  </td>
                  <td className="py-2.5 pr-3">
                    <SensitivityBadge level={d.sensitivity} />
                  </td>
                  <td className="py-2.5 pr-3 font-mono">{d.hits}</td>
                  <td className="w-[130px] py-2.5 pr-3">
                    <span className="font-mono">{(d.precision * 100).toFixed(0)}%</span>
                    <Bar value={d.precision * 100} />
                  </td>
                  <td className="py-2.5 font-mono text-muted-foreground">{d.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Category volume */}
      <Panel
        title="Category Volume Distribution"
        description="Share of detected spans by classification across simulated traffic."
      >
        <ul className="flex flex-col gap-3">
          {categoryBreakdown.map((c) => {
            const total = categoryBreakdown.reduce((s, x) => s + x.count, 0);
            const pct = (c.count / total) * 100;
            return (
              <li key={c.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{c.category}</span>
                  <span className="font-mono text-muted-foreground">
                    {c.count} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={pct} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </Shell>
  );
}
