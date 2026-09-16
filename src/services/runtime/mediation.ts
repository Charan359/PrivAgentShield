/**
 * PRIVAGENTSHIELD RUNTIME MEDIATION SERVICE (RUNTIME PROXY)
 * Active, inline, topology-aware runtime mediation layer for multi-agent LLM systems.
 */

import type {
  ChannelType,
  LriAction,
  RiskEvaluation,
  RuntimeDecision,
} from "@/domain/types";
import { fullInspection } from "@/lib/detection/engine";
import { calculateTm, entityClearanceCategory, entitySeverityLevel } from "@/lib/lri/taint";
import { checkClearance, getAgentClearance, requiredCategoriesFromEntities } from "@/lib/lri/clearance";
import { buildTopologyResult } from "@/lib/lri/topology";
import { lriDecision } from "@/lib/lri/engine";
import { DEFAULT_THRESHOLDS } from "@/lib/lri/types";
import { abacEngine } from "@/lib/abac/engine";
import { pseudonymizeText } from "@/lib/pseudonymization";
import { addToQuarantine } from "@/lib/quarantine";
import { auditService } from "@/lib/audit";
import { securityEventBus } from "@/services/eventBus";
import { telemetryService } from "@/services/telemetry";
import { dbStore } from "@/database/store";
import type { EntityType } from "@/lib/detection/types";

export type ProcessMessageInput = {
  sessionId?: string;
  senderId: string;
  recipientId: string;
  channel?: ChannelType;
  content: string;
};

