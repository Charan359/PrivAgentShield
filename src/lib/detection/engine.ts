/**
 * Classification pipeline:
 *
 *   Message → Entity Detection → Entity Classification → Confidence Score →
 *   Sensitivity Level
 *
 * Runs before any inter-agent message is transmitted. Callers should treat
 * `DetectionResult.maskedText` as the only safe rendering of the message.
 */

import type { Category, Sensitivity } from "@/data/mock";
import { detectorRegistry } from "./detectors";
import { maskValue } from "./mask";
import type { DetectedEntity, DetectionResult, Detector, EntityType, RawMatch } from "./types";

/* ------------------------ stage 2: classification ---------------------------- */

const CATEGORY_OF: Record<EntityType, Category> = {
  person_name: "PII",
  email: "PII",
  phone: "PII",
  address: "PII",
  government_id: "PII",
  date_of_birth: "PII",
  bank_account: "FINANCIAL",
  card_number: "FINANCIAL",
  transaction_info: "FINANCIAL",
  financial_identifier: "FINANCIAL",
  password: "CREDENTIAL",
  api_key: "CREDENTIAL",
  access_token: "CREDENTIAL",
  auth_secret: "CREDENTIAL",
  internal_document: "CONFIDENTIAL",
  project_codename: "CONFIDENTIAL",
  employee_record: "CONFIDENTIAL",
  proprietary_info: "CONFIDENTIAL",
};

/* ------------------------ stage 4: sensitivity level -------------------------- */

const BASE_SEVERITY: Record<EntityType, Sensitivity> = {
  person_name: "LOW",
  email: "MEDIUM",
  phone: "MEDIUM",
  address: "HIGH",
  government_id: "CRITICAL",
  date_of_birth: "HIGH",
  bank_account: "CRITICAL",
  card_number: "CRITICAL",
  transaction_info: "MEDIUM",
  financial_identifier: "HIGH",
  password: "CRITICAL",
  api_key: "CRITICAL",
  access_token: "CRITICAL",
  auth_secret: "HIGH",
  internal_document: "MEDIUM",
  project_codename: "MEDIUM",
  employee_record: "HIGH",
  proprietary_info: "HIGH",
};

const ORDER: Sensitivity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const rank = (s: Sensitivity) => ORDER.indexOf(s);
const bump = (s: Sensitivity, by: number) =>
  ORDER[Math.min(ORDER.length - 1, Math.max(0, rank(s) + by))]!;

/** Low-confidence matches are de-escalated so weak signals do not over-trigger. */
function severityFor(type: EntityType, confidence: number): Sensitivity {
  const base = BASE_SEVERITY[type];
  if (confidence < 0.7) return bump(base, -1);
  return base;
}

/* --------------------- stage 3: confidence adjustment ------------------------ */

const CUES: Partial<Record<EntityType, RegExp>> = {
  bank_account: /\b(?:bank|account|a\/c|acct)\b/i,
  card_number: /\b(?:card|credit|debit|visa|mastercard|cvv|exp)\b/i,
  password: /\b(?:password|login|credential)\b/i,
  api_key: /\b(?:key|token|secret|auth)\b/i,
  auth_secret: /\b(?:key|token|secret|auth|bearer)\b/i,
  government_id: /\b(?:aadhaar|pan|ssn|passport|national id|govt|government)\b/i,
  date_of_birth: /\b(?:dob|birth)\b/i,
  address: /\b(?:address|resides|lives at|shipping)\b/i,
};

/** Nearby keywords lift confidence; the cap keeps rule-based scores below 1.0. */
function contextualConfidence(text: string, m: RawMatch): { confidence: number; rationale: string } {
  const cue = CUES[m.type];
  if (!cue) return { confidence: m.confidence, rationale: m.rationale };
  const window = text.slice(Math.max(0, m.start_index - 40), Math.min(text.length, m.end_index + 40));
  if (!cue.test(window)) return { confidence: m.confidence, rationale: m.rationale };
  return {
    confidence: Math.min(0.99, Number((m.confidence + 0.04).toFixed(2))),
    rationale: `${m.rationale}; supporting keyword in ±40 char window`,
  };
}

/* ------------------------------ overlap resolution --------------------------- */

