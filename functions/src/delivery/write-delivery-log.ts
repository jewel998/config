import { getFirestore } from "firebase-admin/firestore";
import { MAX_DELIVERIES } from "../constants.js";
import type { DispatchResult } from "../types.js";

/**
 * Write a delivery log entry and enforce the 20-entry cap.
 */
export async function writeDeliveryLog(
  projectId: string,
  webhookId: string,
  result: DispatchResult,
  auditEntryId: string,
  isTest: boolean,
): Promise<void> {
  const db = getFirestore("default");
  const deliveriesRef = db
    .collection("projects")
    .doc(projectId)
    .collection("webhooks")
    .doc(webhookId)
    .collection("deliveries");

  // Write the new entry
  await deliveriesRef.add({
    timestamp: new Date().toISOString(),
    httpStatus: result.httpStatus,
    success: result.success,
    duration: result.duration,
    error: result.error,
    auditEntryId,
    isTest,
  });

  // Enforce cap — delete oldest entries beyond limit
  await enforceDeliveryCap(deliveriesRef);
}

async function enforceDeliveryCap(
  deliveriesRef: FirebaseFirestore.CollectionReference,
): Promise<void> {
  const snapshot = await deliveriesRef.orderBy("timestamp", "asc").get();

  if (snapshot.size > MAX_DELIVERIES) {
    const batch = getFirestore("default").batch();
    const toDelete = snapshot.docs.slice(0, snapshot.size - MAX_DELIVERIES);
    toDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
