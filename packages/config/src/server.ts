// ═══════════════════════════════════════════════════════════════
// @jewel998/config — Server (Node.js) Entry Point
//
// This module provides the backend SDK that runs in Node.js,
// Deno, Bun, or any server-side JavaScript runtime.
//
// It does NOT import any browser-specific code (localStorage,
// navigator, document, window). Tree-shaking ensures that
// frontend-only modules are never bundled into server builds.
// ═══════════════════════════════════════════════════════════════

// Server-specific entry point
export { initServerConfig } from "./server/initServerConfig.js";
export type { InitServerConfigOptions, ServerFlags } from "./server/initServerConfig.js";

// Server context helper (equivalent of autoContext for Node.js)
export { serverContext } from "./server/serverContext.js";
export type { ServerContextOptions } from "./server/serverContext.js";

// Shared types (universal — no browser deps)
export type {
  CacheStorage,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventPayloads,
  ConfigEventType,
  ConfigRecord,
  CreateConfigOptions,
  EvaluationWarning,
  FetchGranularity,
  LoadingStrategy,
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

// Cache adapters (memory only — no browser storage)
export { memoryStorage } from "./cache/memoryStorage.js";

// Errors
export {
  AuthenticationError,
  ConfigError,
  InitializationError,
  RateLimitError,
  TimeoutError,
} from "./errors/index.js";
export type { ConfigErrorCode } from "./errors/index.js";
