// ═══════════════════════════════════════════════════════════════
// Server-Side Evaluation Engine
// Replicates the SDK plugin pipeline on the server.
// Pipeline order: archived → prerequisites → overrides → schedule → targeting → rollout → default
// ═══════════════════════════════════════════════════════════════

import { isInRollout } from "./rollout-hash";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface UserContext {
  userId?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
}

export interface EvaluationWarning {
  key: string;
  reason: "evaluation_error" | "segment_not_found" | "prerequisite_failed";
  message: string;
}

export interface ConfigDoc {
  key: string;
  value: unknown;
  valueType: string;
  version?: string;
  lifecycleState?: string;
  targetingRules?: TargetingRule[];
  rolloutPercentage?: number;
  rolloutValue?: unknown;
  overrides?: Record<string, unknown>;
  schedule?: { targetValue: unknown; activateAt: string };
  prerequisites?: Array<{ flagKey: string; requiredValue: unknown }>;
}

export interface SegmentDoc {
  id: string;
  name: string;
  conditions: PredicateGroup[];
}

interface TargetingRule {
  id: string;
  priority: number;
  value: unknown;
  conditions: PredicateGroup[];
}

interface PredicateGroup {
  predicates: Predicate[];
}

interface Predicate {
  attribute: string;
  operator: string;
  value: string | number | boolean | string[];
}

interface EvalResult {
  value: unknown;
  warning?: EvaluationWarning;
}

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate all configs for a given user context.
 * Returns resolved values and any evaluation warnings.
 */
export function evaluateConfigsForContext(
  configs: ConfigDoc[],
  segments: Record<string, SegmentDoc>,
  context: UserContext | null,
): { data: Record<string, unknown>; warnings: EvaluationWarning[] } {
  const data: Record<string, unknown> = {};
  const warnings: EvaluationWarning[] = [];

  // Build a map for prerequisite lookups
  const configMap = new Map<string, ConfigDoc>();
  for (const config of configs) {
    configMap.set(config.key, config);
  }

  for (const config of configs) {
    try {
      const result = evaluatePipeline(config, segments, context, configMap);
      data[config.key] = result.value;
      if (result.warning) warnings.push(result.warning);
    } catch {
      // If evaluation fails entirely, return default value
      data[config.key] = config.value;
      warnings.push({
        key: config.key,
        reason: "evaluation_error",
        message: `Evaluation failed for ${config.key}, returning default value`,
      });
    }
  }

  return { data, warnings };
}

// ═══════════════════════════════════════════════════════════════
// Pipeline
// ═══════════════════════════════════════════════════════════════

function evaluatePipeline(
  config: ConfigDoc,
  segments: Record<string, SegmentDoc>,
  context: UserContext | null,
  configMap: Map<string, ConfigDoc>,
): EvalResult {
  // Step 1: Archived check
  if (config.lifecycleState === "archived") {
    return { value: undefined };
  }

  // Step 2: Prerequisites
  if (config.prerequisites && config.prerequisites.length > 0) {
    for (const prereq of config.prerequisites) {
      const prereqConfig = configMap.get(prereq.flagKey);
      if (!prereqConfig) {
        return {
          value: config.value,
          warning: {
            key: config.key,
            reason: "prerequisite_failed",
            message: `Prerequisite flag "${prereq.flagKey}" not found`,
          },
        };
      }
      // Evaluate prerequisite (without recursing into its own prerequisites to avoid loops)
      const prereqValue = resolveSimpleValue(prereqConfig, segments, context);
      if (prereqValue !== prereq.requiredValue) {
        // Prerequisite not met — return default value
        return { value: config.value };
      }
    }
  }

  // Step 3: User overrides
  if (config.overrides && context?.userId) {
    if (context.userId in config.overrides) {
      return { value: config.overrides[context.userId] };
    }
  }

  // Step 4: Schedule
  if (config.schedule) {
    const activateAt = new Date(config.schedule.activateAt).getTime();
    if (Date.now() >= activateAt) {
      return { value: config.schedule.targetValue };
    }
  }

  // Step 5: Targeting rules
  if (config.targetingRules && config.targetingRules.length > 0) {
    const targetingResult = evaluateTargetingRules(
      config.targetingRules,
      segments,
      context,
    );
    if (targetingResult.resolved) {
      return { value: targetingResult.value };
    }
  }

  // Step 6: Rollout
  if (config.rolloutPercentage != null && config.rolloutPercentage > 0) {
    if (config.rolloutPercentage >= 100) {
      return { value: config.rolloutValue };
    }
    const userId = context?.userId;
    if (userId && isInRollout(userId, config.key, config.rolloutPercentage)) {
      return { value: config.rolloutValue };
    }
  }

  // Default: return base value
  return { value: config.value };
}

