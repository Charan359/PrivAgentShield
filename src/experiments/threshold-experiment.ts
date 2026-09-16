/**
 * PRIVAGENTSHIELD — PHASE 3 THRESHOLD SENSITIVITY EXPERIMENT
 * Sweeps τlow and τhigh to analyze decision boundary sensitivity.
 * All results computed from real pipeline execution.
 */

import { executeThresholdSweep } from "./runner";
import type { ExperimentConfig, ThresholdExperimentPoint } from "./types";

// Standard sweep grid from Phase 3 spec
export const TAU_LOW_VALUES  = [0.10, 0.20, 0.30, 0.40];
export const TAU_HIGH_VALUES = [0.60, 0.70, 0.80, 0.90];

export async function runThresholdSensitivityExperiment(
  baseConfig: ExperimentConfig,
): Promise<ThresholdExperimentPoint[]> {
  const sweepResults = await executeThresholdSweep(TAU_LOW_VALUES, TAU_HIGH_VALUES, baseConfig);

  return sweepResults.map(({ tauLow, tauHigh, run }) => {
    const m = run.metrics!;
    return {
      tauLow,
      tauHigh,
      allowRate:          m.allowRate,
      sanitizeRate:       m.sanitizeRate,
      quarantineRate:     m.quarantineRate,
      leakageRate:        m.leakage.leakageRate,
      falsePositiveRate:  m.leakage.falsePositiveRate,
      taskCompletionRate: m.task.taskCompletionRate,
      avgLatencyMs:       m.latency.mean,
      provenance: {
        status: "MEASURED" as const,
        experimentId: run.experimentId,
        runId: run.runId,
        datasetVersion: run.config.datasetVersion,
        seed: run.config.seed,
        timestamp: run.completedAt,
        sampleCount: run.messagesProcessed,
      },
    };
  });
}

// Format results for display
export function formatThresholdTable(
  points: ThresholdExperimentPoint[],
): Array<Record<string, string>> {
  return points.map((p) => ({
    "τlow":        p.tauLow.toFixed(2),
    "τhigh":       p.tauHigh.toFixed(2),
    "ALLOW%":      pct(p.allowRate),
    "SANITIZE%":   pct(p.sanitizeRate),
    "QUARANTINE%": pct(p.quarantineRate),
    "Leakage%":    pct(p.leakageRate),
    "FPR%":        pct(p.falsePositiveRate),
    "TCR%":        pct(p.taskCompletionRate),
    "Lat(ms)":     p.avgLatencyMs.toFixed(2),
    "Status":      p.provenance.status,
  }));
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}
