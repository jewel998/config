import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createVersion = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, projectId, environmentId, version, payload } =
    request.data as {
      tenantId: string;
      projectId: string;
      environmentId?: string;
      version: string;
      payload: Record<string, unknown>;
    };

  if (!tenantId || !projectId) {
    throw new HttpsError(
      "invalid-argument",
      "Tenant ID and Project ID are required.",
    );
  }

  if (!version || typeof version !== "string") {
    throw new HttpsError("invalid-argument", "Version string is required.");
  }

  if (!payload || typeof payload !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "Payload must be a non-null object.",
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

  const versionRef = projectRef.collection("versions").doc();

  const versionRecord = {
    id: versionRef.id,
    projectId,
    environmentId: environmentId ?? null,
    version,
    payload,
    publishedAt: null,
    createdAt: new Date().toISOString(),
  };

  await versionRef.set(versionRecord);

  return versionRecord;
});

export const publishVersion = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId, projectId, versionId } = request.data as {
    tenantId: string;
    projectId: string;
    versionId: string;
  };

  if (!tenantId || !projectId || !versionId) {
    throw new HttpsError(
      "invalid-argument",
      "Tenant ID, Project ID, and Version ID are required.",
    );
  }

  const db = getFirestore();
  const versionRef = db
    .collection("tenants")
    .doc(tenantId)
    .collection("projects")
    .doc(projectId)
    .collection("versions")
    .doc(versionId);

  const versionDoc = await versionRef.get();

  if (!versionDoc.exists) {
    throw new HttpsError("not-found", "Version not found.");
  }

  const versionData = versionDoc.data();

  if (versionData?.publishedAt) {
    throw new HttpsError(
      "failed-precondition",
      "Version is already published.",
    );
  }

  const publishedAt = new Date().toISOString();

  await versionRef.update({ publishedAt });

  return { ...versionData, publishedAt };
});
