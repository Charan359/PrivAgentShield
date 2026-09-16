# PrivAgentShield

> **A Policy-Aware Runtime Framework for Mitigating Sensitive Data Leakage in Multi-Agent LLM Systems**

---

## 1. Research Motivation & The Problem Gap

Multi-agent LLM systems exhibit emergent collaborative workflows where specialized agents coordinate to solve complex goals. However, inter-agent message propagation creates acute data leakage vulnerabilities:
1. **Confused Deputy Attacks**: Low-clearance agents prompt privileged agents to retrieve sensitive records.
2. **Indirect Prompt Injection**: External web-retrieval payloads contain instructions subverting agent instructions.
3. **Downstream Sink Exposure**: Data routed across seemingly internal paths eventually terminates at high-risk external sinks (untrusted APIs, webhooks, or public models).
4. **Boundary Guardrail Blindness**: Traditional boundary guardrails only check the prompt input or the final output, completely missing lateral sensitive transfers within the agent graph.

**PrivAgentShield** addresses this gap by providing an **active, inline, topology-aware runtime mediation layer** that evaluates information-flow violations and downstream sink reachability before dispatching inter-agent envelopes.

---

## 2. Logical Architecture

```
                 MULTI-AGENT SYSTEM
                        |
                        v
              +-------------------+
              | Runtime Proxy     |
              | / Mediation Layer |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Detection Engine  |
              | Tier 1 / 2 / 3    |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Taint Engine      |
              | T*m               |
              +---------+---------+
                        |
                        v
              +-------------------+
              | IFC Engine        |
              | Delta*ij          |
              +---------+---------+
                        |
                        v
              +-------------------+
              | ABAC Policy       |
              | Engine            |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Topology Engine   |
              | Markov Reachability
              | Pi*j              |
              +---------+---------+
                        |
                        v
              +-------------------+
              | LRI* Risk Engine  |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Decision Engine   |
              +----+-------+------+
                   |       |
             +-----+---+---+-----+
             |         |         |
           ALLOW    SANITIZE  QUARANTINE
             |         |         |
             v         v         v
          Dispatch  Transform   Block
                                + Audit
```

---

## 3. Core Mathematical Formulation

### 3.1 Message Sensitivity / Taint ($T_m^*$)
$$T_m^* = \min\left(1.0, \sum_{k} s^*(e_k) \times \omega(e_k)\right)$$

Where:
- $s^*(e_k)$ is the sensitivity severity weight:
  - $L_1 = 0.1$ (General metadata)
  - $L_2 = 0.3$ (Personal information, names, contacts)
  - $L_3 = 0.7$ (Medical, financial, confidential)
  - $L_4 = 1.0$ (Credentials, authentication secrets)
- $\omega(e_k)$ is the entropy modifier:
  $$\omega(e_k) = \begin{cases} \frac{H(e_k)}{H_{\max}} & \text{for secrets (with } H_{\max} = 4.5 \text{ bits/char)} \\ 1.0 & \text{otherwise} \end{cases}$$
  With Shannon entropy: $H(X) = -\sum p(x) \log_2 p(x)$.

### 3.2 Clearance Dominance Violation ($\Delta_{ij}^*$)
$$\Delta_{ij}^*(m) = \begin{cases} 1.0 & \text{if any required sensitivity exceeds recipient clearance} \\ 0.0 & \text{otherwise} \end{cases}$$

### 3.3 Downstream Sink Reachability ($\Pi_j^*$) via Absorbing Markov Chains
Let the agent communication graph be $G = (V, E)$, partitioned into:
- $V_A$: transient agent nodes
- $V_S$: absorbing sink nodes (databases, external APIs, egress gateways)

The transition probability matrix $P$ is structured in canonical form:
$$P = \begin{bmatrix} Q & R \\ 0 & I \end{bmatrix}$$

- $Q$ ($(V_A \times V_A)$): transitions among transient agent nodes.
- $R$ ($(V_A \times V_S)$): transitions from transient agents to absorbing sinks.
- $I$: identity matrix on absorbing sinks.

The **Fundamental Matrix** $N$ represents the expected visits before absorption:
$$N = (I - Q)^{-1}$$

The **Absorption Probability Matrix** $B$ is:
$$B = N \times R$$

The downstream sink reachability for recipient $v_j$ is:
$$\Pi_j^* = \max_{s \in V_S^{\text{ext}}} B[j, s]$$

### 3.4 Final Leakage Risk Index ($\text{LRI}^*$)
$$\text{LRI}^*(v_i, v_j, m) = \max\left(\Delta_{ij}^*(m), T_m^* \times \Pi_j^*\right)$$

---

## 4. Decision Enforcement Engine

Configurable demonstration thresholds:
- $\tau_{\text{low}} = 0.30$
- $\tau_{\text{high}} = 0.70$

