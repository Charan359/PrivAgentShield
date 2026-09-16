/**
 * PRIVAGENTSHIELD — PHASE 3 EXPERIMENT STORE
 * In-memory experiment management with lifecycle, versioning, and immutability.
 */

import type {
  ExperimentConfig,
  ExperimentRun,
  ExperimentStatus,
  StatusTransition,
  ExperimentManifest,
} from "./types";
import { simpleHash } from "./runner";

// ─── In-Memory Store ──────────────────────────────────────────────────────────

class ExperimentStore {
  private configs = new Map<string, ExperimentConfig>();
  private runs    = new Map<string, ExperimentRun>();

  // ─── Config CRUD ────────────────────────────────────────────────────

  createConfig(config: ExperimentConfig): ExperimentConfig {
    if (this.configs.has(config.experimentId)) {
      throw new Error(`Experiment ${config.experimentId} already exists. Clone it to create a new version.`);
    }
    this.configs.set(config.experimentId, config);
    return config;
  }

  getConfig(experimentId: string): ExperimentConfig | undefined {
    return this.configs.get(experimentId);
  }

  listConfigs(): ExperimentConfig[] {
    return Array.from(this.configs.values());
  }

  cloneConfig(experimentId: string, newId: string, overrides: Partial<ExperimentConfig> = {}): ExperimentConfig {
    const original = this.configs.get(experimentId);
    if (!original) throw new Error(`Experiment ${experimentId} not found`);
    const cloned: ExperimentConfig = {
      ...original,
      ...overrides,
      experimentId: newId,
      name: overrides.name ?? `${original.name} (clone)`,
    };
    return this.createConfig(cloned);
  }

  deleteConfig(experimentId: string): boolean {
    return this.configs.delete(experimentId);
  }

  // ─── Run CRUD ────────────────────────────────────────────────────────

  saveRun(run: ExperimentRun): void {
    // Completed runs are immutable — create a new version if modifying
    const existing = this.runs.get(run.runId);
    if (existing && existing.status === "COMPLETED") {
      throw new Error(
        `Run ${run.runId} is COMPLETED and immutable. Create a new run ID for modifications.`
      );
    }
    this.runs.set(run.runId, run);
  }

  getRun(runId: string): ExperimentRun | undefined {
    return this.runs.get(runId);
  }

  listRuns(experimentId?: string): ExperimentRun[] {
    const all = Array.from(this.runs.values());
    return experimentId ? all.filter((r) => r.experimentId === experimentId) : all;
  }

  updateRunStatus(runId: string, newStatus: ExperimentStatus, reason?: string): void {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (run.status === "COMPLETED") {
      throw new Error(`Run ${runId} is COMPLETED and cannot change status`);
    }

    const transition: StatusTransition = {
      from: run.status,
      to: newStatus,
      timestamp: new Date().toISOString(),
      reason,
    };

    this.runs.set(runId, {
      ...run,
      status: newStatus,
      statusHistory: [...run.statusHistory, transition],
      ...(newStatus === "COMPLETED" ? { completedAt: new Date().toISOString() } : {}),
      ...(newStatus === "FAILED" ? { failedAt: new Date().toISOString(), failureReason: reason } : {}),
    });
  }

  // ─── Queries ─────────────────────────────────────────────────────────

  getRunsForExperiment(experimentId: string): ExperimentRun[] {
    return this.listRuns(experimentId);
  }

  getLatestRunForExperiment(experimentId: string): ExperimentRun | undefined {
    const runs = this.listRuns(experimentId)
      .filter((r) => r.status === "COMPLETED")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return runs[0];
  }

  getRunsByStatus(status: ExperimentStatus): ExperimentRun[] {
    return this.listRuns().filter((r) => r.status === status);
  }

  // ─── Validate Config ─────────────────────────────────────────────────

