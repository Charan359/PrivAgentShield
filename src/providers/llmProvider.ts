/**
 * PRIVAGENTSHIELD LLM PROVIDER ADAPTER
 * OpenAI-compatible provider adapter supporting external LLM inference.
 * Operates in simulation/mock mode when no API key is configured.
 */

export interface LLMRequestOptions {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  simulated: boolean;
}

export class OpenAICompatibleProvider {
  private baseUrl: string;
  private apiKey?: string;
  private defaultModel: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: {
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
    timeoutMs?: number;
    maxRetries?: number;
  } = {}) {
    this.baseUrl = options.baseUrl ?? (typeof process !== "undefined" ? process.env?.LLM_BASE_URL ?? "https://api.openai.com/v1" : "https://api.openai.com/v1");
    this.apiKey = options.apiKey ?? (typeof process !== "undefined" ? process.env?.LLM_API_KEY : undefined);
    this.defaultModel = options.defaultModel ?? (typeof process !== "undefined" ? process.env?.LLM_MODEL ?? "gpt-4o-mini" : "gpt-4o-mini");
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      // Return deterministic simulated response when provider is not configured
      const lastMsg = options.messages[options.messages.length - 1]?.content ?? "";
      return {
        id: `sim-resp-${Date.now()}`,
        model: options.model ?? this.defaultModel,
        content: `[Simulated LLM Response]: Processed prompt of length ${lastMsg.length} characters without external network call.`,
        simulated: true,
        usage: { promptTokens: Math.ceil(lastMsg.length / 4), completionTokens: 20, totalTokens: Math.ceil(lastMsg.length / 4) + 20 },
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model ?? this.defaultModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM provider HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id ?? `resp-${Date.now()}`,
        model: data.model ?? this.defaultModel,
        content: data.choices?.[0]?.message?.content ?? "",
        usage: data.usage,
        simulated: false,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`LLM provider request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }
}

export const llmProvider = new OpenAICompatibleProvider();
