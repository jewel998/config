import { addDoc, collection } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/types";

/**
 * Create an audit log entry in the project's audit_log subcollection.
 */
export async function writeAuditEntry(
  projectId: string,
  entry: Omit<AuditEntry, "id">,
): Promise<string> {
  const sanitizedEntry = {
    ...entry,
    oldValue: entry.oldValue ? truncate(entry.oldValue, 10_000) : undefined,
    newValue: entry.newValue ? truncate(entry.newValue, 10_000) : undefined,
  };

  const auditRef = collection(db, "projects", projectId, "audit_log");
  const docRef = await addDoc(auditRef, sanitizedEntry);
  return docRef.id;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + "…[truncated]";
}

/**
 * Helper to create a standard audit entry payload for config modifications.
 */
export function buildConfigAuditEntry(params: {
  actorId: string;
  action: AuditEntry["action"];
  environmentId: string;
  configKey: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Omit<AuditEntry, "id"> {
  return {
    actorId: params.actorId,
    timestamp: new Date().toISOString(),
    action: params.action,
    resourcePath: `environments/${params.environmentId}/configs/${params.configKey}`,
    oldValue:
      params.oldValue !== undefined
        ? JSON.stringify(params.oldValue)
        : undefined,
    newValue:
      params.newValue !== undefined
        ? JSON.stringify(params.newValue)
        : undefined,
  };
}

/**
 * Generic audit entry builder for non-config resources.
 */
export function buildAuditEntry(params: {
  actorId: string;
  action: AuditEntry["action"];
  resourcePath: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Omit<AuditEntry, "id"> {
  return {
    actorId: params.actorId,
    timestamp: new Date().toISOString(),
    action: params.action,
    resourcePath: params.resourcePath,
    oldValue:
      params.oldValue !== undefined
        ? JSON.stringify(params.oldValue)
        : undefined,
    newValue:
      params.newValue !== undefined
        ? JSON.stringify(params.newValue)
        : undefined,
  };
}
