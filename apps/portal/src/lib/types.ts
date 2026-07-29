import { z } from "zod";

/** A single config entry stored per environment */
export interface ConfigEntry {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";
  version: string;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  locked?: boolean;
}

/** The set of supported value types */
export type ConfigValueType = ConfigEntry["valueType"];

/** Validation schema for config values (discriminated union by valueType) */
export const configValueSchema = z.discriminatedUnion("valueType", [
  z.object({ valueType: z.literal("string"), value: z.string() }),
  z.object({ valueType: z.literal("number"), value: z.number() }),
  z.object({ valueType: z.literal("boolean"), value: z.boolean() }),
  z.object({
    valueType: z.literal("json"),
    value: z.string().refine((v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "Invalid JSON"),
  }),
  z.object({
    valueType: z.literal("array"),
    value: z.string().refine((v) => {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p);
      } catch {
        return false;
      }
    }, "Must be a valid JSON array"),
  }),
]);

/** Validation schema for config keys */
export const configKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(100, "Key must be 100 characters or less")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Only alphanumeric, dots, and underscores allowed",
  );

/** An environment within a project */
export interface Environment {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  color?: string;
  isProduction?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** An API key for SDK authentication */
export interface ApiKey {
  token: string;
  label: string;
  status: "active" | "revoked";
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
}

/** A project entity */
export interface Project {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// Advanced Feature Management Types
// ═══════════════════════════════════════════════════════════════

/** Extended config entry with advanced feature management fields */
export interface ConfigFlagExtended extends ConfigEntry {
  lifecycleState: "draft" | "active" | "stale" | "archived";
  stateChangedAt: string;
  targetingRules?: TargetingRule[];
  rolloutPercentage?: number;
  rolloutValue?: unknown;
  overrides?: Record<string, unknown>;
  schedule?: {
    targetValue: unknown;
    activateAt: string;
  };
  prerequisites?: Array<{
    flagKey: string;
    requiredValue: unknown;
  }>;
}

/** Targeting rule for the portal */
export interface TargetingRule {
  id: string;
  priority: number;
  value: unknown;
  conditions: PredicateGroup[];
}

export interface PredicateGroup {
  predicates: Predicate[];
}

export interface Predicate {
  attribute: string;
  operator: PredicateOperator;
  value: string | number | boolean | string[];
}

export type PredicateOperator =
  | "equals" | "not_equals" | "contains" | "starts_with" | "ends_with"
  | "in_list" | "not_in_list" | "greater_than" | "less_than"
  | "regex_match" | "in_segment" | "not_in_segment";

export type LifecycleState = "draft" | "active" | "stale" | "archived";

/** Segment stored in projects/{projectId}/segments/{segmentId} */
export interface Segment {
  id: string;
  name: string;
  description: string;
  conditions: PredicateGroup[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Audit log entry stored in projects/{projectId}/audit_log/{entryId} */
export interface AuditEntry {
  id: string;
  actorId: string;
  timestamp: string;
  action: "create" | "update" | "delete" | "state_change" | "data_deletion";
  resourcePath: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, string>;
}

/** Project with RBAC roles map */
export interface ProjectWithRBAC extends Project {
  roles: Record<string, "viewer" | "editor" | "admin">;
  staleDurationDays?: number;
  auditRetentionDays?: number;
}

export type RBACRole = "viewer" | "editor" | "admin";
