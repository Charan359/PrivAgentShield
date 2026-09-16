/**
 * Sensitive Data Detection & Classification Engine — shared types.
 *
 * Rule-based today, but every detector is a pluggable module implementing
 * `Detector`, so an ML/NLP detector can be added or swapped in later without
 * touching the pipeline.
 */

import type { Category, Sensitivity } from "@/data/mock";

/** Fine-grained entity kinds produced by detectors. */
export type EntityType =
  // PII
  | "person_name"
  | "email"
  | "phone"
  | "address"
  | "government_id"
  | "date_of_birth"
  // FINANCIAL
  | "bank_account"
  | "card_number"
  | "transaction_info"
  | "financial_identifier"
  // CREDENTIAL
  | "password"
  | "api_key"
  | "access_token"
  | "auth_secret"
  // CONFIDENTIAL
  | "internal_document"
  | "project_codename"
  | "employee_record"
  | "proprietary_info";

export type DetectedEntity = {
  type: EntityType;
  /** Category assigned by the classification stage. */
  category: Category;
  /** Raw matched span. Never render or log this directly — use `masked`. */
  value: string;
  /** Display-safe rendering of `value`. */
  masked: string;
  start_index: number;
  end_index: number;
  /** 0..1 */
  confidence: number;
  severity: Sensitivity;
  /** Which detector module produced the match. */
  detector: string;
  /** Why the confidence landed where it did. */
  rationale: string;
  /** Which inspection tier detected this entity. */
  tier: 1 | 2 | 3;
  /** Contribution to T*m (filled by LRI taint engine after detection). */
  taintContribution: number;
  /** Shannon entropy value for secret-type entities. */
  entropyValue?: number;
};

export type InspectionTier = {
  tier: 1 | 2 | 3;
  name: string;
  status: "active" | "fallback" | "planned";
  technique: string;
  description: string;
  providerInterface: string;
};

export const INSPECTION_TIERS: InspectionTier[] = [
  {
    tier: 1,
    name: "Regex / Automata + Entropy",
    status: "active",
    technique: "Compiled pattern matching, checksum validation, Shannon entropy",
    description:
      "Detects structured PII (SSN, IBAN, card numbers via Luhn), credentials (API keys, JWTs), high-entropy secret strings. Hyperscan-compatible interface — Phase 1 uses TypeScript fallback.",
    providerInterface: "Hyperscan-compatible (TypeScript fallback active)",
  },
  {
    tier: 2,
    name: "Named Entity Recognition",
    status: "fallback",
    technique: "NER / PII detection (Presidio/GLiNER-compatible, simulated)",
    description:
      "Detects person names, medical terms, locations, organizations. Phase 1 uses deterministic simulated detection. Real integration planned with Presidio / GLiNER.",
    providerInterface: "Presidio / GLiNER interface (simulated for Phase 1)",
  },
  {
    tier: 3,
    name: "Semantic / Injection Analysis",
    status: "fallback",
    technique: "Semantic analysis, prompt injection detection (transformer-compatible, simulated)",
    description:
      "Detects indirect prompt injection, confused-deputy patterns, jailbreak attempts. Phase 1 uses deterministic rule simulation. Real integration planned with transformer classifier.",
    providerInterface: "Transformer probe interface (simulated for Phase 1)",
  },
];

export type DetectionResult = {
  text: string;
  entities: DetectedEntity[];
  /** Highest severity across entities; LOW when nothing matched. */
  sensitivity: Sensitivity;
  categories: Category[];
  /** Mean confidence across entities, 0 when none. */
  meanConfidence: number;
  /** Original text with every entity span replaced by its masked form. */
  maskedText: string;
  /** Wall-clock cost of the pipeline in ms. */
  elapsedMs: number;
};

/** A raw candidate span, before classification. */
export type RawMatch = {
  type: EntityType;
  value: string;
  start_index: number;
  end_index: number;
  /** Base confidence before context boosts. */
  confidence: number;
  rationale: string;
};

export type Detector = {
  /** Stable id, e.g. `email-rfc5322`. */
  name: string;
  technique: "regex" | "checksum" | "entropy" | "lexicon" | "structural" | "ml";
  detect: (text: string) => RawMatch[];
};
