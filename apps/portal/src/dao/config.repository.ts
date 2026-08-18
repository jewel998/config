import { doc, increment, updateDoc } from "firebase/firestore";

import { BaseRepository } from "./base-repository";
import type {
  AuditContext,
  AuthenticatedUser,
  RepositoryContext,
  ValidationError,
} from "./types";
import { RepositoryError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface ConfigEntity {
  id: string;
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";
  version: string;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  locked?: boolean;
  lifecycleState?: "draft" | "active" | "stale" | "archived";
  stateChangedAt?: string;
  targetingRules?: unknown[];
  rolloutPercentage?: number;
  rolloutValue?: unknown;
  overrides?: Record<string, unknown>;
  schedule?: { targetValue: unknown; activateAt: string };
  prerequisites?: Array<{
    flagKey: string;
    operator?: string;
    requiredValue: unknown;
  }>;
}

export interface ConfigCreateInput {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";
  lifecycleState?: string;
  targetingRules?: unknown[];
  rolloutPercentage?: number;
  rolloutValue?: unknown;
  overrides?: Record<string, unknown>;
  schedule?: { targetValue: unknown; activateAt: string };
  prerequisites?: Array<{
    flagKey: string;
    operator?: string;
    requiredValue: unknown;
  }>;
  [key: string]: unknown;
}

export interface ConfigUpdateInput {
  value?: unknown;
  valueType?: "string" | "number" | "boolean" | "json" | "array";
  locked?: boolean;
  lifecycleState?: string;
  targetingRules?: unknown[];
  rolloutPercentage?: number;
  rolloutValue?: unknown;
  overrides?: Record<string, unknown>;
  schedule?: { targetValue: unknown; activateAt: string } | null;
  prerequisites?: Array<{
    flagKey: string;
    operator?: string;
    requiredValue: unknown;
  }>;
  _allowLockedOverride?: boolean;
  [key: string]: unknown;
}

// ─── Validation Constants ────────────────────────────────────

const KEY_PATTERN = /^[a-zA-Z0-9._]+$/;
const MAX_KEY_LENGTH = 100;
const VALID_VALUE_TYPES = ["string", "number", "boolean", "json", "array"];
const VALID_LIFECYCLE_STATES = ["draft", "active", "stale", "archived"];

// ─── ConfigRepository ────────────────────────────────────────

export class ConfigRepository extends BaseRepository<
  ConfigEntity,
  ConfigCreateInput,
  ConfigUpdateInput
> {
  protected collectionPath(ctx: RepositoryContext): string {
    if (!ctx.environmentId) {
      throw new RepositoryError("environmentId is required", "MISSING_CONTEXT");
    }
    return `projects/${ctx.projectId}/environments/${ctx.environmentId}/configs`;
  }

  protected queryKeys(ctx: RepositoryContext): string[][] {
    return [
      ["configs", ctx.projectId, ctx.environmentId ?? ""],
      ["audit_log", ctx.projectId],
    ];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: ConfigCreateInput | ConfigUpdateInput,
    oldEntity?: ConfigEntity | null,
    newEntity?: ConfigEntity,
  ): AuditContext {
    const key =
      (input as ConfigCreateInput)?.key ??
      oldEntity?.key ??
      newEntity?.key ??
      "unknown";
    return {
      actorId: "", // Will be set by caller
      action: operation,
      resourcePath: `environments/${ctx.environmentId}/configs/${key}`,
      oldValue: oldEntity
        ? { value: oldEntity.value, valueType: oldEntity.valueType }
        : undefined,
      newValue: input
        ? {
            value: (input as ConfigCreateInput).value,
            valueType: (input as ConfigCreateInput).valueType,
          }
        : undefined,
    };
  }

  // ─── Validation ────────────────────────────────────────────

  protected validate(
    input: ConfigCreateInput | ConfigUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (operation === "create") {
      const createInput = input as ConfigCreateInput;

      // Required fields for create
      if (!createInput.key) {
        errors.push({
          field: "key",
          message: "Key is required",
          code: "REQUIRED",
        });
      } else {
        if (createInput.key.length > MAX_KEY_LENGTH) {
          errors.push({
            field: "key",
            message: "Key too long (max 100)",
            code: "KEY_TOO_LONG",
          });
        } else if (!KEY_PATTERN.test(createInput.key)) {
          errors.push({
            field: "key",
            message: "Invalid key format",
            code: "INVALID_KEY_FORMAT",
          });
        }
      }

      if (createInput.value === undefined || createInput.value === null) {
        errors.push({
          field: "value",
          message: "Value is required",
          code: "REQUIRED",
        });
      }

      if (!createInput.valueType) {
        errors.push({
          field: "valueType",
          message: "ValueType is required",
          code: "REQUIRED",
        });
      } else if (!VALID_VALUE_TYPES.includes(createInput.valueType)) {
        errors.push({
          field: "valueType",
          message: "Unsupported value type",
          code: "INVALID_VALUE_TYPE",
        });
      }
    }

    // Value-type consistency (for both create and update)
    const valueType = (input as ConfigCreateInput).valueType;
    const value = (input as ConfigCreateInput).value;

    if (valueType && value !== undefined && value !== null) {
      this.validateValueTypeConsistency(value, valueType, errors);
    }

    // Lifecycle state
    if ("lifecycleState" in input && input.lifecycleState) {
      if (!VALID_LIFECYCLE_STATES.includes(input.lifecycleState)) {
        errors.push({
          field: "lifecycleState",
          message: "Invalid lifecycle state",
          code: "INVALID_LIFECYCLE",
        });
      }
    }

    // Rollout
    if ("rolloutPercentage" in input && input.rolloutPercentage !== undefined) {
      const pct = Number(input.rolloutPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        errors.push({
          field: "rolloutPercentage",
          message: "Must be 0-100",
          code: "INVALID_ROLLOUT",
        });
      }
    }

    // Schedule
    if ("schedule" in input && input.schedule) {
      if (!input.schedule.activateAt) {
        errors.push({
          field: "schedule.activateAt",
          message: "activateAt is required",
          code: "REQUIRED",
        });
      } else if (isNaN(new Date(input.schedule.activateAt).getTime())) {
        errors.push({
          field: "schedule.activateAt",
          message: "Invalid ISO date",
          code: "INVALID_DATE",
        });
      }
    }

    return errors;
  }

  private validateValueTypeConsistency(
    value: unknown,
    valueType: string,
    errors: ValidationError[],
  ): void {
    switch (valueType) {
      case "number":
        if (isNaN(Number(value))) {
          errors.push({
            field: "value",
            message: "Invalid number value",
            code: "INVALID_NUMBER",
          });
        }
        break;
      case "boolean":
        if (typeof value === "string") {
          if (value !== "true" && value !== "false") {
            errors.push({
              field: "value",
              message: "Must be true or false",
              code: "INVALID_BOOLEAN",
            });
          }
        } else if (typeof value !== "boolean") {
          errors.push({
            field: "value",
            message: "Must be true or false",
            code: "INVALID_BOOLEAN",
          });
        }
        break;
      case "json":
        if (typeof value === "string") {
          try {
            JSON.parse(value);
          } catch {
            errors.push({
              field: "value",
              message: "Invalid JSON",
              code: "INVALID_JSON",
            });
          }
        } else if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          errors.push({
            field: "value",
            message: "Invalid JSON value",
            code: "INVALID_JSON",
          });
        }
        break;
      case "array":
        if (typeof value === "string") {
          try {
            if (!Array.isArray(JSON.parse(value))) {
              errors.push({
                field: "value",
                message: "Must be a JSON array",
                code: "INVALID_ARRAY",
              });
            }
          } catch {
            errors.push({
              field: "value",
              message: "Invalid array value",
              code: "INVALID_ARRAY",
            });
          }
        } else if (!Array.isArray(value)) {
          errors.push({
            field: "value",
            message: "Must be an array",
            code: "INVALID_ARRAY",
          });
        }
        break;
    }
  }

  // ─── Lifecycle Hooks ───────────────────────────────────────

  protected async beforeUpdate(
    id: string,
    input: ConfigUpdateInput,
    ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {
    // Locked config check
    if (input._allowLockedOverride) return;
    const existing = await this.getById(id, ctx);
    if (existing?.locked) {
      throw new RepositoryError("Config is locked", "CONFIG_LOCKED");
    }
  }

  protected async afterCreate(
    entity: ConfigEntity,
    ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {
    await this.bumpVersion(ctx, [entity.key]);
  }

  protected async afterUpdate(
    entity: ConfigEntity,
    ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {
    await this.bumpVersion(ctx, [entity.key]);
  }

  // ─── Version Bump ──────────────────────────────────────────

  private async bumpVersion(
    ctx: RepositoryContext,
    changedKeys: string[],
  ): Promise<void> {
    const envRef = doc(
      this.firestore,
      "projects",
      ctx.projectId,
      "environments",
      ctx.environmentId!,
    );
    await updateDoc(envRef, {
      configVersion: increment(1),
      lastChangedKeys: changedKeys,
      lastChangedAt: new Date().toISOString(),
    });
  }
}
