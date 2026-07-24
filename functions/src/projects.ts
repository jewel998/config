import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, name } = request.data as {
    tenantId: string;
    name: string;
  };

  if (!tenantId) {
    throw new HttpsError("invalid-argument", "Tenant ID is required.");
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Project name is required.");
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    throw new HttpsError("not-found", "Tenant not found.");
  }

  const projectRef = tenantRef.collection("projects").doc();

  const project = {
    id: projectRef.id,
    tenantId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  await projectRef.set(project);

  return project;
});

export const deleteProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, projectId } = request.data as {
    tenantId: string;
    projectId: string;
  };

  if (!tenantId || !projectId) {
    throw new HttpsError(
      "invalid-argument",
      "Tenant ID and Project ID are required.",
    );
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

  await projectRef.delete();

  return { success: true };
});
