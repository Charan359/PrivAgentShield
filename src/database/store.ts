/**
 * PRIVAGENTSHIELD RELATIONAL DATABASE STORE
 * In-Memory persistence engine initialized with synthetic domain state.
 */

import type {
  Agent,
  AuditEvent,
  ClearanceVector,
  Policy,
  PseudonymMapping,
  QuarantineEvent,
  TopologyEdge,
  TopologyNode,
} from "@/domain/types";
import { DEFAULT_NODES, DEFAULT_EDGES } from "@/data/topology";

const DEFAULT_CLEARANCE_HIGH: ClearanceVector = {
  personal: "L3",
  medical: "L3",
  financial: "L3",
  credentials: "L4",
  confidential: "L3",
};

const DEFAULT_CLEARANCE_MID: ClearanceVector = {
  personal: "L2",
  medical: "L1",
  financial: "L2",
  credentials: "L1",
  confidential: "L2",
};

const DEFAULT_CLEARANCE_LOW: ClearanceVector = {
  personal: "L1",
  medical: "L1",
  financial: "L1",
  credentials: "L1",
  confidential: "L1",
};

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "coordinator-01",
    name: "Coordinator-01",
    role: "intake / orchestrator",
    department: "Operations",
    clearance: DEFAULT_CLEARANCE_MID,
    trustLevel: 0.92,
    allowedCategories: ["personal", "confidential"],
    allowedDestinations: ["medical-agent-01", "finance-agent-01", "research-agent-01"],
    allowedTools: ["router", "task_allocator"],
    status: "active",
    isExternal: false,
    violationsCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "medical-agent-01",
    name: "Medical-Agent-01",
    role: "medical analyst",
    department: "Healthcare Services",
    clearance: {
      personal: "L3",
      medical: "L4",
      financial: "L1",
      credentials: "L1",
      confidential: "L2",
    },
    trustLevel: 0.95,
    allowedCategories: ["personal", "medical", "confidential"],
    allowedDestinations: ["tool-agent-01", "internal-db", "audit-log"],
    allowedTools: ["ehr_reader", "diagnostic_db"],
    status: "active",
    isExternal: false,
    violationsCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "finance-agent-01",
    name: "Finance-Agent-01",
    role: "billing & payments",
    department: "Finance",
    clearance: {
      personal: "L2",
      medical: "L1",
      financial: "L4",
      credentials: "L3",
      confidential: "L3",
    },
    trustLevel: 0.96,
    allowedCategories: ["financial", "credentials", "confidential"],
    allowedDestinations: ["tool-agent-01", "external-gateway-01", "internal-db"],
    allowedTools: ["payment_gateway", "iban_validator"],
    status: "active",
    isExternal: false,
    violationsCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "research-agent-01",
    name: "Research-Agent-01",
    role: "external research",
    department: "Analytics",
    clearance: {
      personal: "L3",
      medical: "L1",
      financial: "L1",
      credentials: "L1",
      confidential: "L1",
    },
    trustLevel: 0.45,
    allowedCategories: ["personal"],
    allowedDestinations: ["external-gateway-01", "tool-agent-01"],
    allowedTools: ["web_search", "arxiv_fetcher"],
    status: "active",
    isExternal: true,
    violationsCount: 5,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "tool-agent-01",
    name: "Tool-Agent-01",
    role: "tool execution worker",
    department: "Infrastructure",
    clearance: DEFAULT_CLEARANCE_MID,
    trustLevel: 0.88,
    allowedCategories: ["personal", "financial"],
    allowedDestinations: ["internal-db", "external-api"],
    allowedTools: ["db_connector", "http_client"],
    status: "active",
    isExternal: false,
    violationsCount: 2,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "external-gateway-01",
    name: "External-Gateway-01",
    role: "egress proxy",
    department: "Network Edge",
    clearance: DEFAULT_CLEARANCE_LOW,
    trustLevel: 0.30,
    allowedCategories: [],
    allowedDestinations: ["external-api"],
    allowedTools: ["egress_router"],
    status: "active",
    isExternal: true,
    violationsCount: 8,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "shared-memory-store",
    name: "Shared-Memory-Store",
    role: "internal memory persistence",
    department: "Infrastructure",
    clearance: {
      personal: "L3",
      medical: "L4",
      financial: "L4",
      credentials: "L1",
      confidential: "L3",
    },
    trustLevel: 0.99,
    allowedCategories: ["personal", "medical", "financial", "confidential"],
    allowedDestinations: ["coordinator-01", "medical-agent-01", "finance-agent-01", "research-agent-01", "tool-agent-01"],
    allowedTools: [],
    status: "active",
    isExternal: false,
    violationsCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

