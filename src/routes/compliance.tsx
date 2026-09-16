import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Panel } from "@/components/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance Mapping — PrivAgentShield" },
      { name: "description", content: "Regulatory reference mapping for GDPR Art.9, HIPAA 164.312, and EU AI Act Annex III. Not legal compliance certification." },
    ],
  }),
  component: CompliancePage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Regulatory reference data
// ─────────────────────────────────────────────────────────────────────────────

const REGULATIONS = [
  {
    id: "gdpr-art9",
    name: "GDPR Article 9",
    jurisdiction: "EU",
    fullName: "General Data Protection Regulation — Article 9: Processing of special categories of personal data",
    summary:
      "Prohibits processing of special categories of personal data (health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs) unless explicit conditions are met.",
    relevantCategories: ["Medical", "Personal (special category)", "Biometric"],
    enforcementMechanism: "The PrivAgentShield LRI* engine classifies medical entities (L3) and flags clearance violations (Δij=1) when medical data flows to agents without medical clearance, triggering QUARANTINE.",
    demoScenariosRef: ["sc-03", "sc-05"],
    color: "border-primary/40 bg-primary/5",
    badge: "GDPR",
  },
  {
    id: "hipaa-164312",
    name: "HIPAA §164.312",
    jurisdiction: "US",
    fullName: "HIPAA Security Rule — §164.312: Technical Safeguards",
    summary:
      "Requires covered entities to implement access controls, audit controls, integrity controls, and transmission security for electronic protected health information (ePHI).",
    relevantCategories: ["Medical / ePHI", "Employee health records", "Diagnostic data"],
    enforcementMechanism: "The framework enforces access control via clearance vectors (medical clearance required at L3+), audit-logs every gateway decision including ALLOWs, and pseudonymizes ePHI in sanitized payloads instead of transmitting raw values.",
    demoScenariosRef: ["sc-03", "sc-05"],
    color: "border-mask/40 bg-mask/5",
    badge: "HIPAA",
  },
  {
    id: "euai-annex3",
    name: "EU AI Act Annex III",
    jurisdiction: "EU",
    fullName: "EU Artificial Intelligence Act — Annex III: High-Risk AI Systems",
    summary:
      "Classifies AI systems used in critical infrastructure, employment, education, public services, law enforcement, and biometric identification as high-risk, requiring transparency, human oversight, and robustness measures.",
    relevantCategories: ["Automated decision-making", "Biometric data", "Law enforcement outputs", "Employment data"],
    enforcementMechanism: "PrivAgentShield provides: (1) human-in-the-loop review via quarantine queue for high-LRI* decisions, (2) full explainability of every decision via the LRI* breakdown, (3) audit trail with decision rationale, (4) configurable thresholds allowing human adjustment of automated decision boundaries.",
    demoScenariosRef: ["sc-06", "sc-07"],
    color: "border-redact/40 bg-redact/5",
    badge: "EU AI Act",
  },
];

const DEMO_EVENTS = [
  {
    id: "evt-001",
    ts: "2026-09-13T07:42:11Z",
    category: "Medical / ePHI",
    action: "QUARANTINE",
    lriStar: 1.00,
    regulatoryRef: ["GDPR Art. 9", "HIPAA §164.312"],
    reason: "Medical entity (cardiac arrhythmia) detected. Clearance violation: medical(required:L3, has:L1). Δij=1.",
    auditRef: "qev-0001",
  },
  {
    id: "evt-002",
    ts: "2026-09-13T07:40:55Z",
    category: "Credentials (L4)",
    action: "QUARANTINE",
    lriStar: 1.00,
    regulatoryRef: ["GDPR Art. 32", "HIPAA §164.312(e)"],
    reason: "L4 credential (api_key) attempting egress to external sink. High-entropy secret detected by Tier 1.",
    auditRef: "qev-0002",
  },
  {
    id: "evt-003",
    ts: "2026-09-13T07:39:20Z",
    category: "Personal (PII) + Financial",
    action: "SANITIZE",
    lriStar: 0.49,
    regulatoryRef: ["GDPR Art. 5", "GDPR Art. 9"],
    reason: "PII (person_name, email) + IBAN detected. LRI*=0.49, threshold triggered SANITIZE. Session-consistent pseudonymization applied.",
    auditRef: "aud-evt-003",
  },
];

function RegulationCard({ reg }: { reg: typeof REGULATIONS[0] }) {
  return (
    <div className={cn("rounded-md border p-5", reg.color)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-card/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {reg.badge}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{reg.jurisdiction}</span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">{reg.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{reg.fullName}</p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{reg.summary}</p>

      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Relevant Data Categories</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {reg.relevantCategories.map((c) => (
            <span key={c} className="rounded border border-border bg-card/60 px-2 py-0.5 text-xs text-foreground/80">{c}</span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Framework Enforcement Mechanism</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/70">{reg.enforcementMechanism}</p>
      </div>

      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Demo Scenarios</p>
        <div className="mt-1 flex gap-1.5">
          {reg.demoScenariosRef.map((s) => (
            <span key={s} className="rounded border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompliancePage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Regulatory mapping"
        title="Compliance Reference Mapping"
        subtitle="How PrivAgentShield's enforcement actions correspond to regulatory requirements. This is a reference mapping only — not legal compliance certification."
      />
      <SimulationBanner />

      {/* Disclaimer */}
      <div className="rounded-md border border-mask/40 bg-mask/10 p-4 text-sm text-mask">
        <p className="font-semibold">⚠ Regulatory Reference Mapping — Not Legal Compliance Certification</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The mappings below illustrate how the framework's enforcement actions relate to regulatory requirements.
          PrivAgentShield does not claim compliance certification under any regulation.
          Organizations must conduct their own legal assessment for compliance determination.
        </p>
      </div>

      {/* Regulation cards */}
      <div className="flex flex-col gap-4">
        {REGULATIONS.map((reg) => (
          <RegulationCard key={reg.id} reg={reg} />
        ))}
      </div>

      {/* Sample event table */}
      <Panel
        title="Sample Regulatory Reference Events"
        description="SIMULATION DATA — enforcement decisions with corresponding regulatory references."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-3">Timestamp</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3">Action</th>
                <th className="pb-2 pr-3">LRI*</th>
                <th className="pb-2 pr-3">Regulatory References</th>
                <th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_EVENTS.map((evt) => (
                <tr key={evt.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(evt.ts).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-3 text-foreground/80">{evt.category}</td>
                  <td className="py-2 pr-3">
                    <span className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                      evt.action === "QUARANTINE"
                        ? "border-block/40 bg-block/10 text-block"
                        : "border-mask/40 bg-mask/10 text-mask",
                    )}>
                      {evt.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono font-semibold text-block">{evt.lriStar.toFixed(2)}</td>
                  <td className="py-2 pr-3">
                    {evt.regulatoryRef.map((r) => (
                      <span key={r} className="mr-1 rounded border border-border bg-secondary/50 px-1 font-mono text-[9px]">{r}</span>
                    ))}
                  </td>
                  <td className="py-2 text-muted-foreground max-w-xs">{evt.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          ⚠ SIMULATION DATA — Demo scenarios only. Audit references are illustrative.
        </p>
      </Panel>
    </Shell>
  );
}
