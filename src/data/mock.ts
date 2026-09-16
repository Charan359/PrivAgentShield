/**
 * SIMULATED / DEMO DATA ONLY.
 *
 * Everything in this module is synthetic mock data produced by scripted mock
 * agents. No real LLM provider is called and none of these numbers represent
 * measured performance of a deployed system. Real evaluation data will be
 * produced by the evaluation engine in a later phase and is clearly labelled
 * as such in the UI.
 */

export const DATA_MODE = "SIMULATED (MOCK MODE)" as const;

export type ActionType = "ALLOW" | "MASK" | "REDACT" | "BLOCK";
export type Category =
  | "PII"
  | "FINANCIAL"
  | "CREDENTIAL"
  | "CONFIDENTIAL"
  | "HEALTH"
  | "NONE";
export type Sensitivity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Agent = {
  id: string;
  name: string;
  role: string;
  clearance: 0 | 1 | 2 | 3;
  allowed: Category[];
  isExternal: boolean;
  trust: number;
  violations: number;
};

export const agents: Agent[] = [
  {
    id: "customer",
    name: "Customer Agent",
    role: "intake / orchestrator",
    clearance: 1,
    allowed: ["NONE", "CONFIDENTIAL"],
    isExternal: false,
    trust: 0.82,
    violations: 2,
  },
  {
    id: "finance",
    name: "Finance Agent",
    role: "billing & payments",
    clearance: 3,
    allowed: ["FINANCIAL", "PII", "NONE"],
    isExternal: false,
    trust: 0.94,
    violations: 0,
  },
  {
    id: "hr",
    name: "HR Agent",
    role: "employee records",
    clearance: 3,
    allowed: ["PII", "HEALTH", "NONE"],
    isExternal: false,
    trust: 0.91,
    violations: 1,
  },
  {
    id: "support",
    name: "Support Agent",
    role: "customer resolution",
    clearance: 1,
    allowed: ["NONE"],
    isExternal: false,
    trust: 0.76,
    violations: 4,
  },
  {
    id: "security",
    name: "Security Agent",
    role: "guardian / reference monitor",
    clearance: 3,
    allowed: ["PII", "FINANCIAL", "CREDENTIAL", "CONFIDENTIAL", "HEALTH", "NONE"],
    isExternal: false,
    trust: 0.99,
    violations: 0,
  },
  {
    id: "research",
    name: "Research Agent",
    role: "external knowledge / tools",
    clearance: 0,
    allowed: ["NONE"],
    isExternal: true,
    trust: 0.41,
    violations: 7,
  },
];

export const agentById = (id: string) => agents.find((a) => a.id === id);

export type Decision = {
  id: string;
  seq: number;
  from: string;
  to: string;
  channel: "direct" | "broadcast" | "tool_call" | "memory_write";
  detected: string;
  category: Category;
  sensitivity: Sensitivity;
  policy: string;
  policyId: string;
  lri: number;
  action: ActionType;
  explanation: string;
  rawContent: string;
  sanitizedContent: string;
  latencyMs: number;
  ts: string;
};

