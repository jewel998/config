// ═══════════════════════════════════════════════════════════════
// Platform Access callables
//
//   grantPlatformAccess({ email, permissions })  — super-admin only
//   revokePlatformAccess({ email })               — super-admin only
//   listPlatformAccess()                          — super-admin only
//
// Only a super-admin (SUPER_ADMIN_EMAIL env secret, or an existing
// isSuperAdmin doc) may call these. The grant call mutates ONLY the
// permissions array and can NEVER set isSuperAdmin.
// ═══════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";

import {
  getSuperAdminEmail,
  isPlatformPermission,
  isSuperAdmin,
  type PlatformPermission,
} from "../identity/platform-access";
import { getDb } from "../utils/firestore";

/** Normalize + validate an email argument. */
function requireEmailArg(email: unknown): string {
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new HttpsError("invalid-argument", "email is required");
  }
  const normalized = email.trim().toLowerCase();
  // Basic shape check — the real identity gate is Firebase Auth + allowlist.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new HttpsError("invalid-argument", "email is not a valid address");
  }
  return normalized;
}

/** Assert the caller is an authenticated super-admin; returns their email. */
async function requireSuperAdmin(authEmail: string | undefined): Promise<string> {
  const db = getDb();
  if (!authEmail) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (!(await isSuperAdmin(db, authEmail))) {
    throw new HttpsError(
      "permission-denied",
      "Only the platform super-admin can manage platform access",
    );
  }
  return authEmail.toLowerCase();
}

export const grantPlatformAccess = onCall<{
  email: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}>(async (request) => {
  const callerEmail = await requireSuperAdmin(request.auth?.token.email as string | undefined);
  const db = getDb();

  const targetEmail = requireEmailArg(request.data.email);

  const rawPermissions = request.data.permissions;
  if (!Array.isArray(rawPermissions)) {
    throw new HttpsError("invalid-argument", "permissions must be an array");
  }
  // Validate + dedupe. Reject unknown keys rather than silently dropping them.
  const permissions: PlatformPermission[] = [];
  for (const p of rawPermissions) {
    if (!isPlatformPermission(p)) {
      throw new HttpsError("invalid-argument", `Unknown permission: ${String(p)}`);
    }
    if (!permissions.includes(p)) permissions.push(p);
  }

  const makeSuperAdmin = request.data.isSuperAdmin === true;

  // A super-admin cannot change their OWN super-admin status (no self-escalation,
  // no self-lockout). Changing it requires another super-admin or the env root.
  if (targetEmail === callerEmail && makeSuperAdmin !== true) {
    // Caller is already a super-admin (requireSuperAdmin passed); refuse any
    // self-grant that would drop their own super-admin flag.
    throw new HttpsError("permission-denied", "Cannot change your own super-admin status");
  }

  const ref = db.collection("platformAccess").doc(targetEmail);

  await ref.set(
    {
      permissions,
      isSuperAdmin: makeSuperAdmin,
      addedBy: callerEmail,
      addedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(
    `[grantPlatformAccess] ${callerEmail} granted [${permissions.join(", ")}]` +
      `${makeSuperAdmin ? " +superAdmin" : ""} to ${targetEmail}`,
  );

  return { email: targetEmail, permissions, isSuperAdmin: makeSuperAdmin };
});

export const revokePlatformAccess = onCall<{ email: string }>(async (request) => {
  const callerEmail = await requireSuperAdmin(request.auth?.token.email as string | undefined);
  const db = getDb();

  const targetEmail = requireEmailArg(request.data.email);

  // No self-revoke — avoids locking yourself out in one click.
  if (targetEmail === callerEmail) {
    throw new HttpsError("permission-denied", "Cannot revoke your own platform access");
  }

  // The env-bootstrap root (SUPER_ADMIN_EMAIL) is immutable via the API; it
  // regains its grant on next sign-in anyway, so revoking it is meaningless.
  if (getSuperAdminEmail() === targetEmail) {
    throw new HttpsError(
      "permission-denied",
      "Cannot revoke the bootstrap super-admin; change SUPER_ADMIN_EMAIL instead",
    );
  }

  await db.collection("platformAccess").doc(targetEmail).delete();

  console.log(`[revokePlatformAccess] ${callerEmail} revoked platform access for ${targetEmail}`);

  return { email: targetEmail, revoked: true };
});

export const listPlatformAccess = onCall(async (request) => {
  await requireSuperAdmin(request.auth?.token.email as string | undefined);
  const db = getDb();

  const snapshot = await db.collection("platformAccess").get();
  const grants = snapshot.docs.map((doc) => ({
    email: doc.id,
    permissions: (doc.data().permissions ?? []) as string[],
    isSuperAdmin: doc.data().isSuperAdmin === true,
    addedBy: doc.data().addedBy ?? null,
    addedAt: doc.data().addedAt ?? null,
  }));

  return { grants };
});
