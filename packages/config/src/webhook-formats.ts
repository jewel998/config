// ═══════════════════════════════════════════════════════════════
// Webhook Format Constants — shared between portal, docs, and functions
// ═══════════════════════════════════════════════════════════════

/**
 * Supported webhook format identifiers.
 */
export const WEBHOOK_FORMATS = [
  "standard",
  "slack",
  "discord",
  "google-chat",
  "ms-teams",
  "custom",
] as const;

export type WebhookFormat = (typeof WEBHOOK_FORMATS)[number];

/**
 * Human-readable descriptions for each webhook format.
 */
export const WEBHOOK_FORMAT_INFO: Record<
  WebhookFormat,
  { label: string; description: string }
> = {
  standard: {
    label: "Standard JSON",
    description: "Plain JSON payload with all event details",
  },
  slack: {
    label: "Slack",
    description: "Block Kit formatted message for Slack channels",
  },
  discord: {
    label: "Discord",
    description: "Rich embed message for Discord channels",
  },
  "google-chat": {
    label: "Google Chat",
    description: "Cards v2 formatted message for Google Chat",
  },
  "ms-teams": {
    label: "Microsoft Teams",
    description: "Adaptive Card for Microsoft Teams channels",
  },
  custom: {
    label: "Custom Template",
    description: "User-defined template with {{variable}} interpolation",
  },
};

/**
 * Available template variables for the custom format.
 * Used by: portal UI (variable reference), docs page, and the function's template engine.
 */
export const TEMPLATE_VARIABLES = [
  {
    variable: "{{action}}",
    description: "The action that occurred",
    example: "create, update, delete, state_change",
  },
  {
    variable: "{{resource.category}}",
    description: "Resource category",
    example: "config, segment, api_key, team",
  },
  {
    variable: "{{resource.path}}",
    description: "Full resource path",
    example: "environments/prod/configs/feature.dark_mode",
  },
  {
    variable: "{{resource.name}}",
    description: "Human-readable resource name",
    example: "feature.dark_mode",
  },
  {
    variable: "{{environment}}",
    description: "Environment name (empty if none)",
    example: "production",
  },
  {
    variable: "{{actor.id}}",
    description: "User ID of the person who made the change",
    example: "user_abc123",
  },
  {
    variable: "{{timestamp}}",
    description: "ISO 8601 timestamp of the event",
    example: "2025-01-15T09:30:00.000Z",
  },
  {
    variable: "{{project.id}}",
    description: "Project identifier",
    example: "proj_xyz",
  },
  {
    variable: "{{webhook.id}}",
    description: "Webhook identifier",
    example: "whk_123",
  },
  {
    variable: "{{changes.old}}",
    description: "Previous value as JSON string (empty if create)",
    example: '{"enabled": true}',
  },
  {
    variable: "{{changes.new}}",
    description: "New value as JSON string (empty if delete)",
    example: '{"enabled": false}',
  },
] as const;

/**
 * Event types that can trigger webhooks.
 */
export const WEBHOOK_EVENT_TYPES = [
  "create",
  "update",
  "delete",
  "state_change",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/**
 * Resource categories for webhook filtering.
 */
export const WEBHOOK_RESOURCE_CATEGORIES = [
  "config",
  "segment",
  "api_key",
  "project",
  "team",
  "environment",
] as const;

export type WebhookResourceCategory =
  (typeof WEBHOOK_RESOURCE_CATEGORIES)[number];

/**
 * Sample payload used for preview/testing (shared between portal and docs).
 */
export const SAMPLE_WEBHOOK_EVENT = {
  action: "update",
  resourceCategory: "config",
  resourcePath: "environments/production/configs/feature.dark_mode",
  resourceName: "feature.dark_mode",
  environment: "production",
  actorId: "user_abc123",
  timestamp: "2025-01-15T09:30:00.000Z",
  oldValue: { value: false },
  newValue: { value: true },
  projectId: "proj_xyz",
  webhookId: "whk_sample",
} as const;
