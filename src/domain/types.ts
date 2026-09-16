/**
 * PRIVAGENTSHIELD — CENTRAL DOMAIN MODEL
 * Single Source of Truth for shared TypeScript domain types.
 */

export type SensitivityLevel = "L1" | "L2" | "L3" | "L4";

export type ClearanceCategory =
  | "personal"
  | "medical"
  | "financial"
  | "credentials"
  | "confidential";

export const SEVERITY_WEIGHT: Record<SensitivityLevel, number> = {
  L1: 0.1,
  L2: 0.3,
  L3: 0.7,
  L4: 1.0,
};

export const SEVERITY_RANK: Record<SensitivityLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export type ClearanceVector = Record<ClearanceCategory, SensitivityLevel>;

export type AgentStatus = "active" | "disabled" | "quarantined" | "offline";

export type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  clearance: ClearanceVector;
  trustLevel: number;
  allowedCategories: ClearanceCategory[];
  allowedDestinations: string[];
  allowedTools: string[];
  status: AgentStatus;
  isExternal: boolean;
  violationsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentAttribute = {
  agentId: string;
  role: string;
  department: string;
  clearance: ClearanceVector;
  allowedCategories: ClearanceCategory[];
  allowedDestinations: string[];
  allowedTools: string[];
  trustLevel: number;
  session: string;
  taskContext?: string;
  environment: "production" | "staging" | "simulation";
};

export type PolicyEffect = "allow" | "sanitize" | "quarantine";

export type PolicyRule = {
  id: string;
  policyId: string;
  condition: string;
  effect: PolicyEffect;
  obligations: string[];
};

export type Policy = {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  categories: ClearanceCategory[];
  rules: PolicyRule[];
  matchesCount: number;
  version: string;
  createdAt: string;
};

export type ChannelType = "direct" | "broadcast" | "tool_call" | "memory_write" | "egress";

export type Message = {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  channel: ChannelType;
  content: string;
  timestamp: string;
};

export type DetectionFinding = {
  entity: string;
  type: string;
  category: ClearanceCategory | "other";
  severity: SensitivityLevel;
  tier: 1 | 2 | 3;
  confidence: number;
  start_index: number;
  end_index: number;
  entropyValue?: number;
  entropyModifier?: number;
  detector: string;
  rationale: string;
};

export type EntityTaintContribution = {
  entityType: string;
  category: ClearanceCategory | "other";
  severityLevel: SensitivityLevel;
  severityWeight: number;
  isSecret: boolean;
  entropyValue: number;
  entropyModifier: number;
  contribution: number;
};

export type TaintResult = {
  entities: EntityTaintContribution[];
  sumContributions: number;
  tm: number; // T*m = min(1.0, sumContributions)
  breakdown: string;
};

export type ClearanceViolation = {
  category: ClearanceCategory;
  required: SensitivityLevel;
  recipientHas: SensitivityLevel;
  requiredRank: number;
  recipientRank: number;
};

export type ClearanceResult = {
  senderClearance: ClearanceVector;
  recipientClearance: ClearanceVector;
  checkedCategories: ClearanceCategory[];
  violations: ClearanceViolation[];
  deltaIj: 0 | 1; // Δ*ij
  summary: string;
};

export type NodeType = "agent" | "internal_sink" | "external_sink";

export type TopologyNode = {
  id: string;
  label: string;
  type: NodeType;
  isAbsorbing: boolean;
  description: string;
  x: number;
  y: number;
};

export type TopologyEdge = {
  id: string;
  from: string;
  to: string;
  probability: number; // 0..1
  label: string;
  channel: ChannelType;
};

export type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type ReachabilityResult = {
  graph: TopologyGraph;
  agentIds: string[];
  sinkIds: string[];
  Q: number[][];
  R: number[][];
  N: number[][];
  B: number[][];
  piJ: Record<string, number>; // Π*j per agent
  matrixLabels: { agents: string[]; sinks: string[] };
};

export type LriAction = "ALLOW" | "SANITIZE" | "QUARANTINE";

export type ThresholdConfig = {
  tauLow: number;  // default 0.30
  tauHigh: number; // default 0.70
};

export type RiskEvaluation = {
  senderId: string;
  recipientId: string;
  tm: number;
  deltaIj: 0 | 1;
  piJ: number;
  lriStar: number; // max(Δ*ij, Tm × Π*j)
  action: LriAction;
  thresholds: ThresholdConfig;
  formulaString: string;
  contributingFactors: string[];
};

export type RuntimeDecision = {
  id: string;
  sessionId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  channel: ChannelType;
  rawPayload: string;
  transformedPayload?: string;
  findings: DetectionFinding[];
  riskEvaluation: RiskEvaluation;
  action: LriAction;
  policyId?: string;
  reason: string;
  latencyMs: number;
  timestamp: string;
};

export type SanitizationResult = {
  originalText: string;
  sanitizedText: string;
  replacementsCount: number;
  mappings: PseudonymMapping[];
};

export type PseudonymMapping = {
  sessionId: string;
  originalHash: string;
  entityType: string;
  surrogate: string;
  createdAt: string;
};

export type QuarantineStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type QuarantineEvent = {
  eventId: string;
  sessionId: string;
  timestamp: string;
  senderId: string;
  recipientId: string;
  riskEvaluation: RiskEvaluation;
  reason: string;
  detectedEntities: DetectionFinding[];
  rawPayload: string;
  destination: string;
  policyId?: string;
  status: QuarantineStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
};

export type AuditEvent = {
  eventId: string;
  seq: number;
  timestamp: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  payloadHash: string;
  detectionCount: number;
  tm: number;
  deltaIj: 0 | 1;
  piJ: number;
  lriStar: number;
  action: LriAction;
  policyId?: string;
  reason: string;
  destination: string;
  recordHash: string;
  prevHash: string;
  reviewer?: string;
  reviewStatus?: QuarantineStatus;
};

export type TelemetryMetric = {
  timestamp: string;
  messagesInspected: number;
  sensitiveMessagesDetected: number;
  allowCount: number;
  sanitizeCount: number;
  quarantineCount: number;
  highRiskCount: number;
  externalSinkExposure: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier1LatencyMs: number;
  tier2LatencyMs: number;
  tier3LatencyMs: number;
  totalInspectionLatencyMs: number;
};

export type ExperimentStatus = "PLANNED" | "RUNNING" | "COMPLETED" | "FAILED";

export type Experiment = {
  id: string;
  name: string;
  description: string;
  benchmarkAdapter: string;
  status: ExperimentStatus;
  createdAt: string;
  notes: string;
};
