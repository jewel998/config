// ═══════════════════════════════════════════════════════════════
// Pipeline Executor — Sorts plugins into fixed order, iterates,
// short-circuits on first resolved result.
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "./models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepId,
} from "./types.js";
import { PIPELINE_ORDER } from "./types.js";

/**
 * Evaluate a config flag through the plugin pipeline.
 *
 * 1. Builds a lookup map of stepId → plugin from the registered plugins.
 * 2. Iterates through PIPELINE_ORDER (fixed order regardless of registration order).
 * 3. For each step, if a plugin is registered, calls plugin.evaluate().
 * 4. If a plugin returns { resolved: true, value }, returns that value immediately (short-circuit).
 * 5. If no plugin resolves, returns the flag's default value (flag.value).
 *
 * Steps with no registered plugin are transparently skipped.
 */
export function evaluatePipeline(
  plugins: EvaluationPlugin[],
  flag: ConfigFlagData,
  context: EvaluationContext,
  helpers: PipelineHelpers,
): unknown {
  // Build a map from stepId → plugin (last registration wins if duplicates)
  const pluginMap = new Map<PipelineStepId, EvaluationPlugin>();
  for (const plugin of plugins) {
    pluginMap.set(plugin.stepId, plugin);
  }

  // Iterate through the fixed pipeline order
  for (const stepId of PIPELINE_ORDER) {
    const plugin = pluginMap.get(stepId);

    // Skip steps with no registered plugin (Property 21)
    if (!plugin) {
      continue;
    }

    const result = plugin.evaluate(flag, context, helpers);

    // Short-circuit on first resolved result (Requirement 11.2)
    if (result.resolved) {
      return result.value;
    }
  }

  // No step resolved — return the flag's default value
  return flag.value;
}
