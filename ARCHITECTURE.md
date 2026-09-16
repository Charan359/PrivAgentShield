# PrivAgentShield

**A Policy-Aware Runtime Framework for Preventing Sensitive Data Leakage in Multi-Agent LLM Systems**

Phase 1 — System Architecture (design only, no advanced functionality implemented yet).

> Note on scope: the prototype runs in **Simulation / Mock Mode** by default. Agents are
> scripted/templated mock agents — **no real LLM API is used** unless a provider key is later
> configured and the `LLM_MODE=live` flag is enabled. All claims below assume mock mode.

---

## 1. Architecture Diagram Description

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. USER INTERFACE (React + TanStack Start)                   │
│    Scenario builder · Live message stream · Policy editor    │
│    Audit explorer · Evaluation dashboard                     │
└───────────────────────────┬──────────────────────────────────┘
                            ↓  REST / SSE
┌──────────────────────────────────────────────────────────────┐
│ 2. MULTI-AGENT SIMULATION LAYER                              │
│    Agent registry · Roles · Scenario runner · Task graph     │
└───────────────────────────┬──────────────────────────────────┘
                            ↓ AgentMessage envelope
┌──────────────────────────────────────────────────────────────┐
│ 3. AGENT COMMUNICATION LAYER (message bus)                   │
│    Routing · Ordering · Delivery · Interception hook         │
└───────────────────────────┬──────────────────────────────────┘
                            ↓ MANDATORY CHOKE POINT
┌══════════════════════════════════════════════════════════════┐
║ 4. PRIVAGENTSHIELD RUNTIME SECURITY GATEWAY                  ║
║    Every message passes through; nothing bypasses.           ║
║                                                              ║
║   4a. Detection Engine ──► spans of candidate sensitive data ║
║   4b. Classification Engine ──► category + confidence        ║
║   4c. Risk Engine / LRI ──► 0–100 leakage risk index         ║
║   4d. Policy Engine ──► matching rules, obligations          ║
║   4e. Access Control ──► agent-level flow permission check   ║
║   4f. Action Engine ──► ALLOW | MASK | REDACT | BLOCK        ║
╚═══════════════════════════┬══════════════════════════════════╝
                 ┌──────────┴──────────┐
                 ↓                     ↓
     sanitized message           decision record
     to receiving agent                ↓
                            ┌──────────────────────────────┐
                            │ 5. AUDIT & EXPLAINABILITY    │
                            │  immutable log + rationale   │
                            └──────────────┬───────────────┘
                                           ↓
                            ┌──────────────────────────────┐
                            │ 6. EVALUATION LAYER          │
                            │  metrics vs ground truth     │
                            └──────────────┬───────────────┘
                                           ↓
                                  Dashboard (back to UI)
```

Key architectural property: the gateway is an **inline, blocking reference monitor**. The
communication layer cannot deliver a message that has not returned a decision.

---

## 2. Component Responsibilities

| # | Component | Responsibility |
|---|-----------|----------------|
| 1 | **User Interface** | Configure scenarios, run simulations, watch messages + decisions live, edit policies, browse audit trail, view evaluation metrics. |
| 2 | **Multi-Agent Simulation Layer** | Define agents (id, role, clearance, allowed data categories), orchestrate a scenario as a sequence of tasks, generate messages via mock templates (or a live LLM later). |
| 3 | **Agent Communication Layer** | Typed message bus. Wraps payloads into an `AgentMessage` envelope, routes sender→receiver, guarantees the gateway hook is invoked before delivery. |
| 4 | **Security Gateway** | Orchestrates the 6 sub-engines in fixed order, enforces timeouts, fails **closed** (BLOCK) on internal error, emits one `Decision` per message. |
| 4a | **Detection Engine** | Locate candidate sensitive spans: regex/validators (email, phone, Aadhaar/SSN, PAN, card+Luhn, IBAN, IP, API keys, JWT, private keys), keyword & context rules, entropy check for secrets. Pluggable detector interface so an ML/NER detector can be added later. |
| 4b | **Classification Engine** | Map each span to a category — `PII`, `FINANCIAL`, `CREDENTIAL`, `CONFIDENTIAL`, `HEALTH`, `NONE` — with sensitivity level (LOW/MEDIUM/HIGH/CRITICAL) and confidence score. |
| 4c | **Risk Engine (LRI)** | Compute the Leakage Risk Index per message (see §7). Inputs: span sensitivity, count, receiver trust, channel exposure, agent history. |
| 4d | **Policy Engine** | Evaluate declarative rules (JSON/YAML) against message context; first-match-wins with explicit priority; returns effect + obligations. |
| 4e | **Access Control** | Agent-level permission matrix + information-flow constraints (no-read-up / no-write-down style clearance check, category allow-lists per role, external-sink rules). |
| 4f | **Action Engine** | Apply the effect: `ALLOW` (verbatim), `MASK` (partial, e.g. `****1234`), `REDACT` (`[REDACTED:PII]`), `BLOCK` (message not delivered, sender notified). Produces the sanitized payload. |
| 5 | **Audit Logger** | Append-only decision records: message hash, spans, categories, LRI, matched rule, action, latency, human-readable explanation chain. |
| 6 | **Evaluation Engine** | Compare decisions against labelled ground truth in scenarios; compute accuracy, precision, recall, F1, leakage rate, prevention rate, FPR, task-completion rate, p50/p95 latency. |

---

## 3. Data Flow (single message)

1. Simulation layer produces `AgentMessage{ id, scenarioId, from, to, content, intent, ts }`.
2. Communication layer intercepts and calls `gateway.inspect(message)`.
3. Detection → `spans[]`.
4. Classification → `spans[] + {category, sensitivity, confidence}`.
5. Risk Engine → `lri`, `riskBand`.
6. Policy Engine → `matchedRule`, `effect`, `obligations`.
7. Access Control → clearance/flow verdict; may **escalate** effect (never weaken it).
8. Action Engine → `sanitizedContent`, final `action`.
9. Audit Logger → persists `Decision` + `Explanation`.
10. Communication layer delivers sanitized content (or delivery failure on BLOCK).
11. Evaluation Engine aggregates on scenario completion; dashboard streams updates.

Failure modes: engine error or timeout → BLOCK + audit entry `reason=FAIL_CLOSED`.

---

## 4. Database Schema Proposal

In-memory `DatabaseStore` (with optional PostgreSQL migration path). All tables in `public`, owner-scoped.

```text
agents(id, name, role, clearance_level, allowed_categories[], trust_score, is_external, created_at)