export const decisions: Decision[] = [
  {
    id: "dec-1041",
    seq: 41,
    from: "customer",
    to: "finance",
    channel: "direct",
    detected: "Card number 4539 8832 1145 1234 (Luhn valid)",
    category: "FINANCIAL",
    sensitivity: "CRITICAL",
    policy: "Card data may reach Finance only in masked form",
    policyId: "pol-002",
    lri: 71,
    action: "MASK",
    explanation:
      "Detector `luhn-card` matched a 16-digit sequence passing the Luhn checksum. Receiver Finance Agent holds clearance 3 and FINANCIAL in its allow-list, so delivery is permitted, but policy pol-002 attaches a masking obligation for card primary account numbers on every channel.",
    rawContent:
      "Please charge the outstanding invoice to card 4539 8832 1145 1234, exp 09/28.",
    sanitizedContent:
      "Please charge the outstanding invoice to card **** **** **** 1234, exp 09/28.",
    latencyMs: 11,
    ts: "2026-09-04T07:41:12Z",
  },
  {
    id: "dec-1042",
    seq: 42,
    from: "support",
    to: "research",
    channel: "tool_call",
    detected: "API key sk_test_51NcQ2fJk8ZxT0aWbYh3PmR",
    category: "CREDENTIAL",
    sensitivity: "CRITICAL",
    policy: "No credentials to external tools",
    policyId: "pol-004",
    lri: 96,
    action: "BLOCK",
    explanation:
      "High-entropy token (Shannon 4.7 bits/char) matched the secret-key detector. Receiver Research Agent is flagged external with clearance 0. Policy pol-004 blocks any CREDENTIAL flow to an external sink; access control independently reached the same verdict, so no de-escalation is possible. Sender was notified without echoing the value.",
    rawContent:
      "Use sk_test_51NcQ2fJk8ZxT0aWbYh3PmR to query the vendor pricing endpoint.",
    sanitizedContent: "[MESSAGE BLOCKED — DeliveryRejected: CREDENTIAL → external sink]",
    latencyMs: 9,
    ts: "2026-09-04T07:40:55Z",
  },
  {
    id: "dec-1043",
    seq: 43,
    from: "hr",
    to: "support",
    channel: "direct",
    detected: "Diagnosis note + employee ID EMP-20194",
    category: "HEALTH",
    sensitivity: "HIGH",
    policy: "Health data restricted to HR clearance",
    policyId: "pol-006",
    lri: 64,
    action: "REDACT",
    explanation:
      "Lexicon classifier tagged a clinical term adjacent to an employee identifier. Support Agent has clearance 1 and does not list HEALTH in its allow-list, so the information-flow check escalated the policy effect from mask to redact.",
    rawContent:
      "EMP-20194 is on extended leave following a cardiac arrhythmia diagnosis.",
    sanitizedContent:
      "[REDACTED:PII] is on extended leave following a [REDACTED:HEALTH].",
    latencyMs: 14,
    ts: "2026-09-04T07:40:31Z",
  },
  {
    id: "dec-1044",
    seq: 44,
    from: "finance",
    to: "customer",
    channel: "direct",
    detected: "No sensitive spans",
    category: "NONE",
    sensitivity: "LOW",
    policy: "Default allow below LRI 25",
    policyId: "pol-000",
    lri: 8,
    action: "ALLOW",
    explanation:
      "No detector fired and the computed LRI (8) is under the default-allow threshold of 25. The message was delivered verbatim; the ALLOW is still recorded in the audit chain.",
    rawContent: "Invoice INV-88213 has been settled. Nothing further is owed.",
    sanitizedContent: "Invoice INV-88213 has been settled. Nothing further is owed.",
    latencyMs: 5,
    ts: "2026-09-04T07:40:02Z",
  },
  {
    id: "dec-1045",
    seq: 45,
    from: "customer",
    to: "support",
    channel: "broadcast",
    detected: "Email priya.n@example.com, phone +91 98xxxxxx21",
    category: "PII",
    sensitivity: "MEDIUM",
    policy: "PII masked on broadcast channels",
    policyId: "pol-001",
    lri: 47,
    action: "MASK",
    explanation:
      "Two PII spans detected. Broadcast channel carries an elevated exposure weight (0.8), lifting the LRI into the MODERATE band. Policy pol-001 masks contact identifiers rather than removing them so the support task can still complete.",
    rawContent: "Reach me at priya.n@example.com or +91 9812345621.",
    sanitizedContent: "Reach me at p****.n@e*****.com or +91 98******21.",
    latencyMs: 12,
    ts: "2026-09-04T07:39:48Z",
  },
  {
    id: "dec-1046",
    seq: 46,
    from: "support",
    to: "finance",
    channel: "memory_write",
    detected: "Aadhaar 4321 8876 1290 (Verhoeff valid)",
    category: "PII",
    sensitivity: "CRITICAL",
    policy: "National IDs never persisted to shared memory",
    policyId: "pol-005",
    lri: 88,
    action: "BLOCK",
    explanation:
      "National identifier passed checksum validation. The target is shared agent memory, which any clearance-1 agent can later read, so the flow is treated as a write-down. Policy pol-005 blocks persistence outright.",
    rawContent: "Store customer Aadhaar 4321 8876 1290 for future verification.",
    sanitizedContent: "[MESSAGE BLOCKED — DeliveryRejected: PII → shared memory]",
    latencyMs: 10,
    ts: "2026-09-04T07:39:20Z",
  },
  {
    id: "dec-1047",
    seq: 47,
    from: "research",
    to: "customer",
    channel: "direct",
    detected: "Internal roadmap excerpt",
    category: "CONFIDENTIAL",
    sensitivity: "MEDIUM",
    policy: "Confidential material requires clearance 2",
    policyId: "pol-003",
    lri: 39,
    action: "REDACT",
    explanation:
      "Keyword and context rules matched an internal project codename. The sending agent is external and low-trust (0.41), which raises the receiver-risk factor; the confidential paragraph was removed while the rest of the answer was preserved.",
    rawContent:
      "Per the internal Project Halcyon roadmap, the pricing change lands in Q1.",
    sanitizedContent: "Per [REDACTED:CONFIDENTIAL], the pricing change lands in Q1.",
    latencyMs: 13,
    ts: "2026-09-04T07:38:57Z",
  },
  {
    id: "dec-1048",
    seq: 48,
    from: "finance",
    to: "hr",
    channel: "direct",
    detected: "Salary band + IBAN DE89 3704 0044 0532 0130 00",
    category: "FINANCIAL",
    sensitivity: "HIGH",
    policy: "Bank identifiers masked between departments",
    policyId: "pol-002",
    lri: 58,
    action: "MASK",
    explanation:
      "IBAN structure validated by the mod-97 check. Both agents hold clearance 3, so the flow is lawful, but cross-department transfer of bank identifiers carries a masking obligation for least-exposure.",
    rawContent: "Payroll account DE89 3704 0044 0532 0130 00, band L5.",
    sanitizedContent: "Payroll account DE89 **** **** **** **30 00, band L5.",
    latencyMs: 15,
    ts: "2026-09-04T07:38:30Z",
  },
];

