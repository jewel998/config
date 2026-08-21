/**
 * Config and segment fetching middleware.
 *
 * Retrieves config documents and segment definitions from Firestore
 * for the given project and environment.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { ConfigDoc, SegmentDoc } from "../server-evaluator.js";

export interface FetchConfigsResult {
  /** Parsed config documents */
  configs: ConfigDoc[];
  /** Segment definitions keyed by ID */
  segments: Record<string, SegmentDoc>;
  /** ISO timestamp of the most recently updated config */
  latestUpdate: string;
}

/**
 * Fetch config documents and segments from Firestore.
 *
 * If `keys` is provided and has 10 or fewer entries, fetches only those
 * specific documents (projected read). Otherwise fetches all configs.
 *
 * @param db - Firestore instance
 * @param projectId - The project document ID
 * @param environmentId - The environment document ID
 * @param keys - Optional subset of config keys to fetch
 * @returns Configs, segments, and the latest update timestamp
 */
export async function fetchConfigs(
  db: Firestore,
  projectId: string,
  environmentId: string,
  keys?: string[],
): Promise<FetchConfigsResult> {
  const configsRef = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .collection("configs");

  // Fetch config documents (projected or full)
  let configDocs: FirebaseFirestore.DocumentSnapshot[];
  if (keys && keys.length > 0 && keys.length <= 10) {
    const docs = await Promise.all(
      keys.map((key) => configsRef.doc(key).get()),
    );
    configDocs = docs.filter((d) => d.exists);
  } else {
    const snapshot = await configsRef.get();
    configDocs = snapshot.docs;
  }

  // Fetch segments
  const segmentsSnapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("segments")
    .get();

  const segments: Record<string, SegmentDoc> = {};
  for (const doc of segmentsSnapshot.docs) {
    const segData = doc.data();
    segments[doc.id] = {
      id: doc.id,
      name: segData.name ?? "",
      conditions: segData.conditions ?? [],
    };
  }

  // Parse config documents and track latest update
  let latestUpdate = "";
  const configs: ConfigDoc[] = [];

  for (const doc of configDocs) {
    const d = doc.data();
    if (!d) continue;

    configs.push({
      key: doc.id,
      value: d.value,
      valueType: d.valueType ?? "string",
      version: d.version ?? "1",
      lifecycleState: d.lifecycleState ?? "active",
      targetingRules: d.targetingRules,
      rolloutPercentage: d.rolloutPercentage,
      rolloutValue: d.rolloutValue,
      overrides: d.overrides,
      schedule: d.schedule,
      prerequisites: d.prerequisites,
    });

    if (d.updatedAt > latestUpdate) {
      latestUpdate = d.updatedAt;
    }
  }

  return { configs, segments, latestUpdate };
}
