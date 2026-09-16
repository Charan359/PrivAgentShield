/**
 * PRIVAGENTSHIELD DATABASE SCHEMA DEFINITIONS
 * Relational schema interfaces matching Supabase / PostgreSQL architecture.
 */

export interface DbAgentRow {
  id: string;
  name: string;
  role: string;
  department: string;
  trust_level: number;
  is_external: boolean;
  status: string;
  violations_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbAgentClearanceRow {
  agent_id: string;
  personal: string;
  medical: string;
  financial: string;
  credentials: string;
  confidential: string;
}

export interface DbAgentAttributeRow {
  agent_id: string;
  allowed_categories: string; // JSON array
  allowed_destinations: string; // JSON array
  allowed_tools: string; // JSON array
}

export interface DbPolicyRow {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  categories: string; // JSON array
  matches_count: number;
  version: string;
  created_at: string;
}

export interface DbPolicyRuleRow {
  id: string;
  policy_id: string;
  condition: string;
  effect: string;
  obligations: string; // JSON array
}

export interface DbSessionRow {
  id: string;
  status: string;
  created_at: string;
}

export interface DbMessageRow {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  channel: string;
  content: string;
  created_at: string;
}

export interface DbDetectionRow {
  id: string;
  message_id: string;
  entity: string;
  type: string;
  category: string;
  severity: string;
  tier: number;
  confidence: number;
  entropy_value?: number;
  entropy_modifier?: number;
  detector: string;
}

export interface DbRiskEvaluationRow {
  id: string;
  message_id: string;
  sender_id: string;
  recipient_id: string;
  tm: number;
  delta_ij: number;
  pi_j: number;
  lri_star: number;
  action: string;
  tau_low: number;
  tau_high: number;
  formula_string: string;
  created_at: string;
}

export interface DbTopologyNodeRow {
  id: string;
  label: string;
  type: string;
  is_absorbing: boolean;
  description: string;
  x: number;
  y: number;
}

export interface DbTopologyEdgeRow {
  id: string;
  from_node: string;
  to_node: string;
  probability: number;
  label: string;
  channel: string;
}

export interface DbSinkProbabilityRow {
  agent_id: string;
  sink_id: string;
  probability: number;
  calculated_at: string;
}

export interface DbRuntimeEventRow {
  id: string;
  session_id: string;
  event_type: string;
  payload_json: string;
  timestamp: string;
}

export interface DbAuditLogRow {
  id: string;
  seq: number;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  payload_hash: string;
  tm: number;
  delta_ij: number;
  pi_j: number;
  lri_star: number;
  action: string;
  policy_id?: string;
  reason: string;
  record_hash: string;
  prev_hash: string;
  created_at: string;
}

export interface DbQuarantineEventRow {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  lri_star: number;
  reason: string;
  destination: string;
  status: string; // PENDING_REVIEW, APPROVED, REJECTED
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface DbPseudonymMappingRow {
  session_id: string;
  original_hash: string;
  entity_type: string;
  surrogate: string;
  created_at: string;
}

export interface DbExperimentRow {
  id: string;
  name: string;
  benchmark_adapter: string;
  status: string;
  created_at: string;
}

export interface DbExperimentRunRow {
  id: string;
  experiment_id: string;
  metrics_json: string;
  run_at: string;
}
