// ═══════════════════════════════════════════════════════════════
// Rollout Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";
import { computeBucket } from "./computeBucket.js";

/**
 * Factory function that creates the rollout evaluation plugin.
 *
 * Evaluation logic:
 * - If `rolloutPercentage` is undefined/null → skip (resolved: false)
 * - If rolloutPercentage is 0 → skip (let pipeline continue to default)
 * - If rolloutPercentage is 100 → return rollout value
 * - If no userId in context → skip (can't bucket without userId)
 * - Otherwise: compute bucket, if bucket < rolloutPercentage → return rollout value, else skip
 */
export function rolloutPlugin(): EvaluationPlugin {
  return {
    stepId: "rollout",

    evaluate(
      flag: ConfigFlagData,
      context: EvaluationContext,
      _helpers: PipelineHelpers,
    ): PipelineStepResult {
      // No rollout configured — skip
      if (flag.rolloutPercentage == null) {
        return { resolved: false };
      }

      // 0% — no one gets the rollout value; let pipeline continue to default
      if (flag.rolloutPercentage === 0) {
        return { resolved: false };
      }

      // 100% — everyone gets the rollout value
      if (flag.rolloutPercentage === 100) {
        return { resolved: true, value: flag.rolloutValue };
      }

      // No userId — can't compute a bucket; skip
      if (!context.userId) {
        return { resolved: false };
      }

      // Compute deterministic bucket and compare against percentage
      const bucket = computeBucket(flag.key, context.userId);
      if (bucket < flag.rolloutPercentage) {
        return { resolved: true, value: flag.rolloutValue };
      }

      return { resolved: false };
    },
  };
}
