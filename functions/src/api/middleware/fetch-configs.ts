/**
 * Config and segment fetching middleware.
 *
 * Retrieves config documents and segment definitions from Firestore
 * for the given project and environment.
 */

import type { Firestore } from "firebase-admin/firestore";

import type { ConfigDoc, SegmentDoc } from "../server-evaluator";

export interface FetchConfigsResult {
  /** Parsed config documents */
  configs: ConfigDoc[];
  /** Segment definitions keyed by ID */
  segments: Record<string, SegmentDoc>;
  /** Environment config version (same as getVersion returns) */
  version: string;
  /** ISO timestamp of the most recently updated config */
  latestUpdate: string;
}

/**
 * Fetch config documents and segments from Firestore.
 *
 * If `keys` is provided, fetches only those specific documents in parallel
 * batches (no size limit). Otherwise fetches all configs via collection scan.
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

  // Fetch config documents and segments in PARALLEL
  const configsPromise: Promise<FirebaseFirestore.DocumentSnapshot[]> =
    keys && keys.length > 0
      ? fetchDocsByKeys(configsRef, keys)
      : configsRef.get().then((snapshot) => snapshot.docs);

  const segmentsPromise = db.collection("projects").doc(projectId).collection("segments").get();

  const envPromise = db
    .collection("projects")
    .doc(projectId)
    .collection("environments")
    .doc(environmentId)
    .get();

  const [configDocs, segmentsSnapshot, envDoc] = await Promise.all([
    configsPromise,
    segmentsPromise,
    envPromise,
  ]);

  const envData = envDoc.data() ?? {};
  const version: string = envData.configVersion ?? "0";

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

  return { configs, segments, version, latestUpdate };
}

/**
 * Fetch specific config documents by key in parallel batches.
 *
 * Firestore has no hard limit on parallel doc.get() calls, but we batch
 * into chunks of 30 to avoid overwhelming the connection pool.
 */
const BATCH_SIZE = 30;

async function fetchDocsByKeys(
  ref: FirebaseFirestore.CollectionReference,
  keys: string[],
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    chunks.push(keys.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) => Promise.all(chunk.map((key) => ref.doc(key).get()))),
  );

  return results.flat().filter((d) => d.exists);
}
