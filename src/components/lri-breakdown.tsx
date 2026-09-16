/**
 * LRI* Breakdown Component
 *
 * Displays the full LRI* calculation in a structured, formula-visible layout.
 * Shows Tm, Δij, Πj, and the final LRI* decision with all intermediate steps.
 *
 * This is a purely presentational component — it receives pre-computed values.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors lri/types.ts but standalone for component use)
// ─────────────────────────────────────────────────────────────────────────────
export type LriAction = "ALLOW" | "SANITIZE" | "QUARANTINE";

export type EntityTaintRow = {
  entityType: string;
  severityLevel: string; // "L1" | "L2" | "L3" | "L4"
  severityWeight: number;
  isSecret: boolean;
  entropyValue?: number;
  entropyModifier: number;
  contribution: number;
};

export type ClearanceRow = {
  category: string;
  required: string;
  recipientHas: string;
  violation: boolean;
};

export type LriBreakdownProps = {
  senderId: string;
  recipientId: string;
  // Tm
  tm: number;
  taintRows?: EntityTaintRow[];
  // Clearance
  deltaIj: number;
  clearanceRows?: ClearanceRow[];
  // Topology
  piJ: number;
  // LRI*
  lriStar: number;
  action: LriAction;
  tauLow?: number;
  tauHigh?: number;
  /** Show full calculation breakdown (expanded by default) */
  expanded?: boolean;
  className?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Action colors
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_STYLE: Record<LriAction, { bg: string; border: string; text: string; label: string }> = {
  ALLOW:      { bg: "bg-allow/10",      border: "border-allow/40",      text: "text-allow",      label: "ALLOW" },
  SANITIZE:   { bg: "bg-mask/10",       border: "border-mask/40",       text: "text-mask",       label: "SANITIZE" },
  QUARANTINE: { bg: "bg-block/10",      border: "border-block/40",      text: "text-block",      label: "QUARANTINE" },
};

