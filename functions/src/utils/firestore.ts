/**
 * Shared Firestore instance provider.
 * Uses the singleton pattern — getFirestore() already returns a cached instance,
 * but wrapping it here gives us a single import path and a seam for testing.
 */

import { getFirestore } from "firebase-admin/firestore";

export function getDb() {
  return getFirestore("default");
}
