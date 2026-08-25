export const MAX_WEBHOOKS = 10;
export const DISPATCH_TIMEOUT_MS = 10_000;

export const EVENT_TYPES = ["create", "update", "delete", "state_change"] as const;

export const RESOURCE_CATEGORIES = [
  "config",
  "segment",
  "api_key",
  "project",
  "team",
  "environment",
] as const;
