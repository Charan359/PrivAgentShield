import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { ActionBadge, Chip, Metric, Panel } from "@/components/primitives";
import { policies } from "@/data/mock";
import { fullInspection } from "@/lib/detection/engine";
import { calculateLriStar } from "@/lib/lri/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policy Management — PrivAgentShield" },
      {
        name: "description",
        content:
          "Ordered ABAC policies with conditions, obligations, priority match counts, and an interactive policy simulator.",
      },
    ],
  }),
  component: Policies,
});

function PolicySimulator() {
  const [senderId, setSenderId] = useState("tool-agent-01");
  const [recipientId, setRecipientId] = useState("external-gateway-01");
  const [destination, setDestination] = useState("external-api");
  const [payload, setPayload] = useState("Please charge invoice to card 4539 8832 1145 1234, exp 09/28.");
  const [testResult, setTestResult] = useState<ReturnType<typeof calculateLriStar> | null>(null);

  const handleTestPolicy = () => {
    const insp = fullInspection(payload);
    const entities = insp.tier1.entities.map((e) => ({
      type: e.type as any,
      entropy: e.entropyValue,
    }));
    const lri = calculateLriStar({
      senderId,
      recipientId,
      detectedEntities: entities,
      tier3Alert: insp.hasTier3Alert,
    });
    setTestResult(lri);
  };

  return (
    <Panel
      title="Interactive Policy Simulator — Test Policy"
      description="Test policy evaluations on arbitrary sender, recipient, destination, and payload inputs."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sender Agent
          </label>
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="coordinator-01">coordinator-01</option>
            <option value="medical-agent-01">medical-agent-01</option>
            <option value="finance-agent-01">finance-agent-01</option>
            <option value="research-agent-01">research-agent-01</option>
            <option value="tool-agent-01">tool-agent-01</option>
            <option value="external-gateway-01">external-gateway-01</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recipient Agent
          </label>
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="external-gateway-01">external-gateway-01</option>
            <option value="tool-agent-01">tool-agent-01</option>
            <option value="coordinator-01">coordinator-01</option>
            <option value="finance-agent-01">finance-agent-01</option>
            <option value="medical-agent-01">medical-agent-01</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Destination / Sink
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Payload Text
          </label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleTestPolicy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Evaluate Policy & LRI*
        </button>
      </div>

      {testResult && (
        <div className="mt-4 rounded-md border border-border bg-secondary/30 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Evaluation Result</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="rounded border border-border bg-card p-2">
              <p className="font-mono text-[9px] text-muted-foreground">T*m</p>
              <p className="font-mono font-semibold text-foreground">{testResult.tm.toFixed(2)}</p>
            </div>
            <div className="rounded border border-border bg-card p-2">
              <p className="font-mono text-[9px] text-muted-foreground">Δ*ij</p>
              <p className="font-mono font-semibold text-foreground">{testResult.deltaIj.toFixed(2)}</p>
            </div>
            <div className="rounded border border-border bg-card p-2">
              <p className="font-mono text-[9px] text-muted-foreground">Π*j</p>
              <p className="font-mono font-semibold text-foreground">{testResult.piJ.toFixed(2)}</p>
            </div>
            <div className="rounded border border-border bg-card p-2">
              <p className="font-mono text-[9px] text-muted-foreground">LRI*</p>
              <p className="font-mono font-bold text-block">{testResult.lriStar.toFixed(2)}</p>
            </div>
            <div className="rounded border border-border bg-card p-2 sm:col-span-1 col-span-2 flex flex-col justify-center items-center">
              <p className="font-mono text-[9px] text-muted-foreground">Action</p>
              <span className={cn(
                "rounded px-2 py-0.5 font-mono text-xs font-bold mt-0.5",
                testResult.action === "ALLOW" ? "bg-allow/20 text-allow" :
                testResult.action === "SANITIZE" ? "bg-mask/20 text-mask" : "bg-block/20 text-block"
              )}>
                {testResult.action}
              </span>
            </div>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{testResult.formulaString}</p>
        </div>
      )}
    </Panel>
  );
}

function Policies() {
  const [state, setState] = useState(() =>
    Object.fromEntries(policies.map((p) => [p.id, p.enabled])),
  );
  const activeCount = Object.values(state).filter(Boolean).length;

  return (
    <Shell>
      <PageHeader
        eyebrow="Governance"
        title="Policy Management & Policy Simulator"
        subtitle="Policies are evaluated in priority order; final runtime action (ALLOW / SANITIZE / QUARANTINE) is determined by the LRI* threshold engine."
      />
      <SimulationBanner />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Policies defined" value={policies.length} />
        <Metric label="Currently enabled" value={activeCount} tone="primary" />
        <Metric
          label="Total matches"
          value={policies.reduce((s, p) => s + p.matches, 0).toLocaleString()}
          tone="mask"
        />
      </div>

      {/* Policy Simulator */}
      <PolicySimulator />

      {/* Configured Policy Rules */}
      <Panel title="Configured Policy Rules" description="Priority-ordered declarative rules matching agent communication patterns.">
        <div className="grid gap-4 xl:grid-cols-2">
          {policies.map((p) => (
            <div key={p.id} className="rounded-md border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {p.id} · priority {p.priority} · {p.version}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{p.name}</p>
                </div>
                <ActionBadge
                  action={p.effect.toUpperCase() as "ALLOW" | "MASK" | "REDACT" | "BLOCK"}
                />
              </div>

              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Condition
              </p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-secondary/50 p-2.5 text-[11px] text-foreground/90">
                {p.condition}
              </pre>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.categories.map((c) => (
                  <Chip key={c} tone="primary">
                    {c}
                  </Chip>
                ))}
                {p.obligations.map((o) => (
                  <Chip key={o}>{o}</Chip>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {p.matches.toLocaleString()} matches
                </span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={state[p.id]}
                    onChange={(e) =>
                      setState((s) => ({ ...s, [p.id]: e.target.checked }))
                    }
                  />
                  {state[p.id] ? "Enabled" : "Disabled"}
                </label>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Shell>
  );
}
