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

// ═══════════════════════════════════════════════════════════════
// Deprecated API (kept for Phase 1 migration, remove in v1.0.0)
// ═══════════════════════════════════════════════════════════════

/** @deprecated Use createConfig() instead */
export { createConfigClient } from "./client";
export type {
  ConfigClient as LegacyConfigClient,
  ConfigClientOptions,
} from "./client";

/** @deprecated Tenant concept removed. Use ProjectRecord instead. */
export type { TenantRecord } from "./types";

/** @deprecated Use ConfigRecord instead */
export type { ConfigVersionRecord } from "./types";

/** @deprecated Scoping is handled by clientId */
export type { ConfigResolveContext, ConfigDefinition } from "./types";

/** @deprecated Use LoadingStrategy instead */
export type { ConfigScope, ConfigSourceMode } from "./types";

// Management (Portal only — still active)
export { createConfigManager } from "./management/index";
export type { ConfigManager, ConfigManagerOptions } from "./management/index";
export type { ConfigManagerBackend } from "./management/manager";
