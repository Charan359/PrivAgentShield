/**
 * Payload Diff Component
 *
 * Side-by-side comparison of original vs sanitized payload with
 * highlighted entity replacements. Used in Payload Inspector and Decisions pages.
 */

import { cn } from "@/lib/utils";

export type HighlightSpan = {
  original: string;
  replacement: string;
  type: string;
  tier: 1 | 2 | 3;
  severityLevel?: string;
};

export type PayloadDiffProps = {
  originalPayload: string;
  sanitizedPayload: string;
  highlights?: HighlightSpan[];
  action: "ALLOW" | "SANITIZE" | "QUARANTINE";
  className?: string;
};

const TIER_COLOR: Record<number, string> = {
  1: "bg-primary/15 border-primary/40 text-primary",
  2: "bg-mask/15 border-mask/40 text-mask",
  3: "bg-block/15 border-block/40 text-block",
};

const TIER_LABEL: Record<number, string> = {
  1: "T1",
  2: "T2",
  3: "T3",
};

function HighlightedText({
  text,
  highlights,
  isOriginal,
}: {
  text: string;
  highlights?: HighlightSpan[];
  isOriginal: boolean;
}) {
  if (!highlights || highlights.length === 0) {
    return <span className="text-foreground/90">{text}</span>;
  }

  // Build parts by replacing known substrings
  const parts: { text: string; span?: HighlightSpan }[] = [];
  let remaining = text;
  let searchIn = isOriginal ? "original" : "replacement";

  // For original: highlight the original strings
  // For sanitized: highlight the replacement tokens
  const searchTerms = highlights.map((h) => ({
    term: isOriginal ? h.original : h.replacement,
    span: h,
  }));

  // Simple linear scan
  let pos = 0;
  const workText = text;

  // Build index of all matches
  type Match = { start: number; end: number; span: HighlightSpan };
  const matches: Match[] = [];

  for (const { term, span } of searchTerms) {
    if (!term) continue;
    let idx = 0;
    while (true) {
      const found = workText.indexOf(term, idx);
      if (found === -1) break;
      matches.push({ start: found, end: found + term.length, span });
      idx = found + 1;
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlaps
  const clean: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      clean.push(m);
      lastEnd = m.end;
    }
  }

  // Build parts
  let cursor = 0;
  for (const m of clean) {
    if (m.start > cursor) {
      parts.push({ text: workText.slice(cursor, m.start) });
    }
    parts.push({ text: workText.slice(m.start, m.end), span: m.span });
    cursor = m.end;
  }
  if (cursor < workText.length) {
    parts.push({ text: workText.slice(cursor) });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.span ? (
          <span
            key={i}
            className={cn(
              "inline-block rounded border px-0.5 py-px text-[11px] font-mono font-semibold",
              TIER_COLOR[part.span.tier] ?? "bg-secondary text-foreground",
            )}
            title={`${part.span.type} • Tier ${part.span.tier}${part.span.severityLevel ? ` • ${part.span.severityLevel}` : ""}`}
          >
            {part.text}
          </span>
        ) : (
          <span key={i} className="text-foreground/90">
            {part.text}
          </span>
        ),
      )}
    </>
  );
}

export function PayloadDiff({
  originalPayload,
  sanitizedPayload,
  highlights,
  action,
  className,
}: PayloadDiffProps) {
  const isAllow = action === "ALLOW";
  const isQuarantine = action === "QUARANTINE";

  return (
    <div className={cn("grid gap-4", isAllow ? "grid-cols-1" : "lg:grid-cols-2", className)}>
      {/* Original payload */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Original Payload
          </p>
          {highlights && highlights.length > 0 && (
            <div className="flex gap-1">
              {([1, 2, 3] as const)
                .filter((t) => highlights.some((h) => h.tier === t))
                .map((t) => (
                  <span
                    key={t}
                    className={cn(
                      "rounded border px-1 py-px font-mono text-[9px] font-semibold",
                      TIER_COLOR[t],
                    )}
                  >
                    {TIER_LABEL[t]}
                  </span>
                ))}
            </div>
          )}
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs leading-relaxed text-foreground/90">
          <HighlightedText
            text={originalPayload}
            highlights={highlights}
            isOriginal={true}
          />
        </pre>
      </div>

      {/* Sanitized / blocked payload */}
      {!isAllow && (
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {isQuarantine ? "Blocked — Not Delivered" : "Sanitized Payload"}
            </p>
            {!isQuarantine && (
              <span className="rounded border border-mask/40 bg-mask/10 px-1 py-px font-mono text-[9px] font-semibold text-mask">
                SANITIZED
              </span>
            )}
            {isQuarantine && (
              <span className="rounded border border-block/40 bg-block/10 px-1 py-px font-mono text-[9px] font-semibold text-block">
                QUARANTINED
              </span>
            )}
          </div>
          <pre
            className={cn(
              "whitespace-pre-wrap rounded-md border p-3 font-mono text-xs leading-relaxed",
              isQuarantine
                ? "border-block/30 bg-block/5 text-muted-foreground line-through decoration-block/50"
                : "border-border bg-secondary/40 text-foreground/90",
            )}
          >
            {isQuarantine ? (
              <span className="no-underline text-block">[MESSAGE BLOCKED — Dispatch Prevented]</span>
            ) : (
              <HighlightedText
                text={sanitizedPayload}
                highlights={highlights}
                isOriginal={false}
              />
            )}
          </pre>
        </div>
      )}

      {/* Legend */}
      {highlights && highlights.length > 0 && (
        <div className={cn("flex flex-wrap gap-2 text-[11px]", !isAllow && "lg:col-span-2")}>
          {([1, 2, 3] as const)
            .filter((t) => highlights.some((h) => h.tier === t))
            .map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("rounded border px-1 py-px font-mono text-[9px] font-semibold", TIER_COLOR[t])}>
                  {TIER_LABEL[t]}
                </span>
                {t === 1 && "Regex/Entropy (Tier 1)"}
                {t === 2 && "NER/PII (Tier 2)"}
                {t === 3 && "Semantic (Tier 3)"}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
