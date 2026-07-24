import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const createEnvironment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, name, allowedDomains } = request.data as {
    projectId: string;
    name: string;
    allowedDomains?: string[];
  };

  if (!projectId) {
    throw new HttpsError("invalid-argument", "Project ID is required.");
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Environment name is required.");
  }

  const db = getFirestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }

  const envRef = projectRef.collection("environments").doc();

  const environment = {
    id: envRef.id,
    projectId,
    name: name.trim(),
    allowedDomains: allowedDomains ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await envRef.set(environment);

  return environment;
});

export const deleteEnvironment = onCall(async (request) => {
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
  const envRef = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId);

  const envDoc = await envRef.get();

  if (!envDoc.exists) {
    throw new HttpsError("not-found", "Environment not found.");
  }

  await envRef.delete();

  return { success: true };
});

export const updateEnvironmentDomains = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, environmentId, allowedDomains } = request.data as {
    projectId: string;
    environmentId: string;
    allowedDomains: string[];
  };

  if (!projectId || !environmentId) {
    throw new HttpsError(
      "invalid-argument",
      "Project ID and Environment ID are required.",
    );
  }

  if (!Array.isArray(allowedDomains)) {
    throw new HttpsError(
      "invalid-argument",
      "allowedDomains must be an array.",
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
      "Only the project owner can update domains.",
    );
  }

  const envRef = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId);

  await envRef.update({
    allowedDomains,
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});
