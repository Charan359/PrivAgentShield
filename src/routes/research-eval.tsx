import { createFileRoute } from "@tanstack/react-router";
import { ResearchEval } from "../components/ResearchEval";
import { Shell, PageHeader, SimulationBanner } from "../components/shell";

export const Route = createFileRoute("/research-eval")({
  head: () => ({
    meta: [
      { title: "Research Evaluation — PrivAgentShield" },
      { name: "description", content: "Empirical evaluation results and metrics for Phase 4 validation." },
    ],
  }),
  component: ResearchEvalPage,
});

function ResearchEvalPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Phase 4 Empirical Validation"
        title="Research Evaluation Dashboard"
        subtitle="Empirical results, baseline comparisons, and statistical metric breakdowns generated from experimental runs."
      />
      <SimulationBanner />
      <ResearchEval />
    </Shell>
  );
}
