/**
 * Clearance Dominance Engine — Δ*ij
 *
 * Implements: Δij(m) = 1.0  if any required sensitivity level exceeds
 *                           the recipient's clearance in that category
 *                      0.0  otherwise
 *
 * The clearance model uses a lattice: agent clearance is represented as a
 * vector over categories (personal, medical, financial, credentials, confidential).
 * Each dimension carries a sensitivity level L1–L4.
 *
 * This implements a no-read-up, no-write-down information-flow style check.
 */

import type {
  ClearanceCategory,
  ClearanceResult,
  ClearanceVector,
  ClearanceViolation,
  SensitivityLevel,
} from "./types";
import { CLEARANCE_CATEGORIES, SEVERITY_RANK } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Demo agent clearance registry
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_CLEARANCES: Record<string, ClearanceVector> = {
  "coordinator-01": {
    personal:     "L2",
    medical:      "L1",
    financial:    "L2",
    credentials:  "L1",
    confidential: "L2",
  },
  "medical-agent-01": {
    personal:     "L3",
    medical:      "L4",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L2",
  },
  "finance-agent-01": {
    personal:     "L2",
    medical:      "L1",
    financial:    "L4",
    credentials:  "L2",
    confidential: "L2",
  },
  "research-agent-01": {
    personal:     "L2",
    medical:      "L1",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L2",
  },
  "tool-agent-01": {
    personal:     "L1",
    medical:      "L1",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L1",
  },
  "external-gateway-01": {
    personal:     "L1",
    medical:      "L1",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L1",
  },
  "shared-memory-store": {
    personal:     "L3",
    medical:      "L4",
    financial:    "L4",
    credentials:  "L1",
    confidential: "L3",
  },
  // Map legacy demo agent IDs
  "customer": {
    personal:     "L2",
    medical:      "L1",
    financial:    "L2",
    credentials:  "L1",
    confidential: "L2",
  },
  "finance": {
    personal:     "L2",
    medical:      "L1",
    financial:    "L4",
    credentials:  "L2",
    confidential: "L2",
  },
  "hr": {
    personal:     "L3",
    medical:      "L4",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L2",
  },
  "support": {
    personal:     "L1",
    medical:      "L1",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L1",
  },
  "security": {
    personal:     "L4",
    medical:      "L4",
    financial:    "L4",
    credentials:  "L4",
    confidential: "L4",
  },
  "research": {
    personal:     "L1",
    medical:      "L1",
    financial:    "L1",
    credentials:  "L1",
    confidential: "L1",
  },
};

/** Fallback clearance for unknown agents */
export const UNKNOWN_CLEARANCE: ClearanceVector = {
  personal:     "L1",
  medical:      "L1",
  financial:    "L1",
  credentials:  "L1",
  confidential: "L1",
};

export function getAgentClearance(agentId: string): ClearanceVector {
  return AGENT_CLEARANCES[agentId] ?? UNKNOWN_CLEARANCE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clearance check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether the recipient has sufficient clearance for the required
 * sensitivity categories of this message.
 *
 * @param senderClearance     Sender's clearance vector
 * @param recipientClearance  Recipient's clearance vector
 * @param requiredCategories  Categories that appear in the detected payload,
 *                            with their required sensitivity level
 */
export function checkClearance(
  senderClearance: ClearanceVector,
  recipientClearance: ClearanceVector,
  requiredCategories: Array<{ category: ClearanceCategory; required: SensitivityLevel }>,
): ClearanceResult {
  const violations: ClearanceViolation[] = [];

  for (const { category, required } of requiredCategories) {
    const recipientHas = recipientClearance[category];
    const requiredRank = SEVERITY_RANK[required];
    const recipientRank = SEVERITY_RANK[recipientHas];
    if (recipientRank < requiredRank) {
      violations.push({
        category,
        required,
        recipientHas,
        requiredRank,
        recipientRank,
      });
    }
  }

  const deltaIj: 0 | 1 = violations.length > 0 ? 1 : 0;

  const summary =
    deltaIj === 1
      ? `Clearance violation in ${violations.map((v) => `${v.category}(required:${v.required}, has:${v.recipientHas})`).join(", ")} → Δij = 1.0`
      : "No clearance violations → Δij = 0.0";

  return {
    senderClearance,
    recipientClearance,
    checkedCategories: requiredCategories.map((r) => r.category),
    violations,
    deltaIj,
    summary,
  };
}

/**
 * Convenience: derive required categories from taint entity types.
 * Returns unique (category, max required level) pairs.
 */
export function requiredCategoriesFromEntities(
  entities: Array<{ category: ClearanceCategory | "other"; severityLevel: SensitivityLevel }>,
): Array<{ category: ClearanceCategory; required: SensitivityLevel }> {
  const map = new Map<ClearanceCategory, SensitivityLevel>();

  for (const e of entities) {
    if (e.category === "other") continue;
    const cat = e.category as ClearanceCategory;
    const existing = map.get(cat);
    if (!existing || SEVERITY_RANK[e.severityLevel] > SEVERITY_RANK[existing]) {
      map.set(cat, e.severityLevel);
    }
  }

  return Array.from(map.entries()).map(([category, required]) => ({ category, required }));
}
