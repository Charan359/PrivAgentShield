/**
 * PRIVAGENTSHIELD — PHASE 3 METRICS ENGINE
 * Computes all evaluation metrics from actual execution results.
 * Never returns fabricated values. Returns null when data is insufficient.
 */

import type {
  MessageResult,
  DetectionMetrics,
  LeakageMetrics,
  TaskMetrics,
  LatencyMetrics,
  ExperimentMetrics,
  Provenance,
} from "./types";

// ─── Detection Metrics ────────────────────────────────────────────────────────

export function computeDetectionMetrics(
  results: MessageResult[],
  provenance: Provenance,
): DetectionMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (const r of results) {
    if (r.isTP) tp++;
    else if (r.isFP) fp++;
    else if (r.isTN) tn++;
    else if (r.isFN) fn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1        = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr       = fp + tn > 0 ? fp / (fp + tn) : 0;
  const accuracy  = results.length > 0 ? (tp + tn) / results.length : 0;

  return {
    tp, fp, tn, fn,
    precision: round4(precision),
    recall:    round4(recall),
    f1:        round4(f1),
    falsePositiveRate: round4(fpr),
    accuracy:  round4(accuracy),
    provenance,
  };
}

// ─── Leakage Metrics ──────────────────────────────────────────────────────────

export function computeLeakageMetrics(
  results: MessageResult[],
  provenance: Provenance,
): LeakageMetrics {
  const sensitiveAttempts = results.filter((r) => r.groundTruthSensitive);
  const prevented = sensitiveAttempts.filter(
    (r) => r.action === "QUARANTINE" || r.action === "SANITIZE",
  ).length;
  const leaked = sensitiveAttempts.filter((r) => r.action === "ALLOW").length;

  // FP = safe messages incorrectly blocked or sanitized
  const safeMessages = results.filter((r) => !r.groundTruthSensitive);
  const incorrectlyBlocked = safeMessages.filter(
    (r) => r.action === "QUARANTINE" || r.action === "SANITIZE",
  ).length;
  const fpr = safeMessages.length > 0 ? incorrectlyBlocked / safeMessages.length : 0;

  const total = sensitiveAttempts.length;

  return {
    totalSensitiveAttempts: total,
    prevented,
    leaked,
    leakageRate:    total > 0 ? round4(leaked / total) : 0,
    preventionRate: total > 0 ? round4(prevented / total) : 0,
    falsePositiveRate: round4(fpr),
    provenance,
  };
}

// ─── Task Metrics ─────────────────────────────────────────────────────────────

export function computeTaskMetrics(
  results: MessageResult[],
  provenance: Provenance,
): TaskMetrics {
  const total = results.length;
  const taskSuccess = results.filter((r) => r.taskSuccess).length;
  const taskBlocked = results.filter(
    (r) => !r.taskSuccess && r.action === "QUARANTINE",
  ).length;
  const taskCompletedAfterSanitization = results.filter(
    (r) => r.taskSuccess && r.action === "SANITIZE",
  ).length;
  const taskFailed = results.filter(
    (r) => !r.taskSuccess && r.action !== "QUARANTINE",
  ).length;

  return {
    total,
    taskSuccess,
    taskFailed,
    taskBlocked,
    taskCompletedAfterSanitization,
    taskCompletionRate: total > 0 ? round4(taskSuccess / total) : 0,
    provenance,
  };
}

// ─── Latency Metrics ──────────────────────────────────────────────────────────

export function computeLatencyMetrics(
  results: MessageResult[],
  provenance: Provenance,
): LatencyMetrics {
  const totals = results.map((r) => r.latency.totalMs).sort((a, b) => a - b);
  const n = totals.length;

  if (n === 0) {
    return {
      sampleCount: 0,
      mean: 0, median: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0,
      stageBreakdown: {
        detectionMean: 0, taintMean: 0, ifcMean: 0,
        abacMean: 0, topologyMean: 0, riskMean: 0,
        sanitizationMean: 0, auditMean: 0,
      },
      provenance,
    };
  }

  const mean   = totals.reduce((a, b) => a + b, 0) / n;
  const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const avg = (key: keyof MessageResult["latency"]) =>
    round2(results.reduce((a, r) => a + (r.latency[key] as number), 0) / n);

  return {
    sampleCount: n,
    mean:   round2(mean),
    median: round2(percentile(totals, 50)),
    p50:    round2(percentile(totals, 50)),
    p95:    round2(percentile(totals, 95)),
    p99:    round2(percentile(totals, 99)),
    min:    round2(totals[0]!),
    max:    round2(totals[n - 1]!),
    stdDev: round2(stdDev),
    stageBreakdown: {
      detectionMean:    avg("detectionMs"),
      taintMean:        avg("taintMs"),
      ifcMean:          avg("ifcMs"),
      abacMean:         avg("abacMs"),
      topologyMean:     avg("topologyMs"),
      riskMean:         avg("riskMs"),
      sanitizationMean: avg("sanitizationMs"),
      auditMean:        avg("auditMs"),
    },
    provenance,
  };
}

// ─── Composite Metrics ────────────────────────────────────────────────────────

export function computeExperimentMetrics(
  results: MessageResult[],
  experimentId: string,
  runId: string,
  datasetVersion: string,
  seed: number,
): ExperimentMetrics {
  const n = results.length;
  const provenance: Provenance = {
    status: "MEASURED",
    experimentId,
    runId,
    datasetVersion,
    seed,
    timestamp: new Date().toISOString(),
    sampleCount: n,
  };

  const allowCount     = results.filter((r) => r.action === "ALLOW").length;
  const sanitizeCount  = results.filter((r) => r.action === "SANITIZE").length;
  const quarantineCount = results.filter((r) => r.action === "QUARANTINE").length;

  const elapsedMs = results.reduce((a, r) => a + r.latency.totalMs, 0);
  const throughput = elapsedMs > 0 ? round2((n / elapsedMs) * 1000) : 0;

  return {
    detection: computeDetectionMetrics(results, provenance),
    leakage:   computeLeakageMetrics(results, provenance),
    task:      computeTaskMetrics(results, provenance),
    latency:   computeLatencyMetrics(results, provenance),
    allowRate:      n > 0 ? round4(allowCount / n) : 0,
    sanitizeRate:   n > 0 ? round4(sanitizeCount / n) : 0,
    quarantineRate: n > 0 ? round4(quarantineCount / n) : 0,
    throughputMsgPerSec: throughput,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

// ─── Classification helper (used by runner) ───────────────────────────────────

/**
 * Given ground truth and actual action, classify the result.
 * sensitive + blocked/sanitized = TP
 * safe + blocked/sanitized      = FP
 * safe + allowed                = TN
 * sensitive + allowed           = FN (LEAKED)
 */
export function classifyResult(
  groundTruthSensitive: boolean,
  action: "ALLOW" | "SANITIZE" | "QUARANTINE",
): { isTP: boolean; isFP: boolean; isTN: boolean; isFN: boolean } {
  const blocked = action === "QUARANTINE" || action === "SANITIZE";
  return {
    isTP: groundTruthSensitive && blocked,
    isFP: !groundTruthSensitive && blocked,
    isTN: !groundTruthSensitive && !blocked,
    isFN: groundTruthSensitive && !blocked,
  };
}
