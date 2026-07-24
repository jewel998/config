import { getFirestore } from "firebase-admin/firestore";
import {
  beforeUserCreated,
  beforeUserSignedIn,
  HttpsError,
} from "firebase-functions/v2/identity";

/**
 * Checks if the user's email is in the allowedUsers collection.
 * If not, blocks the auth operation.
 *
 * To grant access: add a document to /allowedUsers/{email}
 * with at least { email: "user@example.com" }
 *
 * To revoke access: delete the document.
 */
const checkAllowedUser = async (email: string | undefined): Promise<void> => {
  if (!email) {
    throw new HttpsError(
      "permission-denied",
      "Access denied. Email is required.",
    );
  }

  const db = getFirestore();
  const doc = await db.collection("allowedUsers").doc(email).get();

  if (!doc.exists) {
    throw new HttpsError(
      "permission-denied",
      "Access denied. This portal is available on request only. Rights of Admission Reserved.",
    );
  }
};

/**
 * Blocks new user creation if their email is not in the allowedUsers list.
 */

export const beforeCreate: any = beforeUserCreated(async (event) => {
  await checkAllowedUser(event.data?.email);
});

/**
 * Blocks sign-in if the user's email is not in the allowedUsers list.
 * This catches returning users who may have been removed from the allowlist.
 */

export const beforeSignIn: any = beforeUserSignedIn(async (event) => {
  await checkAllowedUser(event.data?.email);
});
