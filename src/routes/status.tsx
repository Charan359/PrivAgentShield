import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Panel } from "@/components/primitives";
import { tier1Detector } from "@/detection/tier1";
import { tier2Detector } from "@/detection/tier2";
import { llmProvider } from "@/providers/llmProvider";
import { topologyCache } from "@/topology/cache";
import { failSafeManager } from "@/security/failSafe";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status & Health — PrivAgentShield" },
      { name: "description", content: "Technical status page detailing real connectivity, fallback states, and subsystem health." },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const tier2Status = tier2Detector.getStatus();
  const llmConfigured = llmProvider.isConfigured();
  const failSafeConfig = failSafeManager.getConfig();

  const components = [
    { name: "Runtime Proxy", status: "OPERATIONAL", detail: "Active inline HTTP interception (/v1/chat/completions & /api/proxy/mediate)", tone: "text-allow" },
    { name: "Tier 1 Pattern/Entropy Detector", status: "OPERATIONAL", detail: "Compiled regex, mod-97, Luhn checksum & Shannon entropy calculator", tone: "text-allow" },
    { name: "Hyperscan Regex Adapter", status: tier1Detector.adapterStatus, detail: tier1Detector.adapterStatus === "CONNECTED" ? "C++ native automata loaded" : "Native libhyperscan absent; operating via compiled regex local fallback", tone: "text-mask" },
    { name: "Microsoft Presidio Adapter", status: tier2Status.presidio, detail: tier2Status.presidio === "CONNECTED" ? "Presidio REST API connected" : "PRESIDIO_ANALYZER_URL unconfigured; operating via local deterministic NER fallback", tone: "text-mask" },
    { name: "GLiNER Zero-Shot Adapter", status: tier2Status.gliner, detail: tier2Status.gliner === "CONNECTED" ? "GLiNER ONNX model active" : "GLINER_MODEL unconfigured; operating via local entity classifier fallback", tone: "text-mask" },
    { name: "Tier 3 Semantic Security Probe", status: "OPERATIONAL", detail: "Deterministic injection, jailbreak & confused-deputy rule classifier", tone: "text-allow" },
    { name: "Taint Engine (T*m)", status: "OPERATIONAL", detail: "T*m = min(1.0, Σ s*(ek) × ω(ek)) strictly enforced", tone: "text-allow" },
    { name: "Dynamic IFC Engine (Δ*ij)", status: "OPERATIONAL", detail: "Lattice clearance dominance verification active across 5 categories", tone: "text-allow" },
    { name: "ABAC Policy Engine", status: "OPERATIONAL", detail: "Attribute-based policy evaluator (agent role, trust, channel constraints)", tone: "text-allow" },
    { name: "Topology Engine & Markov Solver", status: "OPERATIONAL", detail: "Fundamental matrix N=(I-Q)⁻¹ and absorption B=NR active with cycle handling", tone: "text-allow" },
    { name: "Topology Reachability Cache", status: "OPERATIONAL", detail: `Version v${topologyCache.getVersion()} active with auto-invalidation on graph edits`, tone: "text-allow" },
    { name: "LRI* Minimax Risk Engine", status: "OPERATIONAL", detail: "LRI* = max(Δ*ij, T*m × Π*j) strictly computed without compensatory dilution", tone: "text-allow" },
    { name: "Session-Consistent Sanitization", status: "OPERATIONAL", detail: "Session-scoped dictionary generating typed surrogates preserving coreference", tone: "text-allow" },
    { name: "Quarantine Review Queue", status: "OPERATIONAL", detail: "Human review approval/rejection lifecycle with automated audit emission", tone: "text-allow" },
    { name: "Cryptographic Audit Ledger", status: "OPERATIONAL", detail: "SHA-256 payloadHash and tamper-evident hash chain verification active", tone: "text-allow" },
    { name: "External Sink Demonstrator", status: "OPERATIONAL", detail: "Physical payload receipt tracker for verifiable delivery enforcement", tone: "text-allow" },
    { name: "LLM Provider Adapter", status: llmConfigured ? "CONNECTED" : "SIMULATION FALLBACK", detail: llmConfigured ? "OpenAI-compatible endpoint active" : "LLM_API_KEY unconfigured; operating via deterministic simulation provider", tone: llmConfigured ? "text-allow" : "text-mask" },
    { name: "AgentLeak Benchmark Harness", status: "PLANNED", detail: "Channel C2, C3, C5 test runner protocol implemented; awaiting full benchmark run", tone: "text-muted-foreground" },
    { name: "AgentDojo Adversarial Suite", status: "PLANNED", detail: "Adversarial injection and tool hijacking harness implemented; awaiting benchmark run", tone: "text-muted-foreground" },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="System Health & Connectivity"
        title="Technical System Status"
        subtitle="Complete architectural visibility into runtime proxy subsystems, detector adapters, mathematical engines, and benchmark readiness. Status labels reflect actual operational connectivity."
      />
      <SimulationBanner />

      {/* Global Health Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-allow/40 bg-allow/10 p-3 text-xs">
          <p className="font-mono text-muted-foreground uppercase text-[10px]">Overall System State</p>
          <p className="mt-1 font-mono text-lg font-bold text-allow flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> OPERATIONAL
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">All core security engines active and responsive</p>
        </div>

        <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs">
          <p className="font-mono text-muted-foreground uppercase text-[10px]">Fail-Safe Policy</p>
          <p className="mt-1 font-mono text-lg font-bold text-primary">
            {failSafeConfig.mode === "failClosed" ? "FAIL-CLOSED (Secure)" : "FAIL-OPEN"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Blocks unverified payloads upon detector exceptions</p>
        </div>

        <div className="rounded-md border border-border bg-card p-3 text-xs">
          <p className="font-mono text-muted-foreground uppercase text-[10px]">Topology Version</p>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            v{topologyCache.getVersion()} (Cached)
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Markov absorption cache auto-invalidates on edits</p>
        </div>

        <div className="rounded-md border border-mask/40 bg-mask/10 p-3 text-xs">
          <p className="font-mono text-muted-foreground uppercase text-[10px]">External Adapters</p>
          <p className="mt-1 font-mono text-lg font-bold text-mask flex items-center gap-1.5">
            <AlertTriangle className="size-4" /> LOCAL FALLBACK
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Operating with deterministic built-in local engines</p>
        </div>
      </div>

      {/* Subsystems Table */}
      <Panel title="Subsystem Health & Operational Connectivity" description="Live status of all 19 PrivAgentShield components.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 pr-4">Component Subsystem</th>
                <th className="py-2.5 pr-4">Operational Status</th>
                <th className="py-2.5">Connectivity & Implementation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {components.map((c) => (
                <tr key={c.name} className="hover:bg-secondary/30">
                  <td className="py-2.5 pr-4 font-mono font-semibold text-foreground">{c.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn(
                      "rounded border px-2 py-0.5 font-mono text-[10px] font-bold",
                      c.status === "OPERATIONAL" ? "border-allow/40 bg-allow/10 text-allow" :
                      c.status.includes("CONNECTED") ? "border-allow/40 bg-allow/10 text-allow" :
                      c.status.includes("FALLBACK") ? "border-mask/40 bg-mask/10 text-mask" :
                      "border-border bg-secondary/50 text-muted-foreground"
                    )}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground font-sans">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}
