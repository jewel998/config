import type { Firestore } from "firebase-admin/firestore";

import { authenticateClient } from "../api/middleware/authenticate";

interface CorsRequest {
  method?: string;
  query: Record<string, unknown>;
  body?: { data?: { clientId?: unknown } };
  headers: Record<string, string | string[] | undefined>;
}

interface CorsResponse {
  set(field: string, value: string): unknown;
  status(code: number): CorsResponse;
  end(): unknown;
}

const CORS_HEADERS = {
  methods: "GET, POST, OPTIONS",
  allowedHeaders: "Content-Type, Authorization, If-None-Match",
  exposedHeaders: "ETag, X-Config-Project, X-Config-Environment, X-Config-Version, X-Config-Hash",
  maxAge: "86400",
} as const;

function getClientId(req: CorsRequest): string | null {
  const queryClientId = req.query.clientId;
  if (typeof queryClientId === "string" && queryClientId) return queryClientId;

  const bodyClientId = req.body?.data?.clientId;
  return typeof bodyClientId === "string" && bodyClientId ? bodyClientId : null;
}

function isAllowedOrigin(origin: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  return allowedDomains.some((domain) => {
    const normalized = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0];
    return hostname === normalized || hostname.endsWith(`.${normalized}`);
  });
}

function setAllowedCorsHeaders(res: CorsResponse, origin: string): void {
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Methods", CORS_HEADERS.methods);
  res.set("Access-Control-Allow-Headers", CORS_HEADERS.allowedHeaders);
  res.set("Access-Control-Expose-Headers", CORS_HEADERS.exposedHeaders);
  res.set("Access-Control-Max-Age", CORS_HEADERS.maxAge);
  res.set("Vary", "Origin");
}

/** Authorizes CORS against the environment mapped by the client ID. */
export async function handleCors(
  req: CorsRequest,
  res: CorsResponse,
  db: Firestore,
): Promise<boolean> {
  const origin = req.headers.origin;
  const requestOrigin = Array.isArray(origin) ? origin[0] : origin;

  if (!requestOrigin) {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return true;
    }
    return false;
  }

  const clientId = getClientId(req);
  if (!clientId) {
    if (req.method === "OPTIONS") {
      res.status(400).end();
      return true;
    }
    return false;
  }

  try {
    const { projectId, environmentId } = await authenticateClient(db, clientId);
    const environment = await db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .get();
    const allowedDomains: string[] = environment.data()?.allowedDomains ?? [];

    if (!isAllowedOrigin(requestOrigin, allowedDomains)) {
      res.status(403).end();
      return true;
    }

    setAllowedCorsHeaders(res, requestOrigin);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return true;
    }
  } catch {
    if (req.method === "OPTIONS") {
      res.status(403).end();
      return true;
    }
  }

  return false;
}