  validateConfig(config: ExperimentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.experimentId || config.experimentId.trim() === "") {
      errors.push("experimentId is required");
    }
    if (!config.name || config.name.trim() === "") {
      errors.push("name is required");
    }
    if (config.seed < 0) {
      errors.push("seed must be non-negative");
    }
    if (config.repetitions < 1) {
      errors.push("repetitions must be >= 1");
    }
    if (config.thresholds.tauLow >= config.thresholds.tauHigh) {
      errors.push(`τlow (${config.thresholds.tauLow}) must be < τhigh (${config.thresholds.tauHigh})`);
    }
    if (config.thresholds.tauLow < 0 || config.thresholds.tauLow > 1) {
      errors.push("τlow must be in [0, 1]");
    }
    if (config.thresholds.tauHigh < 0 || config.thresholds.tauHigh > 1) {
      errors.push("τhigh must be in [0, 1]");
    }
    if (config.numberOfAgents < 1) {
      errors.push("numberOfAgents must be >= 1");
    }
    if (config.timeoutMs < 1000) {
      errors.push("timeoutMs must be >= 1000");
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Stats ───────────────────────────────────────────────────────────

  getStats(): {
    totalConfigs: number;
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    runningRuns: number;
    queuedRuns: number;
  } {
    const runs = this.listRuns();
    return {
      totalConfigs:  this.configs.size,
      totalRuns:     runs.length,
      completedRuns: runs.filter((r) => r.status === "COMPLETED").length,
      failedRuns:    runs.filter((r) => r.status === "FAILED").length,
      runningRuns:   runs.filter((r) => r.status === "RUNNING").length,
      queuedRuns:    runs.filter((r) => r.status === "QUEUED").length,
    };
  }
}

export const experimentStore = new ExperimentStore();

// ─── Pre-load default experiment config ──────────────────────────────────────

experimentStore.createConfig({
  experimentId: "EXP-2026-001",
  name: "PrivAgentShield Full System Evaluation",
  description:
    "Complete evaluation of PrivAgentShield on the synthetic benchmark dataset. " +
    "Tests all 10 attack scenarios and safe baselines with the full pipeline.",
  dataset: "privagentshield-synth-v1",
  datasetVersion: "v1.0",
  scenarioSet: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "SAFE"],
  model: "mock",
  modelVersion: "1.0",
  agentFramework: "mock",
  numberOfAgents: 7,
  topology: "default",
  policyVersion: "v1.0",
  detectorVersion: "v1.0",
  thresholds: { tauLow: 0.30, tauHigh: 0.70 },
  baseline: "FULL",
  seed: 42,
  repetitions: 1,
  concurrency: 1,
  timeoutMs: 30000,
  tags: ["phase3", "full-eval", "paper"],
});

experimentStore.createConfig({
  experimentId: "EXP-2026-002",
  name: "Ablation Study",
  description: "Systematic ablation of PrivAgentShield components to quantify each contribution.",
  dataset: "privagentshield-synth-v1",
  datasetVersion: "v1.0",
  scenarioSet: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "SAFE"],
  model: "mock",
  modelVersion: "1.0",
  agentFramework: "mock",
  numberOfAgents: 7,
  topology: "default",
  policyVersion: "v1.0",
  detectorVersion: "v1.0",
  thresholds: { tauLow: 0.30, tauHigh: 0.70 },
  baseline: "FULL",
  seed: 42,
  repetitions: 1,
  concurrency: 1,
  timeoutMs: 60000,
  tags: ["phase3", "ablation", "paper"],
});

experimentStore.createConfig({
  experimentId: "EXP-2026-003",
  name: "Threshold Sensitivity Analysis",
  description: "Sweeps τlow ∈ {0.10, 0.20, 0.30, 0.40} × τhigh ∈ {0.60, 0.70, 0.80, 0.90} to measure decision boundary sensitivity.",
  dataset: "privagentshield-synth-v1",
  datasetVersion: "v1.0",
  scenarioSet: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "SAFE"],
  model: "mock",
  modelVersion: "1.0",
  agentFramework: "mock",
  numberOfAgents: 7,
  topology: "default",
  policyVersion: "v1.0",
  detectorVersion: "v1.0",
  thresholds: { tauLow: 0.30, tauHigh: 0.70 },
  baseline: "FULL",
  seed: 42,
  repetitions: 1,
  concurrency: 1,
  timeoutMs: 120000,
  tags: ["phase3", "threshold-sensitivity", "paper"],
});
