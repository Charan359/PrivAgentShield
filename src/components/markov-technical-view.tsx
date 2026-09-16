/**
 * MARKOV TECHNICAL VIEW COMPONENT
 * Exposes full matrix mathematical calculations for Π*j downstream sink reachability:
 *   - Transition matrix P = [ Q  R ]
 *                           [ 0  I ]
 *   - Fundamental matrix N = (I - Q)^-1
 *   - Absorption matrix B = N × R
 *   - Reachability vector Π*j = max_s B[j, s]
 */

import { useState } from "react";
import { buildTopologyResult, formatMatrix } from "@/lib/lri/topology";
import { dbStore } from "@/database/store";
import { Panel } from "@/components/primitives";

export function MarkovTechnicalView() {
  const [graph] = useState(() => dbStore.getTopologyGraph());
  const res = buildTopologyResult(graph);

  return (
    <Panel
      title="Markov Chain Technical Matrix View (Π*j Engine)"
      description="Exposes exact transient Q matrix, absorption R matrix, fundamental N=(I-Q)⁻¹ matrix, and absorption probabilities B=N×R."
    >
      <div className="grid gap-4 font-mono text-xs md:grid-cols-2">
        {/* Q Matrix */}
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-primary">Q Matrix (Transient Agents)</span>
            <span className="text-[10px] text-muted-foreground">{res.agentIds.length} × {res.agentIds.length}</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Transitions between active agent nodes (VA → VA)</p>
          <pre className="mt-2 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] text-foreground">
            {formatMatrix(res.Q, 3)}
          </pre>
          <p className="mt-1 text-[10px] text-muted-foreground">Agents: {res.matrixLabels.agents.join(", ")}</p>
        </div>

        {/* R Matrix */}
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-primary">R Matrix (Absorbing Sinks)</span>
            <span className="text-[10px] text-muted-foreground">{res.agentIds.length} × {res.sinkIds.length}</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Transitions from agents to sinks (VA → VS)</p>
          <pre className="mt-2 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] text-foreground">
            {formatMatrix(res.R, 3)}
          </pre>
          <p className="mt-1 text-[10px] text-muted-foreground">Sinks: {res.matrixLabels.sinks.join(", ")}</p>
        </div>

        {/* Fundamental N Matrix */}
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-primary">N = (I − Q)⁻¹ Fundamental Matrix</span>
            <span className="text-[10px] text-muted-foreground">Expected Steps</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Expected number of visits to transient nodes before absorption</p>
          <pre className="mt-2 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] text-foreground">
            {formatMatrix(res.N, 3)}
          </pre>
        </div>

        {/* B Matrix & Pi*j */}
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-primary">B = N × R Absorption Probabilities</span>
            <span className="text-[10px] text-muted-foreground">Π*j Vector</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Absorption probability into each sink node</p>
          <pre className="mt-2 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] text-foreground">
            {formatMatrix(res.B, 3)}
          </pre>
          <div className="mt-3 border-t border-border pt-2">
            <p className="text-[10px] font-bold text-foreground">Derived Π*j (Max Sink Exposure per Agent):</p>
            <ul className="mt-1 flex flex-wrap gap-2 text-[10px]">
              {Object.entries(res.piJ).map(([agent, val]) => (
                <li key={agent} className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5">
                  <span className="text-muted-foreground">{agent}: </span>
                  <span className="font-bold text-primary">{val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
