import { doc, updateDoc } from "firebase/firestore";

import { BaseRepository } from "./base-repository";
import type { AuditContext, AuthenticatedUser, RepositoryContext, ValidationError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface ProjectEntity {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  roles: Record<string, string>;
  description?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProjectCreateInput {
  name: string;
  [key: string]: unknown;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

// ─── ProjectRepository ───────────────────────────────────────

export class ProjectRepository extends BaseRepository<
  ProjectEntity,
  ProjectCreateInput,
  ProjectUpdateInput
> {
  protected collectionPath(_ctx: RepositoryContext): string {
    return "projects";
  }

  protected queryKeys(_ctx: RepositoryContext): string[][] {
    return [["projects"]];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    _ctx: RepositoryContext,
    input?: ProjectCreateInput | ProjectUpdateInput,
    oldEntity?: ProjectEntity | null,
    newEntity?: ProjectEntity,
  ): AuditContext {
    const name =
      (input as ProjectCreateInput)?.name ?? oldEntity?.name ?? newEntity?.name ?? "unknown";
    return {
      actorId: "",
      action: operation === "delete" ? "delete" : operation,
      resourcePath: `project/${name}`,
      oldValue: oldEntity ? { name: oldEntity.name } : undefined,
      newValue: input ? { name: (input as ProjectCreateInput).name } : undefined,
    };
  }

  protected validate(
    input: ProjectCreateInput | ProjectUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (operation === "create" || "name" in input) {
      const name = (input as ProjectCreateInput).name;
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

    return errors;
  }

  // ─── Lifecycle Hooks ─────────────────────────────────────────

  /**
   * Inject owner info into the input before create.
   */
  protected async beforeCreate(
    input: ProjectCreateInput,
    _ctx: RepositoryContext,
    user: AuthenticatedUser,
  ): Promise<void> {
    const record = input as Record<string, unknown>;
    record.name = (input.name as string).trim();
    record.ownerId = user.uid;
    record.authorizedUsers = [user.uid];
    record.roles = { [user.uid]: "admin" };
  }

  /**
   * Soft delete: set deletedAt instead of actually removing the document.
   * We override the delete pipeline by using beforeDelete to perform the
   * soft-delete write, then we skip the actual Firestore deleteDoc.
   */
  async softDelete(
    id: string,
    ctx: RepositoryContext,
    user: AuthenticatedUser | null,
  ): Promise<void> {
    // Reuse the full pipeline: auth, before, audit, after, invalidate
    // But instead of deleting, we update with deletedAt.
    // We do this by calling update() with a special field.
    if (!user || !user.uid) {
      const { RepositoryError } = await import("./types");
      throw new RepositoryError("Not authenticated", "UNAUTHENTICATED");
    }

    const docRef = doc(this.firestore, "projects", id);
    await updateDoc(docRef, { deletedAt: new Date().toISOString() });

    // Audit
    const auditCtx = this.buildAuditContext("delete", ctx, undefined, null);
    auditCtx.actorId = user.uid;
    // Write audit manually using the parent's private method indirectly
    // We use addDoc directly for audit
    const { addDoc, collection } = await import("firebase/firestore");
    const auditRef = collection(this.firestore, "projects", ctx.projectId, "audit_log");
    await addDoc(auditRef, {
      actorId: user.uid,
      timestamp: new Date().toISOString(),
      action: "delete",
      resourcePath: auditCtx.resourcePath,
    });

    // Invalidate cache
    if (this.queryClient) {
      for (const key of this.queryKeys(ctx)) {
        this.queryClient.invalidateQueries({ queryKey: key });
      }
    }
  }
}
