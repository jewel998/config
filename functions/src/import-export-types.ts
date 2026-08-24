// ─── Bulk Import/Export Domain Types ──────────────────────────

/** Supported value types for config entries */
export type ConfigValueType = "string" | "number" | "boolean" | "json" | "array";

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
