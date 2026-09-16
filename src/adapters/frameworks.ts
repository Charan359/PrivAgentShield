/**
 * PRIVAGENTSHIELD AGENT FRAMEWORK ADAPTERS
 * Provides integrations for LangGraph, CrewAI, and MetaGPT agent execution frameworks.
 */

import { runtimeProxy, type ProxyMediationResult } from "@/proxy/runtimeProxy";
import { MessageNormalizer } from "@/normalizer/messageNormalizer";

export interface AgentRuntimeAdapter {
  frameworkName: string;
  status: "ADAPTER READY" | "FULL INTEGRATION";
  interceptMessage(event: unknown): Promise<ProxyMediationResult>;
}

export class LangGraphAdapter implements AgentRuntimeAdapter {
  frameworkName = "LangGraph";
  status: "ADAPTER READY" = "ADAPTER READY";

  /** Intercepts state transitions, messages, and node handoffs in LangGraph state graphs */
  async interceptMessage(event: {
    currentNode: string;
    nextNode: string;
    messages: Array<{ role: string; content: string }>;
    state?: Record<string, unknown>;
  }): Promise<ProxyMediationResult> {
    const lastMsg = event.messages[event.messages.length - 1];
    const raw = {
      senderId: event.currentNode,
      recipientId: event.nextNode,
      channel: "direct",
      content: lastMsg?.content ?? "",
      metadata: { framework: "LangGraph", stateKeys: Object.keys(event.state ?? {}) },
    };

    const norm = MessageNormalizer.normalize(raw);
    return runtimeProxy.mediate(norm);
  }
}

export class CrewAIAdapter implements AgentRuntimeAdapter {
  frameworkName = "CrewAI";
  status: "ADAPTER READY" = "ADAPTER READY";

  /** Intercepts hierarchical task delegator communications between CrewAI agents */
  async interceptMessage(event: {
    senderRole: string;
    targetRole: string;
    taskDescription: string;
    context?: string;
  }): Promise<ProxyMediationResult> {
    const raw = {
      senderId: event.senderRole,
      recipientId: event.targetRole,
      channel: "direct",
      content: `${event.taskDescription}\n${event.context ?? ""}`,
      metadata: { framework: "CrewAI" },
    };

    const norm = MessageNormalizer.normalize(raw);
    return runtimeProxy.mediate(norm);
  }
}

export class MetaGPTAdapter implements AgentRuntimeAdapter {
  frameworkName = "MetaGPT";
  status: "ADAPTER READY" = "ADAPTER READY";

  /** Intercepts standard operating procedure (SOP) broadcast messages in MetaGPT */
  async interceptMessage(event: {
    author: string;
    receivers: string[];
    content: string;
  }): Promise<ProxyMediationResult> {
    const raw = {
      senderId: event.author,
      recipientId: event.receivers[0] ?? "broadcast-all",
      channel: "broadcast",
      content: event.content,
      metadata: { framework: "MetaGPT", receivers: event.receivers },
    };

    const norm = MessageNormalizer.normalize(raw);
    return runtimeProxy.mediate(norm);
  }
}

export const langGraphAdapter = new LangGraphAdapter();
export const crewAIAdapter = new CrewAIAdapter();
export const metaGPTAdapter = new MetaGPTAdapter();
