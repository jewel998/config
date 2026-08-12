// ═══════════════════════════════════════════════════════════════
// Prerequisites Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";

/** Options for the prerequisite plugin */
export interface PrerequisitePluginOptions {
  /** Maximum recursion depth for prerequisite evaluation (default: 5) */
  maxDepth?: number;
}

/**
 * Factory function that creates the prerequisites evaluation plugin.
 *
 * Evaluation logic:
 * - If `prerequisites` is undefined/empty → skip (resolved: false)
 * - For each prerequisite:
 *   - Check for circular dependency (flag already in evaluation stack)
 *   - Check for depth exceeded (> maxDepth levels)
 *   - Evaluate the prerequisite flag via helpers.evaluateFlag()
 *   - If the resolved value !== requiredValue → prerequisite is unmet
 * - If any prerequisite is unmet → return flag's default value
 * - If all met → skip (resolved: false), let pipeline continue
 *
 * Circular dependency detection uses a module-level evaluation stack (Set)
 * that tracks which flags are currently being evaluated for prerequisites.
 */
export function prerequisitePlugin(
  options?: PrerequisitePluginOptions,
): EvaluationPlugin {
  const maxDepth = options?.maxDepth ?? 5;

  /** Tracks flags currently being evaluated for prerequisites (cycle detection) */
  const evaluationStack = new Set<string>();

  return {
    stepId: "prerequisites",

    evaluate(
      flag: ConfigFlagData,
      context: EvaluationContext,
      helpers: PipelineHelpers,
    ): PipelineStepResult {
      // No prerequisites configured — skip
      if (!flag.prerequisites || flag.prerequisites.length === 0) {
        return { resolved: false };
      }

      // Check for circular dependency: this flag is already being evaluated
      if (evaluationStack.has(flag.key)) {
        helpers.emitError(
          `Circular dependency detected: flag "${flag.key}" is already in the prerequisite evaluation chain`,
        );
        return { resolved: true, value: flag.value };
      }

      // Check depth: if we've exceeded the max depth, stop
      if (evaluationStack.size >= maxDepth) {
        helpers.emitError(
          `Prerequisite evaluation depth exceeded maximum of ${maxDepth} levels while evaluating flag "${flag.key}"`,
        );
        return { resolved: true, value: flag.value };
      }

      // Add current flag to the evaluation stack
      evaluationStack.add(flag.key);

      try {
        // Evaluate each prerequisite
        for (const prerequisite of flag.prerequisites) {
          const resolvedValue = helpers.evaluateFlag(
            prerequisite.flagKey,
            context,
          );

          // Evaluate using the specified operator (defaults to "equals")
          const op = prerequisite.operator ?? "equals";
          if (
            !evaluatePrerequisiteOp(
              resolvedValue,
              op,
              prerequisite.requiredValue,
            )
          ) {
            return { resolved: true, value: flag.value };
          }
        }

        // All prerequisites met — let pipeline continue
        return { resolved: false };
      } finally {
        // Always remove current flag from the stack after evaluation
        evaluationStack.delete(flag.key);
      }
    },
  };
}

/**
 * Evaluate a prerequisite comparison using the specified operator.
 */
function evaluatePrerequisiteOp(
  actual: unknown,
  operator: string,
  expected: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return actual === expected || String(actual) === String(expected);

    case "not_equals":
      return actual !== expected && String(actual) !== String(expected);

    case "greater_than":
      return Number(actual) > Number(expected);

    case "less_than":
      return Number(actual) < Number(expected);

    case "contains":
      return String(actual ?? "").includes(String(expected));

    default:
      return actual === expected || String(actual) === String(expected);
  }
}
