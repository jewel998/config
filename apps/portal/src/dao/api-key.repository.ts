import { doc, setDoc } from "firebase/firestore";

import { BaseRepository } from "./base-repository";
import type { AuditContext, AuthenticatedUser, RepositoryContext, ValidationError } from "./types";
import { RepositoryError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface ApiKeyEntity {
  id: string;
  token: string;
  label: string;
  status: "active" | "revoked";
  type: "client" | "server";
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface ApiKeyCreateInput {
  label: string;
  type: "client" | "server";
  [key: string]: unknown;
}

export interface ApiKeyUpdateInput {
  status?: "active" | "revoked";
  revokedAt?: string | null;
  label?: string;
  [key: string]: unknown;
}

// ─── Token Generation ────────────────────────────────────────

function generateToken(type: "client" | "server"): string {
  const prefix = type === "server" ? "svr_" : "cid_";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// ─── ApiKeyRepository ────────────────────────────────────────

export class ApiKeyRepository extends BaseRepository<
  ApiKeyEntity,
  ApiKeyCreateInput,
  ApiKeyUpdateInput
> {
  protected collectionPath(ctx: RepositoryContext): string {
    if (!ctx.environmentId) {
      throw new RepositoryError("environmentId is required", "MISSING_CONTEXT");
    }
    return `projects/${ctx.projectId}/environments/${ctx.environmentId}/clientIds`;
  }

  protected queryKeys(ctx: RepositoryContext): string[][] {
    return [
      ["apiKeys", ctx.projectId, ctx.environmentId ?? ""],
      ["audit_log", ctx.projectId],
    ];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: ApiKeyCreateInput | ApiKeyUpdateInput,
    oldEntity?: ApiKeyEntity | null,
    newEntity?: ApiKeyEntity,
  ): AuditContext {
    const label =
      (input as ApiKeyCreateInput)?.label ?? oldEntity?.label ?? newEntity?.label ?? "API key";
    return {
      actorId: "",
      action: operation,
      resourcePath: `environments/${ctx.environmentId}/apiKeys/${label}`,
      oldValue: oldEntity ? { status: oldEntity.status, label: oldEntity.label } : undefined,
      newValue: input ?? undefined,
    };
  }

  protected validate(
    input: ApiKeyCreateInput | ApiKeyUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (operation === "create") {
      const createInput = input as ApiKeyCreateInput;
      if (!createInput.type || !["client", "server"].includes(createInput.type)) {
        errors.push({
          field: "type",
          message: "Type must be 'client' or 'server'",
          code: "INVALID_TYPE",
        });
      }
    }

    return errors;
  }

  // ─── Lifecycle Hooks ─────────────────────────────────────────

  /**
   * Generate a token and write the document with the token as the ID
   * (overriding the default addDoc behavior from BaseRepository).
   */
  protected async beforeCreate(
    input: ApiKeyCreateInput,
    ctx: RepositoryContext,
    user: AuthenticatedUser,
  ): Promise<void> {
    // We generate and inject the token into the input so
    // the base create() writes it along with the rest.
    const token = generateToken(input.type);
    (input as Record<string, unknown>).token = token;
    (input as Record<string, unknown>).status = "active";
    (input as Record<string, unknown>).revokedAt = null;
    (input as Record<string, unknown>).createdBy = user.uid;
  }
}