scenarios(id, name, description, domain, config_json, ground_truth_json, created_at)

runs(id, scenario_id → scenarios, mode('mock'|'live'), status, started_at, ended_at,
     task_completed bool, metrics_json)

messages(id, run_id → runs, seq, from_agent → agents, to_agent → agents,
         raw_content, sanitized_content, intent, created_at)

detections(id, message_id → messages, start_idx, end_idx, matched_text_hash,
           detector_name, category, sensitivity, confidence)

risk_scores(id, message_id → messages, lri numeric, band, factors_json)

policies(id, name, priority int, enabled bool, condition_json, effect
         ('allow'|'mask'|'redact'|'block'), obligations_json, version, created_at)

decisions(id, message_id → messages, policy_id → policies, action, lri,
          access_control_verdict, explanation_json, latency_ms, created_at)

audit_logs(id, run_id, message_id, actor, event_type, payload_json, prev_hash,
           record_hash, created_at)     -- hash chain = tamper evidence

evaluations(id, run_id → runs, tp, fp, tn, fn, accuracy, precision, recall, f1,
            leakage_rate, prevention_rate, false_positive_rate,
            task_completion_rate, p50_latency_ms, p95_latency_ms, created_at)
```

Every `CREATE TABLE` migration will include explicit `GRANT`s for `authenticated` /
`service_role` before enabling RLS.

---

## 5. API Structure Proposal

Internal app calls use typed server functions; only external/streaming needs raw HTTP routes.

| Purpose | Endpoint / Function | Method |
|---|---|---|
| List/create agents | `agents.list`, `agents.create` | GET / POST |
| List scenarios | `scenarios.list`, `scenarios.get` | GET |
| Start a simulation run | `runs.start({scenarioId, mode})` | POST |
| Run status + messages | `runs.get({runId})` | GET |
| Live stream of messages/decisions | `/api/runs/:id/stream` (SSE) | GET |
| Inspect a single message (core API) | `gateway.inspect({message})` | POST |
| CRUD policies | `policies.list/create/update/toggle` | GET/POST/PATCH |
| Audit trail (filter, paginate) | `audit.list({runId, action, category})` | GET |
| Explanation for one decision | `audit.explain({decisionId})` | GET |
| Evaluation metrics | `evaluation.compute({runId})`, `evaluation.get` | POST/GET |
| Export report | `/api/public/report/:runId` (JSON/CSV) | GET |

---

## 6. Agent Model & Communication Protocol

**Agent**
```ts
type Agent = {
  id: string; name: string;
  role: 'orchestrator' | 'researcher' | 'analyst' | 'finance' | 'hr' | 'external_tool' | 'logger';
  clearanceLevel: 0 | 1 | 2 | 3;          // 3 = highest
  allowedCategories: Category[];           // may receive
  isExternal: boolean;                     // external sink → stricter policy
  trustScore: number;                      // 0–1, decays on violations
};
```

**Message envelope**
```ts
type AgentMessage = {
  id: string; runId: string; seq: number;
  from: AgentId; to: AgentId | 'broadcast';
  channel: 'direct' | 'broadcast' | 'tool_call' | 'memory_write';
  intent: 'request' | 'response' | 'delegate' | 'report' | 'tool_input';
  content: string;
  attachments?: { name: string; text: string }[];
  ts: string;
};
```

**Protocol rules**
1. No direct agent-to-agent delivery — bus only.
2. Bus calls gateway synchronously; delivery uses the returned sanitized content.
3. BLOCK returns a `DeliveryRejected` notice to the sender containing the reason (never the sensitive value).
4. Every envelope and every decision is audited, including ALLOWs.

---

## 7. Leakage Risk Index (LRI)

```text
LRI = 100 × clamp01( w1·S + w2·V + w3·R + w4·C + w5·H )

