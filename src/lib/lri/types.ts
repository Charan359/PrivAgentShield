/**
 * LRI* Engine — Shared Types
 *
 * Implements the paper's core type system for:
 *   LRI*(vi, vj, m) = max(Δij(m), Tm × Π*j)
 *
 * T*m  = Message Sensitivity / Taint
 * Δ*ij = Clearance Dominance Violation
 * Π*j  = Downstream Sink Reachability
 *
 * This is NOT a generic risk score — it is a non-compensatory minimax
 * risk metric as defined in the paper.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sensitivity taxonomy — L1..L4
// ─────────────────────────────────────────────────────────────────────────────

export type SensitivityLevel = "L1" | "L2" | "L3" | "L4";

/** Paper severity weights: L1=0.1, L2=0.3, L3=0.7, L4=1.0 */
export const SEVERITY_WEIGHT: Record<SensitivityLevel, number> = {
  L1: 0.1,
  L2: 0.3,
  L3: 0.7,
  L4: 1.0,
};

export const SEVERITY_RANK: Record<SensitivityLevel, number> = {
  L1: 1, L2: 2, L3: 3, L4: 4,
};

export const SEVERITY_LABEL: Record<SensitivityLevel, string> = {
  L1: "General / Low-sensitivity metadata",
  L2: "Personal information — names, contact, locations",
  L3: "Medical, financial, confidential information",
  L4: "Credentials, secrets, highly regulated data",
};

// ─────────────────────────────────────────────────────────────────────────────
// Clearance model
// ─────────────────────────────────────────────────────────────────────────────

export type ClearanceCategory =
  | "personal"
  | "medical"
  | "financial"
  | "credentials"
  | "confidential";

export const CLEARANCE_CATEGORIES: ClearanceCategory[] = [
  "personal", "medical", "financial", "credentials", "confidential",
];

/** Per-agent clearance vector: each category maps to the max sensitivity level the agent may receive. */
export type ClearanceVector = Record<ClearanceCategory, SensitivityLevel>;

// ─────────────────────────────────────────────────────────────────────────────
// T*m — Taint / Message Sensitivity
// ─────────────────────────────────────────────────────────────────────────────

export type EntityTaintResult = {
  entityType: string;
  category: ClearanceCategory | "other";
  severityLevel: SensitivityLevel;
  severityWeight: number;
  isSecret: boolean;
  entropyValue: number;    // Shannon entropy (0 if structured identifier)
  entropyModifier: number; // H(ek)/Hmax for secrets, 1.0 for structured
  contribution: number;    // severityWeight × entropyModifier
};

export type TmResult = {
  entities: EntityTaintResult[];
  sumContributions: number;
  tm: number;          // min(1.0, sumContributions)
  breakdown: string;   // human-readable formula string
};

// ─────────────────────────────────────────────────────────────────────────────
// Δ*ij — Clearance Dominance
// ─────────────────────────────────────────────────────────────────────────────

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
  deltaIj: 0 | 1;
  summary: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Π*j — Downstream Sink Reachability (Markov)
// ─────────────────────────────────────────────────────────────────────────────

export type TopologyNode = {
  id: string;
  label: string;
  type: "agent" | "internal_sink" | "external_sink";
  isAbsorbing: boolean;
};

export type TopologyEdge = {
  from: string;
  to: string;
  probability: number;
};

export type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type TopologyResult = {
  graph: TopologyGraph;
  agentIds: string[];   // transient agents (VA)
  sinkIds: string[];    // absorbing sinks (VS)
  /** Q matrix (VA×VA) — transitions between agents */
  Q: number[][];
  /** R matrix (VA×VS) — transitions from agents to sinks */
  R: number[][];
  /** N = (I-Q)^-1 — fundamental matrix */
  N: number[][];
  /** B = N×R — absorption probability matrix */
  B: number[][];
  /** piJ[agentId] = max_s B[j,s] — max downstream sink exposure */
  piJ: Record<string, number>;
  matrixLabels: { agents: string[]; sinks: string[] };
};

// ─────────────────────────────────────────────────────────────────────────────
// LRI* final result
// ─────────────────────────────────────────────────────────────────────────────

export type LriAction = "ALLOW" | "SANITIZE" | "QUARANTINE";

export type ThresholdConfig = {
  /** Default 0.30 — configurable demo value, NOT experimentally calibrated */
  tauLow: number;
  /** Default 0.70 — configurable demo value, NOT experimentally calibrated */
  tauHigh: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  tauLow: 0.30,
  tauHigh: 0.70,
};

export type LriStarResult = {
  senderId: string;
  recipientId: string;
  tm: number;
  deltaIj: 0 | 1;
  piJ: number;
  /** LRI*(vi,vj,m) = max(Δij(m), Tm × Π*j) */
  lriStar: number;
  action: LriAction;
  thresholds: ThresholdConfig;
  formulaString: string;
  breakdown: {
    tmResult: TmResult;
    clearanceResult: ClearanceResult;
    topologyResult: TopologyResult;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Demo calculations (from the paper examples)
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_WALKTHROUGH_ALLOW = {
  label: "Example: ALLOW path",
  tm: 1.00,
  deltaIj: 0,
  piJ: 0.05,
  lriStar: 0.05,
  formula: "max(0.00, 1.00 × 0.05) = 0.05",
  action: "ALLOW" as LriAction,
  note: "High taint but very low downstream sink exposure → safe to allow",
};

export const DEMO_WALKTHROUGH_QUARANTINE = {
  label: "Example: QUARANTINE path",
  tm: 1.00,
  deltaIj: 0,
  piJ: 0.85,
  lriStar: 0.85,
  formula: "max(0.00, 1.00 × 0.85) = 0.85",
  action: "QUARANTINE" as LriAction,
  note: "High taint + high external exposure → quarantine",
};
