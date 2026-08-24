/**
 * Client authentication middleware.
 *
 * Validates a clientId token against Firestore and resolves the
 * associated project and environment IDs.
 */

import type { Firestore } from "firebase-admin/firestore";

import { InternalError, UnauthorizedError } from "../../utils/errors";

export interface AuthResult {
  /** Firestore project document ID */
  projectId: string;
  /** Firestore environment document ID */
  environmentId: string;
}

/**
 * Authenticate a clientId by looking it up in the Firestore collectionGroup.
 *
 * @param db - Firestore instance
 * @param clientId - The client token to validate
 * @returns Resolved project and environment IDs
 * @throws UnauthorizedError if the clientId is invalid or revoked
 * @throws InternalError if the Firestore index is missing
 */
export async function authenticateClient(db: Firestore, clientId: string): Promise<AuthResult> {
  let clientIdSnapshot;
  try {
    clientIdSnapshot = await db
      .collectionGroup("clientIds")
      .where("token", "==", clientId)
      .where("status", "==", "active")
      .limit(1)
      .get();
  } catch (error) {
    const grpcCode = (error as { code?: number }).code;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[authenticateClient] Firestore collectionGroup query failed. ` +
        `gRPC code: ${grpcCode}, message: ${msg}. ` +
        `This usually means the composite index for clientIds (token + status, COLLECTION_GROUP scope) ` +
        `has not been deployed. Run: firebase deploy --only firestore:indexes`,
    );
    throw new InternalError(
      "Failed to validate clientId. The required Firestore index may not exist.",
    );
  }

  if (clientIdSnapshot.empty) {
    throw new UnauthorizedError("Invalid or revoked clientId");
  }

  // Path: projects/{projectId}/environments/{envId}/clientIds/{token}
  const pathParts = clientIdSnapshot.docs[0].ref.path.split("/");
  const projectId = pathParts[1];
  const environmentId = pathParts[3];

  return { projectId, environmentId };
}
