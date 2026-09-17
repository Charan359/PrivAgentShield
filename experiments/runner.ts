// experiments/runner.ts
/**
 * Core orchestration for Phase 4 experiments.
 * Reads a configuration object, iterates over the defined scenarios
 * (or baseline pipelines), executes each trial, and returns an array of
 * raw result objects that will be persisted by the entry‑point.
 */
import path from "path";
import fs from "fs";
import { storeResult } from "./store";

// Placeholder for the actual mediation runtime – in a real implementation
// this would import the PrivAgentShield mediation service and invoke it.
async function executeScenario(scenario: any, config: any): Promise<any> {
  // Simulate latency measurement
  const start = Date.now();
  // Here you would call the real runtime, e.g.:
  // const result = await mediationEngine.run(scenario, config);
  // For now we return a synthetic but well‑structured object.
  await new Promise((r) => setTimeout(r, Math.random() * 10)); // tiny delay
  const latency = Date.now() - start;
  return {
    scenarioId: scenario.id ?? "unknown",
    configId: config.experiment_id ?? "default",
    timestamp: new Date().toISOString(),
    latency_ms: latency,
    // The following fields mirror what the paper expects for LRI* etc.
    Tm: scenario.Tm ?? 0,
    deltaIj: scenario.deltaIj ?? 0,
    PiJ: scenario.PiJ ?? 0,
    LRI: Math.max(scenario.deltaIj ?? 0, (scenario.Tm ?? 0) * (scenario.PiJ ?? 0)),
    decision: "ALLOW", // placeholder – real engine decides based on LRI and thresholds
    leakage: false,
    taskCompleted: true,
  };
}

export async function runExperiment(config: any, outputDir: string) {
  // Load scenario definitions – assume they are relative to the config file.
  const scenarioPath = path.resolve(config.scenario_path);
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`Scenario file not found: ${scenarioPath}`);
  }
  const scenarios = require(scenarioPath);
  const trials = config.trials ?? 1;
  const results: any[] = [];
  for (const scenario of scenarios) {
    for (let i = 0; i < trials; i++) {
      const result = await executeScenario(scenario, config);
      result.trial = i + 1;
      results.push(result);
      // Persist each trial immediately so that partial results survive crashes.
      const trialFile = path.join(outputDir, `${scenario.id}_trial${i + 1}.json`);
      fs.writeFileSync(trialFile, JSON.stringify(result, null, 2));
    }
  }
  // Store a summary file for convenience.
  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ results, config }, null, 2));
  // Also record via the store helper (could be extended for DB storage).
  await storeResult(outputDir, { results, config });
  return { results, config };
}
