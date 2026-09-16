/**
 * PRIVAGENTSHIELD TOOL CALL & RESULT MEDIATION MODULE
 * Intercepts outbound agent tool calls and inbound tool execution results before consumption.
 */

import { runtimeProxy } from "@/proxy/runtimeProxy";
import { MessageNormalizer } from "@/normalizer/messageNormalizer";
import type { ProxyMediationResult } from "@/proxy/runtimeProxy";

export class ToolMediationInterceptor {
  /** Intercepts Agent → Tool invocation */
  async mediateToolCall(params: {
    callingAgentId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    sessionId?: string;
  }): Promise<ProxyMediationResult> {
    const rawEnvelope = {
      senderId: params.callingAgentId,
      recipientId: params.toolName,
      tool: params.toolName,
      arguments: params.arguments,
      sessionId: params.sessionId,
    };

    const normMessage = MessageNormalizer.normalize(rawEnvelope, params.sessionId);
    return runtimeProxy.mediate(normMessage);
  }

  /** Intercepts Tool → Agent response */
  async mediateToolResult(params: {
    toolName: string;
    receivingAgentId: string;
    result: unknown;
    sessionId?: string;
  }): Promise<ProxyMediationResult> {
    const rawEnvelope = {
      senderId: params.toolName,
      recipientId: params.receivingAgentId,
      toolResult: params.result,
      sessionId: params.sessionId,
    };

    const normMessage = MessageNormalizer.normalize(rawEnvelope, params.sessionId);
    return runtimeProxy.mediate(normMessage);
  }
}

export const toolMediator = new ToolMediationInterceptor();
