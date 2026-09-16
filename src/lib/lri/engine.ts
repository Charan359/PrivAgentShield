/**
 * LRI* Risk Engine
 *
 * Orchestrates the full pipeline:
 *   Tm → Δij → Πj → LRI*(vi,vj,m) = max(Δij(m), Tm × Π*j)
 *
 * Decision thresholds (configurable demo defaults, NOT experimentally calibrated):
 *   LRI* < τlow             → ALLOW
 *   τlow ≤ LRI* < τhigh    → SANITIZE
 *   LRI* ≥ τhigh           → QUARANTINE
 */

import type { EntityType } from "@/lib/detection/types";
import type {
  ClearanceVector,
  LriAction,
  LriStarResult,
  ThresholdConfig,
  TopologyGraph,
} from "./types";
import { DEFAULT_THRESHOLDS } from "./types";
import { calculateTm, entityClearanceCategory, entitySeverityLevel } from "./taint";
import { checkClearance, getAgentClearance, requiredCategoriesFromEntities } from "./clearance";
import { buildTopologyResult } from "./topology";
import { DEFAULT_TOPOLOGY } from "@/data/topology";

// ─────────────────────────────────────────────────────────────────────────────
// Decision function
// ─────────────────────────────────────────────────────────────────────────────

export function lriDecision(lriStar: number, thresholds: ThresholdConfig): LriAction {
  if (lriStar >= thresholds.tauHigh) return "QUARANTINE";
  if (lriStar >= thresholds.tauLow)  return "SANITIZE";
  return "ALLOW";
}

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline
// ─────────────────────────────────────────────────────────────────────────────

export type LriPipelineInput = {
  senderId: string;
  recipientId: string;
  /** Detected entities from the inspection engine */
  detectedEntities: Array<{ type: EntityType; entropy?: number }>;
  /** Override sender clearance (defaults to registry lookup) */
  senderClearance?: ClearanceVector;
  /** Override recipient clearance (defaults to registry lookup) */
  recipientClearance?: ClearanceVector;
  /** Override topology graph (defaults to DEFAULT_TOPOLOGY) */
  topologyGraph?: TopologyGraph;
  /** Override thresholds */
  thresholds?: ThresholdConfig;
  /** Force Tier 3 alert (semantic injection → auto QUARANTINE) */
  tier3Alert?: boolean;
};

export function calculateLriStar(input: LriPipelineInput): LriStarResult {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const senderClearance = input.senderClearance ?? getAgentClearance(input.senderId);
  const recipientClearance = input.recipientClearance ?? getAgentClearance(input.recipientId);
  const graph = input.topologyGraph ?? (DEFAULT_TOPOLOGY as unknown as TopologyGraph);

  // ── Stage 1: T*m ──────────────────────────────────────────────────────────
  const tmResult = calculateTm(input.detectedEntities);

  // ── Stage 2: Δ*ij ─────────────────────────────────────────────────────────
  const requiredCategories = requiredCategoriesFromEntities(
    tmResult.entities.map((e) => ({
      category: entityClearanceCategory(e.entityType as EntityType),
      severityLevel: entitySeverityLevel(e.entityType as EntityType),
    })),
  );
  const clearanceResult = checkClearance(
    senderClearance,
    recipientClearance,
    requiredCategories,
  );

  // ── Stage 3: Π*j ─────────────────────────────────────────────────────────
  const topologyResult = buildTopologyResult(graph);
  const piJ = topologyResult.piJ[input.recipientId] ?? 0;

  // ── Stage 4: LRI* ─────────────────────────────────────────────────────────
  const tmPiProduct = Number((tmResult.tm * piJ).toFixed(4));
  const rawLri = Math.max(clearanceResult.deltaIj, tmPiProduct);
  // Tier 3 semantic alert always forces QUARANTINE
  const lriStar = input.tier3Alert ? Math.max(rawLri, thresholds.tauHigh) : rawLri;
  const lriStarRounded = Number(Math.min(1, lriStar).toFixed(4));

  const action = lriDecision(lriStarRounded, thresholds);

  const formulaString =
    `LRI*(${input.senderId}, ${input.recipientId}, m) = ` +
    `max(${clearanceResult.deltaIj.toFixed(2)}, ${tmResult.tm.toFixed(2)} × ${piJ.toFixed(2)}) = ` +
    `max(${clearanceResult.deltaIj.toFixed(2)}, ${tmPiProduct.toFixed(2)}) = ${lriStarRounded.toFixed(2)}` +
    (input.tier3Alert ? " [Tier 3 escalation]" : "");

  return {
    senderId: input.senderId,
    recipientId: input.recipientId,
    tm: tmResult.tm,
    deltaIj: clearanceResult.deltaIj,
    piJ,
    lriStar: lriStarRounded,
    action,
    thresholds,
    formulaString,
    breakdown: { tmResult, clearanceResult, topologyResult },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Threshold-only re-evaluation (for live slider updates)
// ─────────────────────────────────────────────────────────────────────────────

export function reEvaluateWithThresholds(
  existingResult: LriStarResult,
  newThresholds: ThresholdConfig,
): LriStarResult {
  const action = lriDecision(existingResult.lriStar, newThresholds);
  return { ...existingResult, thresholds: newThresholds, action };
}
