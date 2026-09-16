/**
 * PRIVAGENTSHIELD FAIL-SAFE POLICY ENGINE
 * Defines defensive system behavior when security subsystems (detectors, matrix solver, DB) encounter exceptions.
 */

export type FailSafeAction = "BLOCK" | "QUARANTINE" | "FALLBACK_ALLOW";

export interface FailSafeConfig {
  mode: "failClosed" | "failOpen";
  detectorFailureAction: FailSafeAction;
  topologyFailureAction: FailSafeAction;
  providerFailureAction: FailSafeAction;
}

export const DEFAULT_FAIL_SAFE_CONFIG: FailSafeConfig = {
  mode: "failClosed", // Default for secure enterprise deployments
  detectorFailureAction: "QUARANTINE",
  topologyFailureAction: "QUARANTINE",
  providerFailureAction: "BLOCK",
};

export class FailSafePolicyManager {
  private config: FailSafeConfig = { ...DEFAULT_FAIL_SAFE_CONFIG };

  getConfig(): FailSafeConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<FailSafeConfig>): FailSafeConfig {
    this.config = { ...this.config, ...updates };
    return this.config;
  }

  handleFailure(subsystem: "detector" | "topology" | "provider", error: unknown): FailSafeAction {
    console.error(`[Fail-Safe Triggered] ${subsystem} subsystem failed:`, error);
    if (this.config.mode === "failOpen") {
      return "FALLBACK_ALLOW";
    }

    if (subsystem === "detector") return this.config.detectorFailureAction;
    if (subsystem === "topology") return this.config.topologyFailureAction;
    return this.config.providerFailureAction;
  }
}

export const failSafeManager = new FailSafePolicyManager();
