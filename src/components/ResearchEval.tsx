import React, { useEffect, useState } from 'react';

interface Phase4Summary {
  experiment_id: string;
  config: any;
  metrics: {
    security: {
      leakageRate: number;
      preventionRate: number;
      precision: number;
      recall: number;
      f1: number;
      falsePositiveRate: number;
    };
    performance: {
      meanLatency: number;
      medianLatency: number;
      p95Latency: number;
      p99Latency: number;
      throughputReqPerSec: number;
    };
  };
  // Additional fields can be added as needed
}

/**
 * Research Evaluation page – shows a concise summary of the latest Phase 4 run.
 * It fetches a JSON file placed in the public folder (e.g. /phase4_summary.json).
 * The experiment export step should write that file.
 */
export const ResearchEval: React.FC = () => {
  const [summary, setSummary] = useState<Phase4Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/phase4_summary.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="p-4 text-red-600">Failed to load Phase 4 summary: {error}</div>;
  }

  if (!summary) {
    return <div className="p-4">Loading Phase 4 results…</div>;
  }

  const { experiment_id, metrics } = summary;
  const { security, performance } = metrics;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Phase 4 Research Evaluation</h1>
      <p className="mb-2">Experiment ID: <code>{experiment_id}</code></p>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Security Metrics</h2>
        <table className="border-collapse border w-full">
          <tbody>
            <tr><td className="border p-1">Leakage Rate</td><td className="border p-1">{(security.leakageRate * 100).toFixed(2)} %</td></tr>
            <tr><td className="border p-1">Prevention Rate</td><td className="border p-1">{(security.preventionRate * 100).toFixed(2)} %</td></tr>
            <tr><td className="border p-1">Precision</td><td className="border p-1">{(security.precision * 100).toFixed(2)} %</td></tr>
            <tr><td className="border p-1">Recall</td><td className="border p-1">{(security.recall * 100).toFixed(2)} %</td></tr>
            <tr><td className="border p-1">F1 Score</td><td className="border p-1">{(security.f1 * 100).toFixed(2)} %</td></tr>
            <tr><td className="border p-1">False‑Positive Rate</td><td className="border p-1">{(security.falsePositiveRate * 100).toFixed(2)} %</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Performance Metrics</h2>
        <table className="border-collapse border w-full">
          <tbody>
            <tr><td className="border p-1">Mean Latency</td><td className="border p-1">{performance.meanLatency.toFixed(2)} ms</td></tr>
            <tr><td className="border p-1">Median Latency</td><td className="border p-1">{performance.medianLatency.toFixed(2)} ms</td></tr>
            <tr><td className="border p-1">P95 Latency</td><td className="border p-1">{performance.p95Latency.toFixed(2)} ms</td></tr>
            <tr><td className="border p-1">P99 Latency</td><td className="border p-1">{performance.p99Latency.toFixed(2)} ms</td></tr>
            <tr><td className="border p-1">Throughput</td><td className="border p-1">{performance.throughputReqPerSec.toFixed(2)} req/s</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};
