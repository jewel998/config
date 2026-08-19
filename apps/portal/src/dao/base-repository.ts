import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { QueryClient } from "@tanstack/react-query";

import type {
  AuthenticatedUser,
  AuditContext,
  RepositoryContext,
  ValidationError,
} from "./types";
import { RepositoryError } from "./types";

/**
 * Abstract base repository providing a mandatory mutation pipeline:
 *   authenticate → validate → beforeHook → write → audit → afterHook → invalidate
 *
 * Subclasses MUST implement:
 *   - collectionPath(ctx): Firestore collection path
 *   - validate(input): entity-specific validation rules
 *   - queryKeys(ctx): cache keys to invalidate
 *   - buildAuditContext(...): how to create the audit entry
 *
 * Subclasses MAY override:
 *   - beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete
 */
export abstract class BaseRepository<
  TEntity extends { id: string },
  TCreateInput extends Record<string, unknown>,
  TUpdateInput extends Record<string, unknown>,
> {
  constructor(
    protected readonly firestore: Firestore,
    protected readonly queryClient: QueryClient | null = null,
  ) {}

  // ─── Abstract methods (MUST implement) ─────────────────────

  /** Returns the Firestore collection path for this entity */
  protected abstract collectionPath(ctx: RepositoryContext): string;

  /** Validates input before write. Returns errors (empty = valid). */
  protected abstract validate(
    input: TCreateInput | TUpdateInput,
    operation: "create" | "update",
  ): ValidationError[];

  /** Returns TanStack Query keys to invalidate after mutations */
  protected abstract queryKeys(ctx: RepositoryContext): string[][];

  /** Builds the audit context for logging */
  protected abstract buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: TCreateInput | TUpdateInput,
    oldEntity?: TEntity | null,
    newEntity?: TEntity,
  ): AuditContext;

  // ─── Overridable lifecycle hooks ───────────────────────────

  protected async beforeCreate(
    _input: TCreateInput,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  protected async afterCreate(
    _entity: TEntity,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  protected async beforeUpdate(
    _id: string,
    _input: TUpdateInput,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  protected async afterUpdate(
    _entity: TEntity,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  protected async beforeDelete(
    _id: string,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  protected async afterDelete(
    _id: string,
    _ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {}

  // ─── Auth check ────────────────────────────────────────────

  private checkAuth(
    user: AuthenticatedUser | null,
  ): asserts user is AuthenticatedUser {
    if (!user || !user.uid) {
      throw new RepositoryError("Not authenticated", "UNAUTHENTICATED");
    }
  }

  // ─── Audit writing ─────────────────────────────────────────

  private async writeAudit(
    projectId: string,
    context: AuditContext,
  ): Promise<string> {
    // Guard: actorId must always be set by the pipeline
    if (!context.actorId) {
      throw new RepositoryError(
        "Audit actorId is required — this is a bug in the repository pipeline",
        "AUDIT_MISSING_ACTOR",
      );
    }

    const sanitized: Record<string, unknown> = {
      actorId: context.actorId,
      timestamp: new Date().toISOString(),
      action: context.action,
      resourcePath: context.resourcePath,
    };
    if (context.oldValue !== undefined) {
      sanitized.oldValue = JSON.stringify(context.oldValue).slice(0, 10_000);
    }
    if (context.newValue !== undefined) {
      sanitized.newValue = JSON.stringify(context.newValue).slice(0, 10_000);
    }

    const auditRef = collection(
      this.firestore,
      "projects",
      projectId,
      "audit_log",
    );
    const docRef = await addDoc(auditRef, sanitized);
    return docRef.id;
  }

  // ─── Cache invalidation ────────────────────────────────────

  private invalidateCache(ctx: RepositoryContext): void {
    if (!this.queryClient) return;
    for (const key of this.queryKeys(ctx)) {
      this.queryClient.invalidateQueries({ queryKey: key });
    }
  }

  // ─── CRUD Operations (pipeline-enforced) ───────────────────

  /** Create a new entity with full pipeline enforcement */
  async create(
    input: TCreateInput,
    ctx: RepositoryContext,
    user: AuthenticatedUser | null,
  ): Promise<TEntity> {
    // 1. Auth
    this.checkAuth(user);

    // 2. Validate
    const errors = this.validate(input, "create");
    if (errors.length > 0) {
      throw new RepositoryError(
        "Validation failed",
        "VALIDATION_ERROR",
        errors,
      );
    }

    // 3. Before hook
    await this.beforeCreate(input, ctx, user);

    // 4. Write
    const colPath = this.collectionPath(ctx);
    const colRef = collection(this.firestore, colPath);
    const now = new Date().toISOString();
    const data = { ...input, createdAt: now, updatedAt: now };
    const docRef = await addDoc(colRef, data);
    const entity = { id: docRef.id, ...data } as unknown as TEntity;

    // 5. Audit (mandatory — NOT in try/catch)
    const auditCtx = this.buildAuditContext("create", ctx, input, null, entity);
    auditCtx.actorId = user.uid;
    await this.writeAudit(ctx.projectId, auditCtx);

    // 6. After hook
    await this.afterCreate(entity, ctx, user);

    // 7. Invalidate cache
    this.invalidateCache(ctx);

    return entity;
  }

  /** Update an entity with full pipeline enforcement */
  async update(
    id: string,
    input: TUpdateInput,
    ctx: RepositoryContext,
    user: AuthenticatedUser | null,
  ): Promise<TEntity> {
    // 1. Auth
    this.checkAuth(user);

    // 2. Validate
    const errors = this.validate(input, "update");
    if (errors.length > 0) {
      throw new RepositoryError(
        "Validation failed",
        "VALIDATION_ERROR",
        errors,
      );
    }

    // 3. Before hook (can read existing for lock checks etc.)
    await this.beforeUpdate(id, input, ctx, user);

    // Get old entity for audit
    const oldEntity = await this.getById(id, ctx);

    // 4. Write
    const colPath = this.collectionPath(ctx);
    const docRef = doc(this.firestore, colPath, id);
    const now = new Date().toISOString();
    const updateData = { ...input, updatedAt: now };
    await updateDoc(docRef, updateData as Record<string, unknown>);
    const entity = { id, ...oldEntity, ...updateData } as unknown as TEntity;

    // 5. Audit (mandatory)
    const auditCtx = this.buildAuditContext(
      "update",
      ctx,
      input,
      oldEntity,
      entity,
    );
    auditCtx.actorId = user.uid;
    await this.writeAudit(ctx.projectId, auditCtx);

    // 6. After hook
    await this.afterUpdate(entity, ctx, user);

    // 7. Invalidate
    this.invalidateCache(ctx);

    return entity;
  }

  /** Delete an entity with full pipeline enforcement */
  async delete(
    id: string,
    ctx: RepositoryContext,
    user: AuthenticatedUser | null,
  ): Promise<void> {
    // 1. Auth
    this.checkAuth(user);

    // 2. Before hook
    await this.beforeDelete(id, ctx, user);

    // Get old entity for audit
    const oldEntity = await this.getById(id, ctx);

    // 3. Write
    const colPath = this.collectionPath(ctx);
    const docRef = doc(this.firestore, colPath, id);
    await deleteDoc(docRef);

    // 4. Audit (mandatory)
    const auditCtx = this.buildAuditContext(
      "delete",
      ctx,
      undefined,
      oldEntity,
    );
    auditCtx.actorId = user.uid;
    await this.writeAudit(ctx.projectId, auditCtx);

    // 5. After hook
    await this.afterDelete(id, ctx, user);

    // 6. Invalidate
    this.invalidateCache(ctx);
  }

  /** Get entity by ID */
  async getById(id: string, ctx: RepositoryContext): Promise<TEntity | null> {
    const colPath = this.collectionPath(ctx);
    const docRef = doc(this.firestore, colPath, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as TEntity;
  }

  /** Get all entities in the collection */
  async getAll(ctx: RepositoryContext): Promise<TEntity[]> {
    const colPath = this.collectionPath(ctx);
    const colRef = collection(this.firestore, colPath);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TEntity);
  }

  /** Batch create with validation, batched writes, and single audit entry */
  async batchCreate(
    inputs: TCreateInput[],
    ctx: RepositoryContext,
    user: AuthenticatedUser | null,
  ): Promise<{
    succeeded: TEntity[];
    failed: Array<{ input: TCreateInput; errors: ValidationError[] }>;
  }> {
    this.checkAuth(user);

    const succeeded: TEntity[] = [];
    const failed: Array<{ input: TCreateInput; errors: ValidationError[] }> =
      [];
    const toWrite: Array<{
      input: TCreateInput;
      data: Record<string, unknown>;
    }> = [];

    // Validate all inputs
    for (const input of inputs) {
      const errors = this.validate(input, "create");
      if (errors.length > 0) {
        failed.push({ input, errors });
      } else {
        const now = new Date().toISOString();
        toWrite.push({
          input,
          data: { ...input, createdAt: now, updatedAt: now },
        });
      }
    }

    // Batched writes (max 500 per batch)
    const colPath = this.collectionPath(ctx);
    for (let i = 0; i < toWrite.length; i += 500) {
      const batchSlice = toWrite.slice(i, i + 500);
      const batch = writeBatch(this.firestore);

      for (const { data } of batchSlice) {
        const id =
          ((data as Record<string, unknown>).key as string) ||
          doc(collection(this.firestore, colPath)).id;
        const docRef = doc(this.firestore, colPath, id);
        batch.set(docRef, data, { merge: true });
      }

      try {
        await batch.commit();
        for (const { input, data } of batchSlice) {
          const id = ((data as Record<string, unknown>).key as string) || "";
          succeeded.push({ id, ...data } as unknown as TEntity);
        }
      } catch (error) {
        for (const { input } of batchSlice) {
          failed.push({
            input,
            errors: [
              {
                field: "_write",
                message:
                  error instanceof Error ? error.message : "Write failed",
                code: "WRITE_ERROR",
              },
            ],
          });
        }
      }
    }

    // Per-item audit entries + summary entry
    if (succeeded.length > 0) {
      // Write individual audit entry for each created item (traceability)
      for (const entity of succeeded) {
        const itemAudit = this.buildAuditContext(
          "create",
          ctx,
          undefined,
          null,
          entity,
        );
        itemAudit.actorId = user!.uid;
        await this.writeAudit(ctx.projectId, itemAudit);
      }

      // Also write a summary entry for the batch operation
      const summaryAudit: AuditContext = {
        actorId: user!.uid,
        action: "create",
        resourcePath: colPath,
        newValue: {
          operation: "batch_import",
          total: inputs.length,
          succeeded: succeeded.length,
          failed: failed.length,
          keys: succeeded.map(
            (e) => (e as Record<string, unknown>).key ?? e.id,
          ),
        },
      };
      await this.writeAudit(ctx.projectId, summaryAudit);
    }

    // After hooks for all succeeded
    for (const entity of succeeded) {
      await this.afterCreate(entity, ctx, user!);
    }

    // Invalidate
    this.invalidateCache(ctx);

    return { succeeded, failed };
  }
}
