import { initializeApp } from "firebase-admin/app";
import { createOnAuditCreated } from "./triggers/on-audit-created.js";
import { testWebhook } from "./callables/test-webhook.js";
import { importConfigs } from "./callables/import-configs.js";
import { exportConfigs } from "./callables/export-configs.js";
import { retryFailedRows } from "./callables/retry-failed-rows.js";
import { validateSignIn, validateCreate } from "./identity/validate-sign-in.js";
import { getConfig } from "./api/get-config.js";
import { getVersion } from "./api/get-version.js";

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
