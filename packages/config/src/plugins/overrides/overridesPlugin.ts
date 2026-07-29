// ═══════════════════════════════════════════════════════════════
// Overrides Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";

/**
 * Factory function that creates the overrides evaluation plugin.
 *
 * Evaluation logic:
 * - If no userId in context → skip (Req 4.5)
 * - If `flag.overrides` is undefined/null → skip
 * - If userId exists in overrides map AND value is not null/undefined → return override value (Req 4.3)
 * - If userId not in overrides or value is null/undefined → skip (Req 4.4, 4.7)
 */
export function overridesPlugin(): EvaluationPlugin {
  return {
    stepId: "overrides",

    evaluate(
      flag: ConfigFlagData,
      context: EvaluationContext,
      _helpers: PipelineHelpers,
    ): PipelineStepResult {
      // No userId in context — skip override evaluation entirely (Req 4.5)
      if (!context.userId) {
        return { resolved: false };
      }

      // No overrides map configured on this flag — skip
      if (flag.overrides == null) {
        return { resolved: false };
      }

      // Check if userId exists in overrides map
      const userId = context.userId;
      if (!(userId in flag.overrides)) {
        return { resolved: false };
      }

      // userId exists but value is null/undefined — skip (Req 4.7)
      const overrideValue = flag.overrides[userId];
      if (overrideValue == null) {
        return { resolved: false };
      }

      // Override found with a non-null value — return immediately (Req 4.3)
      return { resolved: true, value: overrideValue };
    },
  };
}
