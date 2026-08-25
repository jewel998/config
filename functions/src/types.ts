// ─── Domain Types ─────────────────────────────────────────────

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  eventTypes: EventType[];
  resourceCategories: WebhookResourceCategory[];
  environments: string[];
  format: string;
  createdAt: string;
  updatedAt: string;
  customTemplate?: string;
}

export type EventType = "create" | "update" | "delete" | "state_change";

export type WebhookResourceCategory =
  | "config"
  | "segment"
  | "api_key"
  | "project"
  | "team"
  | "environment";

export interface AuditEntry {
  action: string;
  actorId: string;
  timestamp: string;
  resourcePath: string;
  oldValue?: string;
  newValue?: string;
}

// ─── Adapter Pattern: Dispatcher Interface ────────────────────

export interface DispatchOptions {
  method: string;
  timeout: number;
  headers: Record<string, string>;
}

export interface DispatchResult {
  success: boolean;
  httpStatus: number | null;
  duration: number;
  error: string | null;
}

export interface WebhookDispatcher {
  dispatch(url: string, payload: unknown, options: DispatchOptions): Promise<DispatchResult>;
}

// ─── Chain of Responsibility: Filter Function Type ────────────

export type FilterFn = (webhook: WebhookConfig, entry: AuditEntry) => boolean;

// ─── Webhook Payload (standard format) ────────────────────────

export interface WebhookPayload {
  action: string;
  resourceCategory: string;
  resourcePath: string;
  resourceName: string;
  environment: string | null;
  actorId: string;
  timestamp: string;
  oldValue: unknown | null;
  newValue: unknown | null;
  projectId: string;
  webhookId: string;
  test?: boolean;
}
