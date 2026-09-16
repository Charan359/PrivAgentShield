import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import {
  ActionBadge,
  Chip,
  Panel,
  RiskBadge,
  SensitivityBadge,
} from "@/components/primitives";
import { agents, decisions, scenarioSteps, agentById } from "@/data/mock";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Multi-Agent Playground — PrivAgentShield" },
      {
        name: "description",
        content:
          "Step through a scripted multi-agent exchange and watch the guardian intercept, classify, and enforce policy on each message.",
      },
      { property: "og:title", content: "Multi-Agent Playground — PrivAgentShield" },
      {
        property: "og:description",
        content:
          "Scripted agent-to-agent exchange with inline guardian interception and policy enforcement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Playground,
});

function Playground() {
  const [step, setStep] = useState(scenarioSteps.length - 1);
  const [selected, setSelected] = useState(decisions[0]!.id);
  const decision = decisions.find((d) => d.id === selected) ?? decisions[0]!;

  return (
    <Shell>
      <PageHeader
        eyebrow="Simulation"
        title="Multi-Agent Playground"
        subtitle="Replay scripted agent conversations and observe the inline reference monitor mediate every envelope."
      />
      <SimulationBanner />

      <Panel
        title="Agent roster"
        description="Clearance levels and category allow-lists used by the access-control check."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-card/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {a.name}
                </p>
                <Chip tone={a.isExternal ? "danger" : "primary"}>
                  L{a.clearance}
                  {a.isExternal ? " · external" : ""}
                </Chip>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.role}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.allowed.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                trust {a.trust.toFixed(2)} · violations {a.violations}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Scenario: billing dispute with card data"
        description="Customer Agent → Finance Agent → Security Guardian → Policy Engine → Decision"
        right={
          <div className="flex gap-2">
            <button
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            <button
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary"
              onClick={() =>
                setStep((s) => Math.min(scenarioSteps.length - 1, s + 1))
              }
            >
              Step
            </button>
          </div>
        }
      >
        <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          {scenarioSteps.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={
                  "flex-1 rounded-md border p-3 transition-colors " +
                  (i <= step
                    ? "border-primary/40 bg-primary/8"
                    : "border-border bg-card/40 opacity-60")
                }
              >
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  step {i + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
              </div>
              {i < scenarioSteps.length - 1 && (
                <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Message queue" description="Pick an envelope to inspect.">
          <ul className="flex flex-col gap-1.5">
            {decisions.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setSelected(d.id)}
                  className={
                    "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors " +
                    (d.id === selected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:bg-secondary")
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-muted-foreground">#{d.seq}</span>
                    <ActionBadge action={d.action} />
                  </span>
                  <span className="mt-1 block truncate text-foreground/80">
                    {agentById(d.from)?.name} → {agentById(d.to)?.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={`Envelope ${decision.id}`}
          description={`${decision.channel} channel · ${decision.latencyMs} ms inspection`}
          right={<ActionBadge action={decision.action} />}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="primary">{decision.category}</Chip>
            <SensitivityBadge level={decision.sensitivity} />
            <RiskBadge lri={decision.lri} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Raw payload
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-secondary/50 p-3 text-xs text-foreground/90">
                {decision.rawContent}
              </pre>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Delivered payload
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-secondary/50 p-3 text-xs text-foreground/90">
                {decision.sanitizedContent}
              </pre>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-card/60 p-3">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
              <ShieldCheck className="size-3.5" /> guardian rationale
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {decision.explanation}
            </p>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
