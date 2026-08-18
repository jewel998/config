/** Context passed to repository operations for path resolution */
export interface RepositoryContext {
  projectId: string;
  environmentId?: string;
  [key: string]: string | undefined;
}

/** Authenticated user info passed to mutations */
export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

/** A validation error with field reference */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/** Audit context for an operation */
export interface AuditContext {
  actorId: string;
  action: "create" | "update" | "delete" | "state_change" | "data_deletion";
  resourcePath: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/** Result of a batch import operation */
export interface BatchImportResult<T> {
  succeeded: T[];
  failed: Array<{ input: unknown; errors: ValidationError[] }>;
  skipped: number;
  auditId: string;
}

/** Custom error thrown by repositories */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly validationErrors?: ValidationError[],
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
