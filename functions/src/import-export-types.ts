// ─── Bulk Import/Export Domain Types ──────────────────────────

/** Supported value types for config entries */
export type ConfigValueType = "string" | "number" | "boolean" | "json" | "array";

/** A single entry to import */
export interface ImportEntry {
  key: string;
  value: unknown;
  valueType: ConfigValueType;
}

/** Raw entry from parsed file (may have missing/invalid fields) */
export interface RawEntry {
  key?: unknown;
  value?: unknown;
  valueType?: unknown;
  [extra: string]: unknown;
}

// ─── Import Request/Response ──────────────────────────────────

export type ConflictStrategy = "skip" | "overwrite" | "review";

export interface ImportRequest {
  projectId: string;
  environmentId: string;
  entries: ImportEntry[];
  conflictStrategy: ConflictStrategy;
  reviewDecisions?: Record<string, "accept" | "reject">;
}

export interface ImportResponse {
  jobId: string;
  status: "processing" | "completed" | "failed";
}

// ─── Retry Request/Response ───────────────────────────────────

export interface CorrectedEntry {
  rowId: string;
  key: string;
  value: unknown;
  valueType: ConfigValueType;
}

export interface RetryRequest {
  projectId: string;
  jobId: string;
  entries: CorrectedEntry[];
  dismiss?: string[]; // rowIds to dismiss
}

export interface RetryResponse {
  results: Array<{ rowId: string; success: boolean; error?: string }>;
}

// ─── Export Request/Response ──────────────────────────────────

export type ExportType = "full" | "user";

export interface ExportRequest {
  projectId: string;
  exportType: ExportType;
  userId?: string;
}

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
  exportId: string;
}

// ─── Import Job Document ──────────────────────────────────────

export type ImportJobStatus = "processing" | "completed" | "failed" | "resolved";

export interface ImportJob {
  id: string;
  projectId: string;
  environmentId: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  dismissedCount: number;
  conflictStrategy: ConflictStrategy;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

// ─── Failed Row Document ──────────────────────────────────────

export interface FailedRowDoc {
  id: string;
  rowNumber: number;
  key: string;
  value: unknown;
  valueType: string;
  reason: string;
  dismissed: boolean;
  createdAt: string;
}

// ─── Validation Types ─────────────────────────────────────────

export interface FailedRow {
  rowNumber: number;
  entry: Partial<ImportEntry>;
  reason: string;
}

export interface ConflictRow {
  rowNumber: number;
  entry: ImportEntry;
  existingValue: unknown;
  existingValueType: string;
  isLocked: boolean;
}

export interface ValidationResult {
  valid: ImportEntry[];
  failed: FailedRow[];
  conflicts: ConflictRow[];
}

// ─── Export File Format ───────────────────────────────────────

export interface ExportEnvironmentMetadata {
  name: string;
  color?: string;
  isProduction: boolean;
}

export interface ExportEnvironment {
  metadata: ExportEnvironmentMetadata;
  configs: Array<{ key: string; value: unknown; valueType: string }>;
}

export interface ExportSegment {
  id: string;
  name: string;
  description: string;
  conditions: unknown[];
}

export interface ExportFile {
  projectId: string;
  exportedAt: string;
  exportedBy: string;
  exportType: ExportType;
  environments: Record<string, ExportEnvironment>;
  segments: ExportSegment[];
  auditEntries?: Array<{
    action: string;
    actorId: string;
    timestamp: string;
    resourcePath: string;
    oldValue?: string;
    newValue?: string;
  }>;
}
