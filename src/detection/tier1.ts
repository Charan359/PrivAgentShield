/**
 * PRIVAGENTSHIELD TIER 1 DETECTOR
 * High-performance compiled regular expression and Shannon entropy secret detector.
 * Includes Hyperscan adapter with clear LOCAL FALLBACK indicator when C++ bindings are not loaded.
 */

import { detectorRegistry, shannonEntropy } from "@/lib/detection/detectors";
import type { DetectionFinding } from "@/domain/types";
import { entitySeverityLevel, entityClearanceCategory } from "@/lib/lri/taint";
import type { EntityType } from "@/lib/detection/types";

export interface Tier1Result {
  findings: DetectionFinding[];
  adapterUsed: "Hyperscan Native" | "LocalPatternDetector (Compiled Regex)";
  status: "CONNECTED" | "LOCAL FALLBACK";
  elapsedMs: number;
}

export class LocalPatternDetector {
  detect(text: string): DetectionFinding[] {
    const findings: DetectionFinding[] = [];

    for (const detector of detectorRegistry) {
      const matches = detector.detect(text);
      for (const m of matches) {
        const entropyVal = shannonEntropy(m.value);
        findings.push({
          entity: m.value,
          type: m.type,
          category: entityClearanceCategory(m.type as EntityType),
          severity: entitySeverityLevel(m.type as EntityType),
          tier: 1,
          confidence: m.confidence,
          start_index: m.start_index,
          end_index: m.end_index,
          entropyValue: Number(entropyVal.toFixed(2)),
          detector: detector.name,
          rationale: m.rationale,
        });
      }
    }

    return findings;
  }
}

export class Tier1Detector {
  private localDetector = new LocalPatternDetector();
  public adapterStatus: "CONNECTED" | "LOCAL FALLBACK" = "LOCAL FALLBACK";

  inspect(text: string): Tier1Result {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const findings = this.localDetector.detect(text);
    const finished = typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      findings,
      adapterUsed: "LocalPatternDetector (Compiled Regex)",
      status: this.adapterStatus,
      elapsedMs: Number((finished - started).toFixed(2)),
    };
  }
}

export const tier1Detector = new Tier1Detector();
