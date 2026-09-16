/**
 * PRIVAGENTSHIELD ABAC ENGINE
 * Evaluates attribute-based access control policies based on agent attributes.
 */

import type { AgentAttribute, Policy, PolicyEffect } from "@/domain/types";
import { dbStore } from "@/database/store";

export type AbacEvaluationResult = {
  allowed: boolean;
  effect: PolicyEffect;
  matchedPolicies: string[];
  reasons: string[];
};

export class ABACEngine {
  evaluate(
    senderAttr: AgentAttribute,
    recipientAttr: AgentAttribute,
    categoriesInPayload: string[],
  ): AbacEvaluationResult {
    const activePolicies = dbStore.getAllPolicies().filter((p) => p.enabled);
    // sort by priority ascending (lower number = higher priority)
    activePolicies.sort((a, b) => a.priority - b.priority);

    const matchedPolicies: string[] = [];
    const reasons: string[] = [];
    let finalEffect: PolicyEffect = "allow";

    for (const policy of activePolicies) {
      const categoryMatch = policy.categories.some((c) =>
        categoriesInPayload.includes(c),
      );
      if (!categoryMatch && !policy.categories.includes("confidential")) continue;

      for (const rule of policy.rules) {
        if (rule.condition.includes("receiver.isExternal == true")) {
          const isExternal = recipientAttr.allowedDestinations.includes("external-api");
          if (isExternal && categoriesInPayload.includes("credentials")) {
            matchedPolicies.push(policy.id);
            reasons.push(`Policy ${policy.id}: ${policy.name}`);
            finalEffect = rule.effect;
            break;
          }
        } else if (rule.condition.includes("category == 'financial'")) {
          if (categoriesInPayload.includes("financial")) {
            matchedPolicies.push(policy.id);
            reasons.push(`Policy ${policy.id}: ${policy.name}`);
            finalEffect = rule.effect;
            break;
          }
        } else if (rule.condition.includes("shared-memory-store")) {
          if (recipientAttr.agentId === "shared-memory-store" && categoriesInPayload.includes("personal")) {
            matchedPolicies.push(policy.id);
            reasons.push(`Policy ${policy.id}: ${policy.name}`);
            finalEffect = rule.effect;
            break;
          }
        }
      }

      if (finalEffect === "quarantine") break;
    }

    return {
      allowed: finalEffect === "allow",
      effect: finalEffect,
      matchedPolicies,
      reasons,
    };
  }
}

export const abacEngine = new ABACEngine();
