/**
 * PRIVAGENTSHIELD — PHASE 3 EXPERIMENT TYPES
 * Core TypeScript types for the experiment management system.
 * All types carry explicit provenance to prevent fabrication.
 */

// ─── Provenance ───────────────────────────────────────────────────────────────

export type DataStatus =
  | "MEASURED"        // Actually executed and measured
  | "SIMULATED"       // Synthetic simulation (clearly labeled)
  | "PLANNED"         // Planned but not yet executed
  | "NOT_EXECUTED"    // Configuration exists, run not started
  | "FAILED"          // Run attempted but failed
  | "DEMO";           // Demo/showcase data

export interface Provenance {
  status: DataStatus;
  experimentId?: string;
  runId?: string;
  datasetVersion?: string;
  seed?: number;
  timestamp?: string;
  sampleCount?: number;
  note?: string;
}

// ─── Experiment Lifecycle ─────────────────────────────────────────────────────

export type ExperimentStatus =
  | "DRAFT"
  | "VALIDATED"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED";

export interface StatusTransition {
  from: ExperimentStatus;
  to: ExperimentStatus;
  timestamp: string;
  reason?: string;
}

// ─── Experiment Configuration ─────────────────────────────────────────────────

export interface ThresholdConfig {
  tauLow: number;   // τlow
  tauHigh: number;  // τhigh
}

export interface ExperimentConfig {
  experimentId: string;
  name: string;
  description: string;
  dataset: string;
  datasetVersion: string;
  scenarioSet: string[];
  model: string;
  modelVersion: string;
  agentFramework: "mock" | "langgraph" | "crewai" | "metagpt" | "http";
  numberOfAgents: number;
  topology: string;
  policyVersion: string;
  detectorVersion: string;
  thresholds: ThresholdConfig;
  baseline: "FULL" | "NO_IFC" | "NO_ABAC" | "NO_TOPOLOGY" | "NO_MARKOV" | "NO_LRI" | "NO_TIER_3" | "DETECTION_ONLY" | "NO_ENFORCEMENT";
  seed: number;
  repetitions: number;
  concurrency: number;
  timeoutMs: number;
  tags: string[];
}

// ─── Experiment Manifest (Reproducibility) ─────────────────────────────────────

export interface ExperimentManifest {
  experimentId: string;
  runId: string;
  seed: number;
  model: string;
  modelConfig: Record<string, unknown>;
  dataset: string;
  datasetVersion: string;
  policyVersion: string;
  topologyVersion: string;
  shieldVersion: string;
  detectorConfig: Record<string, unknown>;
  thresholdConfig: ThresholdConfig;
  gitCommit: string;
  nodeVersion: string;
  timestamp: string;
  configHash: string;
  datasetHash: string;
}

// ─── Per-Message Result ────────────────────────────────────────────────────────

export interface MessageResult {
  messageId: string;
  scenarioId: string;
  senderId: string;
  recipientId: string;
  payload: string;
  groundTruthSensitive: boolean;
  groundTruthAction: "ALLOW" | "SANITIZE" | "QUARANTINE";
  detectedEntities: string[];
  detectedSensitive: boolean;
  action: "ALLOW" | "SANITIZE" | "QUARANTINE";
  destinationReceived: boolean;
  payloadSanitized: boolean;
  taskSuccess: boolean;
  // LRI* components
  tm: number;
  deltaIj: number;
  piJ: number;
  lriStar: number;
  // Latency breakdown (ms)
  latency: LatencyBreakdown;
  // Classification
  isTP: boolean;  // sensitive, correctly blocked/sanitized
  isFP: boolean;  // safe, incorrectly blocked/sanitized
  isTN: boolean;  // safe, correctly allowed
  isFN: boolean;  // sensitive, incorrectly allowed (LEAKED)
}

export interface LatencyBreakdown {
  totalMs: number;
  detectionMs: number;
  taintMs: number;
  ifcMs: number;
  abacMs: number;
  topologyMs: number;
  riskMs: number;
  sanitizationMs: number;
  auditMs: number;
}

// ─── Aggregate Metrics ─────────────────────────────────────────────────────────

export interface DetectionMetrics {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  accuracy: number;
  provenance: Provenance;
}

export interface LeakageMetrics {
  totalSensitiveAttempts: number;
  prevented: number;        // QUARANTINE or SANITIZE on sensitive
  leaked: number;           // ALLOW on sensitive (FN)
  leakageRate: number;      // leaked / totalSensitiveAttempts
  preventionRate: number;   // prevented / totalSensitiveAttempts
  falsePositiveRate: number;
  provenance: Provenance;
}

export interface TaskMetrics {
  total: number;
  taskSuccess: number;
  taskFailed: number;
  taskBlocked: number;
  taskCompletedAfterSanitization: number;
  taskCompletionRate: number;
  provenance: Provenance;
}

