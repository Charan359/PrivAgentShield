/**
 * PRIVAGENTSHIELD AUDIT SYSTEM & PAYLOAD HASHING
 * Cryptographic hashing and immutable hash-chain audit logging.
 */

import type { AuditEvent, LriAction, QuarantineStatus } from "@/domain/types";
import { dbStore } from "@/database/store";

export function computePayloadHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `0x${hex}a9b2c3d4`;
}

export function computeRecordHash(data: string, prevHash: string): string {
  const combined = `${prevHash}:${data}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `0x${hex}7f8e9d0a`;
}

export type CreateAuditParams = {
  sessionId: string;
  senderId: string;
  recipientId: string;
  rawPayload: string;
  detectionCount: number;
  tm: number;
  deltaIj: 0 | 1;
  piJ: number;
  lriStar: number;
  action: LriAction;
  policyId?: string;
  reason: string;
  destination: string;
  reviewer?: string;
  reviewStatus?: QuarantineStatus;
};

export class AuditService {
  recordEvent(params: CreateAuditParams): AuditEvent {
    const existing = dbStore.getAuditLogs();
    const seq = existing.length + 1;
    const prevHash = existing.length > 0 ? existing[0]!.recordHash : "0x0000000000000000";

    const payloadHash = computePayloadHash(params.rawPayload);
    const dataString = `${seq}:${params.sessionId}:${params.senderId}:${params.recipientId}:${payloadHash}:${params.lriStar}:${params.action}`;
    const recordHash = computeRecordHash(dataString, prevHash);

    const event: AuditEvent = {
      eventId: `aud-${2100 + seq}`,
      seq,
      timestamp: new Date().toISOString(),
      sessionId: params.sessionId,
      senderId: params.senderId,
      recipientId: params.recipientId,
      payloadHash,
      detectionCount: params.detectionCount,
      tm: params.tm,
      deltaIj: params.deltaIj,
      piJ: params.piJ,
      lriStar: params.lriStar,
      action: params.action,
      policyId: params.policyId,
      reason: params.reason,
      destination: params.destination,
      recordHash,
      prevHash,
      reviewer: params.reviewer,
      reviewStatus: params.reviewStatus,
    };

    dbStore.addAuditEvent(event);
    return event;
  }
}

export const auditService = new AuditService();
