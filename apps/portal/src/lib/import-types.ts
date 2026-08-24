/**
 * Extended import entry supporting all config properties including
 * targeting rules, rollout, overrides, schedule, and prerequisites.
 */
export interface ImportEntryFull {
  // ─── Required Base Fields ──────────────────────────────────
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";

  // ─── Optional Advanced Fields ──────────────────────────────
  /** Lifecycle state (defaults to "active" if not provided) */
  lifecycleState?: "draft" | "active" | "stale" | "archived";

  /** Targeting rules — evaluated in priority order */
  targetingRules?: Array<{
    id: string;
    priority: number;
    value: unknown;
    conditions: Array<{
      predicates: Array<{
        attribute: string;
        operator:
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
        value: string | number | boolean | string[];
      }>;
    }>;
  }>;

  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;
  /** Value served to users in the rollout bucket */
  rolloutValue?: unknown;

  /** Per-user value overrides: userId → value */
  overrides?: Record<string, unknown>;

  /** Scheduled value change */
  schedule?: {
    targetValue: unknown;
    /** ISO 8601 UTC datetime */
    activateAt: string;
  };

  /** Flag prerequisites — must be satisfied before this flag evaluates */
  prerequisites?: Array<{
    flagKey: string;
    operator?: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
    requiredValue: unknown;
  }>;
}

/** Validation error for an import entry */
export interface ImportValidationError {
  rowNumber: number;
  key: string;
  field: string;
  reason: string;
}
