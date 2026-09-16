/**
 * PRIVAGENTSHIELD RUNTIME PROXY
 * HTTP mediation layer for inter-agent messages and OpenAI-compatible API requests.
 */

import { MessageNormalizer, type RuntimeMessage } from "@/normalizer/messageNormalizer";
import { runtimeMediationService } from "@/services/runtime/mediation";
import { externalSink } from "@/mediation/sinkDemonstrator";
import type { LriAction, RuntimeDecision } from "@/domain/types";

export interface ProxyMediationResult {
  message: RuntimeMessage;
  decision: RuntimeDecision;
  dispatchedPayload?: string;
  blocked: boolean;
  sinkReceived: boolean;
}

export class RuntimeProxy {
  /** Intercepts and normalizes raw payload into RuntimeMessage */
  normalizeMessage(raw: unknown, defaultSessionId?: string): RuntimeMessage {
    return MessageNormalizer.normalize(raw, defaultSessionId);
  }

  /** Core mediation pipeline execution */
  async mediate(message: RuntimeMessage): Promise<ProxyMediationResult> {
    // Execute runtime mediation pipeline
    const decision = runtimeMediationService.processMessage({
      sessionId: message.sessionId,
      senderId: message.senderAgentId,
      recipientId: message.recipientAgentId ?? "external-gateway-01",
      channel: message.channel as any,
      content: message.payload,
    });

    const isBlocked = decision.action === "QUARANTINE";
    let dispatchedPayload: string | undefined = undefined;
    let sinkReceived = false;

    if (decision.action === "ALLOW") {
      dispatchedPayload = message.payload;
    } else if (decision.action === "SANITIZE") {
      dispatchedPayload = decision.transformedPayload ?? message.payload;
    }

    // If destination is an external sink or outbound egress, physically record delivery
    if (!isBlocked && dispatchedPayload) {
      externalSink.receive({
        sinkId: message.destination ?? "external-api",
        senderAgentId: message.senderAgentId,
        traceId: message.traceId,
        payload: dispatchedPayload,
      });
      sinkReceived = true;
    }

    return {
      message,
      decision,
      dispatchedPayload,
      blocked: isBlocked,
      sinkReceived,
    };
  }

  /** Intercepts standard Web API Request */
  async interceptRequest(request: Request): Promise<Response> {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      let rawBody: unknown = "";

      if (contentType.includes("application/json")) {
        rawBody = await request.json();
      } else {
        rawBody = await request.text();
      }

      const normMessage = this.normalizeMessage(rawBody);
      const result = await this.mediate(normMessage);

      if (result.blocked) {
        return this.block(normMessage, result.decision.reason, result.decision.riskEvaluation.lriStar);
      }

      return this.forward(normMessage, result.dispatchedPayload ?? normMessage.payload, result.decision.action, result.decision.riskEvaluation.lriStar);
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Runtime proxy mediation error",
          message: err?.message ?? String(err),
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }

  /** Forward allowed or sanitized request */
  forward(
    message: RuntimeMessage,
    dispatchedPayload: string,
    action: LriAction,
    lriStar: number,
  ): Response {
    return new Response(
      JSON.stringify({
        status: "DISPATCHED",
        action,
        lriStar,
        traceId: message.traceId,
        senderId: message.senderAgentId,
        recipientId: message.recipientAgentId,
        payload: dispatchedPayload,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-privagentshield-trace-id": message.traceId,
          "x-privagentshield-action": action,
          "x-privagentshield-lri": lriStar.toFixed(4),
        },
      },
    );
  }

  /** Block quarantined request */
  block(message: RuntimeMessage, reason: string, lriStar: number): Response {
    return new Response(
      JSON.stringify({
        status: "QUARANTINED",
        action: "QUARANTINE",
        lriStar,
        traceId: message.traceId,
        reason,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
          "x-privagentshield-trace-id": message.traceId,
          "x-privagentshield-action": "QUARANTINE",
          "x-privagentshield-lri": lriStar.toFixed(4),
        },
      },
    );
  }
}

export const runtimeProxy = new RuntimeProxy();
