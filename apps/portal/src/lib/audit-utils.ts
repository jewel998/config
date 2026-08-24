import {
  FilePlus2,
  FileX2,
  History,
  Key,
  Layers,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

export type ResourceCategory = "config" | "segment" | "api_key" | "project" | "team" | "other";

export interface DiffLine {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: string;
  newValue?: string;
}

// ─── Constants ────────────────────────────────────────────────

export const CATEGORY_META: Record<ResourceCategory, { label: string; icon: LucideIcon }> = {
  config: { label: "Config", icon: Layers },
  segment: { label: "Segment", icon: Users },
  api_key: { label: "API Key", icon: Key },
  project: { label: "Project", icon: Layers },
  team: { label: "Team", icon: Users },
  other: { label: "Other", icon: History },
};

export const ACTION_ICONS: Record<string, LucideIcon> = {
  create: FilePlus2,
  update: Pencil,
  delete: Trash2,
  state_change: RefreshCw,
  data_deletion: FileX2,
};

export const ACTION_COLORS: Record<string, string> = {
  create: "text-emerald-700/80 dark:text-emerald-300/80 bg-emerald-500/8",
  update: "text-blue-700/80 dark:text-blue-300/80 bg-blue-500/8",
  delete: "text-red-700/80 dark:text-red-300/80 bg-red-500/8",
  state_change: "text-amber-700/80 dark:text-amber-300/80 bg-amber-500/8",
  data_deletion: "text-purple-700/80 dark:text-purple-300/80 bg-purple-500/8",
};

export const ACTION_LABELS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  state_change: "changed state of",
  data_deletion: "deleted data from",
};

// ─── Pure functions ───────────────────────────────────────────

export function getResourceCategory(path: string): ResourceCategory {
  if (path.includes("configs")) return "config";
  if (path.includes("segments")) return "segment";
  if (path.includes("apiKeys") || path.includes("clientIds")) return "api_key";
  if (path.startsWith("project/") || path === "project") return "project";
  if (path.includes("team") || path.includes("members")) return "team";
  // bare "environments/name" = environment resource (show under project)
  if (
    path.startsWith("environments/") &&
    !path.includes("/configs/") &&
    !path.includes("/apiKeys/")
  )
    return "project";
  return "other";
}

export function formatResourceName(path: string): string {
  const parts = path.split("/");
  if (parts.includes("configs") && parts.length >= 4) return parts[parts.length - 1];
  if (parts.includes("apiKeys") && parts.length >= 4) {
    const keyId = parts[parts.length - 1];
    return keyId.startsWith("cid_") ? `API key …${keyId.slice(-6)}` : keyId;
  }
  // "environments/production" (create/delete env, no sub-resource)
  if (parts[0] === "environments" && parts.length === 2) return parts[1];
  if (parts[0] === "segments") return parts[1] ?? "segment";
  if (parts[0] === "project") return parts[1] ?? "project";
  if (parts[0] === "team" && parts[1] === "members") return parts[2] ?? "member";
  if (parts[0] === "team" && parts[1] === "invites") return parts[2] ?? "invite";
  return parts[parts.length - 1] || path;
}

export function getEnvironmentFromPath(path: string): string | null {
  const match = path.match(/environments\/([^/]+)/);
  return match ? match[1] : null;
}

// ─── Diff computation ─────────────────────────────────────────

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function flattenObject(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj == null) return result;
  if (typeof obj !== "object") {
    result[prefix || "(value)"] = String(obj);
    return result;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++)
      Object.assign(result, flattenObject(obj[i], `${prefix}[${i}]`));
    return result;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) Object.assign(result, flattenObject(value, p));
    else result[p] = JSON.stringify(value);
  }
  return result;
}

export function computeDiff(oldRaw?: string, newRaw?: string): DiffLine[] {
  const oldObj = oldRaw ? tryParseJson(oldRaw) : null;
  const newObj = newRaw ? tryParseJson(newRaw) : null;

  if (oldObj === null && newObj === null) {
    const lines: DiffLine[] = [];
    if (oldRaw) lines.push({ key: "(value)", type: "removed", oldValue: oldRaw });
    if (newRaw) lines.push({ key: "(value)", type: "added", newValue: newRaw });
    return lines;
  }

  const oldFlat = oldObj ? flattenObject(oldObj) : {};
  const newFlat = newObj ? flattenObject(newObj) : {};
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
  const lines: DiffLine[] = [];

  for (const key of allKeys) {
    const o = oldFlat[key];
    const n = newFlat[key];
    if (o === undefined && n !== undefined) lines.push({ key, type: "added", newValue: n });
    else if (o !== undefined && n === undefined) lines.push({ key, type: "removed", oldValue: o });
    else if (o !== n) lines.push({ key, type: "changed", oldValue: o, newValue: n });
    else lines.push({ key, type: "unchanged", oldValue: o, newValue: n });
  }

  const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  lines.sort((a, b) => order[a.type] - order[b.type]);
  return lines;
}
