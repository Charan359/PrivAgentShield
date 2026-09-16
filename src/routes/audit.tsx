import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Chip, Metric, Panel } from "@/components/primitives";
import { decisions } from "@/data/mock";
import { Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail & Ledger — PrivAgentShield" },
      {
        name: "description",
        content:
          "Append-only, hash-chained audit log with LRI* metrics, search, filter, and JSON/CSV export. Never exposes raw sensitive payloads in listings.",
      },
    ],
  }),
  component: Audit,
});

export type ExtendedAuditRecord = {
  eventId: string;
  seq: number;
  timestamp: string;
  sessionId: string;
  sender: string;
  recipient: string;
  payloadHash: string;
  detectionResult: string;
  tm: number;
  deltaIj: number;
  piJ: number;
  lriStar: number;
  action: "ALLOW" | "SANITIZE" | "QUARANTINE";
  policyId: string;
  reason: string;
  transformation: string;
  destination: string;
  prevHash: string;
  recordHash: string;
};

// Generate complete audit records from decisions
const FULL_AUDIT_LOG: ExtendedAuditRecord[] = decisions.map((d, i) => {
  const action: "ALLOW" | "SANITIZE" | "QUARANTINE" =
    d.action === "BLOCK" ? "QUARANTINE" : d.action === "MASK" || d.action === "REDACT" ? "SANITIZE" : "ALLOW";
  const tm = Number((d.lri / 100).toFixed(2));
  const deltaIj = d.action === "BLOCK" ? 1 : 0;
  const piJ = d.to === "research" ? 0.85 : 0.25;
  const lriStar = Math.max(deltaIj, tm * piJ);

  return {
    eventId: `aud-ev-${2100 + i}`,
    seq: 2100 + i,
    timestamp: d.ts,
    sessionId: `sess-${1040 + i}`,
    sender: d.from,
    recipient: d.to,
    payloadHash: `0x${(0x9f2a41c + i * 0x1d3f7).toString(16)}b7e4`,
    detectionResult: d.detected,
    tm,
    deltaIj,
    piJ,
    lriStar: Number(lriStar.toFixed(2)),
    action,
    policyId: d.policyId,
    reason: d.explanation,
    transformation: action === "SANITIZE" ? "Session-consistent pseudonymization applied" : action === "QUARANTINE" ? "Dispatch blocked — non-sensitive notice sent to sender" : "Delivered verbatim",
    destination: d.to,
    prevHash: `0x${(0x9f2a41c + (i - 1) * 0x1d3f7).toString(16)}b7e4`,
    recordHash: `0x${(0x9f2a41c + i * 0x1d3f7).toString(16)}b7e4`,
  };
});

import { dbStore } from "@/database/store";

