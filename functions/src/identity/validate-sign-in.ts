import { HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

import { getDb } from "../utils/firestore";
import { getSuperAdminEmail, PLATFORM_PERMISSIONS } from "./platform-access";

/**
 * Ensure the bootstrap super-admin (SUPER_ADMIN_EMAIL) has a platformAccess
 * doc with isSuperAdmin + all permissions, plus portal access. Best-effort:
 * never throws, so a write hiccup can't lock the owner out of sign-in.
 */
async function ensureSuperAdminProvisioned(email: string): Promise<void> {
  try {
    const db = getDb();
    const ref = db.collection("platformAccess").doc(email);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.isSuperAdmin !== true) {
      await ref.set(
        {
          permissions: [...PLATFORM_PERMISSIONS],
          isSuperAdmin: true,
          addedBy: "bootstrap:SUPER_ADMIN_EMAIL",
          addedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }
    await db
      .collection("allowedUsers")
      .doc(email)
      .set(
        {
          addedBy: "bootstrap:SUPER_ADMIN_EMAIL",
          addedAt: new Date().toISOString(),
          reason: "super-admin",
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[ensureSuperAdminProvisioned] best-effort provisioning failed:", error);
  }
}

/**
 * Shared access control check.
 * Reads `accessControl/default` from Firestore and verifies the email
 * is either in the explicit emails list or matches a regex pattern.
 */
async function checkAccessControl(email: string | undefined): Promise<void> {
  if (!email) {
    throw new HttpsError("permission-denied", "Email is required for sign-in");
  }

  const normalizedEmail = email.toLowerCase();
  const db = getDb();

  // Bootstrap super-admin always passes the gate, even on a fresh deploy where
  // no accessControl/allowedUsers docs exist yet (chicken-and-egg). Provision
  // their platform grant on the way through.
  if (getSuperAdminEmail() === normalizedEmail) {
    await ensureSuperAdminProvisioned(normalizedEmail);
    return;
  }

  // A dashboard-granted PORTAL permission is sufficient for sign-in. This is
  // the managed path that replaces hand-editing accessControl/allowedUsers.
  try {
    const grant = await db.collection("platformAccess").doc(normalizedEmail).get();
    if (grant.exists) {
      const data = grant.data()!;
      if (data.isSuperAdmin === true) return;
      const permissions: string[] = data.permissions ?? [];
      if (permissions.includes("PORTAL")) return;
    }
  } catch (error) {
    console.error("[accessControl] platformAccess lookup failed:", error);
    // Fall through to the legacy accessControl check below.
  }

  try {
    const configDoc = await db.collection("accessControl").doc("default").get();

    if (!configDoc.exists) {
      // No access control configured — allow all (open mode)
      return;
    }

    const config = configDoc.data()!;
    const allowedEmails: string[] = config.emails ?? [];
    const allowedPatterns: string[] = config.patterns ?? [];

    // Check explicit email list
    if (allowedEmails.includes(normalizedEmail)) {
      return;
    }

    // Check regex patterns
    for (const pattern of allowedPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(normalizedEmail)) {
          return;
        }
      } catch {
        console.warn(`[accessControl] Invalid regex pattern: "${pattern}" — skipping`);
      }
    }

    // No match — reject
    throw new HttpsError(
      "permission-denied",
      "Access denied. Your email is not authorized to use this application.",
    );
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("[accessControl] Error checking access:", error);
    throw new HttpsError("internal", "Unable to verify access. Please try again later.");
  }
}

/**
 * Blocking Function: Runs BEFORE a new account is created.
 * Prevents unauthorized users from ever being registered in Firebase Auth.
 */
export const validateCreate = beforeUserCreated(async (event) => {
  await checkAccessControl(event.data?.email);
});

/**
 * Blocking Function: Runs BEFORE every sign-in (including returning users).
 * Ensures revoked users can't sign in even if their account still exists.
 */
export const validateSignIn = beforeUserSignedIn(async (event) => {
  await checkAccessControl(event.data?.email);
});
