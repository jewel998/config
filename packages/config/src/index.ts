// ═══════════════════════════════════════════════════════════════
// @jewel998/config SDK
// ═══════════════════════════════════════════════════════════════

// Primary entry point
export { initConfig } from "./initConfig";
export type { InitConfigOptions, Flags } from "./initConfig";

// Legacy (still works, use initConfig for new projects)
export { createConfig } from "./createConfig";

// Types
export type {
  CacheStorage,
  ClientIdRecord,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventPayloads,
  ConfigEventType,
  ConfigRecord,
  CreateConfigOptions,
  EnvironmentRecord,
  EvaluationWarning,
  FetchGranularity,
  LoadingStrategy,
  ProjectRecord,
  RetryConfig,
} from "./types";

// Plugin types (re-exported for consumer convenience)
export type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineStepId,
  PipelineStepResult,
  PipelineHelpers,
} from "./plugins/types.js";

export { PIPELINE_ORDER } from "./plugins/types.js";

// Context helpers (tree-shakeable)
export { autoContext, mergeContext } from "./context/autoContext";

// Webhook format constants (shared between portal, docs, functions)
export {
  WEBHOOK_FORMATS,
  WEBHOOK_FORMAT_INFO,
  TEMPLATE_VARIABLES,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_RESOURCE_CATEGORIES,
  SAMPLE_WEBHOOK_EVENT,
} from "./webhook-formats";
export type {
  WebhookFormat,
  WebhookEventType,
  WebhookResourceCategory,
} from "./webhook-formats";

// Cache adapters
export { memoryStorage } from "./cache/memoryStorage";
export { browserStorage } from "./cache/browserStorage";

// Errors
export {
  AuthenticationError,
  ConfigError,
  InitializationError,
  TimeoutError,
} from "./errors/index";
export type { ConfigErrorCode } from "./errors/index";
