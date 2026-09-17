/**
 * LRI* Breakdown Component
 *
 * Displays the LRI* evaluation with both a Plain-English intuitive mode
 * and a Math & Formulas mode for research verification.
 */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, ShieldX, Info, Binary, Sparkles, AlertTriangle, Eye } from "lucide-react";

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
  tm: number;
  taintRows?: EntityTaintRow[];
  deltaIj: number;
  clearanceRows?: ClearanceRow[];
  piJ: number;
  lriStar: number;
  action: LriAction;
  tauLow?: number;
  tauHigh?: number;
  expanded?: boolean;
  className?: string;
};

const ACTION_STYLE: Record<LriAction, { bg: string; border: string; text: string; label: string; icon: any; summary: string }> = {
  ALLOW: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-500",
    label: "ALLOW (Safe to Deliver)",
    icon: ShieldCheck,
    summary: "No privacy risk detected. The message is safe and delivered verbatim.",
  },
  SANITIZE: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-500",
    label: "SANITIZE (Redacted / Masked)",
    icon: ShieldAlert,
    summary: "Contains sensitive information. Sensitive items were masked/pseudonymized before delivery.",
  },
  QUARANTINE: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-500",
    label: "QUARANTINE (Blocked from Sending)",
    icon: ShieldX,
    summary: "High privacy risk or clearance violation! The message was blocked to prevent data leakage.",
  },
};

