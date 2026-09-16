import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Shell, PageHeader, SimulationBanner } from "@/components/shell";
import { Panel } from "@/components/primitives";
import { TopologyGraph, TopologyStats } from "@/components/topology-graph";
import { DEFAULT_TOPOLOGY, type TopoNode, type TopoEdge } from "@/data/topology";
import { buildTopologyResult, formatMatrix } from "@/lib/lri/topology";
import { cn } from "@/lib/utils";
import { MarkovTechnicalView } from "@/components/markov-technical-view";

export const Route = createFileRoute("/topology")({
  head: () => ({
    meta: [
      { title: "Topology Editor — PrivAgentShield" },
      { name: "description", content: "Interactive agent topology graph with Markov absorption probability calculation showing downstream sink reachability Π*j for each agent." },
    ],
  }),
  component: TopologyPage,
});

function MatrixTable({ matrix, rowLabels, colLabels, title }: {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  title: string;
}) {
  if (!matrix.length) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="text-[10px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-2 py-1 text-left font-mono text-muted-foreground">↓ from \ to →</th>
              {colLabels.map((l) => (
                <th key={l} className="px-2 py-1 font-mono text-muted-foreground whitespace-nowrap">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-2 py-1 font-mono text-muted-foreground whitespace-nowrap">{rowLabels[i]}</td>
                {row.map((val, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-2 py-1 text-center font-mono",
                      val > 0.7 ? "text-block font-semibold" :
                      val > 0.3 ? "text-mask" : "text-foreground/60",
                    )}
                  >
                    {val.toFixed(3)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NodeDetail({ node, piJ }: { node: TopoNode; piJ: number | undefined }) {
  const piJVal = piJ ?? 0;
  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Selected Node</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{node.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{node.description}</p>
      <div className="mt-3 grid gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="font-mono capitalize text-foreground">{node.type.replace("_", " ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Absorbing (sink)</span>
          <span className={cn("font-mono", node.isAbsorbing ? "text-block" : "text-allow")}>
            {node.isAbsorbing ? "yes" : "no"}
          </span>
        </div>
        {!node.isAbsorbing && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Π*j (sink exposure)</span>
            <span className={cn(
              "font-mono font-semibold",
              piJVal > 0.7 ? "text-block" : piJVal > 0.4 ? "text-mask" : "text-allow",
            )}>
              {piJVal.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EdgeDetail({ edge }: { edge: TopoEdge }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Selected Edge</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{edge.from} → {edge.to}</p>
      <div className="mt-3 grid gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transition probability</span>
          <span className="font-mono font-semibold text-foreground">{(edge.probability * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Channel</span>
          <span className="font-mono text-foreground">{edge.channel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Label</span>
          <span className="font-mono text-muted-foreground">{edge.label}</span>
        </div>
      </div>
    </div>
  );
}

function TopologyPage() {
  const [selectedNode, setSelectedNode] = useState<TopoNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TopoEdge | null>(null);
  const [showMatrices, setShowMatrices] = useState(false);

  const result = useMemo(() => buildTopologyResult(DEFAULT_TOPOLOGY), []);

  return (
    <Shell>
      <PageHeader
        eyebrow="Topology engine"
        title="Agent Topology Graph"
        subtitle="Visual representation of the agent communication graph. Π*j values show each agent's maximum downstream absorption probability to an external sink, computed via Markov chain analysis."
      />
      <SimulationBanner />

      {/* Stats */}
      <TopologyStats graph={DEFAULT_TOPOLOGY} />

      {/* Graph + detail panel */}
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <Panel
          title="Agent Communication Graph"
          description="Click a node or edge to inspect details. Π% badges show external sink exposure per agent."
        >
          <TopologyGraph
            graph={DEFAULT_TOPOLOGY}
            piJValues={result.piJ}
            selectedNodeId={selectedNode?.id}
            selectedEdgeId={selectedEdge?.id}
            onNodeClick={(n) => { setSelectedNode(n); setSelectedEdge(null); }}
            onEdgeClick={(e) => { setSelectedEdge(e); setSelectedNode(null); }}
          />
        </Panel>

        <div className="flex flex-col gap-4">
          {selectedNode && <NodeDetail node={selectedNode} piJ={result.piJ[selectedNode.id]} />}
          {selectedEdge && <EdgeDetail edge={selectedEdge} />}
          {!selectedNode && !selectedEdge && (
            <div className="rounded-md border border-border bg-card/30 p-4 text-xs text-muted-foreground">
              Click any node or edge on the graph to inspect its details and reachability values.
            </div>
          )}

          {/* Π*j table */}
          <Panel title="Π*j per Agent" description="Max absorption probability to any external sink.">
            <ul className="divide-y divide-border text-xs">
              {result.agentIds.map((id) => {
                const val = result.piJ[id] ?? 0;
                return (
                  <li key={id} className="flex items-center justify-between gap-2 py-2">
                    <span className="font-mono text-foreground/80">{id}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full", val > 0.7 ? "bg-block" : val > 0.4 ? "bg-mask" : "bg-allow")}
                          style={{ width: `${val * 100}%` }}
                        />
                      </div>
                      <span className={cn("w-12 text-right font-mono font-semibold",
                        val > 0.7 ? "text-block" : val > 0.4 ? "text-mask" : "text-allow",
                      )}>
                        {val.toFixed(3)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Expandable matrix panel */}
      <Panel
        title="Markov Matrices"
        description="Technical panel: Q (agent→agent), R (agent→sink), N=(I-Q)⁻¹, B=NR absorption probabilities."
        right={
          <button
            onClick={() => setShowMatrices((v) => !v)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {showMatrices ? "Collapse" : "Expand"}
          </button>
        }
      >
        {showMatrices ? (
          <div className="flex flex-col gap-6 overflow-x-auto">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs font-mono text-primary">
              P = [Q R / 0 I] · N = (I−Q)⁻¹ · B = N×R · Π*j = max_s B[j,s]
            </div>
            <MatrixTable
              title="Q matrix (VA×VA) — agent-to-agent transitions"
              matrix={result.Q}
              rowLabels={result.matrixLabels.agents}
              colLabels={result.matrixLabels.agents}
            />
            <MatrixTable
              title="R matrix (VA×VS) — agent-to-sink transitions"
              matrix={result.R}
              rowLabels={result.matrixLabels.agents}
              colLabels={result.matrixLabels.sinks}
            />
            <MatrixTable
              title="N = (I−Q)⁻¹ — fundamental matrix"
              matrix={result.N}
              rowLabels={result.matrixLabels.agents}
              colLabels={result.matrixLabels.agents}
            />
            <MatrixTable
              title="B = N×R — absorption probability matrix"
              matrix={result.B}
              rowLabels={result.matrixLabels.agents}
              colLabels={result.matrixLabels.sinks}
            />
            <p className="text-[10px] text-muted-foreground">
              ⚠ SIMULATION DATA — Matrices computed from configurable demo topology. Transition probabilities are demonstration defaults, not empirically measured values.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Expand to see the full Q, R, N=(I−Q)⁻¹, and B=NR matrices used in the Π*j computation.
          </p>
        )}
      </Panel>

      {/* Technical Matrix View */}
      <MarkovTechnicalView />
    </Shell>
  );
}
