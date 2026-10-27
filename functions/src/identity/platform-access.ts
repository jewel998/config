// ═══════════════════════════════════════════════════════════════
// Platform Access — capability grants keyed by email.
//
// Firestore: platformAccess/{email}
//   { permissions: PlatformPermission[], isSuperAdmin: boolean,
//     addedBy: string, addedAt: string }
//
// SECURITY MODEL
//   - Clients can READ only their own grant (firestore.rules); they can NEVER
//     write this collection. All writes go through the Admin SDK here.
//   - "Super-admin" is conferred in these ways:
//       1. Their email matches the SUPER_ADMIN_EMAIL Functions secret (the
//          bootstrap root — one email per deployment). This lives server-side
//          only, never in the browser bundle, so it cannot be spoofed, and it
//          guarantees a fresh deploy always has exactly one super-admin.
//       2. Their platformAccess doc has isSuperAdmin == true, granted by an
//          existing super-admin via grantPlatformAccess. Super-admins may mint
//          other super-admins from the dashboard.
//   - Only a super-admin may call the grant/revoke API. isSuperAdmin is
//     grantable BUT a caller can never grant/revoke it on THEMSELVES (no self
//     escalation and no locking yourself out), and the env-bootstrap root can
//     never have its super-admin revoked via the API.
// ═══════════════════════════════════════════════════════════════

import type { Firestore } from "firebase-admin/firestore";

/**
 * Capability keys. Extend this union as new platform capabilities are added.
 *   PORTAL         — may sign in to and use the portal at all.
 *   CREATE_PROJECT — may create new projects.
 */
export const PLATFORM_PERMISSIONS = ["PORTAL", "CREATE_PROJECT"] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export interface PlatformAccessDoc {
  permissions: PlatformPermission[];
  isSuperAdmin: boolean;
  addedBy: string;
  addedAt: string;
}

/** True if `value` is a recognized platform permission key. */
export function isPlatformPermission(value: unknown): value is PlatformPermission {
  return typeof value === "string" && (PLATFORM_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * The single bootstrap super-admin email for this deployment, read from the
 * SUPER_ADMIN_EMAIL environment variable (a Functions secret / env var).
 * Returns null when unset (self-host instances that have not configured one).
 */
export function getSuperAdminEmail(): string | null {
  const raw = process.env.SUPER_ADMIN_EMAIL;
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Resolve whether `email` is a super-admin for this deployment.
 * Checks the env-secret bootstrap first, then the persisted isSuperAdmin flag.
 */
export async function isSuperAdmin(db: Firestore, email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();

  if (getSuperAdminEmail() === normalized) return true;

  const snap = await db.collection("platformAccess").doc(normalized).get();
  return snap.exists && snap.data()?.isSuperAdmin === true;
}
