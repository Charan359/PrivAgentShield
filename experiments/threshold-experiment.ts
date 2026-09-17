// experiments/threshold-experiment.ts
/**
 * Sweep over τlow and τhigh thresholds, run the configured scenarios for each
 * combination, and store aggregated metrics.
 */
import { runExperiment } from "./runner";
import { computeSecurityMetrics, computePerformanceMetrics } from "./metrics";
import fs from "fs";
import path from "path";

interface ThresholdConfig {
  tau_low: number;
  tau_high: number;
}

export async function runThresholdSweep(baseConfig: any, thresholds: ThresholdConfig[], outputDir: string) {
  const results: any[] = [];
  for (const th of thresholds) {
    const cfg = { ...baseConfig, thresholds: { tau_low: th.tau_low, tau_high: th.tau_high } };
    const runId = `threshold_${th.tau_low}_${th.tau_high}`;
    const dir = path.join(outputDir, runId);
    fs.mkdirSync(dir, { recursive: true });
    const expResult = await runExperiment(cfg, dir);
    const secMetrics = computeSecurityMetrics(expResult.results);
    const perfMetrics = computePerformanceMetrics(expResult.results);
    results.push({ thresholds: th, secMetrics, perfMetrics, raw: expResult.results });
    // write summary CSV
    const csvPath = path.join(dir, "summary.csv");
    const csvLines = [
      "tau_low,tau_high,leakageRate,preventionRate,precision,recall,f1,meanLatency,medianLatency,p95Latency,p99Latency,throughputReqPerSec",
      `${th.tau_low},${th.tau_high},${secMetrics.leakageRate},${secMetrics.preventionRate},${secMetrics.precision},${secMetrics.recall},${secMetrics.f1},${perfMetrics.meanLatency},${perfMetrics.medianLatency},${perfMetrics.p95Latency},${perfMetrics.p99Latency},${perfMetrics.throughputReqPerSec}`
    ].join("\n");
    fs.writeFileSync(csvPath, csvLines);
  }
  return results;
}
