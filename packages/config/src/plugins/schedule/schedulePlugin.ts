// ═══════════════════════════════════════════════════════════════
// Schedule Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";

/**
 * Factory function that creates the schedule evaluation plugin.
 *
 * Evaluation logic:
 * - If `flag.schedule` is undefined/null → skip (resolved: false)
 * - Parse `flag.schedule.activateAt` as a Date
 * - If activateAt is an invalid date string → skip (graceful degradation)
 * - If Date.parse(activateAt) <= helpers.now() (schedule is in the past or exactly now)
 *   → return scheduled targetValue (Requirement 6.4)
 * - If activateAt is in the future → skip (Requirement 6.5)
 */
export function schedulePlugin(): EvaluationPlugin {
  return {
    stepId: "schedule",

    evaluate(
      flag: ConfigFlagData,
      _context: EvaluationContext,
      helpers: PipelineHelpers,
    ): PipelineStepResult {
      // No schedule configured — skip
      if (flag.schedule == null) {
        return { resolved: false };
      }

      // Parse the activateAt timestamp
      const activateAtMs = Date.parse(flag.schedule.activateAt);

      // Invalid date string — graceful degradation, skip
      if (Number.isNaN(activateAtMs)) {
        return { resolved: false };
      }

      // Schedule is in the past or exactly now — activate
      if (activateAtMs <= helpers.now()) {
        return { resolved: true, value: flag.schedule.targetValue };
      }

      // Schedule is in the future — skip
      return { resolved: false };
    },
  };
}
