/**
 * Domain validation middleware.
 *
 * Checks that the request origin is in the environment's allowedDomains list.
 * If no allowedDomains are configured, all origins are permitted. localhost is
 * NOT special — to develop locally, add `localhost` (or `127.0.0.1`) to the
 * environment's allowedDomains like any other origin.
 */

import type { Firestore } from "firebase-admin/firestore";

import { ForbiddenError } from "../../utils/errors";

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

  let requestDomain: string;
  try {
    requestDomain = new URL(origin).hostname;
  } catch {
    // Malformed Origin/Referer — treat as no origin rather than hard-failing.
    return;
  }

  const envDoc = await db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .get();

  if (!envDoc.exists) return;

  const allowedDomains: string[] = envDoc.data()?.allowedDomains ?? [];
  if (allowedDomains.length === 0) return;

  const isAllowed = allowedDomains.some(
    (d) => requestDomain === d || requestDomain.endsWith(`.${d}`),
  );

  if (!isAllowed) {
    throw new ForbiddenError(`Origin ${requestDomain} is not in allowedDomains`);
  }
}
