import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Bumps the configVersion on an environment doc and records which keys changed.
 * The SDK's /api/version endpoint reads this to know when to refetch and which keys.
 */
export async function bumpConfigVersion(
  projectId: string,
  environmentId: string,
  changedKeys: string[],
): Promise<void> {
  const envRef = doc(db, "projects", projectId, "environments", environmentId);
  await updateDoc(envRef, {
    configVersion: increment(1),
    lastChangedKeys: changedKeys,
    lastChangedAt: new Date().toISOString(),
  });
}