const CATEGORY_PRIORITY: Category[] = [
  "CREDENTIAL",
  "FINANCIAL",
  "PII",
  "HEALTH",
  "CONFIDENTIAL",
  "NONE",
];

/** Keeps the strongest match when spans overlap (longest → severity → confidence). */
function resolveOverlaps(entities: DetectedEntity[]): DetectedEntity[] {
  const sorted = [...entities].sort((a, b) => {
    const lenDiff = b.end_index - b.start_index - (a.end_index - a.start_index);
    if (lenDiff !== 0) return lenDiff;
    const sev = rank(b.severity) - rank(a.severity);
    if (sev !== 0) return sev;
    const cat =
      CATEGORY_PRIORITY.indexOf(a.category) - CATEGORY_PRIORITY.indexOf(b.category);
    if (cat !== 0) return cat;
    return b.confidence - a.confidence;
  });

  const kept: DetectedEntity[] = [];
  for (const e of sorted) {
    const clash = kept.some((k) => e.start_index < k.end_index && k.start_index < e.end_index);
    if (!clash) kept.push(e);
  }
  return kept.sort((a, b) => a.start_index - b.start_index);
}

/* ---------------------------------- pipeline --------------------------------- */

export type AnalyzeOptions = {
  /** Drop matches scoring below this confidence. Default 0.6. */
  minConfidence?: number;
  /** Restrict the run to a subset of detectors (by name). */
  detectors?: Detector[];
};

export function analyzeMessage(text: string, options: AnalyzeOptions = {}): DetectionResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const minConfidence = options.minConfidence ?? 0.6;
  const registry = options.detectors ?? detectorRegistry;

  // Stage 1 — entity detection
  const raw: Array<RawMatch & { detector: string }> = [];
  for (const d of registry) {
    for (const m of d.detect(text)) raw.push({ ...m, detector: d.name });
  }

  // Stages 2–4 — classification, confidence, sensitivity
  const classified: DetectedEntity[] = raw
    .map((m) => {
      const { confidence, rationale } = contextualConfidence(text, m);
      return {
        type: m.type,
        category: CATEGORY_OF[m.type],
        value: m.value,
        masked: maskValue(m.type, m.value),
        start_index: m.start_index,
        end_index: m.end_index,
        confidence,
        severity: severityFor(m.type, confidence),
        detector: m.detector,
        rationale,
        // LRI* fields — tier assigned by inspection tier, taintContribution filled by taint engine
        tier: 1 as const,
        taintContribution: 0,
      };
    })
    .filter((e) => e.confidence >= minConfidence);

  const entities = resolveOverlaps(classified);

  const sensitivity = entities.reduce<Sensitivity>(
    (acc, e) => (rank(e.severity) > rank(acc) ? e.severity : acc),
    "LOW",
  );

  const categories = [...new Set(entities.map((e) => e.category))];
  const meanConfidence = entities.length
    ? Number((entities.reduce((s, e) => s + e.confidence, 0) / entities.length).toFixed(3))
    : 0;

  let maskedText = "";
  let cursor = 0;
  for (const e of entities) {
    maskedText += text.slice(cursor, e.start_index) + e.masked;
    cursor = e.end_index;
  }
  maskedText += text.slice(cursor);

  const finished = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    text,
    entities,
    sensitivity,
    categories,
    meanConfidence,
    maskedText,
    elapsedMs: Number((finished - started).toFixed(2)),
  };
}

