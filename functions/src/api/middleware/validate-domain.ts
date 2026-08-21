/**
 * Domain validation middleware.
 *
 * Checks that the request origin is in the environment's allowedDomains list.
 * If no allowedDomains are configured, all origins are permitted.
 */

import type { Firestore } from "firebase-admin/firestore";
import { ForbiddenError } from "../../utils/errors.js";

/**
 * Validate that the request origin is allowed for the given environment.
 *
 * @param db - Firestore instance
 * @param projectId - The project document ID
 * @param environmentId - The environment document ID
 * @param origin - The request Origin or Referer header value
 * @throws ForbiddenError if the origin domain is not in the allowedDomains list
 */
export async function validateDomain(
  db: Firestore,
  projectId: string,
  environmentId: string,
  origin: string,
): Promise<void> {
  if (!origin) return;

  const envDoc = await db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .get();

  if (!envDoc.exists) return;

  const allowedDomains: string[] = envDoc.data()?.allowedDomains ?? [];
  if (allowedDomains.length === 0) return;

  const requestDomain = new URL(origin).hostname;
  const isAllowed = allowedDomains.some(
    (d) => requestDomain === d || requestDomain.endsWith(`.${d}`),
  );

  if (!isAllowed) {
    throw new ForbiddenError(
      `Origin ${requestDomain} is not in allowedDomains`,
    );
  }
}