export interface LatencyMetrics {
  sampleCount: number;
  mean: number;
  median: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
  stageBreakdown: {
    detectionMean: number;
    taintMean: number;
    ifcMean: number;
    abacMean: number;
    topologyMean: number;
    riskMean: number;
    sanitizationMean: number;
    auditMean: number;
  };
  provenance: Provenance;
}

export interface ExperimentMetrics {
  detection: DetectionMetrics;
  leakage: LeakageMetrics;
  task: TaskMetrics;
  latency: LatencyMetrics;
  allowRate: number;
  sanitizeRate: number;
  quarantineRate: number;
  throughputMsgPerSec: number;
}

// ─── Experiment Run ────────────────────────────────────────────────────────────

export interface ExperimentRun {
  runId: string;
  experimentId: string;
  config: ExperimentConfig;
  manifest: ExperimentManifest;
  status: ExperimentStatus;
  statusHistory: StatusTransition[];
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  failureStage?: string;
  messagesProcessed: number;
  results: MessageResult[];
  metrics?: ExperimentMetrics;
  resultHash?: string;
  configHash: string;
  datasetHash: string;
  repetitionIndex: number;
  totalRepetitions: number;
}

// ─── Ablation Config ──────────────────────────────────────────────────────────

export type AblationVariant =
  | "FULL"
  | "NO_IFC"
  | "NO_ABAC"
  | "NO_TOPOLOGY"
  | "NO_MARKOV"
  | "NO_LRI"
  | "NO_TIER_3"
  | "NO_SESSION_PSEUDONYMIZATION"
  | "DETECTION_ONLY"
  | "NO_ENFORCEMENT";

export interface AblationResult {
  variant: AblationVariant;
  metrics: ExperimentMetrics;
  runId: string;
  provenance: Provenance;
}

// ─── Threshold Experiment ─────────────────────────────────────────────────────

export interface ThresholdExperimentPoint {
  tauLow: number;
  tauHigh: number;
  allowRate: number;
  sanitizeRate: number;
  quarantineRate: number;
  leakageRate: number;
  falsePositiveRate: number;
  taskCompletionRate: number;
  avgLatencyMs: number;
  provenance: Provenance;
}

// ─── Topology Experiment ──────────────────────────────────────────────────────

export type TopologyVariant =
  | "LINEAR"
  | "BRANCHING"
  | "MULTI_HOP"
  | "DENSE"
  | "HIGH_RISK_SINK"
  | "LOW_RISK_SINK";

export interface TopologyExperimentPoint {
  variant: TopologyVariant;
  nodeCount: number;
  edgeCount: number;
  avgPiJ: number;
  maxPiJ: number;
  avgLriStar: number;
  quarantineRate: number;
  sanitizeRate: number;
  allowRate: number;
  provenance: Provenance;
}

// ─── Confidence Interval ──────────────────────────────────────────────────────

export interface ConfidenceInterval {
  mean: number;
  stdDev: number;
  lower95: number;
  upper95: number;
  n: number;
  method: "bootstrap" | "t-distribution" | "insufficient_data";
}

// ─── Statistical Comparison ───────────────────────────────────────────────────

export interface StatisticalComparison {
  metricName: string;
  groupA: string;
  groupB: string;
  groupAMean: number;
  groupBMean: number;
  difference: number;
  pValue: number | null;
  effectSize: number | null;
  ciDifference: ConfidenceInterval | null;
  nA: number;
  nB: number;
  testName: string;
  isSignificant: boolean | null;
  note: string;
}

// ─── Dataset Record ───────────────────────────────────────────────────────────

export interface DatasetRecord {
  messageId: string;
  scenarioId: string;
  scenarioName: string;
  senderId: string;
  recipientId: string;
  channel: "direct" | "tool_call" | "tool_result" | "broadcast" | "memory";
  payload: string;
  groundTruthSensitive: boolean;
  groundTruthEntityTypes: string[];
  groundTruthAction: "ALLOW" | "SANITIZE" | "QUARANTINE";
  groundTruthTaskSuccess: boolean;
  isAdversarial: boolean;
  attackType?: string;
  notes?: string;
}

// ─── Dataset Metadata ─────────────────────────────────────────────────────────

export interface DatasetMetadata {
  datasetId: string;
  name: string;
  version: string;
  description: string;
  source: "SYNTHETIC";
  license: "CC0";
  totalSamples: number;
  sensitiveSamples: number;
  safeSamples: number;
  adversarialSamples: number;
  entityCategories: string[];
  createdAt: string;
  sha256: string;
}

// ─── Experiment Export ────────────────────────────────────────────────────────

export interface ExperimentExport {
  manifest: ExperimentManifest;
  config: ExperimentConfig;
  datasetMetadata: DatasetMetadata;
  metrics: ExperimentMetrics;
  rawResults: MessageResult[];
  summary: Record<string, unknown>;
  exportedAt: string;
  exportHash: string;
}