export const INITIAL_POLICIES: Policy[] = [
  {
    id: "pol-001",
    name: "No credentials to external tools or sinks",
    description: "Blocks any L4 credential flow directed to external agents or gateways.",
    priority: 10,
    enabled: true,
    categories: ["credentials"],
    rules: [
      {
        id: "rule-001",
        policyId: "pol-001",
        condition: "receiver.isExternal == true AND category == 'credentials'",
        effect: "quarantine",
        obligations: ["notify_security", "audit_high"],
      },
    ],
    matchesCount: 96,
    version: "v3.0",
    createdAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "pol-002",
    name: "Bank & card identifiers masked",
    description: "Enforces session-consistent sanitization on financial identifiers.",
    priority: 30,
    enabled: true,
    categories: ["financial"],
    rules: [
      {
        id: "rule-002",
        policyId: "pol-002",
        condition: "category == 'financial'",
        effect: "sanitize",
        obligations: ["mask_keep_last4"],
      },
    ],
    matchesCount: 195,
    version: "v4.0",
    createdAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "pol-003",
    name: "Health data restricted to HR / Medical clearance",
    description: "Requires L3 medical clearance for patient records.",
    priority: 20,
    enabled: true,
    categories: ["medical"],
    rules: [
      {
        id: "rule-003",
        policyId: "pol-003",
        condition: "category == 'medical' AND receiver.clearance.medical < 'L3'",
        effect: "quarantine",
        obligations: ["audit_high"],
      },
    ],
    matchesCount: 62,
    version: "v1.0",
    createdAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "pol-004",
    name: "Sanitize personal data in shared memory",
    description: "Requires session-consistent sanitization on personal identifiers before persisting to shared memory.",
    priority: 15,
    enabled: true,
    categories: ["personal"],
    rules: [
      {
        id: "rule-004",
        policyId: "pol-004",
        condition: "receiver.id == 'shared-memory-store' AND category == 'personal'",
        effect: "sanitize",
        obligations: ["pseudonymize_surrogates"],
      },
    ],
    matchesCount: 14,
    version: "v1.0",
    createdAt: "2026-09-01T00:00:00Z",
  },
];

class DatabaseStore {
  private agents: Map<string, Agent> = new Map();
  private policies: Map<string, Policy> = new Map();
  private topologyNodes: Map<string, TopologyNode> = new Map();
  private topologyEdges: Map<string, TopologyEdge> = new Map();
  private quarantineEvents: Map<string, QuarantineEvent> = new Map();
  private auditLogs: AuditEvent[] = [];
  private pseudonymMappings: PseudonymMapping[] = [];

  constructor() {
    INITIAL_AGENTS.forEach((a) => this.agents.set(a.id, { ...a }));
    INITIAL_POLICIES.forEach((p) => this.policies.set(p.id, { ...p }));
    DEFAULT_NODES.forEach((n) =>
      this.topologyNodes.set(n.id, {
        id: n.id,
        label: n.label,
        type: n.type as any,
        isAbsorbing: n.isAbsorbing,
        description: n.description,
        x: n.x,
        y: n.y,
      }),
    );
    DEFAULT_EDGES.forEach((e) =>
      this.topologyEdges.set(e.id, {
        id: e.id,
        from: e.from,
        to: e.to,
        probability: e.probability,
        label: e.label,
        channel: e.channel as any,
      }),
    );
  }

  // Agents CRUD
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentById(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  saveAgent(agent: Agent): Agent {
    const updated = { ...agent, updatedAt: new Date().toISOString() };
    this.agents.set(agent.id, updated);
    return updated;
  }

  deleteAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  // Policies CRUD
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  getPolicyById(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  savePolicy(policy: Policy): Policy {
    this.policies.set(policy.id, policy);
    return policy;
  }

  deletePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  // Topology CRUD
  getTopologyGraph() {
    return {
      nodes: Array.from(this.topologyNodes.values()),
      edges: Array.from(this.topologyEdges.values()),
    };
  }

  saveTopologyNode(node: TopologyNode) {
    this.topologyNodes.set(node.id, node);
  }

  deleteTopologyNode(id: string) {
    this.topologyNodes.delete(id);
    // remove connected edges
    for (const [edgeId, edge] of this.topologyEdges.entries()) {
      if (edge.from === id || edge.to === id) {
        this.topologyEdges.delete(edgeId);
      }
    }
  }

  saveTopologyEdge(edge: TopologyEdge) {
    this.topologyEdges.set(edge.id, edge);
  }

  deleteTopologyEdge(id: string) {
    this.topologyEdges.delete(id);
  }

  // Quarantine CRUD
  getQuarantineEvents(): QuarantineEvent[] {
    return Array.from(this.quarantineEvents.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  addQuarantineEvent(event: QuarantineEvent) {
    this.quarantineEvents.set(event.eventId, event);
  }

  updateQuarantineStatus(
    eventId: string,
    status: "APPROVED" | "REJECTED",
    reviewer: string,
    comment?: string,
  ): QuarantineEvent | undefined {
    const ev = this.quarantineEvents.get(eventId);
    if (!ev) return undefined;
    ev.status = status;
    ev.reviewedBy = reviewer;
    ev.reviewedAt = new Date().toISOString();
    ev.reviewComment = comment;
    this.quarantineEvents.set(eventId, ev);
    return ev;
  }

  // Audit Logs
  getAuditLogs(): AuditEvent[] {
    return [...this.auditLogs].sort((a, b) => b.seq - a.seq);
  }

  addAuditEvent(event: AuditEvent) {
    this.auditLogs.push(event);
  }

  // Pseudonym Mappings
  getPseudonymMappings(sessionId: string): PseudonymMapping[] {
    return this.pseudonymMappings.filter((m) => m.sessionId === sessionId);
  }

  savePseudonymMapping(mapping: PseudonymMapping) {
    this.pseudonymMappings.push(mapping);
  }
}

export const dbStore = new DatabaseStore();
