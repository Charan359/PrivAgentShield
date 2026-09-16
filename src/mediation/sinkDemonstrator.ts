/**
 * PRIVAGENTSHIELD MOCK EXTERNAL SINK DEMONSTRATOR
 * Provides a mock downstream external sink that physically records received payloads.
 * Used to verify that:
 *  - ALLOW delivers verbatim payload
 *  - SANITIZE delivers only pseudonymized surrogates
 *  - QUARANTINE prevents physical dispatch entirely
 */

export interface SinkReceipt {
  receiptId: string;
  sinkId: string;
  timestamp: string;
  senderAgentId: string;
  traceId: string;
  payloadReceived: string;
  byteSize: number;
}

class ExternalSinkDemonstrator {
  private receipts: SinkReceipt[] = [];

  /** Simulates receiving an external HTTP or webhook delivery */
  receive(params: {
    sinkId?: string;
    senderAgentId: string;
    traceId: string;
    payload: string;
  }): SinkReceipt {
    const receipt: SinkReceipt = {
      receiptId: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sinkId: params.sinkId ?? "external-api",
      timestamp: new Date().toISOString(),
      senderAgentId: params.senderAgentId,
      traceId: params.traceId,
      payloadReceived: params.payload,
      byteSize: new TextEncoder().encode(params.payload).length,
    };
    this.receipts.unshift(receipt);
    return receipt;
  }

  getReceipts(limit = 20): SinkReceipt[] {
    return this.receipts.slice(0, limit);
  }

  findReceiptByTraceId(traceId: string): SinkReceipt | undefined {
    return this.receipts.find((r) => r.traceId === traceId);
  }

  clear(): void {
    this.receipts = [];
  }
}

export const externalSink = new ExternalSinkDemonstrator();
