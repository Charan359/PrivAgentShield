import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Metric, Panel } from "@/components/primitives";
import {
  agentById,
  categoryBreakdown,
  decisions,
  lriTrend,
  overviewStats,
} from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrivAgentShield — Policy-Aware Runtime Framework" },
      {
        name: "description",
        content:
          "PrivAgentShield runtime security observability dashboard for multi-agent LLM systems with LRI* risk engine, 3-tier inspection, and agent topology visualization.",
      },
    ],
  }),
  component: Overview,
});

const actionBreakdownLri = [
  { action: "ALLOW", count: 3929, color: "var(--allow)" },
  { action: "SANITIZE", count: 723, color: "var(--mask)" },
  { action: "QUARANTINE", count: 168, color: "var(--block)" },
];

const tierUtilization = [
  { tier: "Tier 1 (Pattern/Entropy)", hits: 824, pct: 56.4 },
  { tier: "Tier 2 (NER/PII)", hits: 482, pct: 33.0 },
  { tier: "Tier 3 (Semantic Security)", hits: 155, pct: 10.6 },
];

const topRiskyAgents = [
  { agent: "Research-Agent-01", maxLri: 0.85, violations: 7, exposure: "85%" },
  { agent: "Tool-Agent-01", maxLri: 1.00, violations: 4, exposure: "35%" },
  { agent: "Finance-Agent-01", maxLri: 1.00, violations: 2, exposure: "25%" },
  { agent: "Medical-Agent-01", maxLri: 1.00, violations: 1, exposure: "25%" },
];

const topExposedSinks = [
  { sink: "external-api (External)", exposure: "85%", risk: "HIGH", color: "text-block" },
  { sink: "internal-db (Internal)", exposure: "50%", risk: "MODERATE", color: "text-mask" },
  { sink: "audit-log (Internal)", exposure: "20%", risk: "LOW", color: "text-allow" },
];

const STATE_DISTINCTIONS = [
  { label: "Live/Demo Simulation", active: true, badge: "ACTIVE" },
  { label: "Configured Engine", active: true, badge: "ACTIVE" },
  { label: "Planned Evaluation", active: true, badge: "PLANNED" },
  { label: "Measured Empirical", active: false, badge: "PLANNED" },
];

import { useState, useEffect } from "react";
import { telemetryService } from "@/services/telemetry";
import { dbStore } from "@/database/store";
import { getQuarantineQueue } from "@/lib/quarantine";

