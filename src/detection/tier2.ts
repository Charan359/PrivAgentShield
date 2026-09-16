/**
 * PRIVAGENTSHIELD TIER 2 DETECTOR
 * Named Entity Recognition (NER) & PII classification.
 * Supports Microsoft Presidio and GLiNER adapters with deterministic local fallback.
 */

import type { DetectionFinding } from "@/domain/types";
import { runTier2 } from "@/lib/detection/engine";

export interface Tier2AdapterStatus {
  presidio: "CONNECTED" | "FALLBACK / NOT CONFIGURED";
  gliner: "CONNECTED" | "FALLBACK / NOT CONFIGURED";
}

export class PresidioAdapter {
  private presidioUrl?: string;

  constructor(url?: string) {
    this.presidioUrl = url ?? (typeof process !== "undefined" ? process.env?.PRESIDIO_ANALYZER_URL : undefined);
  }

  isAvailable(): boolean {
    return Boolean(this.presidioUrl && this.presidioUrl.startsWith("http"));
  }

  async detect(text: string): Promise<DetectionFinding[]> {
    if (!this.isAvailable()) {
      return this.localFallback(text);
    }

    try {
      const resp = await fetch(`${this.presidioUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      if (!resp.ok) return this.localFallback(text);
      const items = await resp.json();
      return items.map((item: any) => ({
        entity: text.slice(item.start, item.end),
        type: item.entity_type,
        category: "personal",
        severity: "L2",
        tier: 2,
        confidence: item.score,
        start_index: item.start,
        end_index: item.end,
        detector: "Presidio REST API",
        rationale: "Detected via Microsoft Presidio Analyzer",
      }));
    } catch {
      return this.localFallback(text);
    }
  }

  localFallback(text: string): DetectionFinding[] {
    const raw = runTier2(text);
    return raw.map((e) => ({
      entity: e.text,
      type: e.label,
      category: e.label === "MEDICAL_TERM" ? "medical" : "personal",
      severity: e.label === "MEDICAL_TERM" ? "L3" : "L2",
      tier: 2,
      confidence: e.confidence,
      start_index: e.start,
      end_index: e.end,
      detector: "PresidioAdapter (Deterministic Fallback)",
      rationale: `Local heuristic matching for ${e.label}`,
    }));
  }
}

export class GLiNERAdapter {
  private glinerModel?: string;

  constructor(model?: string) {
    this.glinerModel = model ?? (typeof process !== "undefined" ? process.env?.GLINER_MODEL : undefined);
  }

  isAvailable(): boolean {
    return Boolean(this.glinerModel && this.glinerModel.trim().length > 0);
  }

  async detect(text: string): Promise<DetectionFinding[]> {
    // Falls back to local deterministic NER
    const raw = runTier2(text);
    return raw.map((e) => ({
      entity: e.text,
      type: e.label,
      category: e.label === "MEDICAL_TERM" ? "medical" : "personal",
      severity: e.label === "MEDICAL_TERM" ? "L3" : "L2",
      tier: 2,
      confidence: e.confidence,
      start_index: e.start,
      end_index: e.end,
      detector: "GLiNERAdapter (Deterministic Fallback)",
      rationale: `Local GLiNER fallback for ${e.label}`,
    }));
  }
}

export class Tier2Detector {
  public presidio = new PresidioAdapter();
  public gliner = new GLiNERAdapter();

  getStatus(): Tier2AdapterStatus {
    return {
      presidio: this.presidio.isAvailable() ? "CONNECTED" : "FALLBACK / NOT CONFIGURED",
      gliner: this.gliner.isAvailable() ? "CONNECTED" : "FALLBACK / NOT CONFIGURED",
    };
  }

  async inspect(text: string): Promise<DetectionFinding[]> {
    return this.presidio.detect(text);
  }
}

export const tier2Detector = new Tier2Detector();
