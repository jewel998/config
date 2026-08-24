import type { Firestore } from "firebase-admin/firestore";

import type { ConfigDoc, SegmentDoc, UserContext } from "../api/server-evaluator";

/**
 * Augment the framework's RequestContext with app-specific fields.
 * All optional — populated progressively by guards.
 * Use non-null assertion (ctx.projectId!) in handlers where guards guarantee presence.
 */
declare module "@jewel998/api" {
  interface RequestContext {
    db: Firestore;
    clientId?: string;
    isServerKey?: boolean;
    evaluationMode?: "server" | "client";
    origin?: string;
    requestedKeys?: string[];
    userContext?: UserContext;
    projectId?: string;
    environmentId?: string;
    configs?: ConfigDoc[];
    segments?: Record<string, SegmentDoc>;
    version?: string;
    latestUpdate?: string;
  }
}