const SEVERITY_BADGE: Record<string, { bg: string; label: string }> = {
  L1: { bg: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Low Sensitivity (PII)" },
  L2: { bg: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Medium Sensitivity (Contact/Financial)" },
  L3: { bg: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "High Sensitivity (Health/Gov ID)" },
  L4: { bg: "bg-rose-500/15 text-rose-400 border-rose-500/30", label: "Critical Secret (API Key / Token)" },
};

function FormulaRow({ label, value, sub }: { label: ReactNode; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex flex-col items-end">
        <span className="font-mono font-semibold text-foreground">{value}</span>
        {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

function LriGauge({ value, tauLow, tauHigh }: { value: number; tauLow: number; tauHigh: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const lowPct = tauLow * 100;
  const highPct = tauHigh * 100;
  const color = value >= tauHigh ? "bg-rose-500" : value >= tauLow ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-muted-foreground">Overall Leakage Risk Index (LRI*)</span>
        <span className="font-mono font-bold text-foreground">{(value * 100).toFixed(0)}% ({value.toFixed(2)})</span>
      </div>
      <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-secondary/80 border border-border">
        <div className={cn("absolute left-0 top-0 h-full transition-all duration-300", color)} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-amber-400 z-10" style={{ left: `${lowPct}%` }} title={`Tau Low: ${tauLow}`} />
        <div className="absolute top-0 h-full w-0.5 bg-rose-400 z-10" style={{ left: `${highPct}%` }} title={`Tau High: ${tauHigh}`} />
      </div>
      <div className="relative mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>0.0 (Safe)</span>
        <span>Low Threshold ({tauLow})</span>
        <span>High Threshold ({tauHigh})</span>
        <span>1.0 (Critical)</span>
      </div>
    </div>
  );
}

export function LriBreakdown({
  senderId,
  recipientId,
  tm,
  taintRows = [],
  deltaIj,
  clearanceRows = [],
  piJ,
  lriStar,
  action,
  tauLow = 0.30,
  tauHigh = 0.70,
  className,
}: LriBreakdownProps) {
  const [viewMode, setViewMode] = useState<"intuitive" | "technical">("intuitive");
  const style = ACTION_STYLE[action];
  const ActionIcon = style.icon;

  const hasClearanceViolation = deltaIj === 1;
  const sensitiveEntitiesCount = taintRows.length;

  return (
    <div className={cn("rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm space-y-4", className)}>
      {/* Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="font-semibold text-foreground text-base">Privacy Risk Evaluation</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Flow: <code className="text-primary font-mono">{senderId}</code> ➔ <code className="text-primary font-mono">{recipientId}</code>
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-md border border-border bg-secondary/50 p-0.5">
          <button
            onClick={() => setViewMode("intuitive")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all",
              viewMode === "intuitive"
                ? "bg-background text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="size-3.5" />
            Simple Summary
          </button>
          <button
            onClick={() => setViewMode("technical")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all",
              viewMode === "technical"
                ? "bg-background text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Binary className="size-3.5" />
            Math & Formulas
          </button>
        </div>
      </div>

      {/* Primary Action Banner */}
      <div className={cn("rounded-lg border p-4 flex items-start gap-3", style.bg, style.border)}>
        <ActionIcon className={cn("size-6 shrink-0 mt-0.5", style.text)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className={cn("font-bold text-base tracking-tight", style.text)}>{style.label}</h4>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-background/60 border border-border text-foreground">
              Risk Score: {lriStar.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
            {style.summary}
          </p>
        </div>
      </div>

      {/* INTUITIVE PLAIN ENGLISH VIEW */}
      {viewMode === "intuitive" && (
        <div className="space-y-4">
          <LriGauge value={lriStar} tauLow={tauLow} tauHigh={tauHigh} />

          {/* 3 Clear Visual Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Card 1: Data Sensitivity */}
            <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Eye className="size-4 text-blue-400" />
                <span>1. Data Sensitivity</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {sensitiveEntitiesCount > 0
                  ? `Found ${sensitiveEntitiesCount} sensitive item(s) in payload.`
                  : "No sensitive items detected in message."}
              </p>
              {sensitiveEntitiesCount > 0 ? (
                <div className="space-y-1 pt-1">
                  {taintRows.map((r, i) => {
                    const badge = SEVERITY_BADGE[r.severityLevel] || SEVERITY_BADGE.L1;
                    return (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-foreground font-medium">{r.entityType}</span>
                        <span className={cn("px-1.5 py-0.5 rounded border text-[10px]", badge.bg)}>
                          {r.severityLevel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="inline-block text-[11px] text-emerald-400 font-medium">Clean Payload</span>
              )}
            </div>

            {/* Card 2: Recipient Authorization */}
            <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldAlert className="size-4 text-amber-400" />
                <span>2. Access Rights</span>
              </div>
              {hasClearanceViolation ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                    <AlertTriangle className="size-3.5" /> Unauthorized Access
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Recipient <code className="text-foreground">{recipientId}</code> lacks security clearance for the data.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="size-3.5" /> Clearance Verified
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Recipient holds sufficient clearance for all categories.
                  </p>
                </div>
              )}
            </div>

            {/* Card 3: Exposure Hazard */}
            <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Info className="size-4 text-purple-400" />
                <span>3. Destination Exposure</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Downstream leak risk to public endpoints:
              </p>
              <div className="pt-1">
                <span className="font-mono font-bold text-foreground text-sm">{(piJ * 100).toFixed(0)}% Risk</span>
                <span className="text-[11px] text-muted-foreground ml-1.5">
                  ({piJ > 0.5 ? "High External Exposure" : "Contained / Internal"})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATH & FORMULAS TECHNICAL VIEW */}
      {viewMode === "technical" && (
        <div className="space-y-4 pt-1">
          {/* Formula banner */}
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs font-mono">
            <p className="text-primary font-bold">
              LRI*(v<sub>i</sub>, v<sub>j</sub>, m) = max(Δ<sub>ij</sub>(m), T<sub>m</sub> × Π*<sub>j</sub>)
            </p>
            <p className="mt-1.5 text-muted-foreground">
              = max({deltaIj.toFixed(2)}, {tm.toFixed(2)} × {piJ.toFixed(2)}) = max({deltaIj.toFixed(2)}, {(tm * piJ).toFixed(2)}) ={" "}
              <span className="text-foreground font-bold">{lriStar.toFixed(2)}</span>
            </p>
          </div>

          {/* Component 1: Tm */}
          <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
            <p className="font-mono text-xs font-semibold text-primary">
              ① Message Sensitivity Taint (T<sub>m</sub>)
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Formula: T<sub>m</sub> = min(1.0, Σ s(e<sub>k</sub>) × ω(e<sub>k</sub>))
            </p>
            {taintRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-1">Entity</th>
                      <th className="py-1">Level</th>
                      <th className="py-1">Weight s(ek)</th>
                      <th className="py-1 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {taintRows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1 text-foreground">{r.entityType}</td>
                        <td className="py-1 text-primary">{r.severityLevel}</td>
                        <td className="py-1 text-muted-foreground">{r.severityWeight.toFixed(2)}</td>
                        <td className="py-1 text-right font-bold text-foreground">{r.contribution.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No entities detected (Tm = 0.00)</p>
            )}
            <FormulaRow label="Calculated Tm" value={tm.toFixed(2)} />
          </div>

          {/* Component 2: Clearance */}
          <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
            <p className="font-mono text-xs font-semibold text-primary">
              ② Clearance Dominance Violation (Δ<sub>ij</sub>)
            </p>
            <FormulaRow
              label="Clearance Status"
              value={deltaIj === 1 ? "1.00 (VIOLATION DETECTED)" : "0.00 (NO VIOLATION)"}
              sub={deltaIj === 1 ? "LRI* auto-maximized to 1.00" : "Clearance satisfied"}
            />
          </div>

          {/* Component 3: Downstream Reachability */}
          <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
            <p className="font-mono text-xs font-semibold text-primary">
              ③ Downstream Exposure Probability (Π*<sub>j</sub>)
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Formula: Π*<sub>j</sub> = max<sub>s</sub> B[j,s] where B = (I−Q)<sup>−1</sup> × R
            </p>
            <FormulaRow label={`Exposure for ${recipientId}`} value={piJ.toFixed(4)} />
          </div>
        </div>
      )}
    </div>
  );
}
