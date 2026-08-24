import { BaseRepository } from "./base-repository";
import type { AuditContext, RepositoryContext, ValidationError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface EnvironmentEntity {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  color?: string;
  isProduction?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentCreateInput {
  name: string;
  allowedDomains: string[];
  color?: string;
  isProduction?: boolean;
  [key: string]: unknown;
}

export interface EnvironmentUpdateInput {
  name?: string;
  allowedDomains?: string[];
  color?: string;
  isProduction?: boolean;
  [key: string]: unknown;
}

// ─── EnvironmentRepository ───────────────────────────────────

export class EnvironmentRepository extends BaseRepository<
  EnvironmentEntity,
  EnvironmentCreateInput,
  EnvironmentUpdateInput
> {
  protected collectionPath(ctx: RepositoryContext): string {
    return `projects/${ctx.projectId}/environments`;
  }

  protected queryKeys(ctx: RepositoryContext): string[][] {
    return [
      ["environments", ctx.projectId],
      ["audit_log", ctx.projectId],
    ];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: EnvironmentCreateInput | EnvironmentUpdateInput,
    oldEntity?: EnvironmentEntity | null,
    newEntity?: EnvironmentEntity,
  ): AuditContext {
    const name =
      (input as EnvironmentCreateInput)?.name ?? oldEntity?.name ?? newEntity?.name ?? "unknown";
    return {
      actorId: "",
      action: operation,
      resourcePath: `environments/${name}`,
      oldValue: oldEntity ?? undefined,
      newValue: input ?? undefined,
    };
  }

  protected validate(
    input: EnvironmentCreateInput | EnvironmentUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (operation === "create" || "name" in input) {
      const name = (input as EnvironmentCreateInput).name;
      if (operation === "create" && (!name || name.trim().length === 0)) {
        errors.push({
          field: "name",
          message: "Name is required",
          code: "REQUIRED",
        });
      } else if (name !== undefined && name.trim().length === 0) {
        errors.push({
          field: "name",
          message: "Name cannot be empty",
          code: "REQUIRED",
        });
      }
    }

    // AllowedDomains validation
    if (operation === "create" || "allowedDomains" in input) {
      const domains = (input as EnvironmentCreateInput).allowedDomains;
      if (operation === "create" && !Array.isArray(domains)) {
        errors.push({
          field: "allowedDomains",
          message: "allowedDomains must be an array",
          code: "INVALID_TYPE",
        });
      } else if (domains !== undefined && !Array.isArray(domains)) {
        errors.push({
          field: "allowedDomains",
          message: "allowedDomains must be an array",
          code: "INVALID_TYPE",
        });
      }
    }

    return errors;
  }
}