S = max sensitivity weight of detected spans   (NONE 0, LOW .25, MED .5, HIGH .8, CRIT 1.0)
V = volume factor  = min(1, spanCount / 5)
R = receiver risk  = 1 − receiverTrust, +0.2 if receiver isExternal (clamped)
C = channel risk   (direct .3, broadcast .8, tool_call .9, memory_write .6)
H = sender history = violations / (violations + 10)

default weights: w1=.40  w2=.15  w3=.20  w4=.15  w5=.10
bands: 0–24 LOW · 25–49 MODERATE · 50–74 HIGH · 75–100 CRITICAL
```
Weights are configurable so the evaluation section can report sensitivity analysis.

---

## 8. Policy Model

```json
{
  "id": "pol-004",
  "name": "No credentials to external tools",
  "priority": 10,
  "condition": {
    "categories": ["CREDENTIAL"],
    "receiver": { "isExternal": true },
    "lriAtLeast": 0
  },
  "effect": "block",
  "obligations": ["notify_sender", "audit_high"]
}
```
Evaluation: filter enabled rules → sort by priority asc → first match wins → access control may
escalate (`allow < mask < redact < block`) but never de-escalate. Default effect when no rule
matches: `allow` if LRI < 25, else `redact`.

---

## 9. Folder Structure

```text
src/
  routes/                       # UI + API routes
    index.tsx                   # landing / overview
    simulation.tsx              # scenario runner + live stream
    policies.tsx                # policy editor
    audit.tsx                   # audit trail explorer
    evaluation.tsx              # metrics dashboard
    api/
      runs.$id.stream.ts        # SSE
      public/report.$id.ts      # export
  core/
    types.ts                    # Agent, AgentMessage, Decision, Category...
    agents/                     # agent registry, roles, mock agent behaviours
    comms/                      # message bus + interception hook
    gateway/
      index.ts                  # orchestrator (fail-closed)
      detection/                # regex, validators, entropy, detector interface
      classification/           # category + sensitivity mapping
      risk/                     # LRI computation
      policy/                   # rule evaluation
      access/                   # clearance + information-flow control
      action/                   # mask / redact / block transforms
    audit/                      # hash-chained logger + explanation builder
    evaluation/                 # metric computation
    scenarios/                  # seeded scenarios with ground-truth labels
  lib/
    *.functions.ts              # server functions (client-callable)
    *.server.ts                 # server-only helpers
  components/                   # UI components (shadcn based)
  styles.css                    # design tokens
supabase/migrations/            # SQL schema
ARCHITECTURE.md
```

---

## 10. Technology Recommendations

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + TanStack Start, Tailwind v4, shadcn/ui, Recharts | already the project stack; SSR + typed routing |
| Backend | TanStack `createServerFn` + server routes (edge runtime) | no separate service to deploy |
| Database | In-memory store (DatabaseStore) with optional PostgreSQL migration path | managed in-process, zero external accounts |
| Detection | Pure-TS regex/validator pipeline (Luhn, checksum, Shannon entropy) | deterministic, edge-safe, explainable |
| Classification | Rule/lexicon based + confidence scoring; optional ML detector behind same interface | works offline, upgradeable |
| Policy | JSON rules stored in DB, evaluated in TS | editable at runtime from the UI |
| Streaming | Server-Sent Events | simple, one-way live updates |
  | LLM (optional, later) | Open LLM gateway (configurable via `LLM_MODE` flag) | **off by default; mock agents until then** |
| Charts/report | Recharts + CSV/JSON export | evaluation figures for the paper |

---

## 11. Implementation Roadmap

| Phase | Deliverable |
|---|---|
| **1** | Architecture (this document). |
| **2** | Core types, mock agent registry, message bus, in-memory scenario runner; UI shell with the five routes. |
| **3** | Detection + Classification engines with a test corpus of labelled samples. |
| **4** | Risk Engine (LRI) + Policy Engine + Access Control + Action Engine wired into the gateway (fail-closed). |
| **5** | Audit & explainability: hash-chained log, per-decision rationale, audit explorer UI. |
  | **6** | Self-hosted persistence: in-memory store with full CRUD, SSE live stream. |
| **7** | Evaluation engine: ground-truth scenarios, all nine metrics, dashboard charts, CSV/JSON export. |
| **8** | Hardening & research polish: latency benchmarking, LRI weight sensitivity analysis, ablation (detection-only vs full pipeline), optional live-LLM mode. |

---

## 12. Evaluation Metrics (definitions used in Phase 7)

- **Accuracy / Precision / Recall / F1** — per sensitive-span detection vs ground truth.
- **Leakage Rate** = sensitive items delivered unprotected / total sensitive items.
- **Prevention Rate** = 1 − leakage rate.
- **False-Positive Rate** = non-sensitive spans acted upon / total non-sensitive spans.
- **Task-Completion Rate** = scenarios finishing their goal despite enforcement.
- **Runtime Latency** = gateway p50 / p95 per message, plus overhead vs bypass baseline.
