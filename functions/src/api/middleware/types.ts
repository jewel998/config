/**
 * Shared types for the API middleware pipeline.
 *
 * Each middleware function operates on a RequestContext, enriching it
 * or throwing an ApiError if validation fails.
 */

/**
 * Parsed and validated request context passed through the middleware pipeline.
 */
export interface RequestContext {
  /** The raw clientId token from the request */
  clientId: string;
  /** Firestore project document ID */
  projectId: string;
  /** Firestore environment document ID */
  environmentId: string;
  /** Whether the key is a server key (svr_ prefix) */
  isServerKey: boolean;
  /** Evaluation mode derived from key prefix */
  evaluationMode: "server" | "client";
  /** Optional subset of config keys to fetch */
  requestedKeys?: string[];
  /** User context for server-side evaluation */
  userContext?: { userId?: string; attributes?: Record<string, unknown> };
}
