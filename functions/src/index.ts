import { initializeApp } from "firebase-admin/app";
import { createOnAuditCreated } from "./triggers/on-audit-created";
import { testWebhook } from "./callables/test-webhook";
import { importConfigs } from "./callables/import-configs";
import { exportConfigs } from "./callables/export-configs";
import { retryFailedRows } from "./callables/retry-failed-rows";
import { validateSignIn, validateCreate } from "./identity/validate-sign-in";
import { getConfig } from "./api/get-config";
import { getVersion } from "./api/get-version";

// Initialize Firebase Admin
initializeApp();

// Export Cloud Functions
export const onAuditCreated = createOnAuditCreated();
export {
  testWebhook,
  importConfigs,
  exportConfigs,
  retryFailedRows,
  validateSignIn,
  validateCreate,
  getConfig,
  getVersion,
};
