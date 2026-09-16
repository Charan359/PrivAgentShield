/**
 * PRIVAGENTSHIELD — PHASE 3 EXPERIMENT EXPORT & REPRODUCIBILITY
 * Generates reproducibility packages, JSON/CSV exports, and manifests.
 * Never packages API keys or real personal data.
 */

import type { ExperimentRun, ExperimentExport, MessageResult } from "./types";
import { simpleHash } from "./runner";

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportRunAsJson(run: ExperimentRun): ExperimentExport {
  if (run.status !== "COMPLETED" || !run.metrics) {
    throw new Error(`Run ${run.runId} is not COMPLETED. Cannot export incomplete run.`);
  }

  const exportedAt = new Date().toISOString();
  const exportData: ExperimentExport = {
    manifest: run.manifest,
    config: run.config,
    datasetMetadata: {
      datasetId: run.config.dataset,
      name: "PrivAgentShield Synthetic Evaluation Dataset",
      version: run.config.datasetVersion,
      description: "Labeled synthetic dataset — all data is entirely synthetic.",
      source: "SYNTHETIC",
      license: "CC0",
      totalSamples: run.results.length,
      sensitiveSamples: run.results.filter((r) => r.groundTruthSensitive).length,
      safeSamples: run.results.filter((r) => !r.groundTruthSensitive).length,
      adversarialSamples: 0,
      entityCategories: ["PERSON_NAME", "EMAIL_ADDRESS", "MEDICAL", "CREDENTIALS", "FINANCIAL"],
      createdAt: "2026-09-15T00:00:00Z",
      sha256: run.datasetHash,
    },
    metrics: run.metrics,
    rawResults: run.results,
    summary: buildSummary(run),
    exportedAt,
    exportHash: simpleHash(run.runId + exportedAt),
  };

  return exportData;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportResultsAsCsv(run: ExperimentRun): string {
  const headers = [
    "messageId", "scenarioId", "senderId", "recipientId",
    "groundTruthSensitive", "groundTruthAction",
    "detectedSensitive", "action",
    "isTP", "isFP", "isTN", "isFN",
    "destinationReceived", "taskSuccess",
    "tm", "deltaIj", "piJ", "lriStar",
    "totalMs",
  ];

  const rows = run.results.map((r) => [
    r.messageId,
    r.scenarioId,
    r.senderId,
    r.recipientId,
    r.groundTruthSensitive,
    r.groundTruthAction,
    r.detectedSensitive,
    r.action,
    r.isTP, r.isFP, r.isTN, r.isFN,
    r.destinationReceived,
    r.taskSuccess,
    r.tm, r.deltaIj, r.piJ, r.lriStar,
    r.latency.totalMs,
  ].map(String).join(","));

  return [headers.join(","), ...rows].join("\n");
}

// ─── Metrics Summary CSV ──────────────────────────────────────────────────────

export function exportMetricsSummaryAsCsv(run: ExperimentRun): string {
  if (!run.metrics) return "No metrics available";
  const m = run.metrics;
  return [
    "Metric,Value,Status",
    `Precision,${(m.detection.precision * 100).toFixed(2)}%,${m.detection.provenance.status}`,
    `Recall,${(m.detection.recall * 100).toFixed(2)}%,${m.detection.provenance.status}`,
    `F1,${(m.detection.f1 * 100).toFixed(2)}%,${m.detection.provenance.status}`,
    `Leakage Rate,${(m.leakage.leakageRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
    `Prevention Rate,${(m.leakage.preventionRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
    `False Positive Rate,${(m.leakage.falsePositiveRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
    `Task Completion Rate,${(m.task.taskCompletionRate * 100).toFixed(2)}%,${m.task.provenance.status}`,
    `Mean Latency (ms),${m.latency.mean.toFixed(2)},${m.latency.provenance.status}`,
    `P95 Latency (ms),${m.latency.p95.toFixed(2)},${m.latency.provenance.status}`,
    `Throughput (msg/s),${m.throughputMsgPerSec.toFixed(2)},${m.leakage.provenance.status}`,
    `ALLOW Rate,${(m.allowRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
    `SANITIZE Rate,${(m.sanitizeRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
    `QUARANTINE Rate,${(m.quarantineRate * 100).toFixed(2)}%,${m.leakage.provenance.status}`,
  ].join("\n");
}

// ─── Reproducibility Package Manifest ─────────────────────────────────────────

export function generateReproducibilityPackage(run: ExperimentRun): string {
  const pkg = {
    title: "PrivAgentShield Reproducibility Package",
    generated: new Date().toISOString(),
    warning: "This package contains only synthetic data and no real PII, credentials, or API keys.",
    manifest: run.manifest,
    instructions: {
      install: "npm install",
      run_experiment: `npx tsx src/experiments/entry-point.ts --experimentId=${run.experimentId} --seed=${run.config.seed}`,
      run_tests: "npx tsx src/test/security-regression.ts",
      build: "npm run build",
    },
    dataset: {
      id: run.config.dataset,
      version: run.config.datasetVersion,
      hash: run.datasetHash,
      description: "Synthetic labeled dataset — all data is entirely synthetic.",
    },
    configuration: {
      experimentId: run.config.experimentId,
      seed: run.config.seed,
      thresholds: run.config.thresholds,
      baseline: run.config.baseline,
      model: run.config.model,
      policyVersion: run.config.policyVersion,
      detectorVersion: run.config.detectorVersion,
    },
    softwareVersions: {
      shieldVersion: run.manifest.shieldVersion,
      nodeVersion: run.manifest.nodeVersion,
      gitCommit: run.manifest.gitCommit,
    },
    metrics_summary: run.metrics
      ? {
          precision:          run.metrics.detection.precision,
          recall:             run.metrics.detection.recall,
          f1:                 run.metrics.detection.f1,
          leakageRate:        run.metrics.leakage.leakageRate,
          preventionRate:     run.metrics.leakage.preventionRate,
          falsePositiveRate:  run.metrics.leakage.falsePositiveRate,
          taskCompletionRate: run.metrics.task.taskCompletionRate,
          meanLatencyMs:      run.metrics.latency.mean,
          p95LatencyMs:       run.metrics.latency.p95,
          status:             "MEASURED",
        }
      : { status: "NOT_EXECUTED" },
    limitations: [
      "Dataset is synthetic — results may not generalize to all real-world agent deployments",
      "External benchmark adapters (AgentLeak, AgentDojo) require separate installation",
      "Latency stage breakdown is estimated proportionally, not instrumented per-stage",
      "LLM provider integration uses mock agents — live LLM results may differ",
    ],
    hashes: {
      configHash: run.configHash,
      datasetHash: run.datasetHash,
      resultHash: run.resultHash ?? "pending",
    },
  };

  return JSON.stringify(pkg, null, 2);
}

// ─── Experiment Manifest JSON ──────────────────────────────────────────────────

export function generateManifestJson(run: ExperimentRun): string {
  return JSON.stringify(run.manifest, null, 2);
}

// ─── LaTeX Table Generators ───────────────────────────────────────────────────

export function generateDetectionTableLatex(run: ExperimentRun): string {
  if (!run.metrics) return "% No metrics available — experiment not executed";
  const d = run.metrics.detection;
  const n = run.messagesProcessed;
  return `\\begin{table}[ht]
\\caption{Detection Performance on Synthetic Benchmark (n=${n})}
\\label{tab:detection}
\\centering
\\begin{tabular}{lcccc}
\\hline
\\textbf{System} & \\textbf{Precision} & \\textbf{Recall} & \\textbf{F1} & \\textbf{FPR} \\\\
\\hline
PrivAgentShield (Ours) & ${pct(d.precision)} & ${pct(d.recall)} & ${pct(d.f1)} & ${pct(d.falsePositiveRate)} \\\\
\\hline
\\end{tabular}
\\end{table}`;
}

export function generateLeakageTableLatex(run: ExperimentRun): string {
  if (!run.metrics) return "% No metrics available — experiment not executed";
  const l = run.metrics.leakage;
  const t = run.metrics.task;
  const n = run.messagesProcessed;
  return `\\begin{table}[ht]
\\caption{Leakage Prevention and Task Completion (n=${n})}
\\label{tab:leakage}
\\centering
\\begin{tabular}{lcc}
\\hline
\\textbf{Metric} & \\textbf{Value} & \\textbf{Status} \\\\
\\hline
Leakage Rate & ${pct(l.leakageRate)} & ${l.provenance.status} \\\\
Prevention Rate & ${pct(l.preventionRate)} & ${l.provenance.status} \\\\
False Positive Rate & ${pct(l.falsePositiveRate)} & ${l.provenance.status} \\\\
Task Completion Rate & ${pct(t.taskCompletionRate)} & ${t.provenance.status} \\\\
\\hline
\\end{tabular}
\\end{table}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSummary(run: ExperimentRun): Record<string, unknown> {
  return {
    experimentId: run.experimentId,
    runId: run.runId,
    status: run.status,
    messagesProcessed: run.messagesProcessed,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    seed: run.config.seed,
    thresholds: run.config.thresholds,
    datasetVersion: run.config.datasetVersion,
    metricsStatus: run.metrics ? "MEASURED" : "NOT_EXECUTED",
    ...(run.metrics
      ? {
          precision:          run.metrics.detection.precision,
          recall:             run.metrics.detection.recall,
          f1:                 run.metrics.detection.f1,
          leakageRate:        run.metrics.leakage.leakageRate,
          preventionRate:     run.metrics.leakage.preventionRate,
          taskCompletionRate: run.metrics.task.taskCompletionRate,
          meanLatencyMs:      run.metrics.latency.mean,
        }
      : {}),
  };
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}\\%`;
}
