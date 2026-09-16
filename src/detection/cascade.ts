/**
 * PRIVAGENTSHIELD CASCADED INSPECTION COORDINATOR
 * Optimizes latency by triaging traffic across Tier 1, Tier 2, and Tier 3 detectors.
 */

import { tier1Detector } from "./tier1";
import { tier2Detector } from "./tier2";
import { semanticProbe } from "./tier3";
import type { DetectionFinding } from "@/domain/types";

export type CascadeStrategy = "alwaysRunTier3" | "runTier3OnSuspicion" | "runTier3OnHighRisk";

export interface CascadeResult {
  tier1Findings: DetectionFinding[];
  tier2Findings: DetectionFinding[];
  tier3Alerts: Array<{ type: string; reason: string; severity: "L3" | "L4" }>;
  highestTierFired: 1 | 2 | 3;
  totalEntities: number;
  hasTier3Alert: boolean;
  elapsedMs: number;
}

export class CascadeCoordinator {
  public strategy: CascadeStrategy = "runTier3OnSuspicion";

  async execute(text: string): Promise<CascadeResult> {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();

    // Stage 1: Tier 1 Fast Path
    const t1 = tier1Detector.inspect(text);
    const tier1Findings = t1.findings;

    // Stage 2: Tier 2 NER
    const tier2Findings = await tier2Detector.inspect(text);

    // Stage 3: Tier 3 Semantic Probe based on cascade strategy
    const hasSuspicion =
      tier1Findings.length > 0 ||
      tier2Findings.length > 0 ||
      /ignore|system|admin|override|dump|exfiltrate|behalf/i.test(text);

    let tier3Findings: any[] = [];
    if (
      this.strategy === "alwaysRunTier3" ||
      (this.strategy === "runTier3OnSuspicion" && hasSuspicion) ||
      (this.strategy === "runTier3OnHighRisk" && tier1Findings.some((f) => f.severity === "L4"))
    ) {
      tier3Findings = await semanticProbe.inspect(text);
    }

    const hasTier3Alert = tier3Findings.length > 0;
    const highestTierFired: 1 | 2 | 3 =
      hasTier3Alert ? 3 : tier2Findings.length > 0 ? 2 : 1;

    const finished = typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      tier1Findings,
      tier2Findings,
      tier3Alerts: tier3Findings,
      highestTierFired,
      totalEntities: tier1Findings.length + tier2Findings.length,
      hasTier3Alert,
      elapsedMs: Number((finished - started).toFixed(2)),
    };
  }
}

export const cascadeCoordinator = new CascadeCoordinator();
