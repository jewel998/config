import type { WebhookResourceCategory } from "../types.js";

export function getResourceCategory(path: string): WebhookResourceCategory {
  if (path.includes("configs")) return "config";
  if (path.includes("segments")) return "segment";
  if (path.includes("apiKeys") || path.includes("clientIds")) return "api_key";
  if (path.startsWith("project/") || path === "project") return "project";
  if (path.includes("team") || path.includes("members")) return "team";
  if (
    path.startsWith("environments/") &&
    !path.includes("/configs/") &&
    !path.includes("/apiKeys/")
  )
    return "environment";
  return "config"; // default fallback
}

export function getEnvironmentFromPath(path: string): string | null {
  const match = path.match(/environments\/([^/]+)/);
  return match ? match[1] : null;
}

export function formatResourceName(path: string): string {
  const parts = path.split("/");
  if (parts.includes("configs") && parts.length >= 4)
    return parts[parts.length - 1];
  if (parts.includes("apiKeys") && parts.length >= 4)
    return parts[parts.length - 1];
  if (parts[0] === "segments") return parts[1] ?? "segment";
  if (parts[0] === "project") return parts[1] ?? "project";
  if (parts[0] === "team" && parts[1] === "members")
    return parts[2] ?? "member";
  if (parts[0] === "team" && parts[1] === "invites")
    return parts[2] ?? "invite";
  if (parts[0] === "environments" && parts.length === 2) return parts[1];
  return parts[parts.length - 1] || path;
}
