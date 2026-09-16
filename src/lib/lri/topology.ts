/**
 * Topology / Reachability Engine — Π*j
 *
 * Implements Markov chain absorption probability analysis:
 *
 *   G = (V, E) with V partitioned into:
 *     VA = transient agent nodes
 *     VS = absorbing sink nodes
 *
 *   Transition matrix P = [ Q  R ]
 *                         [ 0  I ]
 *
 *   Fundamental matrix:  N = (I − Q)^−1
 *   Absorption matrix:   B = N × R
 *   Sink exposure:       Π*j = max_s B[j, s]
 *
 * Pure TypeScript — no external math library required.
 * Matrix inversion uses Gauss-Jordan elimination (safe for n ≤ 20).
 */

import type { TopologyGraph, TopologyResult } from "./types";
import type { TopologyGraph as DataTopologyGraph } from "@/data/topology";

// ─────────────────────────────────────────────────────────────────────────────
// Pure matrix utilities
// ─────────────────────────────────────────────────────────────────────────────

type Matrix = number[][];

function zeros(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

function identity(n: number): Matrix {
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i]![i] = 1;
  return m;
}

function matSub(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const cols = a[0]?.length ?? 0;
  const result = zeros(rows, cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[i]![j] = (a[i]![j] ?? 0) - (b[i]![j] ?? 0);
    }
  }
  return result;
}

function matMul(a: Matrix, b: Matrix): Matrix {
  const rowsA = a.length;
  const colsA = a[0]?.length ?? 0;
  const colsB = b[0]?.length ?? 0;
  const result = zeros(rowsA, colsB);
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += (a[i]![k] ?? 0) * (b[k]![j] ?? 0);
      }
      result[i]![j] = sum;
    }
  }
  return result;
}

/**
 * Gauss-Jordan matrix inversion.
 * Returns null if the matrix is singular.
 * Safe for n ≤ 20 (topology graphs are typically n ≤ 10).
 */
function invertMatrix(m: Matrix): Matrix | null {
  const n = m.length;
  // Build augmented matrix [m | I]
  const aug: number[][] = m.map((row, i) => {
    const id = new Array<number>(n).fill(0);
    id[i] = 1;
    return [...row, ...id];
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = -1;
    let maxVal = 0;
    for (let row = col; row < n; row++) {
      const val = Math.abs(aug[row]![col] ?? 0);
      if (val > maxVal) { maxVal = val; pivotRow = row; }
    }
    if (pivotRow === -1 || maxVal < 1e-12) return null; // singular

    // Swap rows
    [aug[col], aug[pivotRow]] = [aug[pivotRow]!, aug[col]!];

    // Scale pivot row
    const pivot = aug[col]![col]!;
    for (let j = 0; j < 2 * n; j++) {
      aug[col]![j]! /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row]![col]!;
      for (let j = 0; j < 2 * n; j++) {
        aug[row]![j]! -= factor * aug[col]![j]!;
      }
    }
  }

  // Extract right half
  return aug.map((row) => row.slice(n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Topology engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full Markov absorption result from a topology graph.
 *
 * Accepts both the LRI type (TopologyGraph from lri/types) and the data
 * type (from data/topology) — they share the same shape.
 */
export function buildTopologyResult(
  graph: TopologyGraph | DataTopologyGraph,
): TopologyResult {
  const nodes = graph.nodes as TopologyGraph["nodes"];
  const edges = graph.edges as Array<{ from: string; to: string; probability: number }>;

  const agents = nodes.filter((n) => !n.isAbsorbing);
  const sinks = nodes.filter((n) => n.isAbsorbing);

  const agentIds = agents.map((a) => a.id);
  const sinkIds = sinks.map((s) => s.id);

  const na = agentIds.length;
  const ns = sinkIds.length;

  const agentIdx = new Map(agentIds.map((id, i) => [id, i]));
  const sinkIdx = new Map(sinkIds.map((id, i) => [id, i]));

  // Build raw probability rows (may not sum to 1 — row-normalize below)
  const rawP: Matrix = zeros(na, na + ns);
  const rowTotals = new Array<number>(na).fill(0);

  for (const edge of edges) {
    const fromA = agentIdx.get(edge.from);
    if (fromA === undefined) continue; // source is a sink — ignore
    const toA = agentIdx.get(edge.to);
    const toS = sinkIdx.get(edge.to);
    if (toA !== undefined) rawP[fromA]![toA] = (rawP[fromA]![toA] ?? 0) + edge.probability;
    else if (toS !== undefined) rawP[fromA]![na + toS] = (rawP[fromA]![na + toS] ?? 0) + edge.probability;
    rowTotals[fromA] = (rowTotals[fromA] ?? 0) + edge.probability;
  }

  // Row-normalize
  const P: Matrix = rawP.map((row, i) => {
    const total = rowTotals[i] ?? 0;
    return total > 0 ? row.map((v) => v / total) : row;
  });

  // Extract Q (na×na) and R (na×ns)
  const Q: Matrix = P.map((row) => row.slice(0, na));
  const R: Matrix = P.map((row) => row.slice(na));

  // Handle degenerate cases
  if (na === 0 || ns === 0) {
    const piJ: Record<string, number> = {};
    for (const id of agentIds) piJ[id] = 0;
    return {
      graph: graph as TopologyGraph,
      agentIds,
      sinkIds,
      Q: Q.length ? Q : [],
      R: R.length ? R : [],
      N: [],
      B: [],
      piJ,
      matrixLabels: { agents: agentIds, sinks: sinkIds },
    };
  }

  // N = (I - Q)^-1
  const IminusQ = matSub(identity(na), Q);
  const N = invertMatrix(IminusQ) ?? identity(na); // fallback to I on singular

  // B = N × R
  const B = matMul(N, R);

  // piJ[agentId] = max over sinks of B[j, s]
  const piJ: Record<string, number> = {};
  for (let j = 0; j < na; j++) {
    const row = B[j] ?? [];
    const maxB = row.length > 0 ? Math.max(...row) : 0;
    piJ[agentIds[j]!] = Number(Math.max(0, Math.min(1, maxB)).toFixed(4));
  }

  return {
    graph: graph as TopologyGraph,
    agentIds,
    sinkIds,
    Q,
    R,
    N,
    B,
    piJ,
    matrixLabels: { agents: agentIds, sinks: sinkIds },
  };
}

/**
 * Convenience: return only the piJ map from a graph.
 */
export function calculatePiJ(
  graph: TopologyGraph | DataTopologyGraph,
): Record<string, number> {
  return buildTopologyResult(graph).piJ;
}

/**
 * Format a matrix as a readable string for display.
 */
export function formatMatrix(m: Matrix, precision = 3): string {
  return m
    .map((row) => "[" + row.map((v) => v.toFixed(precision)).join(", ") + "]")
    .join("\n");
}
