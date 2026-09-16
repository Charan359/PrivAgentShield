# PrivAgentShield

> **A Policy-Aware Runtime Framework for Mitigating Sensitive Data Leakage in Multi-Agent LLM Systems**
>
> 🌐 **Live Interactive Demonstration Dashboard**: [https://priv-agent-shield-bice.vercel.app/](https://priv-agent-shield-bice.vercel.app/)
>
> *An active, inline, topology-aware runtime mediation layer combining dynamic Information Flow Control (IFC) and Attribute-Based Access Control (ABAC).*

---

## 👥 Authors & Research Affiliation
- **Charan H S** (`1nc24cd008@ncetmail.com`, `charanhs359@gmail.com`)
- **Kruthika S** (`1nc24cd024@ncetmail.com`, `kruthikasrinivas16@gmail.com`)
- **Dhereen K** (`1nc24cd009@ncetmail.com`)
- **Manju J K** (`1nc24cd028@ncetmail.com`)

*Department of Computer Science and Engineering (Data Science)*  
*Nagarjuna College of Engineering and Technology, Bengaluru, India*

---

## 1. Research Motivation & Problem Gap

Multi-agent LLM systems decompose complex enterprise objectives into cooperative execution graphs involving intermediate scratchpads, shared memory stores, and external tool execution loops. However, inter-agent communication channels introduce severe data leakage vectors:
1. **Confused-Deputy Privilege Laundering**: Low-clearance agents trick high-clearance peers into exfiltrating confidential records to unmonitored external sinks ($C_3$).
2. **Contextual Summary Collapse**: Upstream agents compress reasoning context for downstream collaborators, routinely stripping privacy qualifiers while preserving raw sensitive records ($C_2, C_5$).
3. **Indirect Prompt Injection**: External web-retrieval payloads subvert downstream agent instructions to compel unauthorized data disclosure.
4. **Perimeter Guardrail Blindness**: Conventional boundary filters (e.g., Llama Guard 3, NeMo Guardrails) only inspect terminal input/output, remaining blind to lateral data propagation across internal channels ($C_2, C_3, C_5$).

**PrivAgentShield** resolves this operational gap by deploying an **inline, zero-overhead reverse proxy** that evaluates message sensitivity ($T^*_m$), lattice clearance dominance ($\Delta^*_{ij}$), and downstream Markov graph reachability ($\Pi^*_j$) into a unified minimax risk index ($LRI^*$).

---

## 2. Logical Architecture

```
                       MULTI-AGENT SYSTEM
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Runtime Mediation Proxy    │
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │  Cascaded Inspection Engine   │
               │  Tier 1: Regex & Entropy      │
               │  Tier 2: Statistical NER      │
               │  Tier 3: Transformer Probe    │
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │       LRI* Risk Engine        │
               │  - Message Taint T*m          │
               │  - Clearance Dominance Δ*ij   │
               │  - Markov Reachability Π*j    │
               │  LRI* = max(Δ*ij, T*m · Π*j)  │
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │       Tri-Action Policy       │
               └───┬───────────┼───────────┬───┘
                   │           │           │
                   ▼           ▼           ▼
               [ ALLOW ]  [ SANITIZE ] [QUARANTINE]
              Unmodified   Surrogate     Channel
               Payload     Pseudonym    Severed &
               Forwarded     Tokens      Audited
```

---

## 3. Mathematical Formulation

### 3.1 Message Sensitivity / Taint ($T^*_m$)
$$T^*_m = \min \left( 1.0, \sum_{k=1}^K s^*(e_k) \cdot \omega(e_k) \right)$$
- $s^*(e_k) \in \{0.1, 0.3, 0.7, 1.0\}$ across regulatory tiers $L_1$ to $L_4$ (GDPR, HIPAA).
- $\omega(e_k) = \frac{H(e_k)}{H_{\max}}$ uses Shannon entropy to isolate cryptographic tokens from random text.

### 3.2 Lattice Clearance Dominance ($\Delta^*_{ij}$)
$$\Delta^*_{ij}(m) = \begin{cases} 1.0, & \text{if } \exists c \in \mathcal{C} : R_{m,c} \not\sqsubseteq C_{j,c} \\ 0.0, & \text{if } \forall c \in \mathcal{C} : R_{m,c} \sqsubseteq C_{j,c} \end{cases}$$
Enforces strict partial-order dominance across the confidentiality lattice $(\mathcal{L}, \sqsubseteq)$.

### 3.3 Downstream Sink Reachability ($\Pi^*_j$) via Absorbing Markov Chains
With canonical transition matrix $P = \begin{bmatrix} Q & R \\ \mathbf{0} & I \end{bmatrix}$ and fundamental matrix $N = (I - Q)^{-1}$:
$$\Pi^*_j = \max_{s \in V_S} \left[ (I - Q)^{-1} R \right]_{j,s}$$

### 3.4 Unified Non-Compensatory Minimax Risk Index ($LRI^*$)
$$LRI^*(v_i, v_j, m) = \max \left( \Delta^*_{ij}(m), \; T^*_m \cdot \Pi^*_j \right)$$

### 3.5 Operational Tri-Action Enforcement
$$\text{Action}(m) = \begin{cases} 
\text{ALLOW}(m), & LRI^* < 0.30 \\ 
\text{SANITIZE}(m, \mathcal{M}), & 0.30 \le LRI^* < 0.70 \\ 
\text{QUARANTINE}(v_i), & LRI^* \ge 0.70 
\end{cases}$$

---

## 4. Empirical Evaluation & Benchmark Results

Evaluated across a multi-agent vulnerability benchmark of 31 labeled execution traces spanning 10 internal attack scenarios (S1–S10) and safe cooperative baselines.

### 4.1 Benchmark Evaluation Metrics
| Framework | Leakage ($C_2$) | Leakage ($C_3$) | Task Compl. ($TCR$) |
|:---|:---:|:---:|:---:|
| **Baseline 1: None (Unprotected)** | 78.4% | 85.2% | 100.0% (Ref.) |
| **Baseline 2: Llama Guard 3** | 62.1% | 74.5% | 81.3% |
| **Baseline 3: Presidio Uniform** | 48.0% | 52.0% | 61.2% |
| **Baseline 4: IFC w/o Topology** | 58.3% | 61.7% | 68.0% |
| **PrivAgentShield (Ours)** | **35.0%** | **31.2%** | **74.2%** |

### 4.2 Ablation Study Matrix
| Ablation Configuration | Prevention ($PR$) | False Positive Rate ($FPR$) | Task Compl. ($TCR$) |
|:---|:---:|:---:|:---:|
| **Config A: Full Engine** | **65.0%** | **36.4%** | **74.2%** |
| **Config B: Without $LRI^*$ Logic** | 55.0% | 42.1% | 68.4% |
| **Config C: No Reachability ($\Pi^*_j=1.0$)** | 75.0% | 54.5% | 74.2% |
| **Config D: Destructive Masking (***)** | 65.0% | 36.4% | 51.6% |
| **Config E: Single-Tier Semantic** | 65.0% | 36.4% | 67.7% |

### 4.3 Operational Latency Overhead
- **Mean Mediation Latency**: `1.66 ms`
- **P95 Latency**: `4.87 ms`
- **P99 Latency**: `14.88 ms`
- **Throughput**: `602.2 messages/second`

---

## 5. Quick Start & Execution

### Prerequisites
- Node.js >= 20.0.0 (Tested on Node.js v25)
- npm or bun

### Installation
```bash
# Clone the repository
git clone https://github.com/Charan359/PrivAgentShield.git
cd PrivAgentShield

# Install dependencies
npm install
```

### Run Local Interactive Telemetry Dashboard
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to explore the live React Flow topology visualizer, live payload diffing, and audit telemetry.

### Run End-to-End Empirical Experiment Suite
```bash
# Executes Full Benchmark + 9 Ablation Studies + LaTeX Exporters
npx tsx src/experiments/entry-point.ts
```

### Run Automated Security Regression Suite
```bash
# 23 Formal Security Verification Tests (Groups A–K + Properties P1–P6)
npx tsx src/test/security-regression.ts

# Phase 2 Multi-Channel Suite (40/40 Tests)
npx tsx src/test/run-phase2.ts
```

### Build for Production
```bash
npm run build
```

---

## 6. Repository Structure

```
PrivAgentShield/
├── main.tex                       # IEEE Conference Paper LaTeX source
├── ablation_chart.png             # Empirical ablation chart (Figure 1)
├── latency_chart.png              # System latency chart (Figure 2)
├── EXPERIMENT_REPORT.md           # Full empirical evaluation report
├── SECURITY_TEST_REPORT.md        # 23-test security verification report
├── src/
│   ├── detection/                 # Cascaded 3-tier inspection pipeline
│   ├── lib/
│   │   ├── lri/                   # Taint, Clearance Lattice, Markov Topology & LRI*
│   │   ├── abac/                  # Attribute-Based Access Control policies
│   │   ├── pseudonymization.ts    # Session-consistent surrogate mapping
│   │   └── quarantine.ts          # Edge severing, rollback & audit logging
│   ├── experiments/               # Synthetic dataset, metrics, ablation & runner
│   ├── routes/                    # Interactive telemetry & management views
│   └── test/                      # Regression and benchmark test suites
└── package.json
```

---

## 7. License & Citation

This project is licensed under the MIT License.

```bibtex
@inproceedings{charan2026privagentshield,
  title={PrivAgentShield: A Policy-Aware Runtime Framework for Mitigating Sensitive Data Leakage in Multi-Agent LLM Systems},
  author={Charan, H S and Kruthika, S and Dhereen, K and Manju, J K},
  booktitle={IEEE Conference Proceedings},
  year={2026}
}
```
