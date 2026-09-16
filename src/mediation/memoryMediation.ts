/**
 * PRIVAGENTSHIELD MEMORY MEDIATION ADAPTER
 * Intercepts writes to and reads from shared or persistent agent memory.
 * Prevents unauthorized persistence of credentials and personal identifiers.
 */

import { runtimeProxy, type ProxyMediationResult } from "@/proxy/runtimeProxy";
import { MessageNormalizer } from "@/normalizer/messageNormalizer";

export class MemoryMediationAdapter {
  private memoryStore: Map<string, string> = new Map();

  /** Intercepts Agent → Shared Memory Write */
  async mediateMemoryWrite(params: {
    agentId: string;
    memoryKey: string;
    value: string;
    sessionId?: string;
  }): Promise<{ status: "WRITTEN" | "SANITIZED" | "QUARANTINED"; mediation: ProxyMediationResult }> {
    const rawEnvelope = {
      senderId: params.agentId,
      recipientId: "shared-memory-store",
      channel: "memory_write",
      content: params.value,
      sessionId: params.sessionId,
      metadata: { memoryKey: params.memoryKey },
    };

    const norm = MessageNormalizer.normalize(rawEnvelope, params.sessionId);
    const mediation = await runtimeProxy.mediate(norm);

    if (mediation.blocked) {
      return { status: "QUARANTINED", mediation };
    }

    const payloadToWrite = mediation.dispatchedPayload ?? params.value;
    this.memoryStore.set(params.memoryKey, payloadToWrite);

    return {
      status: mediation.decision.action === "SANITIZE" ? "SANITIZED" : "WRITTEN",
      mediation,
    };
  }

  /** Intercepts Shared Memory Read → Agent */
  async mediateMemoryRead(params: {
    agentId: string;
    memoryKey: string;
    sessionId?: string;
  }): Promise<{ content?: string; mediation?: ProxyMediationResult }> {
    const rawValue = this.memoryStore.get(params.memoryKey);
    if (rawValue === undefined) return {};

    const rawEnvelope = {
      senderId: "shared-memory-store",
      recipientId: params.agentId,
      channel: "memory_read",
      content: rawValue,
      sessionId: params.sessionId,
    };

    const norm = MessageNormalizer.normalize(rawEnvelope, params.sessionId);
    const mediation = await runtimeProxy.mediate(norm);

    if (mediation.blocked) {
      return { mediation };
    }

    return {
      content: mediation.dispatchedPayload ?? rawValue,
      mediation,
    };
  }
}

export const memoryMediator = new MemoryMediationAdapter();
