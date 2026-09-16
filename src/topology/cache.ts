/**
 * PRIVAGENTSHIELD TOPOLOGY REACHABILITY CACHE
 * Versioned caching for absorbing Markov chain calculations (Pi*j).
 * Automatically invalidates when graph topology is modified.
 */

import { buildTopologyResult } from "@/lib/lri/topology";
import { dbStore } from "@/database/store";
import type { TopologyGraph } from "@/domain/types";

export class TopologyReachabilityCache {
  private version = 1;
  private cache: Map<string, number> = new Map();
  private lastMatrixResult?: ReturnType<typeof buildTopologyResult>;

  /** Current topology version counter */
  getVersion(): number {
    return this.version;
  }

  /** Invalidate cache and increment version counter */
  invalidate(): void {
    this.version++;
    this.cache.clear();
    this.lastMatrixResult = undefined;
  }

  /** Retrieve Pi*j with cache check */
  getPiJ(agentId: string, graph?: TopologyGraph): number {
    const key = `v${this.version}:${agentId}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const currentGraph = graph ?? dbStore.getTopologyGraph();
    if (!this.lastMatrixResult) {
      this.lastMatrixResult = buildTopologyResult(currentGraph);
    }

    const piMap = this.lastMatrixResult.piJ;
    for (const [id, val] of Object.entries(piMap)) {
      this.cache.set(`v${this.version}:${id}`, val);
    }

    return this.cache.get(key) ?? 0.25;
  }
}

export const topologyCache = new TopologyReachabilityCache();
