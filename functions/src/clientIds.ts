import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const generateToken = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return (
    "cid_" +
    Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join("")
  );
};

export const generateClientId = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, environmentId, label } = request.data as {
    projectId: string;
    environmentId: string;
    label?: string;
  };

  if (!projectId || !environmentId) {
    throw new HttpsError(
      "invalid-argument",
      "Project ID and Environment ID are required.",
    );
  }

  const db = getFirestore();

  // Verify project access
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectDoc.data();
  const isAuthorized =
    projectData?.ownerId === request.auth.uid ||
    (projectData?.authorizedUsers as string[])?.includes(request.auth.uid);
  if (!isAuthorized) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized for this project.",
    );
  }

  // Generate token
  const token = generateToken();

  const clientIdRef = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .collection("clientIds")
    .doc(token);

  const record = {
    token,
    status: "active" as const,
    createdAt: new Date().toISOString(),
    revokedAt: null,
    createdBy: request.auth.uid,
    label: label ?? null,
  };

  await clientIdRef.set(record);

  return record;
});

export const revokeClientId = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, environmentId, token } = request.data as {
    projectId: string;
    environmentId: string;
    token: string;
  };

  if (!projectId || !environmentId || !token) {
    throw new HttpsError(
      "invalid-argument",
      "Project ID, Environment ID, and token are required.",
    );
  }

  const db = getFirestore();

  // Verify project ownership
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectDoc.data();
  if (projectData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the project owner can revoke clientIds.",
    );
  }

  const clientIdRef = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .collection("clientIds")
    .doc(token);

  const clientIdDoc = await clientIdRef.get();
  if (!clientIdDoc.exists) {
    throw new HttpsError("not-found", "ClientId not found.");
  }

  await clientIdRef.update({
    status: "revoked",
    revokedAt: new Date().toISOString(),
  });

  return { success: true };
});

export const listClientIds = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, environmentId } = request.data as {
    projectId: string;
    environmentId: string;
  };

  if (!projectId || !environmentId) {
    throw new HttpsError(
      "invalid-argument",
      "Project ID and Environment ID are required.",
    );
  }

  const db = getFirestore();
  const snapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .collection("clientIds")
    .get();

  return snapshot.docs.map((doc) => doc.data());
});
