import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Chip, Panel } from "@/components/primitives";
import { DATA_MODE, detectors, policies } from "@/data/mock";
import { getSessionDictionary, type SurrogateEntry } from "@/lib/pseudonymization";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "System Settings & Demo Dictionary — PrivAgentShield" },
      {
        name: "description",
        content:
          "Runtime configuration, gate options, risk thresholds, and developer/demo pseudonymization session dictionary inspection.",
      },
    ],
  }),
  component: SettingsPage,
});

function Toggle({
  label,
  hint,
  defaultOn = true,
}: {
  label: string;
  hint: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-xs text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={
          "mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors " +
          (on ? "border-allow/50 bg-allow/30" : "border-border bg-secondary")
        }
      >
        <span
          className={
            "block size-3.5 rounded-full bg-foreground transition-transform " +
            (on ? "translate-x-[18px]" : "translate-x-[2px]")
          }
        />
      </button>
    </li>
  );
}

function PseudonymizationDemoViewer() {
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState("session-demo-01");

  // Sample mapping entries for demonstration
  const sampleEntries: SurrogateEntry[] = [
    { surrogate: "[PERSON_8f31a2]", entityType: "person_name", sessionId: "session-demo-01", createdAt: "2026-09-13T07:40:00Z", _demoOriginal: "John Smith" },
    { surrogate: "[PERSON_a3f1b4]", entityType: "person_name", sessionId: "session-demo-01", createdAt: "2026-09-13T07:41:12Z", _demoOriginal: "Sarah Mitchell" },
    { surrogate: "[MEDICAL_RECORD_c891e2]", entityType: "MEDICAL_TERM", sessionId: "session-demo-01", createdAt: "2026-09-13T07:41:12Z", _demoOriginal: "Type 2 Diabetes" },
    { surrogate: "[CREDENTIAL_3c91f4]", entityType: "api_key", sessionId: "session-demo-01", createdAt: "2026-09-13T07:42:11Z", _demoOriginal: "sk_test_51NcQ2fJk8ZxT0aWbYh3PmR" },
    { surrogate: "[FINANCIAL_d4e5f6]", entityType: "financial_identifier", sessionId: "session-demo-01", createdAt: "2026-09-13T07:43:00Z", _demoOriginal: "DE89 3704 0044 0532 0130 00" },
  ];

  const liveEntries = getSessionDictionary(sessionIdInput);
  const displayEntries = liveEntries.length > 0 ? liveEntries : sampleEntries;

  return (
    <Panel
      title="Pseudonymization Ephemeral Session Dictionary (Developer / Demo View)"
      description="Session-consistent typed surrogate tokens preserve coreference across messages. Plaintext mappings are stored in an ephemeral session dictionary and never exposed in normal sanitized outputs."
    >
      <div className="rounded-md border border-mask/30 bg-mask/5 p-3 text-xs text-mask mb-4">
        ⚠ <strong>Developer/Demo Inspection View:</strong> Plaintext mapping values are exposed here strictly for demonstration purposes to verify entity coreference preservation. In production, this dictionary is ephemeral and strictly isolated per session.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">Session ID:</span>
          <span className="font-mono font-semibold text-foreground">{sessionIdInput}</span>
        </div>

        <button
          onClick={() => setShowPlaintext((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono font-semibold transition-colors",
            showPlaintext
              ? "border-block/40 bg-block/10 text-block"
              : "border-border bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          {showPlaintext ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {showPlaintext ? "Hide Plaintext Originals" : "Reveal Plaintext (Demo Only)"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-3">Surrogate Token (Safe Output)</th>
              <th className="pb-2 pr-3">Entity Type</th>
              <th className="pb-2 pr-3">Original Plaintext Entity</th>
              <th className="pb-2 pr-3">Session ID</th>
              <th className="pb-2">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {displayEntries.map((e, i) => (
              <tr key={i} className="hover:bg-secondary/40">
                <td className="py-2.5 pr-3 text-primary font-semibold">{e.surrogate}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{e.entityType}</td>
                <td className="py-2.5 pr-3">
                  {showPlaintext ? (
                    <span className="text-block font-semibold bg-block/10 px-1 py-0.5 rounded border border-block/30">
                      {e._demoOriginal}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic flex items-center gap-1">
                      <Lock className="size-3" /> [PROTECTED — HIDDEN]
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{e.sessionId}</td>
                <td className="py-2.5 text-muted-foreground text-[10px]">{e.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SettingsPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Configuration & developer tools"
        title="System Settings"
        subtitle="Runtime posture, enforcement toggles, and developer/demo session dictionary inspection."
      />
      <SimulationBanner />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Runtime Mode & Engine Architecture" description="Simulated 3-tier runtime security layer setup.">
          <dl className="divide-y divide-border text-xs">
            {[
              ["Data Mode", DATA_MODE],
              ["Tier 1 Pattern Engine", "Active (Hyperscan-compatible TypeScript fallback)"],
              ["Tier 2 NER Engine", "Fallback (Presidio/GLiNER interface simulated)"],
              ["Tier 3 Semantic Engine", "Fallback (Transformer probe interface simulated)"],
              ["Risk Metric Engine", "Non-compensatory LRI* = max(Δij, Tm × Πj)"],
              ["Gateway Placement", "Inline reference monitor"],
              ["Fail Behaviour", "Fail-closed (block on engine error)"],
              ["Active Policies", `${policies.filter((p) => p.enabled).length} of ${policies.length}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-foreground text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Enforcement Pipeline Toggles" description="Arm or disarm specific security gateway stages.">
          <ul className="divide-y divide-border">
            <Toggle label="Inspect inter-agent messages" hint="Mediate direct and broadcast envelopes." />
            <Toggle label="Inspect tool calls" hint="Apply the same pipeline to outbound tool payloads." />
            <Toggle label="Inspect shared memory writes" hint="Scan before anything is persisted to shared memory." />
            <Toggle label="Session-consistent pseudonymization" hint="Replace sensitive spans with coreference-preserving surrogates." defaultOn={true} />
            <Toggle label="Shadow mode" hint="Log decisions without transforming payloads." defaultOn={false} />
          </ul>
        </Panel>
      </div>

      {/* Developer Demo View for Pseudonymization */}
      <PseudonymizationDemoViewer />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Configurable LRI* Thresholds" description="Decision boundaries used by the risk engine.">
          <dl className="divide-y divide-border text-xs">
            {[
              ["τlow (ALLOW → SANITIZE)", "0.30 (configurable default)"],
              ["τhigh (SANITIZE → QUARANTINE)", "0.70 (configurable default)"],
              ["Shannon Entropy Hmax", "4.5 bits/char"],
              ["Severity Weights", "L1=0.1, L2=0.3, L3=0.7, L4=1.0"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Audit & Ledger Security" description="Tamper-evident audit chain retention.">
          <dl className="divide-y divide-border text-xs">
            {[
              ["Ledger Structure", "Append-only, SHA-256 hash chained"],
              ["Retention Window", "90 days"],
              ["Raw Payload Storage", "Disabled — SHA hashes only"],
              ["Export Formats", "JSON, CSV"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1">
            <Chip tone="primary">SIMULATED RUNTIME</Chip>
            <Chip>EPHEMERAL DICTIONARY</Chip>
            <Chip>FAIL-CLOSED</Chip>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}

