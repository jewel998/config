// ═══════════════════════════════════════════════════════════════
// Plugin System — Barrel Export
// ═══════════════════════════════════════════════════════════════

export type {
  PipelineStepId,
  EvaluationContext,
  PipelineStepResult,
  EvaluationPlugin,
  PipelineHelpers,
} from "./types.js";

export { PIPELINE_ORDER } from "./types.js";

export type {
  ConfigFlagData,
  TargetingRule,
  PredicateGroup,
  Predicate,
  PredicateOperator,
  Segment,
} from "./models.js";

export { evaluatePipeline } from "./evaluatePipeline.js";
