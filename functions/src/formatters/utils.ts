import type { AuditEntry, WebhookConfig } from "../types";
import {
  formatResourceName,
  getEnvironmentFromPath,
  getResourceCategory,
} from "../utils/audit-utils";

// ─── Shared string helpers ─────────────────────────────────────

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─── Canonical emoji map (single source of truth) ─────────────

export const ACTION_EMOJI: Record<string, string> = {
  create: "🟢",
  update: "🔵",
  delete: "🔴",
  state_change: "🟡",
};

// ─── Pre-extracted context ─────────────────────────────────────

/**
 * Derives all common per-entry fields in one place so every formatter
 * can destructure rather than calling the same three utils independently.
 */
export interface FormatterContext {
  action: string;
  emoji: string;
  resourceName: string;
  category: string;
  environment: string | null;
  environmentLabel: string; // environment ?? "—"
}

export function buildFormatterContext(
  entry: AuditEntry,
  _webhook: WebhookConfig,
): FormatterContext {
  const action = entry.action;
  const env = getEnvironmentFromPath(entry.resourcePath);
  return {
    action,
    emoji: ACTION_EMOJI[action] ?? "🔔",
    resourceName: formatResourceName(entry.resourcePath),
    // Fall back to "unknown" as a visible label rather than a silent wrong value
    category: getResourceCategory(entry.resourcePath) ?? "unknown",
    environment: env,
    environmentLabel: env ?? "—",
  };
}