const SEVERITY_COLOR: Record<string, string> = {
  L1: "text-muted-foreground",
  L2: "text-mask",
  L3: "text-redact",
  L4: "text-block",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FormulaRow({ label, value, sub }: { label: ReactNode; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex flex-col items-end">
        <span className="font-mono font-semibold text-foreground">{value}</span>
        {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-3 border-t border-border" />;
}

function LriGauge({ value, tauLow, tauHigh }: { value: number; tauLow: number; tauHigh: number }) {
  const pct = Math.min(100, value * 100);
  const lowPct = tauLow * 100;
  const highPct = tauHigh * 100;
  const color = value >= tauHigh ? "bg-block" : value >= tauLow ? "bg-mask" : "bg-allow";
  return (
    <div className="mt-3">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        {/* Fill */}
        <div className={cn("absolute left-0 top-0 h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        {/* τlow marker */}
        <div className="absolute top-0 h-full w-px bg-mask/70" style={{ left: `${lowPct}%` }} />
        {/* τhigh marker */}
        <div className="absolute top-0 h-full w-px bg-block/70" style={{ left: `${highPct}%` }} />
      </div>
      <div className="relative mt-1 flex text-[10px] text-muted-foreground" style={{ position: "relative" }}>
        <span className="absolute" style={{ left: `${lowPct}%`, transform: "translateX(-50%)" }}>
          τ<sub>low</sub>={tauLow.toFixed(2)}
        </span>
        <span className="absolute" style={{ left: `${highPct}%`, transform: "translateX(-50%)" }}>
          τ<sub>high</sub>={tauHigh.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function LriBreakdown({
  senderId,
  recipientId,
  tm,
  taintRows,
  deltaIj,
  clearanceRows,
  piJ,
  lriStar,
  action,
  tauLow = 0.30,
  tauHigh = 0.70,
  className,
}: LriBreakdownProps) {
  const style = ACTION_STYLE[action];

  return (
    <div className={cn("rounded-md border border-border bg-card/60 p-4 text-sm", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            LRI* Calculation
          </p>
          <p className="mt-0.5 font-mono text-xs text-foreground/70">
            {senderId} → {recipientId}
          </p>
        </div>
        <span className={cn("rounded-md border px-3 py-1 font-mono text-sm font-semibold", style.bg, style.border, style.text)}>
          {style.label}
        </span>
      </div>

      {/* Formula banner */}
      <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
        <p className="font-mono text-[11px] text-primary">
          LRI*(v<sub>i</sub>, v<sub>j</sub>, m) = max(Δ<sub>ij</sub>(m), T<sub>m</sub> × Π*<sub>j</sub>)
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          = max({deltaIj.toFixed(2)}, {tm.toFixed(2)} × {piJ.toFixed(2)}) = max({deltaIj.toFixed(2)},{" "}
          {(tm * piJ).toFixed(2)}) ={" "}
          <span className="font-semibold text-foreground">{lriStar.toFixed(2)}</span>
        </p>
      </div>

      {/* Component 1: Tm */}
      <SectionLabel>① Message Taint — T*m</SectionLabel>
      <div className="rounded-md border border-border bg-secondary/30 p-3">
        <p className="mb-2 font-mono text-[10px] text-muted-foreground">
          T<sub>m</sub> = min(1.0, Σ s(e<sub>k</sub>) × ω(e<sub>k</sub>))
        </p>
        {taintRows && taintRows.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-1 pr-2">Entity</th>
                <th className="pb-1 pr-2">Level</th>
                <th className="pb-1 pr-2">Weight s(ek)</th>
                <th className="pb-1 pr-2">ω(ek)</th>
                <th className="pb-1 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {taintRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1 pr-2 font-mono text-foreground/80">{row.entityType}</td>
                  <td className={cn("py-1 pr-2 font-mono font-semibold", SEVERITY_COLOR[row.severityLevel])}>{row.severityLevel}</td>
                  <td className="py-1 pr-2 font-mono text-muted-foreground">{row.severityWeight.toFixed(2)}</td>
                  <td className="py-1 pr-2 font-mono text-muted-foreground">
                    {row.isSecret ? `${row.entropyValue?.toFixed(2)}/4.5` : "1.00"} = {row.entropyModifier.toFixed(2)}
                  </td>
                  <td className="py-1 text-right font-mono font-semibold text-foreground">{row.contribution.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">No entities detected → Tm = 0.00</p>
        )}
        <FormulaRow label={<>Final T<sub>m</sub></>} value={`${tm.toFixed(2)}`} sub="min(1.0, Σ contributions)" />
      </div>

      <Divider />

      {/* Component 2: Δij */}
      <SectionLabel>② Clearance Dominance — Δ*ij</SectionLabel>
      <div className="rounded-md border border-border bg-secondary/30 p-3">
        <p className="mb-2 font-mono text-[10px] text-muted-foreground">
          Δ<sub>ij</sub>(m) = 1.0 if any required sensitivity exceeds recipient clearance, else 0.0
        </p>
        {clearanceRows && clearanceRows.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-1 pr-2">Category</th>
                <th className="pb-1 pr-2">Required</th>
                <th className="pb-1 pr-2">Recipient Has</th>
                <th className="pb-1 text-right">Violation</th>
              </tr>
            </thead>
            <tbody>
              {clearanceRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1 pr-2 font-mono capitalize text-foreground/80">{row.category}</td>
                  <td className={cn("py-1 pr-2 font-mono font-semibold", SEVERITY_COLOR[row.required])}>{row.required}</td>
                  <td className={cn("py-1 pr-2 font-mono font-semibold", SEVERITY_COLOR[row.recipientHas])}>{row.recipientHas}</td>
                  <td className="py-1 text-right">
                    {row.violation ? (
                      <span className="font-mono font-semibold text-block">YES</span>
                    ) : (
                      <span className="font-mono text-allow">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">No clearance categories triggered</p>
        )}
        <FormulaRow
          label={<>Δ<sub>ij</sub></>}
          value={deltaIj === 1 ? "1.00 (VIOLATION)" : "0.00 (no violation)"}
          sub={deltaIj === 1 ? "→ LRI* auto-maximized" : "→ LRI* determined by Tm × Πj"}
        />
      </div>

      <Divider />

      {/* Component 3: Πj */}
      <SectionLabel>③ Downstream Sink Reachability — Π*j</SectionLabel>
      <div className="rounded-md border border-border bg-secondary/30 p-3">
        <p className="mb-2 font-mono text-[10px] text-muted-foreground">
          Π*<sub>j</sub> = max<sub>s</sub> B[j,s] where B = (I−Q)<sup>−1</sup> × R
        </p>
        <FormulaRow
          label={<>Π*<sub>j</sub> for {recipientId}</>}
          value={piJ.toFixed(4)}
          sub="maximum absorption probability to any external sink"
        />
      </div>

      <Divider />

      {/* Final LRI* */}
      <SectionLabel>④ Leakage Risk Index — LRI*</SectionLabel>
      <div className={cn("rounded-md border p-3", style.bg, style.border)}>
        <p className={cn("font-mono text-xs font-semibold", style.text)}>
          LRI* = max({deltaIj.toFixed(2)}, {tm.toFixed(2)} × {piJ.toFixed(2)}) ={" "}
          <span className="text-base">{lriStar.toFixed(2)}</span>
        </p>
        <LriGauge value={lriStar} tauLow={tauLow} tauHigh={tauHigh} />
        <div className="mt-4">
          <p className="font-mono text-[10px] text-muted-foreground">
            Decision rule: LRI* &lt; τ<sub>low</sub>({tauLow}) → ALLOW · τ<sub>low</sub> ≤ LRI* &lt; τ<sub>high</sub>({tauHigh}) → SANITIZE · LRI* ≥ τ<sub>high</sub> → QUARANTINE
          </p>
          <p className={cn("mt-2 font-mono text-sm font-bold", style.text)}>→ {action}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            ⚠ τ<sub>low</sub>={tauLow.toFixed(2)}, τ<sub>high</sub>={tauHigh.toFixed(2)} are configurable demo defaults, not experimentally calibrated values.
          </p>
        </div>
      </div>
    </div>
  );
}
