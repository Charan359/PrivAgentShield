// experiments/metrics.ts
/**
 * Compute security and performance metrics from raw experiment results.
 * The input is an array of result objects produced by `runner.ts`.
 */
export interface SecurityMetrics {
  leakageRate: number; // LR = leaked / totalSensitive
  preventionRate: number; // PR = 1 - LR
  attackSuccessRate: number; // ASR = successful attacks / total attempts
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
}

export interface PerformanceMetrics {
  meanLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughputReqPerSec: number;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function computeSecurityMetrics(results: any[]): SecurityMetrics {
  const total = results.length;
  const leaked = results.filter((r) => r.leakage).length;
  const tp = results.filter((r) => r.leakage && r.decision !== "ALLOW").length; // true positives = correctly blocked leakage
  const fp = results.filter((r) => !r.leakage && r.decision !== "ALLOW").length; // false positives = blocked non‑leakage
  const tn = results.filter((r) => !r.leakage && r.decision === "ALLOW").length;
  const fn = results.filter((r) => r.leakage && r.decision === "ALLOW").length; // false negatives = allowed leakage

  const leakageRate = leaked / total;
  const preventionRate = 1 - leakageRate;
  const attackSuccessRate = fn / total; // attacks that succeeded (leakage allowed)
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const falsePositiveRate = fp + tn === 0 ? 0 : fp / (fp + tn);

  return { leakageRate, preventionRate, attackSuccessRate, precision, recall, f1, falsePositiveRate };
}

export function computePerformanceMetrics(results: any[]): PerformanceMetrics {
  const latencies = results.map((r) => r.latency_ms);
  const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const medianLatency = percentile(latencies, 50);
  const p95Latency = percentile(latencies, 95);
  const p99Latency = percentile(latencies, 99);
  // Throughput: requests per second approximated by 1000 / mean latency
  const throughputReqPerSec = meanLatency === 0 ? 0 : 1000 / meanLatency;
  return { meanLatency, medianLatency, p95Latency, p99Latency, throughputReqPerSec };
}
