// ═══════════════════════════════════════════════════════════════
// Targeting Rules Evaluation Plugin
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData, Predicate, PredicateGroup, Segment } from "../models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepResult,
} from "../types.js";
import { evaluatePredicate } from "./predicates.js";
import { resolveSegment } from "./segmentResolver.js";

type AttributeValue = string | number | boolean | string[];

/**
 * Evaluate a single predicate, handling segment-based predicates specially.
 *
 * For `in_segment` / `not_in_segment` operators, delegates to the segment
 * resolver rather than the default predicate evaluator.
 */
function evaluatePredicateWithSegments(
  predicate: Predicate,
  attributes: Record<string, AttributeValue>,
  segments: Record<string, Segment>,
  emitError?: (message: string) => void,
): boolean {
  if (predicate.operator === "in_segment") {
    const segmentId = String(predicate.value);
    return resolveSegment(segmentId, segments, attributes, emitError);
  }

  if (predicate.operator === "not_in_segment") {
    const segmentId = String(predicate.value);
    return !resolveSegment(segmentId, segments, attributes, emitError);
  }

  return evaluatePredicate(predicate, attributes, emitError);
}

/**
 * Evaluate predicate groups in DNF with segment resolution support.
 *
 * Groups are OR'd — any group matching means the whole expression matches.
 * Within each group, predicates are AND'd — all must match.
 */
function evaluatePredicateGroupsWithSegments(
  groups: PredicateGroup[],
  attributes: Record<string, AttributeValue>,
  segments: Record<string, Segment>,
  emitError?: (message: string) => void,
): boolean {
  if (groups.length === 0) {
    return false;
  }

  // OR across groups: at least one group must fully match
  return groups.some((group) => {
    // AND within each group: all predicates must match
    return group.predicates.every((predicate) =>
      evaluatePredicateWithSegments(predicate, attributes, segments, emitError),
    );
  });
}

/**
 * Factory function that creates the targeting rules evaluation plugin.
 *
 * Accepts an optional segments map for resolving `in_segment`/`not_in_segment`
 * predicates within targeting rules.
 *
 * Evaluation logic:
 * 1. stepId: "targeting"
 * 2. If `flag.targetingRules` is undefined or empty → return { resolved: false }
 * 3. Sort rules by priority (lowest number first); same priority → preserve insertion order
 * 4. For each rule: evaluate its conditions (predicate groups in DNF)
 * 5. For predicates with in_segment/not_in_segment: use segment resolver
 * 6. First matching rule → return { resolved: true, value: rule.value }
 * 7. No rule matches → return { resolved: false }
 */
export function targetingPlugin(
  segments?: Record<string, Segment>,
): EvaluationPlugin {
  const segmentsMap = segments ?? {};

  return {
    stepId: "targeting",

    evaluate(
      flag: ConfigFlagData,
      context: EvaluationContext,
      helpers: PipelineHelpers,
    ): PipelineStepResult {
      // No targeting rules configured — skip
      if (!flag.targetingRules || flag.targetingRules.length === 0) {
        return { resolved: false };
      }

      // Sort rules by priority (lowest number = highest priority).
      // Array.prototype.sort is stable in modern JS — same priority preserves insertion order.
      const sortedRules = [...flag.targetingRules].sort(
        (a, b) => a.priority - b.priority,
      );

      // Build attributes from context (default to empty object)
      const attributes: Record<string, AttributeValue> = context.attributes ?? {};

      // Evaluate each rule in priority order
      for (const rule of sortedRules) {
        const matches = evaluatePredicateGroupsWithSegments(
          rule.conditions,
          attributes,
          segmentsMap,
          helpers.emitError,
        );

        if (matches) {
          return { resolved: true, value: rule.value };
        }
      }

      // No rule matched
      return { resolved: false };
    },
  };
}
