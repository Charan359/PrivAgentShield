# SECURITY TEST REPORT — PrivAgentShield Phase 3

**Generated:** 2026-09-15  
**System:** PrivAgentShield Phase 3 v1.0  
**Node Version:** v25.6.1  
**Dataset:** Synthetic (no real personal data)  
**Git Commit:** local-dev  

---

## Summary

| Category | Count |
|---|---|
| **Tests Executed** | 23 |
| **Passed** | 23 |
| **Failed** | 0 |
| **Skipped** | 0 |

---

## Test Results

### Group A — Unauthorized PII Enforcement
| Test | Result |
|---|---|
| A1: Direct PII to unauthorized external recipient → QUARANTINE | ✅ PASS |
| A2: Credential to external recipient → QUARANTINE | ✅ PASS |
| A3: Prompt injection in tool result → QUARANTINE | ✅ PASS |

### Group B — Sanitization Enforcement
| Test | Result |
|---|---|
| B1: PII to internal agent → SANITIZE (not QUARANTINE) | ✅ PASS |
| B2: After SANITIZE — payload is transformed | ✅ PASS |

### Group C — Safe Message ALLOW
| Test | Result |
|---|---|
| C1: Plain administrative message → ALLOW | ✅ PASS |
| C2: Safe message payload unchanged on ALLOW | ✅ PASS |

### Group D — Authorized Sensitive Communication
| Test | Result |
|---|---|
| D1: Medical agent self-reference → ALLOW (sufficient clearance) | ✅ PASS |

### Group E — Topology Risk Ordering
| Test | Result |
|---|---|
| E1: External gateway recipient has higher Π*j than internal recipient | ✅ PASS |

### Group F — Topology Risk Reduction
| Test | Result |
|---|---|
| F1: Internal agents have lower piJ than external sinks | ✅ PASS |

### Group G — Credential Leakage Prevention
| Test | Result |
|---|---|
| G1: Bearer token to external → QUARANTINE | ✅ PASS |
| G2: Password in message to external → QUARANTINE | ✅ PASS |

### Group H — Session Pseudonymization
| Test | Result |
|---|---|
| H1: Same entity same session → same pseudonym | ✅ PASS |
| H2: Pseudonymized text does not contain original sensitive value | ✅ PASS |

### Group I — Tool Result Mediation
| Test | Result |
|---|---|
| I1: Sensitive tool result to external → intercepted | ✅ PASS |

### Group J — Shared Memory Mediation
| Test | Result |
|---|---|
| J1: Memory write with PII → mediated | ✅ PASS |

### Group K — Multi-Hop Leakage
| Test | Result |
|---|---|
| K1: Hop 2 to external sink with PII → QUARANTINE | ✅ PASS |

### Property Tests
| Test | Result |
|---|---|
| P1: If Δij=1, LRI* ≥ Δij (clearance dominates) | ✅ PASS |
| P2: 0 ≤ LRI* ≤ 1 for all messages | ✅ PASS |
| P3: Quarantined messages — no transformedPayload dispatched | ✅ PASS |
| P4: Sanitization produces a different payload than original | ✅ PASS |
| P5: ALLOW preserves original payload exactly | ✅ PASS |
| P6: Fail-safe — invalid/unknown sender handled safely | ✅ PASS |

---

## Known Limitations

- **Synthetic dataset only:** All test payloads use synthetic data. Real-world agent outputs may contain patterns not covered by the synthetic corpus.
- **Estimated latency breakdown:** Per-stage latency is estimated proportionally. True per-stage instrumentation requires adding performance markers to each engine call.
- **External benchmarks not tested:** AgentLeak and AgentDojo adapters require external Python installation. Their test paths are marked `NOT_CONFIGURED` until installed.
- **Topology is static during tests:** Dynamic topology changes are not exercised in the regression suite (covered in `topology-experiment.ts`).

---

## Run Command

```bash
npx tsx src/test/security-regression.ts
```

Also verify Phase 2 regression still passes:

```bash
npx tsx src/test/run-phase2.ts
# Expected: 40 PASSED, 0 FAILED
```
