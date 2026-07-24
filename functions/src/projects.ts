import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const createProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { name } = request.data as { name: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Project name is required.");
  }

  const db = getFirestore();
  const projectRef = db.collection("projects").doc();

  const project = {
    id: projectRef.id,
    name: name.trim(),
    ownerId: request.auth.uid,
    authorizedUsers: [request.auth.uid],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await projectRef.set(project);

  return project;
});

export const deleteProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId } = request.data as { projectId: string };

  if (!projectId) {
    throw new HttpsError("invalid-argument", "Project ID is required.");
  }

  const db = getFirestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }

  const projectData = projectDoc.data();
  if (projectData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the owner can delete a project.",
    );
  }

  await projectRef.delete();

  return { success: true };
});

export const listProjects = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const db = getFirestore();

  // Query projects where user is owner or in authorizedUsers
  const ownedQuery = db
    .collection("projects")
    .where("ownerId", "==", request.auth.uid);

  const authorizedQuery = db
    .collection("projects")
    .where("authorizedUsers", "array-contains", request.auth.uid);

  const [ownedSnap, authorizedSnap] = await Promise.all([
    ownedQuery.get(),
    authorizedQuery.get(),
  ]);

  // Merge and deduplicate
  const projectsMap = new Map<string, unknown>();
  for (const doc of ownedSnap.docs) {
    projectsMap.set(doc.id, doc.data());
  }
  for (const doc of authorizedSnap.docs) {
    projectsMap.set(doc.id, doc.data());
  }

  return Array.from(projectsMap.values());
});

export const inviteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, userId } = request.data as {
    projectId: string;
    userId: string;
  };

  if (!projectId || !userId) {
    throw new HttpsError(
      "invalid-argument",
      "Project ID and User ID are required.",
    );
  }

  const db = getFirestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }

  const projectData = projectDoc.data();
  if (projectData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the owner can invite users.",
    );
  }

  const authorizedUsers = (projectData?.authorizedUsers as string[]) ?? [];
  if (authorizedUsers.includes(userId)) {
    return { success: true, message: "User already authorized." };
  }

  await projectRef.update({
    authorizedUsers: [...authorizedUsers, userId],
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});
