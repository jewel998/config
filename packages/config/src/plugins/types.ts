// ═══════════════════════════════════════════════════════════════
// Plugin System Types and Pipeline Interfaces
// ═══════════════════════════════════════════════════════════════

import type { ConfigFlagData } from "./models.js";

/** Pipeline step identifier — determines execution order */
export type PipelineStepId =
  | "archived"
  | "prerequisites"
  | "overrides"
  | "schedule"
  | "targeting"
  | "rollout";

/** The fixed execution order (per Requirement 11) */
export const PIPELINE_ORDER: PipelineStepId[] = [
  "archived",
  "prerequisites",
  "overrides",
  "schedule",
  "targeting",
  "rollout",
];

/** Evaluation context provided by the consumer */
export interface EvaluationContext {
  userId?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
  consentGranted?: boolean;
}

/** Result from a pipeline step */
export type PipelineStepResult = { resolved: true; value: unknown } | { resolved: false };

/** A registered evaluation plugin */
export interface EvaluationPlugin {
  /** Which pipeline step this plugin handles */
  stepId: PipelineStepId;

  /** Evaluate a config flag at this pipeline step */
  evaluate(
    flag: ConfigFlagData,
    context: EvaluationContext,
    helpers: PipelineHelpers,
  ): PipelineStepResult;
}

/** Helpers provided to plugins for cross-cutting concerns */
export interface PipelineHelpers {
  /** Evaluate another flag (for prerequisites) */
  evaluateFlag(key: string, context: EvaluationContext): unknown;
  /** Emit an error */
  emitError(message: string): void;
  /** Current timestamp (injectable for testing) */
  now(): number;
}
