import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";

/**
 * Blocking Function: Runs BEFORE Firebase Auth issues a token.
 *
 * Checks the user's email against the access control configuration
 * stored in Firestore at `accessControl/default`:
 *
 * {
 *   emails: ["user@example.com", "admin@company.org"],
 *   patterns: [".*@mycompany\\.com$", ".*@partner\\.io$"]
 * }
 *
 * - If the email matches any entry in `emails` → allowed
 * - If the email matches any regex in `patterns` → allowed
 * - Otherwise → sign-in is REJECTED (no token issued)
 *
 * This is server-enforced — cannot be bypassed from the frontend.
 */
export const validateSignIn = beforeUserSignedIn(async (event) => {
  const email = event.data?.email?.toLowerCase();

  if (!email) {
    throw new HttpsError("permission-denied", "Email is required for sign-in");
  }

  const db = getDb();

  try {
    const configDoc = await db.collection("accessControl").doc("default").get();

    if (!configDoc.exists) {
      // No access control configured — allow all (open mode)
      // This ensures existing deployments don't break
      return;
    }

    const config = configDoc.data()!;
    const allowedEmails: string[] = config.emails ?? [];
    const allowedPatterns: string[] = config.patterns ?? [];

    // Check explicit email list
    if (allowedEmails.includes(email)) {
      return; // Allowed
    }

    // Check regex patterns
    for (const pattern of allowedPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(email)) {
          return; // Allowed
        }
      } catch {
        // Invalid regex — skip it, don't block users because of a bad pattern
        console.warn(
          `[validateSignIn] Invalid regex pattern: "${pattern}" — skipping`,
        );
      }
    }

    // No match — reject
    throw new HttpsError(
      "permission-denied",
      "Access denied. Your email is not authorized to use this application.",
    );
  } catch (error) {
    // If it's already an HttpsError (our rejection), re-throw
    if (error instanceof HttpsError) {
      throw error;
    }

    // For any other error (Firestore down, etc.) — fail-closed
    console.error("[validateSignIn] Error checking access control:", error);
    throw new HttpsError(
      "internal",
      "Unable to verify access. Please try again later.",
    );
  }
});
