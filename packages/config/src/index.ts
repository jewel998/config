// ═══════════════════════════════════════════════════════════════
// New API (v0.2.0+)
// ═══════════════════════════════════════════════════════════════

// Entry point
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
  EvaluationMode,
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