function Overview() {
  const [metrics, setMetrics] = useState(() => telemetryService.getMetrics());
  const [activeAgentCount, setActiveAgentCount] = useState(() => dbStore.getAllAgents().length);
  const [pendingQuarantineCount, setPendingQuarantineCount] = useState(
    () => getQuarantineQueue().filter((q) => q.status === "pending_review").length,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(telemetryService.getMetrics());
      setActiveAgentCount(dbStore.getAllAgents().length);
      setPendingQuarantineCount(getQuarantineQueue().filter((q) => q.status === "pending_review").length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const actionBreakdownLri = [
    { action: "ALLOW", count: metrics.allowCount, color: "var(--allow)" },
    { action: "SANITIZE", count: metrics.sanitizeCount, color: "var(--mask)" },
    { action: "QUARANTINE", count: metrics.quarantineCount, color: "var(--block)" },
  ];

  const tierUtilization = [
    { tier: "Tier 1 (Pattern/Entropy)", hits: metrics.tier1Count, pct: 56.4 },
    { tier: "Tier 2 (NER/PII)", hits: metrics.tier2Count, pct: 33.0 },
    { tier: "Tier 3 (Semantic Security)", hits: metrics.tier3Count, pct: 10.6 },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="PrivAgentShield Security Layer"
        title="PrivAgentShield Dashboard"
        subtitle="A Policy-Aware Runtime Framework for Mitigating Sensitive Data Leakage in Multi-Agent LLM Systems."
      />
      <SimulationBanner />

      {/* State Distinctions Banner */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STATE_DISTINCTIONS.map((sd) => (
          <div
            key={sd.label}
            className={cn(
              "flex items-center justify-between rounded-md border p-2.5 text-xs font-mono font-semibold",
              sd.active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-secondary/40 text-muted-foreground",
            )}
          >
            <span>{sd.label}</span>
            <span className="text-[10px] uppercase opacity-70">[{sd.badge}]</span>
          </div>
        ))}
      </div>

      {/* Top 8 KPI Cards Required by Prompt */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Active Agents"
          value={activeAgentCount.toString()}
          hint="Monitored in topology graph"
          tone="primary"
        />
        <Metric
          label="Messages Inspected"
          value={metrics.messagesInspected.toLocaleString()}
          hint="Envelopes passed through gateway"
        />
        <Metric
          label="Sensitive Messages Detected"
          value={metrics.sensitiveMessagesDetected.toLocaleString()}
          tone="mask"
          hint="At least one detector fired"
        />
        <Metric
          label="ALLOW Decisions"
          value={metrics.allowCount.toLocaleString()}
          tone="allow"
          hint="LRI* < τlow (0.30)"
        />
        <Metric
          label="SANITIZE Decisions"
          value={metrics.sanitizeCount.toLocaleString()}
          tone="mask"
          hint="τlow ≤ LRI* < τhigh (0.70)"
        />
        <Metric
          label="QUARANTINE Decisions"
          value={metrics.quarantineCount.toLocaleString()}
          tone="block"
          hint="LRI* ≥ τhigh (0.70)"
        />
        <Metric
          label="Current High-Risk Events"
          value={pendingQuarantineCount.toString()}
          tone="block"
          hint="Awaiting human review in queue"
        />
        <Metric
          label="External Sink Exposure"
          value={`${(metrics.externalSinkExposure * 100).toFixed(0)}%`}
          tone="block"
          hint="Π*j max reachability via research"
        />
      </div>

      {/* Pipeline Visualizer Banner */}
      <Panel
        title="Conceptual Pipeline — Inline Mediation Gate"
        description="Every inter-agent message passes through PrivAgentShield before delivery."
      >
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-center justify-between gap-2 py-2 text-xs font-mono">
            {[
              { title: "Agent", desc: "Message Sender" },
              { title: "Message Bus", desc: "Inter-Agent Envelope" },
              { title: "3-Tier Inspection", desc: "Pattern + NER + Semantic" },
              { title: "Taint Analysis", desc: "T*m Calculation" },
              { title: "Clearance Verification", desc: "Δ*ij Dominance Check" },
              { title: "Reachability Analysis", desc: "Π*j Markov Exposure" },
              { title: "LRI* Risk Engine", desc: "max(Δij, Tm × Πj)" },
              { title: "Action Gate", desc: "ALLOW / SANITIZE / QUARANTINE" },
              { title: "Target Agent / Sink", desc: "Downstream Egress" },
            ].map((step, i) => (
              <div key={step.title} className="flex items-center gap-2">
                <div className="rounded border border-primary/40 bg-primary/10 p-2 text-center min-w-[100px]">
                  <p className="font-semibold text-primary">{step.title}</p>
                  <p className="text-[9px] text-muted-foreground">{step.desc}</p>
                </div>
                {i < 8 && <span className="text-muted-foreground font-bold">→</span>}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Main Charts Row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Chart 1: LRI* Trend */}
        <Panel
          className="xl:col-span-2"
          title="Runtime Decisions & LRI* Over Time"
          description="⚠ SIMULATION TELEMETRY — Composite LRI* index sampled every 5 minutes."
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lriTrend}>
                <defs>
                  <linearGradient id="lriFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="lri"
                  stroke="var(--primary)"
                  fill="url(#lriFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Chart 2: Decision Mix */}
        <Panel title="LRI* Decision Breakdown" description="Enforcement distribution across corpus.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionBreakdownLri} layout="vertical">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="action"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={3}>
                  {actionBreakdownLri.map((d) => (
                    <Cell key={d.action} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Sub-Charts Row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Chart 3: Detection Tier Utilization */}
        <Panel title="Detection Tier Utilization" description="Share of findings triggered by each tier.">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierUtilization}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="tier" stroke="var(--muted-foreground)" fontSize={9} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="hits" fill="var(--primary)" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Chart 4: Sensitive Data Categories */}
        <Panel title="Sensitive Data Categories" description="Span counts by classification.">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Table: Top Exposed Sinks */}
        <Panel title="Top Exposed Downstream Sinks" description="Sink nodes ranked by exposure risk.">
          <ul className="divide-y divide-border text-xs">
            {topExposedSinks.map((s) => (
              <li key={s.sink} className="flex items-center justify-between py-2.5">
                <span className="font-mono text-foreground">{s.sink}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono font-bold", s.color)}>{s.exposure}</span>
                  <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px]", s.color)}>
                    {s.risk}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Live Event Stream Table */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Recent Security Events & Interceptions"
          description="Live stream of mediated inter-agent envelopes across all channels."
          right={
            <Link
              to="/quarantine"
              className="font-mono text-xs text-primary hover:underline"
            >
              View Quarantine Queue →
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {decisions.slice(0, 6).map((d) => {
              const action: "ALLOW" | "SANITIZE" | "QUARANTINE" =
                d.action === "BLOCK" ? "QUARANTINE" : d.action === "MASK" || d.action === "REDACT" ? "SANITIZE" : "ALLOW";
              const lriVal = Number((d.lri / 100).toFixed(2));
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-2.5 text-xs">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                      action === "QUARANTINE" ? "border-block/40 bg-block/10 text-block" :
                      action === "SANITIZE" ? "border-mask/40 bg-mask/10 text-mask" :
                      "border-allow/40 bg-allow/10 text-allow",
                    )}
                  >
                    {action}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {agentById(d.from)?.name ?? d.from} → {agentById(d.to)?.name ?? d.to}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground/80">
                    {d.detected}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    LRI* {lriVal.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Top Risky Agents */}
        <Panel title="Top Risky Agent Profiles" description="Agents with highest LRI* exposure & violations.">
          <ul className="divide-y divide-border text-xs">
            {topRiskyAgents.map((a) => (
              <li key={a.agent} className="flex flex-col gap-1 py-2.5">
                <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                  <span>{a.agent}</span>
                  <span className="text-block">LRI* {a.maxLri.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Violations: {a.violations}</span>
                  <span>Sink Reachability Πj: {a.exposure}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}
