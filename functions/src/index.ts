import { initializeApp } from "firebase-admin/app";
import { createOnAuditCreated } from "./triggers/on-audit-created.js";
import { testWebhook } from "./callables/test-webhook.js";

// Initialize Firebase Admin
initializeApp();

// Export Cloud Functions
export const onAuditCreated = createOnAuditCreated();
export { testWebhook };
