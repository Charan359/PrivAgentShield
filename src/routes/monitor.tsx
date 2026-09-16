import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Metric, Panel } from "@/components/primitives";
import { decisions, overviewStats, agentById } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Runtime Monitor — PrivAgentShield" },
      {
        name: "description",
        content:
          "Dedicated Risk Monitor page displaying Timestamp, Sender, Recipient, Tm, Δij, Πj, LRI*, Action, and Reason with filterable risk levels.",
      },
    ],
  }),
  component: Monitor,
});

const ACTION_FILTERS = ["ALL", "ALLOW", "SANITIZE", "QUARANTINE"] as const;
const RISK_FILTERS = ["ALL", "LOW", "MODERATE", "HIGH", "CRITICAL"] as const;

function Monitor() {
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [searchSender, setSearchSender] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const rows = useMemo(() => {
    return decisions.map((d) => {
      const action: "ALLOW" | "SANITIZE" | "QUARANTINE" =
        d.action === "BLOCK" ? "QUARANTINE" : d.action === "MASK" || d.action === "REDACT" ? "SANITIZE" : "ALLOW";
      const tm = Number((d.lri / 100).toFixed(2));
      const deltaIj = d.action === "BLOCK" ? 1 : 0;
      const piJ = d.to === "research" ? 0.85 : 0.25;
      const lriStar = Number(Math.max(deltaIj, tm * piJ).toFixed(2));

      const riskBand = lriStar >= 0.70 ? "CRITICAL" : lriStar >= 0.50 ? "HIGH" : lriStar >= 0.30 ? "MODERATE" : "LOW";

      return {
        id: d.id,
        timestamp: d.ts,
        sender: agentById(d.from)?.name ?? d.from,
        senderId: d.from,
        recipient: agentById(d.to)?.name ?? d.to,
        recipientId: d.to,
        channel: d.channel,
        tm,
        deltaIj,
        piJ,
        lriStar,
        action,
        rawAction: d.action,
        riskBand,
        reason: d.explanation,
        latencyMs: d.latencyMs,
      };
    }).filter((r) => {
      const matchAction = actionFilter === "ALL" || r.action === actionFilter;
      const matchRisk = riskFilter === "ALL" || r.riskBand === riskFilter;
      const matchChannel = channelFilter === "ALL" || r.channel === channelFilter;
      const matchSender =
        searchSender === "" ||
        r.sender.toLowerCase().includes(searchSender.toLowerCase()) ||
        r.recipient.toLowerCase().includes(searchSender.toLowerCase());

      return matchAction && matchRisk && matchChannel && matchSender;
    });
  }, [actionFilter, riskFilter, channelFilter, searchSender]);

  return (
    <Shell>
      <PageHeader
        eyebrow="Dedicated risk monitor"
        title="Runtime Risk Monitor"
        subtitle="Real-time inter-agent envelope mediation feed with full LRI* decomposition (T*m, Δ*ij, Π*j) and configurable risk level filters."
      />
      <SimulationBanner />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Envelopes Monitored" value={decisions.length} tone="primary" />
        <Metric label="Avg Gateway Overhead" value={`${overviewStats.avgLatencyMs} ms`} />
        <Metric label="Quarantined Flows" value={decisions.filter((d) => d.action === "BLOCK").length} tone="block" />
        <Metric label="Sanitized Flows" value={decisions.filter((d) => d.action === "MASK" || d.action === "REDACT").length} tone="mask" />
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by agent name…"
          value={searchSender}
          onChange={(e) => setSearchSender(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground min-w-[200px]"
        />

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="ALL">All Actions</option>
          <option value="ALLOW">ALLOW</option>
          <option value="SANITIZE">SANITIZE</option>
          <option value="QUARANTINE">QUARANTINE</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="ALL">All Risk Bands</option>
          <option value="LOW">LOW (&lt;0.30)</option>
          <option value="MODERATE">MODERATE (0.30–0.50)</option>
          <option value="HIGH">HIGH (0.50–0.70)</option>
          <option value="CRITICAL">CRITICAL (≥0.70)</option>
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="ALL">All Channels</option>
          <option value="direct">direct</option>
          <option value="broadcast">broadcast</option>
          <option value="tool_call">tool_call</option>
          <option value="memory_write">memory_write</option>
        </select>

        <span className="ml-auto font-mono text-xs text-muted-foreground">
          Showing {rows.length} of {decisions.length} events
        </span>
      </div>

      {/* Main Table */}
      <Panel title="Monitored Envelope Feed" description="Every mediated flow with complete LRI* factor breakdown.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2.5 pr-3">Timestamp</th>
                <th className="py-2.5 pr-3">Sender</th>
                <th className="py-2.5 pr-3">Recipient</th>
                <th className="py-2.5 pr-3 text-center">T*m</th>
                <th className="py-2.5 pr-3 text-center">Δ*ij</th>
                <th className="py-2.5 pr-3 text-center">Π*j</th>
                <th className="py-2.5 pr-3 text-center">LRI*</th>
                <th className="py-2.5 pr-3">Action</th>
                <th className="py-2.5 pr-3">Risk Band</th>
                <th className="py-2.5">Rationale Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="py-2.5 pr-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-foreground">{r.sender}</td>
                  <td className="py-2.5 pr-3 font-mono text-foreground">{r.recipient}</td>
                  <td className="py-2.5 pr-3 text-center font-mono text-muted-foreground">{r.tm.toFixed(2)}</td>
                  <td className="py-2.5 pr-3 text-center font-mono text-muted-foreground">{r.deltaIj.toFixed(2)}</td>
                  <td className="py-2.5 pr-3 text-center font-mono text-muted-foreground">{r.piJ.toFixed(2)}</td>
                  <td className={cn("py-2.5 pr-3 text-center font-mono font-bold",
                    r.lriStar >= 0.7 ? "text-block" : r.lriStar >= 0.3 ? "text-mask" : "text-allow"
                  )}>
                    {r.lriStar.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                      r.action === "QUARANTINE" ? "border-block/40 bg-block/10 text-block" :
                      r.action === "SANITIZE" ? "border-mask/40 bg-mask/10 text-mask" :
                      "border-allow/40 bg-allow/10 text-allow"
                    )}>
                      {r.action}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={cn("font-mono text-[10px] font-semibold",
                      r.riskBand === "CRITICAL" ? "text-block" : r.riskBand === "HIGH" ? "text-redact" :
                      r.riskBand === "MODERATE" ? "text-mask" : "text-allow"
                    )}>
                      {r.riskBand}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground max-w-xs truncate" title={r.reason}>
                    {r.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}