export const overviewStats = {
  totalInspected: 4820,
  sensitiveDetected: 1163,
  leakageAttempts: 274,
  blocked: 168,
  masked: 421,
  redacted: 302,
  allowed: 3929,
  currentLri: 47,
  avgLatencyMs: 11.6,
  p95LatencyMs: 24.3,
};

/** Simulated metrics computed against the labelled mock scenario corpus. */
export const evaluationMetrics = {
  accuracy: 0.943,
  precision: 0.921,
  recall: 0.906,
  f1: 0.913,
  leakageRate: 0.061,
  preventionRate: 0.939,
  falsePositiveRate: 0.048,
  taskCompletionRate: 0.887,
  tp: 1054,
  fp: 90,
  tn: 3567,
  fn: 109,
  corpusSize: 4820,
};

export const lriTrend = [
  { t: "07:20", lri: 22, messages: 41 },
  { t: "07:25", lri: 35, messages: 58 },
  { t: "07:30", lri: 61, messages: 77 },
  { t: "07:35", lri: 49, messages: 66 },
  { t: "07:40", lri: 74, messages: 92 },
  { t: "07:45", lri: 47, messages: 71 },
  { t: "07:50", lri: 39, messages: 64 },
  { t: "07:55", lri: 47, messages: 69 },
];

export const categoryBreakdown = [
  { category: "PII", count: 468 },
  { category: "FINANCIAL", count: 311 },
  { category: "CREDENTIAL", count: 147 },
  { category: "CONFIDENTIAL", count: 152 },
  { category: "HEALTH", count: 85 },
];

export const actionBreakdown = [
  { action: "ALLOW", count: 3929 },
  { action: "MASK", count: 421 },
  { action: "REDACT", count: 302 },
  { action: "BLOCK", count: 168 },
];

export const latencyDistribution = [
  { bucket: "0-5ms", count: 812 },
  { bucket: "5-10ms", count: 1904 },
  { bucket: "10-15ms", count: 1341 },
  { bucket: "15-25ms", count: 588 },
  { bucket: "25ms+", count: 175 },
];

export type Detector = {
  name: string;
  technique: string;
  category: Category;
  sensitivity: Sensitivity;
  hits: number;
  precision: number;
  sample: string;
};

export const detectors: Detector[] = [
  { name: "email-rfc5322", technique: "regex", category: "PII", sensitivity: "MEDIUM", hits: 231, precision: 0.97, sample: "priya.n@example.com" },
  { name: "phone-e164", technique: "regex + country rules", category: "PII", sensitivity: "MEDIUM", hits: 188, precision: 0.93, sample: "+91 9812345621" },
  { name: "aadhaar-verhoeff", technique: "checksum", category: "PII", sensitivity: "CRITICAL", hits: 49, precision: 0.99, sample: "4321 8876 1290" },
  { name: "luhn-card", technique: "checksum", category: "FINANCIAL", sensitivity: "CRITICAL", hits: 121, precision: 0.98, sample: "4539 8832 1145 1234" },
  { name: "iban-mod97", technique: "checksum", category: "FINANCIAL", sensitivity: "HIGH", hits: 74, precision: 0.98, sample: "DE89 3704 0044 0532 0130 00" },
  { name: "secret-entropy", technique: "Shannon entropy > 4.2", category: "CREDENTIAL", sensitivity: "CRITICAL", hits: 96, precision: 0.88, sample: "sk_test_51NcQ2fJk8ZxT0…" },
  { name: "jwt-structure", technique: "structural", category: "CREDENTIAL", sensitivity: "CRITICAL", hits: 33, precision: 0.99, sample: "eyJhbGciOiJIUzI1NiIs…" },
  { name: "clinical-lexicon", technique: "lexicon + context", category: "HEALTH", sensitivity: "HIGH", hits: 85, precision: 0.84, sample: "cardiac arrhythmia diagnosis" },
  { name: "internal-codename", technique: "keyword list", category: "CONFIDENTIAL", sensitivity: "MEDIUM", hits: 152, precision: 0.79, sample: "Project Halcyon" },
];

