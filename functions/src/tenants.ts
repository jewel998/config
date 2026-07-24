import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createTenant = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { name } = request.data as { name: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Tenant name is required.");
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc();

  const tenant = {
    id: tenantRef.id,
    name: name.trim(),
    ownerId: request.auth.uid,
    createdAt: new Date().toISOString(),
  };

  await tenantRef.set(tenant);

  return tenant;
});

export const deleteTenant = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { tenantId } = request.data as { tenantId: string };

  if (!tenantId) {
    throw new HttpsError("invalid-argument", "Tenant ID is required.");
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    throw new HttpsError("not-found", "Tenant not found.");
  }

  const tenantData = tenantDoc.data();

  if (tenantData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the owner can delete a tenant.",
    );
  }

  await tenantRef.delete();

  return { success: true };
});
