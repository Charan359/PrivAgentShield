/**
 * SIMULATED / DEMO TOPOLOGY DATA
 *
 * Defines the default agent topology graph used by the Π*j Markov absorption
 * engine. Every edge carries a transition probability. The topology engine
 * constructs Q and R from this graph, computes the fundamental matrix N=(I-Q)^-1,
 * and derives absorption probabilities B=NR → Π*j = max_s B[j,s].
 *
 * Users can edit this topology via the Topology Editor page.
 */

export type NodeType = "agent" | "internal_sink" | "external_sink";

export type TopoNode = {
  id: string;
  label: string;
  type: NodeType;
  isAbsorbing: boolean;
  description: string;
  x: number; // layout hint for SVG rendering
  y: number;
};

export type TopoEdge = {
  id: string;
  from: string;
  to: string;
  /** Transition probability 0..1 */
  probability: number;
  label: string;
  channel: "direct" | "tool_call" | "memory_write" | "broadcast" | "egress";
};

export type SecurityState = "allow" | "sanitize" | "quarantine" | "idle";

// ─────────────────────────────────────────────────────────────────────────────
// Default nodes
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_NODES: TopoNode[] = [
  {
    id: "coordinator-01",
    label: "Coordinator-01",
    type: "agent",
    isAbsorbing: false,
    description: "Orchestrator agent: delegates tasks to specialist agents.",
    x: 400,
    y: 60,
  },
  {
    id: "medical-agent-01",
    label: "Medical-Agent-01",
    type: "agent",
    isAbsorbing: false,
    description: "Medical analyst: processes health and diagnostic data.",
    x: 160,
    y: 200,
  },
  {
    id: "finance-agent-01",
    label: "Finance-Agent-01",
    type: "agent",
    isAbsorbing: false,
    description: "Financial analyst: handles billing, payments, IBAN/card data.",
    x: 400,
    y: 200,
  },
  {
    id: "research-agent-01",
    label: "Research-Agent-01",
    type: "agent",
    isAbsorbing: false,
    description: "Research agent: queries knowledge bases and internal tools.",
    x: 640,
    y: 200,
  },
  {
    id: "tool-agent-01",
    label: "Tool-Agent-01",
    type: "agent",
    isAbsorbing: false,
    description: "Tool execution agent: calls external APIs and databases.",
    x: 280,
    y: 340,
  },
  {
    id: "external-gateway-01",
    label: "External-Gateway-01",
    type: "agent",
    isAbsorbing: false,
    description: "External gateway: routes messages to outside services.",
    x: 520,
    y: 340,
  },
  // ── Sinks ──────────────────────────────────────────────────────────────────
  {
    id: "internal-db",
    label: "Internal DB",
    type: "internal_sink",
    isAbsorbing: true,
    description: "Internal database: low external exposure risk.",
    x: 160,
    y: 460,
  },
  {
    id: "audit-log",
    label: "Audit Log",
    type: "internal_sink",
    isAbsorbing: true,
    description: "Immutable audit log: append-only, internal access only.",
    x: 400,
    y: 460,
  },
  {
    id: "external-api",
    label: "External API",
    type: "external_sink",
    isAbsorbing: true,
    description: "External API sink: HIGH exposure. Data may leave the trust boundary.",
    x: 640,
    y: 460,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default edges with transition probabilities
// Probabilities are row-normalized by the topology engine.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_EDGES: TopoEdge[] = [
  // Coordinator → specialists
  { id: "e1", from: "coordinator-01", to: "medical-agent-01",  probability: 0.25, label: "delegate:medical",   channel: "direct" },
  { id: "e2", from: "coordinator-01", to: "finance-agent-01",  probability: 0.30, label: "delegate:finance",   channel: "direct" },
  { id: "e3", from: "coordinator-01", to: "research-agent-01", probability: 0.25, label: "delegate:research",  channel: "direct" },
  { id: "e4", from: "coordinator-01", to: "audit-log",         probability: 0.20, label: "audit",             channel: "memory_write" },

  // Medical agent paths
  { id: "e5",  from: "medical-agent-01", to: "tool-agent-01",  probability: 0.40, label: "tool:db_query",     channel: "tool_call" },
  { id: "e6",  from: "medical-agent-01", to: "internal-db",    probability: 0.50, label: "persist:record",    channel: "memory_write" },
  { id: "e7",  from: "medical-agent-01", to: "audit-log",      probability: 0.10, label: "audit",             channel: "memory_write" },

  // Finance agent paths
  { id: "e8",  from: "finance-agent-01", to: "tool-agent-01",     probability: 0.35, label: "tool:payment",   channel: "tool_call" },
  { id: "e9",  from: "finance-agent-01", to: "external-gateway-01", probability: 0.25, label: "egress:bank",  channel: "egress" },
  { id: "e10", from: "finance-agent-01", to: "internal-db",       probability: 0.30, label: "persist:txn",    channel: "memory_write" },
  { id: "e11", from: "finance-agent-01", to: "audit-log",         probability: 0.10, label: "audit",          channel: "memory_write" },

  // Research agent paths
  { id: "e12", from: "research-agent-01", to: "external-gateway-01", probability: 0.55, label: "query:web",   channel: "egress" },
  { id: "e13", from: "research-agent-01", to: "tool-agent-01",       probability: 0.30, label: "tool:search", channel: "tool_call" },
  { id: "e14", from: "research-agent-01", to: "audit-log",           probability: 0.15, label: "audit",       channel: "memory_write" },

  // Tool agent paths
  { id: "e15", from: "tool-agent-01", to: "internal-db",        probability: 0.50, label: "persist",          channel: "memory_write" },
  { id: "e16", from: "tool-agent-01", to: "external-api",       probability: 0.35, label: "api:call",         channel: "egress" },
  { id: "e17", from: "tool-agent-01", to: "audit-log",          probability: 0.15, label: "audit",            channel: "memory_write" },

  // External gateway
  { id: "e18", from: "external-gateway-01", to: "external-api", probability: 0.80, label: "egress:external",  channel: "egress" },
  { id: "e19", from: "external-gateway-01", to: "audit-log",    probability: 0.20, label: "audit",            channel: "memory_write" },
];

export type TopologyGraph = {
  nodes: TopoNode[];
  edges: TopoEdge[];
};

export const DEFAULT_TOPOLOGY: TopologyGraph = {
  nodes: DEFAULT_NODES,
  edges: DEFAULT_EDGES,
};

/** Get a node by ID */
export const topoNodeById = (id: string, graph = DEFAULT_TOPOLOGY): TopoNode | undefined =>
  graph.nodes.find((n) => n.id === id);

/** Get all edges from a node */
export const edgesFrom = (nodeId: string, graph = DEFAULT_TOPOLOGY): TopoEdge[] =>
  graph.edges.filter((e) => e.from === nodeId);

/** Get all edges to a node */
export const edgesTo = (nodeId: string, graph = DEFAULT_TOPOLOGY): TopoEdge[] =>
  graph.edges.filter((e) => e.to === nodeId);

/** Transient agent nodes (VA) */
export const agentNodes = (graph = DEFAULT_TOPOLOGY): TopoNode[] =>
  graph.nodes.filter((n) => !n.isAbsorbing);

/** Absorbing sink nodes (VS) */
export const sinkNodes = (graph = DEFAULT_TOPOLOGY): TopoNode[] =>
  graph.nodes.filter((n) => n.isAbsorbing);
