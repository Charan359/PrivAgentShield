/**
 * PRIVAGENTSHIELD — PHASE 3 END-TO-END EXPERIMENT ENTRY POINT
 *
 * Runs the complete experiment pipeline:
 * Synthetic Dataset → PrivAgentShield → Metrics → Stats → Export
 *
 * Run: npx tsx src/experiments/entry-point.ts
 */

import { executeExperiment, DEFAULT_EXPERIMENT_CONFIG } from "./runner";
import { runAllAblations, generateAblationComparisonTable } from "./ablation";
import { exportRunAsJson, exportMetricsSummaryAsCsv, generateReproducibilityPackage, generateDetectionTableLatex, generateLeakageTableLatex } from "./export";
import { DATASET_METADATA } from "./dataset";
import type { ExperimentConfig } from "./types";

console.log("\n" + "=".repeat(70));
console.log("  PRIVAGENTSHIELD PHASE 3 — FULL EXPERIMENT EXECUTION");
console.log("=".repeat(70));
console.log(`\nDataset: ${DATASET_METADATA.name} (${DATASET_METADATA.version})`);
console.log(`Samples: ${DATASET_METADATA.totalSamples} (${DATASET_METADATA.sensitiveSamples} sensitive, ${DATASET_METADATA.safeSamples} safe)`);
console.log(`Source: ${DATASET_METADATA.source} — no real personal data`);

// ─── 1. Full System Evaluation ─────────────────────────────────────────────────

console.log("\n[1] Running FULL system evaluation (EXP-2026-001)...");

const fullConfig: ExperimentConfig = {
  ...DEFAULT_EXPERIMENT_CONFIG,
  experimentId: "EXP-2026-001",
  name: "PrivAgentShield Full System Evaluation",
  description: "Complete evaluation on synthetic benchmark dataset",
};

const fullRun = await executeExperiment(fullConfig);

console.log(`  ✓ Completed in ${Date.now() - Date.parse(fullRun.startedAt!)}ms`);
console.log(`  Messages processed: ${fullRun.messagesProcessed}`);
console.log(`  Run ID: ${fullRun.runId}`);

const m = fullRun.metrics!;
console.log("\n  DETECTION METRICS (Status: MEASURED)");
console.log(`  Precision:  ${(m.detection.precision * 100).toFixed(2)}%`);
console.log(`  Recall:     ${(m.detection.recall * 100).toFixed(2)}%`);
console.log(`  F1:         ${(m.detection.f1 * 100).toFixed(2)}%`);
console.log(`  FPR:        ${(m.detection.falsePositiveRate * 100).toFixed(2)}%`);
console.log(`  Accuracy:   ${(m.detection.accuracy * 100).toFixed(2)}%`);

console.log("\n  LEAKAGE METRICS (Status: MEASURED)");
console.log(`  Leakage Rate:    ${(m.leakage.leakageRate * 100).toFixed(2)}%`);
console.log(`  Prevention Rate: ${(m.leakage.preventionRate * 100).toFixed(2)}%`);
console.log(`  FPR:             ${(m.leakage.falsePositiveRate * 100).toFixed(2)}%`);

console.log("\n  TASK METRICS (Status: MEASURED)");
console.log(`  Task Completion: ${(m.task.taskCompletionRate * 100).toFixed(2)}%`);
console.log(`  Blocked:         ${m.task.taskBlocked}`);
console.log(`  After Sanitize:  ${m.task.taskCompletedAfterSanitization}`);

console.log("\n  ENFORCEMENT BREAKDOWN (Status: MEASURED)");
console.log(`  ALLOW:      ${(m.allowRate * 100).toFixed(1)}%`);
console.log(`  SANITIZE:   ${(m.sanitizeRate * 100).toFixed(1)}%`);
console.log(`  QUARANTINE: ${(m.quarantineRate * 100).toFixed(1)}%`);

console.log("\n  LATENCY (Status: MEASURED)");
console.log(`  Mean: ${m.latency.mean.toFixed(2)}ms | P95: ${m.latency.p95.toFixed(2)}ms | P99: ${m.latency.p99.toFixed(2)}ms`);
console.log(`  Throughput: ${m.throughputMsgPerSec.toFixed(1)} msg/s`);

// ─── 2. Ablation Study ─────────────────────────────────────────────────────────

console.log("\n[2] Running ABLATION study (EXP-2026-002)...");
const ablationResults = await runAllAblations("EXP-2026-002");
const ablationTable = generateAblationComparisonTable(ablationResults);

console.log("\n  ABLATION RESULTS (Status: MEASURED)");
console.table(ablationTable.map((r) => ({
  Variant: r.variant,
  Precision: r.precision,
  Recall: r.recall,
  F1: r.f1,
  LeakRate: r.leakageRate,
  PrevRate: r.preventionRate,
  TCR: r.taskCompletionRate,
  Status: r.status,
})));

// ─── 3. LaTeX Tables ──────────────────────────────────────────────────────────

console.log("\n[3] LATEX TABLE: Detection Performance");
console.log(generateDetectionTableLatex(fullRun));

console.log("\n[4] LATEX TABLE: Leakage Prevention");
console.log(generateLeakageTableLatex(fullRun));

// ─── 4. Reproducibility Package ───────────────────────────────────────────────

console.log("\n[5] Reproducibility package generated.");
const pkg = generateReproducibilityPackage(fullRun);
const pkgParsed = JSON.parse(pkg);
console.log(`  Experiment ID: ${pkgParsed.manifest.experimentId}`);
console.log(`  Seed: ${pkgParsed.manifest.seed}`);
console.log(`  Shield Version: ${pkgParsed.manifest.shieldVersion}`);
console.log(`  Git Commit: ${pkgParsed.manifest.gitCommit}`);
console.log(`  Config Hash: ${pkgParsed.hashes.configHash}`);
console.log(`  Result Hash: ${pkgParsed.hashes.resultHash}`);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("  PHASE 3 EXPERIMENT EXECUTION COMPLETE");
console.log("  All metrics are MEASURED values from real pipeline execution.");
console.log("  No fabricated or hardcoded values.");
console.log("=".repeat(70) + "\n");
