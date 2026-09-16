/**
 * T*m — Message Taint / Sensitivity Engine
 *
 * Implements: Tm = min(1.0, Σ s(ek) × ω(ek))
 *
 * Where:
 *   s(ek) = severity weight of entity ek  (L1=0.1, L2=0.3, L3=0.7, L4=1.0)
 *   ω(ek) = H(ek)/Hmax  for credential/secret entities (Hmax = 4.5 bits)
 *           1.0          for structured identifiers (SSN, IBAN, card, etc.)
 */

import type { EntityType } from "@/lib/detection/types";
import type {
  ClearanceCategory,
  EntityTaintResult,
  SensitivityLevel,
  TmResult,
} from "./types";
import { SEVERITY_WEIGHT } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Entity → SensitivityLevel mapping
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY_SEVERITY: Record<EntityType, SensitivityLevel> = {
  // L1 — general / low sensitivity
  transaction_info: "L2",
  // L2 — personal information
  person_name:   "L2",
  email:         "L2",
  phone:         "L2",
  address:       "L2",
  date_of_birth: "L2",
  // L3 — medical / financial / confidential
  government_id:       "L3",
  financial_identifier:"L3",
  bank_account:        "L3",
  card_number:         "L3",
  employee_record:     "L3",
  internal_document:   "L2",
  project_codename:    "L2",
  proprietary_info:    "L3",
  // L4 — credentials / secrets
  password:      "L4",
  api_key:       "L4",
  access_token:  "L4",
  auth_secret:   "L3",
};

// ─────────────────────────────────────────────────────────────────────────────
// Entity → ClearanceCategory mapping
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY_CLEARANCE_CATEGORY: Partial<Record<EntityType, ClearanceCategory>> = {
  person_name:         "personal",
  email:               "personal",
  phone:               "personal",
  address:             "personal",
  date_of_birth:       "personal",
  government_id:       "personal",
  employee_record:     "confidential",
  internal_document:   "confidential",
  project_codename:    "confidential",
  proprietary_info:    "confidential",
  bank_account:        "financial",
  card_number:         "financial",
  financial_identifier:"financial",
  transaction_info:    "financial",
  password:            "credentials",
  api_key:             "credentials",
  access_token:        "credentials",
  auth_secret:         "credentials",
};

// ─────────────────────────────────────────────────────────────────────────────
// Secret entity types (ω = H/Hmax)
// ─────────────────────────────────────────────────────────────────────────────

const SECRET_TYPES = new Set<EntityType>([
  "password", "api_key", "access_token", "auth_secret",
]);

/** Maximum reference entropy (bits/char) for normalization */
const HMAX = 4.5;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function entitySeverityLevel(type: EntityType): SensitivityLevel {
  return ENTITY_SEVERITY[type] ?? "L1";
}

export function entityClearanceCategory(type: EntityType): ClearanceCategory | "other" {
  return ENTITY_CLEARANCE_CATEGORY[type] ?? "other";
}

/**
 * Calculate T*m for a set of detected entities.
 *
 * @param entities  Detected entities (type + optional Shannon entropy)
 * @returns         Full taint result including per-entity breakdown
 */
export function calculateTm(
  entities: Array<{ type: EntityType; entropy?: number }>,
): TmResult {
  if (entities.length === 0) {
    return {
      entities: [],
      sumContributions: 0,
      tm: 0,
      breakdown: "No entities detected → Tm = 0.00",
    };
  }

  const taintRows: EntityTaintResult[] = entities.map((e) => {
    const level = entitySeverityLevel(e.type);
    const weight = SEVERITY_WEIGHT[level];
    const isSecret = SECRET_TYPES.has(e.type);
    const entropyValue = e.entropy ?? 0;

    let entropyModifier: number;
    if (isSecret && entropyValue > 0) {
      entropyModifier = Math.min(1.0, entropyValue / HMAX);
    } else {
      entropyModifier = 1.0;
    }

    const contribution = Number((weight * entropyModifier).toFixed(4));

    return {
      entityType: e.type,
      category: entityClearanceCategory(e.type),
      severityLevel: level,
      severityWeight: weight,
      isSecret,
      entropyValue,
      entropyModifier: Number(entropyModifier.toFixed(4)),
      contribution,
    };
  });

  const sumContributions = Number(
    taintRows.reduce((acc, r) => acc + r.contribution, 0).toFixed(4),
  );
  const tm = Number(Math.min(1.0, sumContributions).toFixed(4));

  const parts = taintRows
    .map((r) => `${r.entityType}(${r.severityLevel}: ${r.contribution.toFixed(2)})`)
    .join(" + ");
  const breakdown = `Tm = min(1.0, ${parts}) = min(1.0, ${sumContributions.toFixed(2)}) = ${tm.toFixed(2)}`;

  return { entities: taintRows, sumContributions, tm, breakdown };
}
