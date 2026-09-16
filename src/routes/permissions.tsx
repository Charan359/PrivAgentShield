import { createFileRoute } from "@tanstack/react-router";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Bar, Chip, Metric, Panel } from "@/components/primitives";
import { AGENT_CLEARANCES } from "@/lib/lri/clearance";
import type { ClearanceCategory, SensitivityLevel } from "@/lib/lri/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Agent Permissions & Clearance Vectors — PrivAgentShield" },
      {
        name: "description",
        content: "Lattice-based clearance vectors (Personal, Medical, Financial, Credentials, Confidential) per agent used for Δ*ij clearance dominance checks.",
      },
    ],
  }),
  component: Permissions,
});

const DEMO_AGENTS_FULL = [
  {
    id: "coordinator-01",
    name: "Coordinator-01",
    role: "Coordinator / Orchestrator",
    department: "Operations",
    isExternal: false,
    trust: 0.95,
    allowedTools: ["task_dispatcher", "agent_router", "status_checker"],
    allowedDestinations: ["medical-agent-01", "finance-agent-01", "research-agent-01", "audit-log"],
  },
  {
    id: "medical-agent-01",
    name: "Medical-Agent-01",
    role: "Medical Analyst",
    department: "Healthcare Services",
    isExternal: false,
    trust: 0.98,
    allowedTools: ["health_db_query", "clinical_analyzer", "ehr_lookup"],
    allowedDestinations: ["tool-agent-01", "internal-db", "audit-log"],
  },
  {
    id: "finance-agent-01",
    name: "Finance-Agent-01",
    role: "Financial Analyst",
    department: "Finance & Billing",
    isExternal: false,
    trust: 0.94,
    allowedTools: ["payment_gateway", "invoice_settler", "banking_api"],
    allowedDestinations: ["tool-agent-01", "external-gateway-01", "internal-db", "audit-log"],
  },
  {
    id: "research-agent-01",
    name: "Research-Agent-01",
    role: "Research Agent",
    department: "R&D",
    isExternal: false,
    trust: 0.88,
    allowedTools: ["web_search", "arxiv_fetcher", "kb_query"],
    allowedDestinations: ["external-gateway-01", "tool-agent-01", "audit-log"],
  },
  {
    id: "tool-agent-01",
    name: "Tool-Agent-01",
    role: "Tool Execution Worker",
    department: "Infrastructure",
    isExternal: false,
    trust: 0.82,
    allowedTools: ["db_connector", "http_client"],
    allowedDestinations: ["internal-db", "external-api", "audit-log"],
  },
  {
    id: "external-gateway-01",
    name: "External-Gateway-01",
    role: "External Gateway / Sink",
    department: "Egress Boundary",
    isExternal: true,
    trust: 0.45,
    allowedTools: ["public_webhook", "vendor_api"],
    allowedDestinations: ["external-api"],
  },
];

const CATEGORIES: ClearanceCategory[] = [
  "personal", "medical", "financial", "credentials", "confidential",
];

const LEVEL_COLOR: Record<SensitivityLevel, string> = {
  L1: "border-border bg-secondary/50 text-muted-foreground",
  L2: "border-mask/40 bg-mask/10 text-mask font-semibold",
  L3: "border-redact/40 bg-redact/10 text-redact font-semibold",
  L4: "border-block/40 bg-block/10 text-block font-bold",
};

function Permissions() {
  const externalCount = DEMO_AGENTS_FULL.filter((a) => a.isExternal).length;
  const avgTrust = DEMO_AGENTS_FULL.reduce((s, a) => s + a.trust, 0) / DEMO_AGENTS_FULL.length;

  return (
    <Shell>
      <PageHeader
        eyebrow="ABAC & Lattice access control"
        title="Agent Management & Clearance Vectors"
        subtitle="Lattice-based clearance vectors represent each agent's authorization level across 5 sensitive data dimensions (Personal, Medical, Financial, Credentials, Confidential). Used in the Δ*ij clearance dominance check."
      />
      <SimulationBanner />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Configured Agents" value={DEMO_AGENTS_FULL.length} tone="primary" />
        <Metric label="External Egress Sinks" value={externalCount} tone="block" />
        <Metric label="Avg Trust Score" value={avgTrust.toFixed(2)} tone="allow" />
        <Metric label="Clearance Dimensions" value={CATEGORIES.length} tone="mask" />
      </div>

      {/* Clearance Vector Table */}
      <Panel
        title="Lattice Clearance Vector Matrix"
        description="Δ*ij = 1.0 if any required category level exceeds the recipient's clearance in this matrix."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2.5 pr-3">Agent</th>
                <th className="py-2.5 pr-3">Role</th>
                <th className="py-2.5 pr-3">Zone</th>
                {CATEGORIES.map((cat) => (
                  <th key={cat} className="py-2.5 pr-3 text-center capitalize">
                    {cat}
                  </th>
                ))}
                <th className="py-2.5 text-right">Trust Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DEMO_AGENTS_FULL.map((agent) => {
                const vector = AGENT_CLEARANCES[agent.id] ?? {
                  personal: "L1", medical: "L1", financial: "L1", credentials: "L1", confidential: "L1",
                };
                return (
                  <tr key={agent.id} className="hover:bg-secondary/40">
                    <td className="py-3 pr-3 font-mono font-semibold text-foreground">
                      {agent.name}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{agent.role}</td>
                    <td className="py-3 pr-3">
                      <Chip tone={agent.isExternal ? "danger" : "default"}>
                        {agent.isExternal ? "EXTERNAL" : "INTERNAL"}
                      </Chip>
                    </td>
                    {CATEGORIES.map((cat) => {
                      const level = vector[cat];
                      return (
                        <td key={cat} className="py-3 pr-3 text-center">
                          <span className={cn(
                            "inline-block min-w-[36px] rounded border px-2 py-0.5 font-mono text-[11px]",
                            LEVEL_COLOR[level],
                          )}>
                            {level}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3 text-right">
                      <span className="font-mono font-semibold">{agent.trust.toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ABAC Attributes List */}
      <Panel title="Attribute-Based Access Control (ABAC) Profiles" description="Agent attributes include role, department, clearance vector, allowed tools, and allowed destinations.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_AGENTS_FULL.map((agent) => {
            const vector = AGENT_CLEARANCES[agent.id];
            return (
              <div key={agent.id} className="rounded-md border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-sm font-semibold text-foreground">{agent.name}</h4>
                  <Chip tone={agent.isExternal ? "danger" : "primary"}>
                    {agent.isExternal ? "External" : "Internal"}
                  </Chip>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{agent.role} · {agent.department}</p>

                {/* Clearance summary pills */}
                {vector && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {CATEGORIES.map((cat) => (
                      <span key={cat} className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px]", LEVEL_COLOR[vector[cat]])}>
                        {cat.slice(0, 3)}: {vector[cat]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Allowed tools */}
                <div className="mt-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Allowed Tools</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {agent.allowedTools.map((t) => (
                      <span key={t} className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trust bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Trust score</span>
                    <span>{agent.trust.toFixed(2)}</span>
                  </div>
                  <Bar value={agent.trust * 100} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </Shell>
  );
}