export class RuntimeMediationService {
  processMessage(input: ProcessMessageInput): RuntimeDecision {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const sessionId = input.sessionId ?? `session-${Date.now()}`;
    const channel = input.channel ?? "direct";

    securityEventBus.emit("MESSAGE_RECEIVED", sessionId, {
      senderId: input.senderId,
      recipientId: input.recipientId,
      channel,
    });

    // 1. Cascaded 3-Tier Inspection Pipeline
    const insp = fullInspection(input.content);

    if (insp.tier1.entities.length > 0) {
      securityEventBus.emit("TIER1_DETECTION", sessionId, { count: insp.tier1.entities.length });
    }
    if (insp.tier2.length > 0) {
      securityEventBus.emit("TIER2_DETECTION", sessionId, { count: insp.tier2.length });
    }
    if (insp.tier3.length > 0) {
      securityEventBus.emit("TIER3_DETECTION", sessionId, { findings: insp.tier3 });
    }

    // 2. Taint Engine (T*m)
    const detectedEntitiesForTm = insp.tier1.entities.map((e) => ({
      type: e.type as EntityType,
      entropy: e.entropyValue,
    }));
    const tmResult = calculateTm(detectedEntitiesForTm);
    securityEventBus.emit("TAINT_CALCULATED", sessionId, { tm: tmResult.tm });

    // 3. IFC Engine (Δ*ij)
    const sender = dbStore.getAgentById(input.senderId);
    const recipient = dbStore.getAgentById(input.recipientId);

    const senderClearance = sender?.clearance ?? getAgentClearance(input.senderId);
    const recipientClearance = recipient?.clearance ?? getAgentClearance(input.recipientId);

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
    securityEventBus.emit("CLEARANCE_CHECK", sessionId, { deltaIj: clearanceResult.deltaIj });

    // 4. ABAC Policy Engine Evaluation
    const categoriesInPayload = clearanceResult.checkedCategories;
    const abacResult = abacEngine.evaluate(
      {
        agentId: input.senderId,
        role: sender?.role ?? "agent",
        department: sender?.department ?? "Operations",
        clearance: senderClearance,
        allowedCategories: sender?.allowedCategories ?? [],
        allowedDestinations: sender?.allowedDestinations ?? [],
        allowedTools: sender?.allowedTools ?? [],
        trustLevel: sender?.trustLevel ?? 0.8,
        session: sessionId,
        environment: "simulation",
      },
      {
        agentId: input.recipientId,
        role: recipient?.role ?? "agent",
        department: recipient?.department ?? "Operations",
        clearance: recipientClearance,
        allowedCategories: recipient?.allowedCategories ?? [],
        allowedDestinations: recipient?.allowedDestinations ?? [],
        allowedTools: recipient?.allowedTools ?? [],
        trustLevel: recipient?.trustLevel ?? 0.8,
        session: sessionId,
        environment: "simulation",
      },
      categoriesInPayload,
    );

    // 5. Topology Engine & Markov Reachability (Π*j)
    const topologyGraph = dbStore.getTopologyGraph();
    const topologyResult = buildTopologyResult(topologyGraph);
    const piJ = topologyResult.piJ[input.recipientId] ?? 0.25;
    securityEventBus.emit("TOPOLOGY_ANALYSIS", sessionId, { piJ });

    // 6. LRI* Minimax Risk Engine Calculation
    const tmPiProduct = Number((tmResult.tm * piJ).toFixed(4));
    const rawLri = Math.max(clearanceResult.deltaIj, tmPiProduct);
    const lriStar = insp.hasTier3Alert ? Math.max(rawLri, DEFAULT_THRESHOLDS.tauHigh) : rawLri;
    const lriStarRounded = Number(Math.min(1.0, lriStar).toFixed(4));

    let action: LriAction = lriDecision(lriStarRounded, DEFAULT_THRESHOLDS);
    // ABAC can force quarantine or sanitize. Sanitize should take precedence even if LRI* suggests QUARANTINE.
    if (abacResult.effect === "quarantine") {
      action = "QUARANTINE";
    } else if (abacResult.effect === "sanitize") {
      action = "SANITIZE";
    }

    const contributingFactors: string[] = [];
    if (clearanceResult.deltaIj === 1) contributingFactors.push("Recipient clearance dominance violation (Δij=1)");
    if (tmResult.tm > 0.5) contributingFactors.push(`High message taint score (Tm=${tmResult.tm.toFixed(2)})`);
    if (piJ > 0.5) contributingFactors.push(`High downstream external sink reachability (Πj=${piJ.toFixed(2)})`);
    if (insp.hasTier3Alert) contributingFactors.push("Tier 3 semantic security escalation (Prompt Injection / Confused Deputy)");
    if (abacResult.matchedPolicies.length > 0) contributingFactors.push(`ABAC policy match: ${abacResult.reasons.join(", ")}`);

    const formulaString = `LRI*(${input.senderId}, ${input.recipientId}, m) = max(${clearanceResult.deltaIj.toFixed(
      2,
    )}, ${tmResult.tm.toFixed(2)} × ${piJ.toFixed(2)}) = ${lriStarRounded.toFixed(2)}`;

    const riskEval: RiskEvaluation = {
      senderId: input.senderId,
      recipientId: input.recipientId,
      tm: tmResult.tm,
      deltaIj: clearanceResult.deltaIj,
      piJ,
      lriStar: lriStarRounded,
      action,
      thresholds: DEFAULT_THRESHOLDS,
      formulaString,
      contributingFactors,
    };

    securityEventBus.emit("LRI_CALCULATED", sessionId, { lriStar: lriStarRounded, action });

    // 7. Decision Enforcement Gates
    let transformedPayload: string | undefined = undefined;
    let reason = "";

    if (action === "ALLOW") {
      transformedPayload = input.content;
      reason = "Payload allowed. LRI* risk below low threshold τlow (0.30).";
      securityEventBus.emit("MESSAGE_ALLOWED", sessionId, { senderId: input.senderId });
    } else if (action === "SANITIZE") {
      const spans = insp.tier1.entities.map((e) => ({
        value: e.value,
        type: e.type,
        start_index: e.start_index,
        end_index: e.end_index,
      }));
      const { pseudonymized } = pseudonymizeText(input.content, spans, sessionId);
      transformedPayload = pseudonymized;
      reason = `Payload sanitized using session-consistent surrogates. LRI* (${lriStarRounded.toFixed(2)}) between τlow and τhigh.`;
      securityEventBus.emit("MESSAGE_SANITIZED", sessionId, { senderId: input.senderId });
    } else if (action === "QUARANTINE") {
      reason = contributingFactors.length > 0 ? contributingFactors.join("; ") : `LRI* (${lriStarRounded.toFixed(2)}) exceeded τhigh (0.70).`;
      
      addToQuarantine({
        sessionId,
        senderId: input.senderId,
        senderName: sender?.name ?? input.senderId,
        recipientId: input.recipientId,
        recipientName: recipient?.name ?? input.recipientId,
        payloadPreview: input.content.slice(0, 100),
        detectedEntities: insp.tier1.entities.map((e) => e.type),
        destination: recipient?.allowedDestinations[0] ?? "external-api",
        policyId: abacResult.matchedPolicies[0] ?? "pol-001",
        reason,
        tm: tmResult.tm,
        deltaIj: clearanceResult.deltaIj,
        piJ,
        lriStar: lriStarRounded,
        tiersActivated: [insp.highestTierFired],
      });

      securityEventBus.emit("MESSAGE_QUARANTINED", sessionId, { reason });
    }

    const finished = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedMs = Number((finished - started).toFixed(2));

    // 8. Audit Event Logging
    const auditEvent = auditService.recordEvent({
      sessionId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      rawPayload: input.content,
      detectionCount: insp.totalEntities,
      tm: tmResult.tm,
      deltaIj: clearanceResult.deltaIj,
      piJ,
      lriStar: lriStarRounded,
      action,
      policyId: abacResult.matchedPolicies[0],
      reason,
      destination: input.recipientId,
    });
    securityEventBus.emit("AUDIT_CREATED", sessionId, { eventId: auditEvent.eventId });

    // 9. Telemetry Recording
    telemetryService.recordInspection({
      sensitiveDetected: insp.totalEntities > 0,
      action,
      tier1Hit: insp.tier1.entities.length > 0,
      tier2Hit: insp.tier2.length > 0,
      tier3Hit: insp.tier3.length > 0,
      tier1Ms: Number((elapsedMs * 0.3).toFixed(1)),
      tier2Ms: Number((elapsedMs * 0.4).toFixed(1)),
      tier3Ms: Number((elapsedMs * 0.3).toFixed(1)),
      totalMs: elapsedMs,
      maxPiJ: piJ,
    });

    const decision: RuntimeDecision = {
      id: `dec-${Date.now().toString().slice(-4)}`,
      sessionId,
      messageId: `msg-${Date.now().toString().slice(-4)}`,
      senderId: input.senderId,
      recipientId: input.recipientId,
      channel,
      rawPayload: input.content,
      transformedPayload,
      findings: insp.tier1.entities.map((e) => ({
        entity: e.value,
        type: e.type,
        category: entityClearanceCategory(e.type as EntityType),
        severity: entitySeverityLevel(e.type as EntityType),
        tier: 1,
        confidence: e.confidence,
        start_index: e.start_index,
        end_index: e.end_index,
        entropyValue: e.entropyValue,
        entropyModifier: e.entropyModifier,
        detector: e.detector,
        rationale: e.rationale,
      })),
      riskEvaluation: riskEval,
      action,
      policyId: abacResult.matchedPolicies[0],
      reason,
      latencyMs: elapsedMs,
      timestamp: new Date().toISOString(),
    };

    securityEventBus.emit("DISPATCH_COMPLETED", sessionId, { action });
    return decision;
  }
}

export const runtimeMediationService = new RuntimeMediationService();