/** Compact, log-safe summary — never contains raw values. */
export function summarizeForLog(result: DetectionResult) {
  return {
    entityCount: result.entities.length,
    categories: result.categories,
    sensitivity: result.sensitivity,
    meanConfidence: result.meanConfidence,
    types: result.entities.map((e) => `${e.type}@${e.start_index}-${e.end_index}`),
    elapsedMs: result.elapsedMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: Simulated NER / PII Detector
// Presidio / GLiNER-compatible interface (simulated for Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

export type Tier2Entity = {
  text: string;
  label: "PERSON" | "LOCATION" | "ORG" | "MEDICAL_TERM" | "DATE";
  start: number;
  end: number;
  confidence: number;
  tier: 2;
};

const MEDICAL_TERMS = [
  "diagnosis", "arrhythmia", "cardiac", "hypertension", "diabetes",
  "oncology", "prescription", "dosage", "patient", "clinical",
  "symptom", "chronic", "acute", "therapy", "medication", "treatment",
  "surgery", "anaemia", "seizure", "prognosis",
];

/** Simulated Tier 2 NER — Presidio/GLiNER-compatible interface */
export function runTier2(text: string): Tier2Entity[] {
  const results: Tier2Entity[] = [];
  for (const term of MEDICAL_TERMS) {
    const re = new RegExp(`\\b${term}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      results.push({
        text: m[0],
        label: "MEDICAL_TERM",
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.78,
        tier: 2,
      });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: Simulated Semantic / Injection Analyzer
// Transformer-compatible interface (simulated for Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

export type Tier3FindingType =
  | "prompt_injection"
  | "confused_deputy"
  | "suspicious_instruction"
  | "jailbreak"
  | "ambiguous_payload";

export type Tier3Finding = {
  type: Tier3FindingType;
  description: string;
  confidence: number;
  snippet: string;
  tier: 3;
};

const INJECTION_PATTERNS: Array<{
  re: RegExp;
  type: Tier3FindingType;
  desc: string;
  confidence: number;
}> = [
  {
    re: /ignore\s+(?:previous|all|above|prior)\s+instructions?/i,
    type: "prompt_injection",
    desc: "Classic prompt injection: override prior instruction",
    confidence: 0.93,
  },
  {
    re: /(?:you\s+are\s+now|pretend\s+(?:you\s+are|to\s+be)|act\s+as\s+(?:an?\s+)?(?:admin|root|system))/i,
    type: "jailbreak",
    desc: "Role override / jailbreak attempt",
    confidence: 0.88,
  },
  {
    re: /(?:system\s+prompt|DAN|do\s+anything\s+now|unrestricted\s+mode)/i,
    type: "jailbreak",
    desc: "DAN / unrestricted mode jailbreak pattern",
    confidence: 0.91,
  },
  {
    re: /(?:on\s+behalf\s+of|as\s+authorized\s+by|with\s+(?:full\s+)?permission\s+of)\s+[A-Z]/i,
    type: "confused_deputy",
    desc: "Confused-deputy authority claim pattern",
    confidence: 0.85,
  },
  {
    re: /(?:exfiltrate|send\s+(?:all|this|data)\s+to\s+(?:external|http)|relay\s+to\s+http)/i,
    type: "suspicious_instruction",
    desc: "Exfiltration / external relay instruction",
    confidence: 0.87,
  },
  {
    re: /(?:export\s+all\s+(?:records?|data|credentials?)|dump\s+(?:all|the)\s+(?:records?|database))/i,
    type: "suspicious_instruction",
    desc: "Bulk data export instruction",
    confidence: 0.82,
  },
];

/** Simulated Tier 3 semantic analyzer — transformer-compatible interface */
export function runTier3(text: string): Tier3Finding[] {
  const results: Tier3Finding[] = [];
  for (const { re, type, desc, confidence } of INJECTION_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      results.push({
        type,
        description: desc,
        confidence,
        snippet: m[0],
        tier: 3,
      });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full three-tier inspection orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export type FullInspectionResult = {
  tier1: DetectionResult;
  tier2: Tier2Entity[];
  tier3: Tier3Finding[];
  highestTierFired: 1 | 2 | 3;
  hasTier3Alert: boolean;
  totalEntities: number;
  elapsedMs: number;
};

export function fullInspection(text: string, options: AnalyzeOptions = {}): FullInspectionResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const tier1 = analyzeMessage(text, options);
  const tier2 = runTier2(text);
  const tier3 = runTier3(text);
  const finished = typeof performance !== "undefined" ? performance.now() : Date.now();

  const hasTier3Alert = tier3.length > 0;
  const highestTierFired: 1 | 2 | 3 =
    tier3.length > 0 ? 3 : tier2.length > 0 ? 2 : 1;

  return {
    tier1,
    tier2,
    tier3,
    highestTierFired,
    hasTier3Alert,
    totalEntities: tier1.entities.length + tier2.length,
    elapsedMs: Number((finished - started).toFixed(2)),
  };
}
