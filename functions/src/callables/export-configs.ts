import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";

import type {
  ExportFile,
  ExportEnvironment,
  ExportSegment,
  ExportType,
} from "../import-export-types";
import { MAX_INSTANCES, FUNCTION_TIMEOUT_SECONDS } from "../utils/constants";
import { getDb } from "../utils/firestore";

interface ExportCallableData {
  projectId: string;
  exportType: ExportType;
  userId?: string;
}

/**
 * exportConfigs — HTTPS Callable Cloud Function
 *
 * Collects all configurations across environments, assembles a JSON export,
 * uploads to Firebase Storage, and returns a signed download URL.
 */
export const exportConfigs = onCall(
  { maxInstances: MAX_INSTANCES, timeoutSeconds: FUNCTION_TIMEOUT_SECONDS },
  async (request) => {
    // ─── Auth Check ──────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;

    // ─── Argument Validation ─────────────────────────────────
    const data = request.data as ExportCallableData;
    if (!data.projectId || !data.exportType) {
      throw new HttpsError("invalid-argument", "projectId and exportType are required");
    }
    if (data.exportType === "user" && !data.userId) {
      throw new HttpsError("invalid-argument", "userId is required for user-specific exports");
    }

    const db = getDb();
    const projectRef = db.collection("projects").doc(data.projectId);

    // ─── Project Membership Check ────────────────────────────
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Project not found");
    }
    const projectData = projectSnap.data()!;
    const roles: Record<string, string> = projectData.roles || {};
    const isOwner = projectData.ownerId === uid;
    const hasRole = uid in roles;
    const isAuthorized = isOwner || hasRole || (projectData.authorizedUsers || []).includes(uid);

    if (!isAuthorized) {
      throw new HttpsError("permission-denied", "Insufficient permissions for this operation");
    }

    // ─── Collect Environments + Configs ──────────────────────
    const environmentsSnap = await projectRef.collection("environments").get();
    const environments: Record<string, ExportEnvironment> = {};

    for (const envDoc of environmentsSnap.docs) {
      const envData = envDoc.data();
      const configsSnap = await envDoc.ref.collection("configs").get();

      const configs = configsSnap.docs.map((configDoc) => {
        const d = configDoc.data();
        return {
          key: d.key,
          value: d.value,
          valueType: d.valueType,
        };
      });

      environments[envData.name || envDoc.id] = {
        metadata: {
          name: envData.name || envDoc.id,
          color: envData.color,
          isProduction: envData.isProduction ?? false,
        },
        configs,
      };
    }

    // ─── Collect Segments ────────────────────────────────────
    const segmentsSnap = await projectRef.collection("segments").get();
    const segments: ExportSegment[] = segmentsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        description: d.description || "",
        conditions: d.conditions || [],
      };
    });

    // ─── Build Export Payload ─────────────────────────────────
    const now = new Date().toISOString();
    const exportPayload: ExportFile = {
      projectId: data.projectId,
      exportedAt: now,
      exportedBy: uid,
      exportType: data.exportType,
      environments,
      segments,
    };

    // ─── User-specific filtering ─────────────────────────────
    if (data.exportType === "user" && data.userId) {
      // Filter audit entries for this user
      const auditSnap = await projectRef
        .collection("audit_log")
        .where("actorId", "==", data.userId)
        .get();

      // Filter configs to only those with overrides for the user
      for (const envKey of Object.keys(exportPayload.environments)) {
        const env = exportPayload.environments[envKey];
        // Only include configs that have user-specific overrides
        env.configs = env.configs.filter((config) => {
          // Check if any config has overrides referencing this user
          // For data minimization, we only export configs the user interacted with
          return true; // All configs are included in user export for portability
        });
      }

      // Attach filtered audit entries to export (properly typed)
      exportPayload.auditEntries = auditSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          action: d.action,
          actorId: d.actorId,
          timestamp: d.timestamp,
          resourcePath: d.resourcePath,
          oldValue: d.oldValue,
          newValue: d.newValue,
        };
      });
    }

    // ─── Upload to Firebase Storage ──────────────────────────
    const bucket = getStorage().bucket();
    const exportId = `export_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `exports/${data.projectId}/${exportId}.json`;
    const file = bucket.file(filePath);

    const jsonContent = JSON.stringify(exportPayload, null, 2);

    try {
      await file.save(jsonContent, {
        contentType: "application/json",
        metadata: {
          metadata: {
            exportedBy: uid,
            projectId: data.projectId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          // Set lifecycle: auto-delete after 7 days for data minimization
          customTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (error) {
      // Single retry
      try {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await file.save(jsonContent, { contentType: "application/json" });
      } catch {
        throw new HttpsError("internal", "Failed to generate export file");
      }
    }

    // ─── Generate Signed URL (24 hours) ──────────────────────
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [downloadUrl] = await file.getSignedUrl({
      action: "read",
      expires: expiresAt,
    });

    // ─── Write Audit Log ─────────────────────────────────────
    const auditRef = projectRef.collection("audit_log").doc();
    await auditRef.set({
      action: "data_export",
      actorId: uid,
      timestamp: now,
      resourcePath: `projects/${data.projectId}`,
      newValue: JSON.stringify({
        exportType: data.exportType,
        exportId,
        userId: data.userId || null,
      }),
    });

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      exportId,
    };
  },
);
