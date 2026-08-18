import { BaseRepository } from "./base-repository";
import type { AuditContext, RepositoryContext, ValidationError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface SegmentEntity {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    predicates: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SegmentCreateInput {
  name: string;
  description: string;
  conditions: Array<{
    predicates: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;
  [key: string]: unknown;
}

export interface SegmentUpdateInput {
  name?: string;
  description?: string;
  conditions?: Array<{
    predicates: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PREDICATES = 20;

// ─── SegmentRepository ───────────────────────────────────────

export class SegmentRepository extends BaseRepository<
  SegmentEntity,
  SegmentCreateInput,
  SegmentUpdateInput
> {
  protected collectionPath(ctx: RepositoryContext): string {
    return `projects/${ctx.projectId}/segments`;
  }

  protected queryKeys(ctx: RepositoryContext): string[][] {
    return [
      ["segments", ctx.projectId],
      ["audit_log", ctx.projectId],
    ];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: SegmentCreateInput | SegmentUpdateInput,
    oldEntity?: SegmentEntity | null,
    newEntity?: SegmentEntity,
  ): AuditContext {
    const name =
      (input as SegmentCreateInput)?.name ??
      oldEntity?.name ??
      newEntity?.name ??
      "unknown";
    return {
      actorId: "",
      action: operation,
      resourcePath: `segments/${name}`,
      oldValue: oldEntity ?? undefined,
      newValue: input ?? undefined,
    };
  }

  protected validate(
    input: SegmentCreateInput | SegmentUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (operation === "create" || "name" in input) {
      const name = (input as SegmentCreateInput).name;
      if (operation === "create" && (!name || name.trim().length === 0)) {
        errors.push({
          field: "name",
          message: "Name is required",
          code: "REQUIRED",
        });
      } else if (name !== undefined) {
        if (name.trim().length === 0) {
          errors.push({
            field: "name",
            message: "Name cannot be empty",
            code: "REQUIRED",
          });
        } else if (name.length > MAX_NAME_LENGTH) {
          errors.push({
            field: "name",
            message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
            code: "NAME_TOO_LONG",
          });
        }
      }
    }

    // Description validation
    if ("description" in input && input.description !== undefined) {
      if (input.description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push({
          field: "description",
          message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
          code: "DESCRIPTION_TOO_LONG",
        });
      }
    }

    // Conditions validation
    if ("conditions" in input && input.conditions !== undefined) {
      const totalPredicates = input.conditions.reduce(
        (sum, group) => sum + (group.predicates?.length ?? 0),
        0,
      );
      if (totalPredicates > MAX_PREDICATES) {
        errors.push({
          field: "conditions",
          message: `Maximum ${MAX_PREDICATES} predicates allowed`,
          code: "TOO_MANY_PREDICATES",
        });
      }
    }

    return errors;
  }
}
