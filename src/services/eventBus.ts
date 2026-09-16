/**
 * PRIVAGENTSHIELD LIVE EVENT BUS
 * Reactive pub/sub event emitter for runtime security pipeline updates.
 */

export type EventType =
  | "MESSAGE_RECEIVED"
  | "TIER1_DETECTION"
  | "TIER2_DETECTION"
  | "TIER3_DETECTION"
  | "TAINT_CALCULATED"
  | "CLEARANCE_CHECK"
  | "TOPOLOGY_ANALYSIS"
  | "LRI_CALCULATED"
  | "DECISION_MADE"
  | "MESSAGE_ALLOWED"
  | "MESSAGE_SANITIZED"
  | "MESSAGE_QUARANTINED"
  | "DISPATCH_COMPLETED"
  | "AUDIT_CREATED";

export type SecurityEvent = {
  id: string;
  type: EventType;
  timestamp: string;
  sessionId: string;
  details: Record<string, unknown>;
};

type Listener = (event: SecurityEvent) => void;

class SecurityEventBus {
  private listeners: Set<Listener> = new Set();
  private recentEvents: SecurityEvent[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(type: EventType, sessionId: string, details: Record<string, unknown>): SecurityEvent {
    const event: SecurityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      sessionId,
      details,
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 100) this.recentEvents.pop();

    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error("Error in event listener:", err);
      }
    });

    return event;
  }

  getRecentEvents(limit = 20): SecurityEvent[] {
    return this.recentEvents.slice(0, limit);
  }
}

export const securityEventBus = new SecurityEventBus();
