# Experiments Framework

This directory contains the reproducible evaluation framework for Phase 4.

## Layout
```
experiments/
├─ configs/          # YAML/JSON experiment configurations
├─ datasets/         # External benchmark datasets (git‑ignored)
├─ scenarios/        # Controlled scenario definitions
├─ baselines/        # Baseline pipeline implementations
├─ results/
│   ├─ raw/         # Raw JSON logs per run
│   ├─ processed/   # Aggregated CSV/JSON summaries
│   ├─ plots/       # Generated figures (PNG/SVG)
│   └─ reports/     # Auto‑generated markdown reports
├─ entry-point.ts    # CLI entry that validates env & runs experiments
├─ runner.ts         # Core experiment orchestration
├─ store.ts          # Filesystem storage utilities
├─ metrics.ts        # Security & performance metric calculations
├─ statistics.ts    # Statistical analysis helpers
├─ threshold-experiment.ts  # Threshold sweep implementation
├─ topology-experiment.ts   # Topology‑controlled experiment
├─ ablation.ts               # Ablation study runner
└─ export.ts                 # Table & figure generation
```

Run the full suite with:
```
npm run phase4   # defined in package.json → calls `node experiments/entry-point.js`
```

Refer to `README.md` in the repository root for overall project information.
