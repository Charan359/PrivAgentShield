/**
 * PRIVAGENTSHIELD TELEMETRY SERVICE
 * Tracks simulation inspection metrics, decision distributions, and latencies.
 * Clearly labeled as SIMULATION TELEMETRY (not benchmark measurements).
 */

import type { TelemetryMetric } from "@/domain/types";

class TelemetryService {
  private metrics: TelemetryMetric = {
    timestamp: new Date().toISOString(),
    messagesInspected: 4820,
    sensitiveMessagesDetected: 1163,
    allowCount: 3929,
    sanitizeCount: 723,
    quarantineCount: 168,
    highRiskCount: 3,
    externalSinkExposure: 0.85,
    tier1Count: 824,
    tier2Count: 482,
    tier3Count: 155,
    tier1LatencyMs: 2.4,
    tier2LatencyMs: 5.1,
    tier3LatencyMs: 4.1,
    totalInspectionLatencyMs: 11.6,
  };

  getMetrics(): TelemetryMetric {
    return { ...this.metrics, timestamp: new Date().toISOString() };
  }

  recordInspection(params: {
    sensitiveDetected: boolean;
    action: "ALLOW" | "SANITIZE" | "QUARANTINE";
    tier1Hit: boolean;
    tier2Hit: boolean;
    tier3Hit: boolean;
    tier1Ms: number;
    tier2Ms: number;
    tier3Ms: number;
    totalMs: number;
    maxPiJ: number;
  }) {
    this.metrics.messagesInspected++;
    if (params.sensitiveDetected) this.metrics.sensitiveMessagesDetected++;

    if (params.action === "ALLOW") this.metrics.allowCount++;
    if (params.action === "SANITIZE") this.metrics.sanitizeCount++;
    if (params.action === "QUARANTINE") this.metrics.quarantineCount++;

    if (params.tier1Hit) this.metrics.tier1Count++;
    if (params.tier2Hit) this.metrics.tier2Count++;
    if (params.tier3Hit) this.metrics.tier3Count++;

    this.metrics.tier1LatencyMs = Number(
      ((this.metrics.tier1LatencyMs * 0.9) + (params.tier1Ms * 0.1)).toFixed(2),
    );
    this.metrics.tier2LatencyMs = Number(
      ((this.metrics.tier2LatencyMs * 0.9) + (params.tier2Ms * 0.1)).toFixed(2),
    );
    this.metrics.tier3LatencyMs = Number(
      ((this.metrics.tier3LatencyMs * 0.9) + (params.tier3Ms * 0.1)).toFixed(2),
    );
    this.metrics.totalInspectionLatencyMs = Number(
      ((this.metrics.totalInspectionLatencyMs * 0.9) + (params.totalMs * 0.1)).toFixed(2),
    );
    this.metrics.externalSinkExposure = params.maxPiJ;
  }
}

export const telemetryService = new TelemetryService();