$$\text{Decision} = \begin{cases}
\text{ALLOW} & \text{if } \text{LRI}^* < \tau_{\text{low}} \\
\text{SANITIZE} & \text{if } \tau_{\text{low}} \le \text{LRI}^* < \tau_{\text{high}} \\
\text{QUARANTINE} & \text{if } \text{LRI}^* \ge \tau_{\text{high}}
\end{cases}$$

- **ALLOW**: Original payload is dispatched verbatim to destination.
- **SANITIZE**: Session-consistent pseudonymization generates typed surrogates (e.g. `[PERSON_A1F3]`, `[CREDENTIAL_3C91]`) preserving cross-message coreference within a session without leaking sensitive data.
- **QUARANTINE**: Delivery is halted immediately. Event is queued in human review queue for security approval/rejection and recorded in the audit trail.

---

## 5. Cascaded 3-Tier Inspection Pipeline

1. **Tier 1 (Deterministic Pattern & Entropy Matcher)**:
   - SSN, PAN, Aadhaar, IBAN (Mod-97), Credit Card (Luhn checksum), RFC 5322 Email, E.164 Phone, API Keys (`sk_test_...`, `ghp_...`, `AKIA...`), JWT tokens.
   - High-entropy secret token detector ($H > 4.0$ bits/char).
2. **Tier 2 (Deterministic Named Entity Classifier)**:
   - Classification for `PERSON`, `LOCATION`, `ORGANIZATION`, `MEDICAL`, `FINANCIAL`, `CONFIDENTIAL`.
3. **Tier 3 (Deterministic Semantic Security Analyzer)**:
   - Indirect prompt injection detection (`"ignore previous instructions"`).
   - Jailbreak attempts (`"unrestricted mode"`, `"DAN"`).
   - Confused-deputy authority claims (`"On behalf of Admin-Override..."`).
   - Unauthorized bulk export instructions.

---

## 6. Audit System & Cryptographic Hashing

- **Zero Plaintext Sensitive Storage**: Normal audit listings and ledger views expose the cryptographic `payloadHash` (`SHA-256` equivalent), never raw sensitive credentials.
- **Tamper-Evident Hash Chain**: Each audit record stores `recordHash = Hash(data + prevHash)`.

---

## 7. System State & Research Claims Transparency

| State Distinction | Description | Phase 1 Status |
| :--- | :--- | :--- |
| **Live / Demo Simulation** | Interactive runtime with simulated 3-tier engines | **ACTIVE** |
| **Configured Engine** | LRI* thresholds, ABAC policies, clearance vectors | **ACTIVE** |
| **Planned Evaluation** | Benchmark tests on AgentLeak & AgentDojo | **PLANNED** |
| **Measured Empirical** | Real published benchmark measurement | **NOT YET MEASURED** |

> **Ethical Notice**: Phase 1 does **NOT** present fabricated accuracy numbers, fabricated F1 scores, or fabricated 99% prevention rates. All dashboard metrics are explicitly labeled as **SIMULATION TELEMETRY**.

---

## 8. Installation & Quick Start

### Prerequisites
- Node.js >= 20.0.0 (Node 25 tested)
- npm or bun

### Local Setup
```bash
# Clone the repository
git clone <repo-url>
cd phased-prompt-partner-main

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Running Automated Verification Tests
```bash
npx tsx src/test/run.ts
```
The test suite validates:
- Taint calculation ($T_m^*$) and Shannon entropy normalization
- Clearance dominance checks ($\Delta_{ij}^*$)
- Markov reachability calculations ($P$, $Q$, $R$, $N$, $B$, $\Pi_j^*$)
- Minimax $\text{LRI}^*$ calculation and threshold boundary decisions
- Session-consistent pseudonymization coreference preservation
- Quarantine queue approval/rejection lifecycle and cryptographic hashing
- End-to-end runtime mediation scenarios

### Production Build
```bash
npm run build
```

---

## 9. Phase 2 TODO Markers

The following components are architecturally scaffolded and ready for real model/gateway binding in Phase 2:
- [ ] **TODO — Real OpenAI-compatible LLM integration** (`LLMProviderAdapter`)
- [ ] **TODO — Real FastAPI reverse proxy** (`RuntimeProxyAdapter`)
- [ ] **TODO — Native Hyperscan C++ bindings** (`HyperscanDetectorAdapter`)
- [ ] **TODO — Microsoft Presidio integration** (`PresidioAdapter`)
- [ ] **TODO — GLiNER zero-shot entity model** (`GLiNERAdapter`)
- [ ] **TODO — Real transformer security probe** (`TransformerSecurityProbeAdapter`)
- [ ] **TODO — AgentLeak benchmark execution** (`AgentLeakBenchmarkAdapter` C2/C3/C5)
- [ ] **TODO — AgentDojo benchmark execution** (`AgentDojoBenchmarkAdapter`)
- [ ] **TODO — LangGraph, CrewAI, MetaGPT adapters**
- [ ] **TODO — Production PostgreSQL / Supabase RLS hardening**
- [ ] **TODO — Empirical latency benchmarking with confidence intervals**

