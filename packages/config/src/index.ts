// ═══════════════════════════════════════════════════════════════
// @jewel998/config SDK
// ═══════════════════════════════════════════════════════════════

// Primary entry point
export { initConfig } from "./initConfig.js";
export type { InitConfigOptions, Flags } from "./initConfig.js";

// Legacy (still works, use initConfig for new projects)
export { createConfig } from "./createConfig.js";

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
} from "./types.js";

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
export { autoContext, mergeContext } from "./context/autoContext.js";

// Webhook format constants (shared between portal, docs, functions)
export {
  WEBHOOK_FORMATS,
  WEBHOOK_FORMAT_INFO,
  TEMPLATE_VARIABLES,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_RESOURCE_CATEGORIES,
  SAMPLE_WEBHOOK_EVENT,
} from "./webhook-formats.js";
export type {
  WebhookFormat,
  WebhookEventType,
  WebhookResourceCategory,
} from "./webhook-formats.js";

// Cache adapters
export { memoryStorage } from "./cache/memoryStorage.js";
export { browserStorage } from "./cache/browserStorage.js";

// Errors
export {
  AuthenticationError,
  ConfigError,
  InitializationError,
  RateLimitError,
  TimeoutError,
} from "./errors/index.js";
export type { ConfigErrorCode } from "./errors/index.js";
