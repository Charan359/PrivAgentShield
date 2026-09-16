/**
 * Topology Graph Component
 *
 * SVG-based agent topology visualization. Renders nodes (agents and sinks)
 * and edges (communication channels) with color-coded security states.
 *
 * Security state colors:
 *   GREEN  (#22c55e) → ALLOW
 *   AMBER  (#f59e0b) → SANITIZE
 *   RED    (#ef4444) → QUARANTINE
 *   GRAY               → idle
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TopoNode, TopoEdge, TopologyGraph } from "@/data/topology";
import { DEFAULT_TOPOLOGY } from "@/data/topology";

export type EdgeSecurityState = "allow" | "sanitize" | "quarantine" | "idle";
export type AnimatingEdge = { edgeId: string; progress: number }; // progress 0..1

export type TopologyGraphProps = {
  graph?: TopologyGraph;
  edgeStates?: Record<string, EdgeSecurityState>; // edgeId → state
  animatingEdges?: AnimatingEdge[];
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  onNodeClick?: (node: TopoNode) => void;
  onEdgeClick?: (edge: TopoEdge) => void;
  piJValues?: Record<string, number>; // agentId → Πj value
  className?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────────────────────
const EDGE_COLOR: Record<EdgeSecurityState, string> = {
  allow:      "#22c55e",
  sanitize:   "#f59e0b",
  quarantine: "#ef4444",
  idle:       "hsl(var(--border))",
};

const NODE_TYPE_STYLE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  agent:         { bg: "hsl(var(--card))",       border: "hsl(var(--primary))",    text: "hsl(var(--primary))",    icon: "🤖" },
  internal_sink: { bg: "hsl(var(--secondary))",  border: "hsl(var(--border))",     text: "hsl(var(--foreground))", icon: "🗄️" },
  external_sink: { bg: "#1a0a0a",                border: "#ef4444",                text: "#ef4444",                icon: "🌐" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Arrow marker defs
// ─────────────────────────────────────────────────────────────────────────────
function ArrowDefs() {
  return (
    <defs>
      {(["allow", "sanitize", "quarantine", "idle"] as const).map((state) => (
        <marker
          key={state}
          id={`arrow-${state}`}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill={EDGE_COLOR[state]} />
        </marker>
      ))}
    </defs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge component
// ─────────────────────────────────────────────────────────────────────────────
function GraphEdge({
  edge,
  fromNode,
  toNode,
  state,
  isSelected,
  isAnimating,
  animProgress,
  onClick,
}: {
  edge: TopoEdge;
  fromNode: TopoNode;
  toNode: TopoNode;
  state: EdgeSecurityState;
  isSelected: boolean;
  isAnimating: boolean;
  animProgress: number;
  onClick: () => void;
}) {
  const NODE_W = 120;
  const NODE_H = 50;

  const x1 = fromNode.x + NODE_W / 2;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x + NODE_W / 2;
  const y2 = toNode.y + NODE_H / 2;

  // Offset midpoint for curved edges
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const color = EDGE_COLOR[state];
  const strokeW = isSelected ? 2.5 : 1.5;

  // Animated packet position
  const pktX = x1 + (x2 - x1) * animProgress;
  const pktY = y1 + (y2 - y1) * animProgress;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Invisible wider hit area */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
      {/* Visible edge */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={state === "idle" ? "4 3" : undefined}
        markerEnd={`url(#arrow-${state})`}
        opacity={isSelected ? 1 : 0.7}
      />
      {/* Probability label */}
      <text
        x={mx}
        y={my - 5}
        textAnchor="middle"
        fontSize={9}
        fill="hsl(var(--muted-foreground))"
      >
        {(edge.probability * 100).toFixed(0)}%
      </text>
      {/* Animated message packet */}
      {isAnimating && (
        <circle cx={pktX} cy={pktY} r={5} fill={color} opacity={0.9}>
          <animate
            attributeName="opacity"
            values="0.9;0.4;0.9"
            dur="0.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node component
// ─────────────────────────────────────────────────────────────────────────────
function GraphNode({
  node,
  isSelected,
  piJ,
  onClick,
}: {
  node: TopoNode;
  isSelected: boolean;
  piJ?: number;
  onClick: () => void;
}) {
  const NODE_W = 120;
  const NODE_H = 50;
  const style = NODE_TYPE_STYLE[node.type];

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {/* Node rect */}
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill={style.bg}
        stroke={isSelected ? "hsl(var(--primary))" : style.border}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {/* Icon */}
      <text x={10} y={20} fontSize={12}>{style.icon}</text>
      {/* Label */}
      <text
        x={NODE_W / 2}
        y={22}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={style.text}
        fontFamily="monospace"
      >
        {node.label.length > 14 ? node.label.slice(0, 14) + "…" : node.label}
      </text>
      {/* Type label */}
      <text
        x={NODE_W / 2}
        y={36}
        textAnchor="middle"
        fontSize={8}
        fill="hsl(var(--muted-foreground))"
      >
        {node.type === "external_sink" ? "⚠ external sink" : node.type === "internal_sink" ? "internal sink" : "agent"}
      </text>
      {/* Πj badge */}
      {piJ !== undefined && !node.isAbsorbing && (
        <g transform={`translate(${NODE_W - 28}, -10)`}>
          <rect
            width={28}
            height={14}
            rx={4}
            fill={piJ > 0.7 ? "#ef444420" : piJ > 0.4 ? "#f59e0b20" : "#22c55e20"}
            stroke={piJ > 0.7 ? "#ef4444" : piJ > 0.4 ? "#f59e0b" : "#22c55e"}
            strokeWidth={1}
          />
          <text
            x={14}
            y={10}
            textAnchor="middle"
            fontSize={8}
            fontFamily="monospace"
            fontWeight={600}
            fill={piJ > 0.7 ? "#ef4444" : piJ > 0.4 ? "#f59e0b" : "#22c55e"}
          >
            Π{(piJ * 100).toFixed(0)}%
          </text>
        </g>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {[
        { color: "#22c55e", label: "ALLOW" },
        { color: "#f59e0b", label: "SANITIZE" },
        { color: "#ef4444", label: "QUARANTINE" },
        { color: "hsl(var(--border))", label: "Idle" },
      ].map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block h-2 w-6 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="font-mono text-[10px] text-primary">Π%</span> Sink exposure
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function TopologyGraph({
  graph = DEFAULT_TOPOLOGY,
  edgeStates = {},
  animatingEdges = [],
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  piJValues,
  className,
}: TopologyGraphProps) {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // Compute SVG viewBox from node positions
  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - 20;
  const minY = Math.min(...ys) - 30;
  const maxX = Math.max(...xs) + 140;
  const maxY = Math.max(...ys) + 80;
  const vw = maxX - minX;
  const vh = maxY - minY;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Legend />
      <div className="overflow-auto rounded-md border border-border bg-card/30">
        <svg
          viewBox={`${minX} ${minY} ${vw} ${vh}`}
          width="100%"
          style={{ minHeight: 340, maxHeight: 520 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <ArrowDefs />

          {/* Edges (render before nodes so nodes sit on top) */}
          {graph.edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;
            const state = edgeStates[edge.id] ?? "idle";
            const anim = animatingEdges.find((a) => a.edgeId === edge.id);
            return (
              <GraphEdge
                key={edge.id}
                edge={edge}
                fromNode={fromNode}
                toNode={toNode}
                state={state}
                isSelected={selectedEdgeId === edge.id}
                isAnimating={!!anim}
                animProgress={anim?.progress ?? 0}
                onClick={() => onEdgeClick?.(edge)}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              piJ={piJValues?.[node.id]}
              onClick={() => onNodeClick?.(node)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph stats panel
// ─────────────────────────────────────────────────────────────────────────────
export function TopologyStats({ graph = DEFAULT_TOPOLOGY }: { graph?: TopologyGraph }) {
  const agents = graph.nodes.filter((n) => !n.isAbsorbing);
  const internalSinks = graph.nodes.filter((n) => n.isAbsorbing && n.type === "internal_sink");
  const externalSinks = graph.nodes.filter((n) => n.isAbsorbing && n.type === "external_sink");
  const externalEdges = graph.edges.filter((e) => {
    const to = graph.nodes.find((n) => n.id === e.to);
    return to?.type === "external_sink";
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {[
        { label: "Agent nodes", value: agents.length },
        { label: "Internal sinks", value: internalSinks.length },
        { label: "External sinks", value: externalSinks.length, highlight: true },
        { label: "Total edges", value: graph.edges.length },
        { label: "External paths", value: externalEdges.length, highlight: true },
      ].map(({ label, value, highlight }) => (
        <div key={label} className="rounded-md border border-border bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("mt-1 font-mono text-xl font-semibold", highlight ? "text-block" : "text-foreground")}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
