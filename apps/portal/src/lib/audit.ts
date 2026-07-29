import { addDoc, collection } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/types";

/**
 * Create an audit log entry in the project's audit_log subcollection.
 *
 * This function must be called BEFORE or alongside any config modification.
 * If it fails, the calling code should block the modification (Requirement 9.6).
 *
 * @param projectId - The project ID
 * @param entry - The audit entry data (without id — Firestore generates it)
 * @returns The document reference of the created audit entry
 * @throws If the write fails (caller should catch and block the modification)
 */
export async function writeAuditEntry(
  projectId: string,
  entry: Omit<AuditEntry, "id">,
): Promise<string> {
  // Serialize and truncate values to max 10,000 characters
  const sanitizedEntry = {
    ...entry,
    oldValue: entry.oldValue ? truncate(entry.oldValue, 10_000) : undefined,
    newValue: entry.newValue ? truncate(entry.newValue, 10_000) : undefined,
  };

  const auditRef = collection(db, "projects", projectId, "audit_log");
  const docRef = await addDoc(auditRef, sanitizedEntry);
  return docRef.id;
}

/** Truncate a string to maxLength characters */
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
