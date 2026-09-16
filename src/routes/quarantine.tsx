import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Panel } from "@/components/primitives";
import {
  getQuarantineQueue,
  updateQuarantineStatus,
  quarantineStats,
  type QuarantineEvent,
  type QuarantineStatus,
} from "@/lib/quarantine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quarantine")({
  head: () => ({
    meta: [
      { title: "Quarantine Queue — PrivAgentShield" },
      { name: "description", content: "Human review queue for quarantined messages. Approve or reject blocked events with full LRI* breakdown." },
    ],
  }),
  component: QuarantinePage,
});

const STATUS_STYLE: Record<QuarantineStatus, { bg: string; border: string; text: string; label: string }> = {
  pending_review: { bg: "bg-mask/10",  border: "border-mask/40",  text: "text-mask",  label: "Pending Review" },
  approved:       { bg: "bg-allow/10", border: "border-allow/40", text: "text-allow", label: "Approved" },
  rejected:       { bg: "bg-block/10", border: "border-block/40", text: "text-block", label: "Rejected" },
};

function LriMini({ tm, deltaIj, piJ, lriStar }: { tm: number; deltaIj: number; piJ: number; lriStar: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center text-xs">
      {[
        { label: "T*m", value: tm.toFixed(2) },
        { label: "Δij", value: deltaIj.toFixed(2) },
        { label: "Πj", value: piJ.toFixed(2) },
        { label: "LRI*", value: lriStar.toFixed(2), highlight: true },
      ].map(({ label, value, highlight }) => (
        <div key={label} className="rounded border border-border bg-secondary/40 p-1">
          <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
          <p className={cn("font-mono text-sm font-semibold", highlight ? "text-block" : "text-foreground")}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function QuarantineCard({ event, onApprove, onReject }: {
  event: QuarantineEvent;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const style = STATUS_STYLE[event.status];

  return (
    <div className={cn("rounded-md border p-4", style.border, style.bg)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{event.eventId}</span>
            <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] font-semibold", style.bg, style.border, style.text)}>
              {style.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-foreground">
            {event.senderName} → {event.recipientName}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()} · Destination: {event.destination}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Collapse" : "Details"}
        </button>
      </div>

      {/* Payload preview */}
      <div className="mt-3 rounded-md border border-border bg-card/50 p-2">
        <p className="font-mono text-[10px] text-muted-foreground">Payload preview (anonymized)</p>
        <p className="mt-1 font-mono text-xs text-foreground/80 line-clamp-2">{event.payloadPreview}</p>
      </div>

      {/* LRI* mini */}
      <div className="mt-3">
        <LriMini tm={event.tm} deltaIj={event.deltaIj} piJ={event.piJ} lriStar={event.lriStar} />
      </div>

      {/* Tiers activated */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        {event.tiersActivated.map((t) => (
          <span key={t} className={cn("rounded border px-1.5 py-0.5 font-mono font-semibold", {
            1: "bg-primary/10 border-primary/40 text-primary",
            2: "bg-mask/10 border-mask/40 text-mask",
            3: "bg-block/10 border-block/40 text-block",
          }[t as 1 | 2 | 3])}>
            Tier {t}
          </span>
        ))}
        <span className="text-muted-foreground">
          {event.detectedEntities.join(", ")}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 rounded-md border border-border bg-secondary/20 p-3 text-xs">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Block Reason</p>
          <p className="mt-1 text-foreground/80 leading-relaxed">{event.reason}</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <span className="text-muted-foreground">Policy</span>
            <span className="font-mono text-foreground">{event.policyId}</span>
            <span className="text-muted-foreground">Session</span>
            <span className="font-mono text-muted-foreground">{event.sessionId}</span>
            <span className="text-muted-foreground">Payload hash</span>
            <span className="font-mono text-[10px] text-muted-foreground">{event.payloadHash}</span>
          </div>
          {event.reviewerNote && (
            <div className="mt-2">
              <p className="font-mono text-[10px] text-muted-foreground">Reviewer note:</p>
              <p className="mt-0.5 text-foreground/70 italic">{event.reviewerNote}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {event.status === "pending_review" && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Review note (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(event.eventId, note)}
              className="flex-1 rounded-md border border-allow/40 bg-allow/10 py-1.5 text-xs font-medium text-allow hover:bg-allow/20"
            >
              Approve (allow delivery)
            </button>
            <button
              onClick={() => onReject(event.eventId, note)}
              className="flex-1 rounded-md border border-block/40 bg-block/10 py-1.5 text-xs font-medium text-block hover:bg-block/20"
            >
              Reject (confirm block)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { auditService } from "@/lib/audit";

function QuarantinePage() {
  const [events, setEvents] = useState<QuarantineEvent[]>(() => getQuarantineQueue());
  const [filter, setFilter] = useState<QuarantineStatus | "all">("all");

  const refresh = () => setEvents(getQuarantineQueue());

  const handleApprove = (id: string, note: string) => {
    const updated = updateQuarantineStatus(id, "approved", note || undefined);
    if (updated) {
      auditService.recordEvent({
        sessionId: updated.sessionId,
        senderId: updated.senderId,
        recipientId: updated.recipientId,
        rawPayload: updated.payloadPreview,
        detectionCount: updated.detectedEntities.length,
        tm: updated.tm,
        deltaIj: updated.deltaIj as 0 | 1,
        piJ: updated.piJ,
        lriStar: updated.lriStar,
        action: "ALLOW",
        policyId: updated.policyId,
        reason: `Quarantine approved by reviewer. Note: ${note || "None"}`,
        destination: updated.destination,
        reviewer: "Security Reviewer",
        reviewStatus: "APPROVED",
      });
    }
    refresh();
  };
  const handleReject = (id: string, note: string) => {
    const updated = updateQuarantineStatus(id, "rejected", note || undefined);
    if (updated) {
      auditService.recordEvent({
        sessionId: updated.sessionId,
        senderId: updated.senderId,
        recipientId: updated.recipientId,
        rawPayload: updated.payloadPreview,
        detectionCount: updated.detectedEntities.length,
        tm: updated.tm,
        deltaIj: updated.deltaIj as 0 | 1,
        piJ: updated.piJ,
        lriStar: updated.lriStar,
        action: "QUARANTINE",
        policyId: updated.policyId,
        reason: `Quarantine rejected (blocked) by reviewer. Note: ${note || "None"}`,
        destination: updated.destination,
        reviewer: "Security Reviewer",
        reviewStatus: "REJECTED",
      });
    }
    refresh();
  };

  const stats = quarantineStats();
  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter);

  return (
    <Shell>
      <PageHeader
        eyebrow="Human review"
        title="Quarantine Queue"
        subtitle="Messages blocked by the LRI* engine awaiting human review. Approve or reject each event with a reviewer note. All decisions are recorded in the audit trail."
      />
      <SimulationBanner />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total quarantined", value: stats.total, tone: "text-foreground" },
          { label: "Pending review", value: stats.pending, tone: "text-mask" },
          { label: "Approved", value: stats.approved, tone: "text-allow" },
          { label: "Rejected", value: stats.rejected, tone: "text-block" },
        ].map(({ label, value, tone }) => (
          <div key={label} className="rounded-md border border-border bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold", tone)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "pending_review", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs capitalize",
              filter === f
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : f === "pending_review" ? "Pending" : f}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} events
        </span>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            No events in this category.
          </div>
        ) : (
          filtered.map((event) => (
            <QuarantineCard
              key={event.eventId}
              event={event}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </Shell>
  );
}
