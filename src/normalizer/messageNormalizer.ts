/**
 * PRIVAGENTSHIELD MESSAGE NORMALIZER
 * Converts varied agent messages, tool calls, and LLM payloads into a unified RuntimeMessage.
 */

export interface RuntimeMessage {
  messageId: string;
  sessionId: string;
  traceId: string;
  senderAgentId: string;
  recipientAgentId?: string;
  channel: string;
  payload: string;
  destination?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  isToolCall?: boolean;
  toolName?: string;
  isToolResult?: boolean;
}

export class MessageNormalizer {
  static normalize(raw: unknown, defaultSessionId?: string): RuntimeMessage {
    const timestamp = new Date().toISOString();
    const traceId = `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sessionId = defaultSessionId ?? `sess-${Date.now()}`;
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 1. Plain String
    if (typeof raw === "string") {
      return {
        messageId,
        sessionId,
        traceId,
        senderAgentId: "agent-default",
        recipientAgentId: "agent-target",
        channel: "direct",
        payload: raw,
        metadata: { format: "plain_text" },
        timestamp,
      };
    }

    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, any>;

      // 2. OpenAI Chat Completions Request Format: { messages: [...] }
      if (Array.isArray(obj.messages) && obj.messages.length > 0) {
        const lastMsg = obj.messages[obj.messages.length - 1];
        const content = typeof lastMsg?.content === "string" ? lastMsg.content : JSON.stringify(lastMsg?.content ?? "");
        const sender = obj.senderId ?? (lastMsg.role === "user" ? "user-agent" : "assistant-agent");
        const recipient = obj.recipientId ?? "model-agent";

        return {
          messageId: obj.messageId ?? messageId,
          sessionId: obj.sessionId ?? sessionId,
          traceId: obj.traceId ?? traceId,
          senderAgentId: sender,
          recipientAgentId: recipient,
          channel: "chat_completion",
          payload: content,
          destination: obj.model ?? "gpt-4",
          metadata: { model: obj.model, role: lastMsg.role, totalMessages: obj.messages.length },
          timestamp,
        };
      }

      // 3. Tool Result Format: { toolResult: ... }
      if (obj.toolResult !== undefined || obj.toolOutput !== undefined) {
        const result = typeof obj.toolResult === "string" ? obj.toolResult : JSON.stringify(obj.toolResult ?? obj.toolOutput);
        return {
          messageId: obj.messageId ?? messageId,
          sessionId: obj.sessionId ?? sessionId,
          traceId: obj.traceId ?? traceId,
          senderAgentId: obj.toolName ?? "tool-executor",
          recipientAgentId: obj.recipientId ?? "agent-receiver",
          channel: "tool_result",
          payload: result,
          isToolResult: true,
          toolName: obj.toolName,
          metadata: { isToolResult: true, toolName: obj.toolName },
          timestamp,
        };
      }

      // 4. Tool Call Format: { tool: string, arguments: ... }
      if (obj.tool || obj.arguments !== undefined || (obj.toolName && obj.content === undefined)) {
        const toolName = obj.tool ?? obj.toolName ?? "tool";
        const args = typeof obj.arguments === "string" ? obj.arguments : JSON.stringify(obj.arguments ?? obj.args ?? {});
        return {
          messageId: obj.messageId ?? messageId,
          sessionId: obj.sessionId ?? sessionId,
          traceId: obj.traceId ?? traceId,
          senderAgentId: obj.senderId ?? "agent-caller",
          recipientAgentId: toolName,
          channel: "tool_call",
          payload: args,
          destination: toolName,
          isToolCall: true,
          toolName,
          metadata: { isToolCall: true, toolName },
          timestamp,
        };
      }

      // 5. Standard Structured Runtime Envelope: { senderId, recipientId, content/payload }
      return {
        messageId: obj.messageId ?? messageId,
        sessionId: obj.sessionId ?? sessionId,
        traceId: obj.traceId ?? traceId,
        senderAgentId: obj.senderId ?? obj.senderAgentId ?? "agent-source",
        recipientAgentId: obj.recipientId ?? obj.recipientAgentId ?? "agent-dest",
        channel: obj.channel ?? "direct",
        payload: String(obj.payload ?? obj.content ?? obj.text ?? ""),
        destination: obj.destination,
        metadata: obj.metadata ?? {},
        timestamp,
      };
    }

    return {
      messageId,
      sessionId,
      traceId,
      senderAgentId: "unknown",
      channel: "direct",
      payload: String(raw ?? ""),
      metadata: {},
      timestamp,
    };
  }
}
