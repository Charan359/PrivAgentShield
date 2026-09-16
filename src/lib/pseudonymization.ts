/**
 * Pseudonymization Engine
 *
 * Generates session-consistent typed surrogate tokens for sanitized payloads.
 *
 * - Same entity value + same session → same surrogate (coreference preservation)
 * - Surrogates are typed: [PERSON_8f31a2], [CREDENTIAL_3c91f4], etc.
 * - Uses deterministic FNV-1a hash for reproducibility within session
 * - Plaintext values are never stored after session ends
 *
 * For developer/demo view: getSessionDictionary() exposes the mapping.
 * This is clearly labeled as a demo capability, not a production API.
 */

import type { EntityType } from "@/lib/detection/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SurrogateEntry = {
  /** Surrogate token (safe to display) */
  surrogate: string;
  /** Entity type that produced this surrogate */
  entityType: string;
  /** Session this entry belongs to */
  sessionId: string;
  /** ISO timestamp */
  createdAt: string;
  /** Only exposed in developer/demo view */
  _demoOriginal?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Entity type → surrogate prefix
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_PREFIX: Partial<Record<EntityType | string, string>> = {
  person_name:         "PERSON",
  email:               "EMAIL",
  phone:               "PHONE",
  address:             "ADDRESS",
  government_id:       "GOV_ID",
  date_of_birth:       "DOB",
  card_number:         "CARD",
  bank_account:        "FINANCIAL",
  financial_identifier:"FINANCIAL",
  transaction_info:    "TXN",
  password:            "CREDENTIAL",
  api_key:             "CREDENTIAL",
  access_token:        "CREDENTIAL",
  auth_secret:         "CREDENTIAL",
  internal_document:   "DOCUMENT",
  project_codename:    "CODENAME",
  employee_record:     "EMP_RECORD",
  proprietary_info:    "PROPRIETARY",
  // Tier 2 labels
  MEDICAL_TERM:        "MEDICAL_RECORD",
  PERSON:              "PERSON",
  LOCATION:            "LOCATION",
  ORG:                 "ORG",
};

function getPrefix(entityType: string): string {
  return TYPE_PREFIX[entityType] ?? "ENTITY";
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic FNV-1a hash → 6-char hex
// ─────────────────────────────────────────────────────────────────────────────

function fnv1aHex(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory session store
// (resets on page refresh — intentional ephemeral session behavior)
// ─────────────────────────────────────────────────────────────────────────────

// key = "sessionId:value:entityType" → SurrogateEntry
const sessionStore = new Map<string, SurrogateEntry>();

function storeKey(value: string, entityType: string, sessionId: string): string {
  return `${sessionId}::${entityType}::${value}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the session-consistent surrogate for (value, entityType, sessionId).
 * Creates a new surrogate if this combination hasn't been seen before.
 */
export function pseudonymize(
  value: string,
  entityType: string,
  sessionId: string,
): string {
  const key = storeKey(value, entityType, sessionId);
  const existing = sessionStore.get(key);
  if (existing) return existing.surrogate;

  const prefix = getPrefix(entityType);
  const hash = fnv1aHex(value + entityType + sessionId);
  const surrogate = `[${prefix}_${hash}]`;

  sessionStore.set(key, {
    surrogate,
    entityType,
    sessionId,
    createdAt: new Date().toISOString(),
    _demoOriginal: value, // only present in demo store — never log this
  });

  return surrogate;
}

/**
 * Replace all entity spans in `text` with their session-consistent surrogates.
 * Entities must be sorted by start_index ascending and non-overlapping.
 */
export function pseudonymizeText(
  text: string,
  entities: Array<{
    value: string;
    type: string;
    start_index: number;
    end_index: number;
  }>,
  sessionId: string,
): { pseudonymized: string; mappings: Array<{ original: string; surrogate: string; type: string }> } {
  const sorted = [...entities].sort((a, b) => a.start_index - b.start_index);
  let result = "";
  let cursor = 0;
  const mappings: Array<{ original: string; surrogate: string; type: string }> = [];

  for (const entity of sorted) {
    if (entity.start_index < cursor) continue; // skip overlapping
    result += text.slice(cursor, entity.start_index);
    const surrogate = pseudonymize(entity.value, entity.type, sessionId);
    result += surrogate;
    mappings.push({ original: entity.value, surrogate, type: entity.type });
    cursor = entity.end_index;
  }
  result += text.slice(cursor);

  return { pseudonymized: result, mappings };
}

/**
 * Developer/demo view: returns all surrogate entries for a session.
 * Exposes the _demoOriginal field — clearly labeled for demo purposes only.
 */
export function getSessionDictionary(sessionId: string): SurrogateEntry[] {
  const entries: SurrogateEntry[] = [];
  for (const [key, entry] of sessionStore.entries()) {
    if (key.startsWith(`${sessionId}::`)) entries.push(entry);
  }
  return entries;
}

/** Clear all entries for a session. */
export function clearSession(sessionId: string): void {
  for (const key of sessionStore.keys()) {
    if (key.startsWith(`${sessionId}::`)) sessionStore.delete(key);
  }
}

/** Clear all sessions. */
export function clearAllSessions(): void {
  sessionStore.clear();
}
