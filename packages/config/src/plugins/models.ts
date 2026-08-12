// ═══════════════════════════════════════════════════════════════
// Config Flag Data Models (SDK-side)
// ═══════════════════════════════════════════════════════════════

/** The full config flag document as fetched from Firestore */
export interface ConfigFlagData {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json";
  version: string;
  lifecycleState: "draft" | "active" | "stale" | "archived";

  // Targeting
  targetingRules?: TargetingRule[];

  // Rollout
  rolloutPercentage?: number; // 0-100
  rolloutValue?: unknown;

  // Overrides
  overrides?: Record<string, unknown>; // userId -> value

  // Schedule
  schedule?: {
    targetValue: unknown;
    activateAt: string; // ISO 8601 UTC
  };

  // Prerequisites
  prerequisites?: Array<{
    flagKey: string;
    operator?:
      "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
    requiredValue: unknown;
  }>;
}

/** A single targeting rule */
export interface TargetingRule {
  id: string;
  priority: number; // 1-1000
  value: unknown;
  conditions: PredicateGroup[]; // OR-combined groups (DNF)
}

/** A group of predicates combined with AND logic */
export interface PredicateGroup {
  predicates: Predicate[];
}

/** A single predicate */
export interface Predicate {
  attribute: string;
  operator: PredicateOperator;
  value: string | number | boolean | string[];
}

/** Supported predicate operators */
export type PredicateOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in_list"
  | "not_in_list"
  | "greater_than"
  | "less_than"
  | "regex_match"
  | "in_segment"
  | "not_in_segment";

/** A reusable audience segment */
export interface Segment {
  id: string;
  name: string; // max 100 chars
  description: string; // max 500 chars
  conditions: PredicateGroup[]; // OR-combined groups (DNF), max 20 predicates total
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
