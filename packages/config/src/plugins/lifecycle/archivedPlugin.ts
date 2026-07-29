// ═══════════════════════════════════════════════════════════════
// Archived State Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";

/**
 * Factory function that creates the archived state evaluation plugin.
 *
 * Evaluation logic:
 * - If `flag.lifecycleState === "archived"` → return `{ resolved: true, value: undefined }`
 *   (archived flags always return undefined, regardless of other configuration)
 * - Otherwise → return `{ resolved: false }` (let pipeline continue)
 *
 * This is the first step in the evaluation pipeline, ensuring archived flags
 * short-circuit before any other evaluation logic runs.
 */
export function archivedPlugin(): EvaluationPlugin {
  return {
    stepId: "archived",

    evaluate(
      flag: ConfigFlagData,
      _context: EvaluationContext,
      _helpers: PipelineHelpers,
    ): PipelineStepResult {
      if (flag.lifecycleState === "archived") {
        return { resolved: true, value: undefined };
      }

      return { resolved: false };
    },
  };
}
