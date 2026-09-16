/**
 * PRIVAGENTSHIELD — PHASE 3 STATISTICAL ANALYSIS
 * Bootstrap confidence intervals and statistical comparisons.
 * Never claims significance without actual calculation.
 * Returns null / insufficient_data when n < 2.
 */

import type { ConfidenceInterval, StatisticalComparison } from "./types";

const BOOTSTRAP_ITERATIONS = 2000;
const CI_LEVEL = 0.95;

// ─── Descriptive Stats ────────────────────────────────────────────────────────

export function describeSamples(values: number[]): {
  n: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
} {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: 0, stdDev: 0, min: 0, max: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    n,
    mean: round4(mean),
    stdDev: round4(Math.sqrt(variance)),
    min: round4(sorted[0]!),
    max: round4(sorted[n - 1]!),
    median: round4(percentile(sorted, 50)),
  };
}

// ─── Bootstrap Confidence Interval ────────────────────────────────────────────

export function bootstrapCI(values: number[]): ConfidenceInterval {
  const n = values.length;

  if (n < 2) {
    return {
      mean: n === 1 ? round4(values[0]!) : 0,
      stdDev: 0,
      lower95: n === 1 ? round4(values[0]!) : 0,
      upper95: n === 1 ? round4(values[0]!) : 0,
      n,
      method: "insufficient_data",
    };
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Bootstrap resample
  const bootstrapMeans: number[] = [];
  for (let i = 0; i < BOOTSTRAP_ITERATIONS; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += values[Math.floor(Math.random() * n)]!;
    }
    bootstrapMeans.push(sum / n);
  }
  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - CI_LEVEL;
  const lowerIdx = Math.floor((alpha / 2) * BOOTSTRAP_ITERATIONS);
  const upperIdx = Math.ceil((1 - alpha / 2) * BOOTSTRAP_ITERATIONS) - 1;

  return {
    mean:    round4(mean),
    stdDev:  round4(stdDev),
    lower95: round4(bootstrapMeans[lowerIdx]!),
    upper95: round4(bootstrapMeans[upperIdx]!),
    n,
    method: "bootstrap",
  };
}

// ─── Bootstrap Difference Test ────────────────────────────────────────────────

export function bootstrapDifferenceTest(
  groupA: number[],
  groupB: number[],
  metricName: string,
  groupAName: string,
  groupBName: string,
): StatisticalComparison {
  const nA = groupA.length;
  const nB = groupB.length;

  if (nA < 2 || nB < 2) {
    const meanA = nA > 0 ? groupA.reduce((a, b) => a + b, 0) / nA : 0;
    const meanB = nB > 0 ? groupB.reduce((a, b) => a + b, 0) / nB : 0;
    return {
      metricName,
      groupA: groupAName,
      groupB: groupBName,
      groupAMean: round4(meanA),
      groupBMean: round4(meanB),
      difference: round4(meanA - meanB),
      pValue: null,
      effectSize: null,
      ciDifference: null,
      nA,
      nB,
      testName: "bootstrap",
      isSignificant: null,
      note: `Insufficient data: nA=${nA}, nB=${nB}. Need ≥2 samples each.`,
    };
  }

  const meanA = groupA.reduce((a, b) => a + b, 0) / nA;
  const meanB = groupB.reduce((a, b) => a + b, 0) / nB;
  const observedDiff = meanA - meanB;

  // Combined pool for permutation p-value
  const combined = [...groupA, ...groupB];
  let extremeCount = 0;
  const bootDiffs: number[] = [];

  for (let i = 0; i < BOOTSTRAP_ITERATIONS; i++) {
    // Bootstrap resample independently
    let sumA = 0, sumB = 0;
    for (let j = 0; j < nA; j++) sumA += combined[Math.floor(Math.random() * combined.length)]!;
    for (let j = 0; j < nB; j++) sumB += combined[Math.floor(Math.random() * combined.length)]!;
    const diff = sumA / nA - sumB / nB;
    bootDiffs.push(diff);
    if (Math.abs(diff) >= Math.abs(observedDiff)) extremeCount++;
  }

  const pValue = extremeCount / BOOTSTRAP_ITERATIONS;
  bootDiffs.sort((a, b) => a - b);

  const alpha = 1 - CI_LEVEL;
  const lowerIdx = Math.floor((alpha / 2) * BOOTSTRAP_ITERATIONS);
  const upperIdx = Math.ceil((1 - alpha / 2) * BOOTSTRAP_ITERATIONS) - 1;

  // Cohen's d effect size
  const pooledStd = pooledStdDev(groupA, groupB);
  const effectSize = pooledStd > 0 ? Math.abs(observedDiff) / pooledStd : 0;

  const ciDiff: ConfidenceInterval = {
    mean:    round4(observedDiff),
    stdDev:  round4(pooledStd),
    lower95: round4(bootDiffs[lowerIdx]!),
    upper95: round4(bootDiffs[upperIdx]!),
    n:       nA + nB,
    method:  "bootstrap",
  };

  return {
    metricName,
    groupA: groupAName,
    groupB: groupBName,
    groupAMean:  round4(meanA),
    groupBMean:  round4(meanB),
    difference:  round4(observedDiff),
    pValue:      round4(pValue),
    effectSize:  round4(effectSize),
    ciDifference: ciDiff,
    nA,
    nB,
    testName: "bootstrap-permutation",
    isSignificant: pValue < 0.05,
    note: pValue < 0.05
      ? `Statistically significant at α=0.05 (p=${pValue.toFixed(4)})`
      : `Not statistically significant at α=0.05 (p=${pValue.toFixed(4)})`,
  };
}

// ─── Aggregate repeated run results ──────────────────────────────────────────

export function aggregateRepeatedRuns(
  metricValues: number[],
  metricName: string,
): {
  ci: ConfidenceInterval;
  description: string;
} {
  const ci = bootstrapCI(metricValues);
  const description =
    ci.method === "insufficient_data"
      ? `${metricName}: n=${ci.n} — insufficient for CI. Run more repetitions.`
      : `${metricName}: ${(ci.mean * 100).toFixed(2)}% ±${((ci.upper95 - ci.lower95) / 2 * 100).toFixed(2)}% [95% CI: ${(ci.lower95 * 100).toFixed(2)}%–${(ci.upper95 * 100).toFixed(2)}%] (n=${ci.n}, bootstrap)`;
  return { ci, description };
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

function pooledStdDev(a: number[], b: number[]): number {
  const meanA = a.reduce((x, y) => x + y, 0) / a.length;
  const meanB = b.reduce((x, y) => x + y, 0) / b.length;
  const varA = a.reduce((x, y) => x + (y - meanA) ** 2, 0) / a.length;
  const varB = b.reduce((x, y) => x + (y - meanB) ** 2, 0) / b.length;
  return Math.sqrt((varA + varB) / 2);
}
