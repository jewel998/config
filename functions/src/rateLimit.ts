import { getFirestore } from "firebase-admin/firestore";

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 100; // requests per window

interface RateLimitDocument {
  clientId: string;
  windowStart: number;
  count: number;
}

export const isRateLimited = async (clientId: string): Promise<boolean> => {
  const db = getFirestore();
  const ref = db.collection("rateLimits").doc(clientId);
  const now = Math.floor(Date.now() / 1000);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data() as RateLimitDocument | undefined;

    if (!data || now - data.windowStart >= RATE_LIMIT_WINDOW) {
      // New window
      tx.set(ref, { clientId, windowStart: now, count: 1 });
      return false;
    }

    if (data.count >= RATE_LIMIT_MAX) {
      return true;
    }

    tx.update(ref, { count: data.count + 1 });
    return false;
  });
};