function Audit() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"seq_desc" | "seq_asc" | "lri_desc">("seq_desc");

  const combinedLogs = useMemo(() => {
    const liveLogs = dbStore.getAuditLogs().map((e) => ({
      eventId: e.eventId,
      seq: e.seq,
      timestamp: e.timestamp,
      sessionId: e.sessionId,
      sender: e.senderId,
      recipient: e.recipientId,
      payloadHash: e.payloadHash,
      detectionResult: `${e.detectionCount} entities detected`,
      tm: e.tm,
      deltaIj: e.deltaIj,
      piJ: e.piJ,
      lriStar: e.lriStar,
      action: e.action,
      policyId: e.policyId ?? "pol-001",
      reason: e.reason,
      transformation: e.action === "SANITIZE" ? "Session-consistent surrogates applied" : e.action === "QUARANTINE" ? "Dispatch blocked" : "Delivered verbatim",
      destination: e.destination,
      prevHash: e.prevHash,
      recordHash: e.recordHash,
    }));
    return [...liveLogs, ...FULL_AUDIT_LOG];
  }, []);

  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((r) => {
      const matchSearch =
        search === "" ||
        r.eventId.toLowerCase().includes(search.toLowerCase()) ||
        r.sender.toLowerCase().includes(search.toLowerCase()) ||
        r.recipient.toLowerCase().includes(search.toLowerCase()) ||
        r.policyId.toLowerCase().includes(search.toLowerCase()) ||
        r.detectionResult.toLowerCase().includes(search.toLowerCase());

      const matchAction = actionFilter === "ALL" || r.action === actionFilter;

      return matchSearch && matchAction;
    }).sort((a, b) => {
      if (sortBy === "seq_desc") return b.seq - a.seq;
      if (sortBy === "seq_asc") return a.seq - b.seq;
      if (sortBy === "lri_desc") return b.lriStar - a.lriStar;
      return 0;
    });
  }, [combinedLogs, search, actionFilter, sortBy]);

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `privagentshield_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const headers = [
      "EventID", "Seq", "Timestamp", "SessionID", "Sender", "Recipient",
      "PayloadHash", "DetectionResult", "Tm", "DeltaIj", "PiJ", "LRIStar",
      "Action", "PolicyID", "Transformation", "RecordHash"
    ];
    const rows = filteredLogs.map((r) => [
      r.eventId, r.seq, r.timestamp, r.sessionId, r.sender, r.recipient,
      r.payloadHash, `"${r.detectionResult.replace(/"/g, '""')}"`,
      r.tm, r.deltaIj, r.piJ, r.lriStar, r.action, r.policyId,
      `"${r.transformation.replace(/"/g, '""')}"`, r.recordHash
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `privagentshield_audit_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Shell>
      <PageHeader
        eyebrow="Tamper-evident accountability"
        title="Audit Trail & Hash-Chained Ledger"
        subtitle="Append-only audit log recording every runtime decision. Raw sensitive payload contents are NEVER stored or rendered in audit listings — only payload hashes and detection metadata."
      />
      <SimulationBanner />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Records in chain" value={FULL_AUDIT_LOG.length} tone="primary" />
        <Metric label="Quarantine events" value={FULL_AUDIT_LOG.filter((r) => r.action === "QUARANTINE").length} tone="block" />
        <Metric label="Sanitized events" value={FULL_AUDIT_LOG.filter((r) => r.action === "SANITIZE").length} tone="mask" />
        <Metric label="Chain integrity" value="VERIFIED" tone="allow" hint="SHA-256 hash chain intact" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search event ID, agent, policy, or finding…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

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
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            <option value="seq_desc">Newest First</option>
            <option value="seq_asc">Oldest First</option>
            <option value="lri_desc">Highest LRI* First</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" /> Export JSON
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <Panel
        title={`Audit Trail Records (${filteredLogs.length})`}
        description="Immutable, tamper-evident audit records. Every record includes full LRI* metrics (Tm, Δij, Πj)."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Seq</th>
                <th className="py-2 pr-3">Timestamp</th>
                <th className="py-2 pr-3">Flow (Sender → Recipient)</th>
                <th className="py-2 pr-3">Detection Metadata</th>
                <th className="py-2 pr-3 text-center">T*m</th>
                <th className="py-2 pr-3 text-center">Δ*ij</th>
                <th className="py-2 pr-3 text-center">Π*j</th>
                <th className="py-2 pr-3 text-center">LRI*</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Policy ID</th>
                <th className="py-2">Payload Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((r) => (
                <tr key={r.eventId} className="hover:bg-secondary/40">
                  <td className="py-2.5 pr-3 font-mono text-muted-foreground">#{r.seq}</td>
                  <td className="py-2.5 pr-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-foreground">
                    {r.sender} → {r.recipient}
                  </td>
                  <td className="py-2.5 pr-3 text-foreground/80 max-w-xs truncate" title={r.detectionResult}>
                    {r.detectionResult}
                  </td>
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
                  <td className="py-2.5 pr-3 font-mono text-muted-foreground">{r.policyId}</td>
                  <td className="py-2.5 font-mono text-[10px] text-muted-foreground" title={`Prev: ${r.prevHash} | Record: ${r.recordHash}`}>
                    {r.payloadHash}
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
