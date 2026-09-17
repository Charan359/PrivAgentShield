// experiments/baselines/no_protection.ts
/**
 * Baseline 1: No protection – runs the scenario without any mediation.
 * The runner will be instructed to bypass the mediation pipeline.
 */
export const baselineConfig = {
  name: "no_protection",
  enableMediation: false,
  enableLRI: false,
  enableTopology: false,
  maskingMode: "none",
};
