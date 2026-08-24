import { initializeApp } from "firebase-admin/app";

import { getConfig } from "./api/get-config";
import { getVersion } from "./api/get-version";
import { exportConfigs } from "./callables/export-configs";
import { importConfigs } from "./callables/import-configs";
import { retryFailedRows } from "./callables/retry-failed-rows";
import { testWebhook } from "./callables/test-webhook";
import { validateSignIn, validateCreate } from "./identity/validate-sign-in";
import { createOnAuditCreated } from "./triggers/on-audit-created";

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
