# EXPERIMENT REPORT — PrivAgentShield Phase 3

**Title:** PrivAgentShield Full System Evaluation  
**Experiment ID:** EXP-2026-001  
**Run Date:** 2026-09-15  
**Shield Version:** phase3-v1.0  
**Node Version:** v25.6.1  
**Config Hash:** sha-sim-0f92812f  
**Result Hash:** sha-sim-740fa338  
**Status:** COMPLETED — All metrics are MEASURED values from real execution

---

## Experimental Setup

### Dataset
- **Dataset:** PrivAgentShield Synthetic Evaluation Dataset v1.0
- **Source:** SYNTHETIC — all data is entirely synthetic, no real personal information
- **Total Samples:** 31
- **Sensitive Samples:** 20 (64.5%)
- **Safe Samples:** 11 (35.5%)
- **Scenarios:** S1–S10 (10 attack scenarios) + SAFE baseline

### Configuration
| Parameter | Value |
|---|---|
| Model | mock (deterministic synthetic agents) |
| Agent Framework | mock |
| Number of Agents | 7 |
| Topology | default (6 nodes, 7 edges) |
| τlow | 0.30 |
| τhigh | 0.70 |
| Baseline | FULL pipeline |
| Seed | 42 |
| Repetitions | 1 |

---

## Results — Full System (EXP-2026-001)

> All metrics below have `Status: MEASURED` — computed from real pipeline execution.

### Detection Metrics
| Metric | Value | Status |
|---|---|---|
| Precision | 76.5% | MEASURED |
| Recall | 65.0% | MEASURED |
| F1 Score | 70.3% | MEASURED |
| False Positive Rate | 36.4% | MEASURED |
| Accuracy | 64.5% | MEASURED |
| TP | 13 | MEASURED |
| FP | 4 | MEASURED |
| TN | 7 | MEASURED |
| FN | 7 | MEASURED |

### Leakage & Prevention Metrics
| Metric | Value | Status |
|---|---|---|
| Leakage Rate | 35.0% | MEASURED |
| Prevention Rate | 65.0% | MEASURED |
| False Positive Rate | 36.4% | MEASURED |

### Task Completion Metrics
| Metric | Value | Status |
|---|---|---|
| Task Completion Rate | 74.2% | MEASURED |
| Tasks Blocked (QUARANTINE) | 1 | MEASURED |
| Completed After Sanitization | 2 | MEASURED |

### Enforcement Breakdown
| Action | Rate | Status |
|---|---|---|
| ALLOW | 45.2% | MEASURED |
| SANITIZE | 19.4% | MEASURED |
| QUARANTINE | 35.5% | MEASURED |

### Latency
| Metric | Value | Status |
|---|---|---|
| Mean | 1.66ms | MEASURED |
| P95 | 4.87ms | MEASURED |
| P99 | 14.88ms | MEASURED |
| Throughput | 602.2 msg/s | MEASURED |

---

## Results — Ablation Study (EXP-2026-002)

| Variant | Precision | Recall | F1 | Leakage Rate | Prevention Rate | TCR | Status |
|---|---|---|---|---|---|---|---|
| FULL | 76.5% | 65.0% | 70.3% | 35.0% | 65.0% | 74.2% | MEASURED |
| NO_IFC | 88.9% | 40.0% | 55.2% | 60.0% | 40.0% | 51.6% | MEASURED |
| NO_ABAC | 91.7% | 55.0% | 68.8% | 45.0% | 55.0% | 74.2% | MEASURED |
| NO_TOPOLOGY | 88.2% | 75.0% | 81.1% | 25.0% | 75.0% | 74.2% | MEASURED |
| NO_MARKOV | 92.9% | 65.0% | 76.5% | 35.0% | 65.0% | 74.2% | MEASURED |
| NO_LRI | 88.2% | 75.0% | 81.1% | 25.0% | 75.0% | 67.7% | MEASURED |
| NO_TIER_3 | 86.7% | 65.0% | 74.3% | 35.0% | 65.0% | 67.7% | MEASURED |
| DETECTION_ONLY | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 51.6% | MEASURED |
| NO_ENFORCEMENT | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 51.6% | MEASURED |

---

## Planned Experiments (NOT_EXECUTED)

The following experiments are defined but not yet executed due to external dependencies:

| Experiment | Status | Reason |
|---|---|---|
| AgentLeak Benchmark (real traces) | NOT_EXECUTED | Requires AgentLeak Python installation |
| AgentDojo Benchmark (real attacks) | NOT_EXECUTED | Requires AgentDojo Python installation |
| Live LLM evaluation | NOT_EXECUTED | Requires OPENAI_API_KEY |
| Multi-repetition CI calculation | NOT_EXECUTED | Currently 1 repetition — need ≥5 for CI |

---

## Limitations

1. **Synthetic dataset:** The evaluation uses a 31-sample synthetic dataset. Results should be interpreted as system behavior characterization, not claims about all real-world deployments.
2. **Baseline TCR values from prior work** (Llama Guard 3: 98.2%, Presidio: 68.4%) are from reference implementations, not re-executed in this platform. They are not included in the measured results.
3. **Latency stage breakdown** is estimated proportionally. Real per-stage timers require instrumentation of each engine function.
4. **No confidence intervals** calculated yet — requires ≥2 repetitions. Set `repetitions: 5` in experiment config for CI.
5. **Topology experiment** uses the default topology. Custom topology variants require running `topology-experiment.ts`.

---

## Reproducibility

```bash
# Install dependencies
npm install

# Run full experiment
npx tsx src/experiments/entry-point.ts

# Run security regression tests
npx tsx src/test/security-regression.ts

# Run Phase 2 regression (must still pass 40/40)
npx tsx src/test/run-phase2.ts

# Build
npm run build
```

**Seed:** 42 | **Config Hash:** sha-sim-0f92812f | **Dataset Hash:** synthetic-dataset-hash-placeholder-v1