/**
 * Simple value resolution for prerequisites (no recursion into prereqs).
 */
function resolveSimpleValue(
  config: ConfigDoc,
  segments: Record<string, SegmentDoc>,
  context: UserContext | null,
): unknown {
  if (config.lifecycleState === "archived") return undefined;

  if (
    config.overrides &&
    context?.userId &&
    context.userId in config.overrides
  ) {
    return config.overrides[context.userId];
  }

  if (config.schedule) {
    const activateAt = new Date(config.schedule.activateAt).getTime();
    if (Date.now() >= activateAt) return config.schedule.targetValue;
  }

  if (config.targetingRules && config.targetingRules.length > 0) {
    const result = evaluateTargetingRules(
      config.targetingRules,
      segments,
      context,
    );
    if (result.resolved) return result.value;
  }

  if (config.rolloutPercentage != null && config.rolloutPercentage > 0) {
    if (config.rolloutPercentage >= 100) return config.rolloutValue;
    const userId = context?.userId;
    if (userId && isInRollout(userId, config.key, config.rolloutPercentage)) {
      return config.rolloutValue;
    }
  }

  return config.value;
}

// ═══════════════════════════════════════════════════════════════
// Targeting Rules Evaluation
// ═══════════════════════════════════════════════════════════════

function evaluateTargetingRules(
  rules: TargetingRule[],
  segments: Record<string, SegmentDoc>,
  context: UserContext | null,
): { resolved: boolean; value?: unknown } {
  if (!rules || rules.length === 0) return { resolved: false };

  // Sort by priority (lowest number = highest priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const attributes = context?.attributes ?? {};

  for (const rule of sorted) {
    if (evaluateConditionGroups(rule.conditions, attributes, segments)) {
      return { resolved: true, value: rule.value };
    }
  }

  return { resolved: false };
}

/**
 * Evaluate predicate groups in DNF (OR of ANDs).
 * At least one group must fully match.
 */
function evaluateConditionGroups(
  groups: PredicateGroup[],
  attributes: Record<string, string | number | boolean | string[]>,
  segments: Record<string, SegmentDoc>,
): boolean {
  if (!groups || groups.length === 0) return false;

  return groups.some((group) =>
    group.predicates.every((pred) =>
      evaluatePredicate(pred, attributes, segments),
    ),
  );
}

/**
 * Evaluate a single predicate against user attributes.
 * Handles segment-based predicates specially.
 */
function evaluatePredicate(
  pred: Predicate,
  attributes: Record<string, string | number | boolean | string[]>,
  segments: Record<string, SegmentDoc>,
): boolean {
  const { attribute, operator, value } = pred;

  // Special: segment-based targeting rule (attribute === "_segment")
  if (attribute === "_segment" && operator === "in_segment") {
    const segmentIds = Array.isArray(value) ? value : [value];
    // OR logic: user must be in ANY of the listed segments
    return segmentIds.some((segId) => {
      const segment = segments[String(segId)];
      if (!segment) return false;
      return evaluateConditionGroups(segment.conditions, attributes, segments);
    });
  }

  // Standard in_segment operator (single segment reference)
  if (operator === "in_segment") {
    const segId = String(value);
    const segment = segments[segId];
    if (!segment) return false;
    return evaluateConditionGroups(segment.conditions, attributes, segments);
  }

  if (operator === "not_in_segment") {
    const segId = String(value);
    const segment = segments[segId];
    if (!segment) return false;
    return !evaluateConditionGroups(segment.conditions, attributes, segments);
  }

  // Get attribute value from user context
  const attrValue = attributes[attribute];

  switch (operator) {
    case "equals":
      return String(attrValue) === String(value);

    case "not_equals":
      return String(attrValue) !== String(value);

    case "contains":
      return String(attrValue ?? "").includes(String(value));

    case "starts_with":
      return String(attrValue ?? "").startsWith(String(value));

    case "ends_with":
      return String(attrValue ?? "").endsWith(String(value));

    case "in_list": {
      const list = Array.isArray(value)
        ? value.map(String)
        : String(value)
            .split(",")
            .map((s) => s.trim());
      return list.includes(String(attrValue));
    }

    case "not_in_list": {
      const list = Array.isArray(value)
        ? value.map(String)
        : String(value)
            .split(",")
            .map((s) => s.trim());
      return !list.includes(String(attrValue));
    }

    case "greater_than":
      return Number(attrValue) > Number(value);

    case "less_than":
      return Number(attrValue) < Number(value);

    case "regex_match": {
      try {
        const regex = new RegExp(String(value));
        return regex.test(String(attrValue ?? ""));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}
