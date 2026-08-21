import {
  beforeUserCreated,
  beforeUserSignedIn,
} from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";

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
        console.warn(
          `[accessControl] Invalid regex pattern: "${pattern}" — skipping`,
        );
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
    throw new HttpsError(
      "internal",
      "Unable to verify access. Please try again later.",
    );
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
