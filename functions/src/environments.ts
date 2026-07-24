import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createEnvironment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, projectId, name } = request.data as {
    tenantId: string;
    projectId: string;
    name: string;
  };

  if (!tenantId || !projectId) {
    throw new HttpsError(
      "invalid-argument",
      "Tenant ID and Project ID are required.",
    );
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Environment name is required.");
  }

  const db = getFirestore();
  const projectRef = db
    .collection("tenants")
    .doc(tenantId)
    .collection("projects")
    .doc(projectId);

  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }

  const envRef = projectRef.collection("environments").doc();

  const environment = {
    id: envRef.id,
    projectId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  await envRef.set(environment);

  return environment;
});

export const deleteEnvironment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, projectId, environmentId } = request.data as {
    tenantId: string;
    projectId: string;
    environmentId: string;
  };

  if (!tenantId || !projectId || !environmentId) {
    throw new HttpsError(
      "invalid-argument",
      "Tenant ID, Project ID, and Environment ID are required.",
    );
  }

  const db = getFirestore();
  const envRef = db
    .collection("tenants")
    .doc(tenantId)
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