export type Policy = {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  categories: Category[];
  condition: string;
  effect: Lowercase<ActionType>;
  obligations: string[];
  matches: number;
  version: string;
};

export const policies: Policy[] = [
  { id: "pol-004", name: "No credentials to external tools", priority: 10, enabled: true, categories: ["CREDENTIAL"], condition: "receiver.isExternal == true", effect: "block", obligations: ["notify_sender", "audit_high"], matches: 96, version: "v3" },
  { id: "pol-005", name: "National IDs never persisted to shared memory", priority: 15, enabled: true, categories: ["PII"], condition: "channel == 'memory_write' AND sensitivity == 'CRITICAL'", effect: "block", obligations: ["notify_sender"], matches: 41, version: "v2" },
  { id: "pol-006", name: "Health data restricted to HR clearance", priority: 20, enabled: true, categories: ["HEALTH"], condition: "receiver.clearance < 3", effect: "redact", obligations: ["audit_high"], matches: 62, version: "v1" },
  { id: "pol-002", name: "Bank & card identifiers masked", priority: 30, enabled: true, categories: ["FINANCIAL"], condition: "always", effect: "mask", obligations: ["mask_keep_last4"], matches: 195, version: "v4" },
  { id: "pol-001", name: "PII masked on broadcast channels", priority: 40, enabled: true, categories: ["PII"], condition: "channel in ['broadcast','tool_call']", effect: "mask", obligations: ["mask_partial"], matches: 226, version: "v2" },
  { id: "pol-003", name: "Confidential material requires clearance 2", priority: 50, enabled: true, categories: ["CONFIDENTIAL"], condition: "receiver.clearance < 2", effect: "redact", obligations: [], matches: 118, version: "v1" },
  { id: "pol-007", name: "Quarantine low-trust senders", priority: 60, enabled: false, categories: ["PII", "FINANCIAL"], condition: "sender.trust < 0.5", effect: "redact", obligations: ["audit_high"], matches: 0, version: "draft" },
  { id: "pol-000", name: "Default allow below LRI 25", priority: 999, enabled: true, categories: ["NONE"], condition: "lri < 25", effect: "allow", obligations: [], matches: 3657, version: "v1" },
];

export type AuditEntry = {
  id: string;
  seq: number;
  event: string;
  actor: string;
  action: ActionType | "CONFIG";
  recordHash: string;
  prevHash: string;
  ts: string;
};

export const auditLog: AuditEntry[] = decisions.map((d, i) => ({
  id: `aud-${2100 + i}`,
  seq: 2100 + i,
  event: `gateway.decision:${d.id}`,
  actor: agentById(d.from)?.name ?? d.from,
  action: d.action,
  recordHash: `0x${(0x9f2a41c + i * 0x1d3f7).toString(16)}b7e4`,
  prevHash: `0x${(0x9f2a41c + (i - 1) * 0x1d3f7).toString(16)}b7e4`,
  ts: d.ts,
}));

export const scenarioSteps = [
  { id: "s1", label: "Customer Agent", detail: "raises a billing dispute containing a card number" },
  { id: "s2", label: "Finance Agent", detail: "requested to settle the invoice" },
  { id: "s3", label: "Security Guardian", detail: "inline reference monitor intercepts the envelope" },
  { id: "s4", label: "Policy Engine", detail: "pol-002 matched · obligations: mask_keep_last4" },
  { id: "s5", label: "Decision", detail: "MASK · LRI 71 · delivered in 11 ms" },
];

export const runtimeFeed = decisions.map((d) => ({
  id: d.id,
  ts: d.ts,
  from: agentById(d.from)?.name ?? d.from,
  to: agentById(d.to)?.name ?? d.to,
  channel: d.channel,
  action: d.action,
  lri: d.lri,
  latencyMs: d.latencyMs,
  preview: d.rawContent,
  sanitized: d.sanitizedContent,
}));

export const lriFactors = [
  { key: "S", label: "Span sensitivity", weight: 0.4, value: 1.0 },
  { key: "V", label: "Volume factor", weight: 0.15, value: 0.4 },
  { key: "R", label: "Receiver risk", weight: 0.2, value: 0.26 },
  { key: "C", label: "Channel exposure", weight: 0.15, value: 0.3 },
  { key: "H", label: "Sender history", weight: 0.1, value: 0.17 },
];

export const riskBand = (lri: number) =>
  lri >= 75 ? "CRITICAL" : lri >= 50 ? "HIGH" : lri >= 25 ? "MODERATE" : "LOW";

