/**
 * PRIVAGENTSHIELD RUNTIME API LAYER
 * Exposes functional backend API endpoints corresponding to the runtime security pipeline.
 */

import { runtimeMediationService } from "@/services/runtime/mediation";
import { fullInspection } from "@/lib/detection/engine";
import { calculateLriStar } from "@/lib/lri/engine";
import { securityEventBus } from "@/services/eventBus";
import { telemetryService } from "@/services/telemetry";
import { dbStore } from "@/database/store";

export const RuntimeApi = {
  /** POST /api/runtime/message */
  async processMessage(input: {
    senderId: string;
    recipientId: string;
    content: string;
    sessionId?: string;
    channel?: any;
  }) {
    return runtimeMediationService.processMessage(input);
  },

  /** POST /api/runtime/inspect */
  async inspectPayload(content: string) {
    return fullInspection(content);
  },

  /** POST /api/runtime/evaluate */
  async evaluateRisk(input: {
    senderId: string;
    recipientId: string;
    detectedEntities: Array<{ type: any; entropy?: number }>;
    tier3Alert?: boolean;
  }) {
    return calculateLriStar(input);
  },

  /** POST /api/runtime/dispatch */
  async dispatchMessage(input: {
    senderId: string;
    recipientId: string;
    content: string;
  }) {
    return runtimeMediationService.processMessage(input);
  },

  /** GET /api/runtime/events */
  async getRecentEvents(limit = 20) {
    return securityEventBus.getRecentEvents(limit);
  },

  /** GET /api/runtime/agents */
  async getAgents() {
    return dbStore.getAllAgents();
  },

  /** GET /api/runtime/topology */
  async getTopology() {
    return dbStore.getTopologyGraph();
  },

  /** GET /api/runtime/policies */
  async getPolicies() {
    return dbStore.getAllPolicies();
  },

  /** GET /api/runtime/metrics */
  async getMetrics() {
    return telemetryService.getMetrics();
  },
};
