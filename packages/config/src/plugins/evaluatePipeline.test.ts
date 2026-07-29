import { describe, expect, it, vi } from "vitest";

import type { ConfigFlagData } from "./models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepId,
} from "./types.js";
import { evaluatePipeline } from "./evaluatePipeline.js";

// ─── Helpers ─────────────────────────────────────────────────

function makeFlag(overrides: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key: "test-flag",
    value: "default-value",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

function makeContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    userId: "user-1",
    attributes: {},
    ...overrides,
  };
}

function makeHelpers(): PipelineHelpers {
  return {
    evaluateFlag: vi.fn(() => undefined),
    emitError: vi.fn(),
    now: () => Date.now(),
  };
}

function makePlugin(
  stepId: PipelineStepId,
  result: { resolved: true; value: unknown } | { resolved: false },
): EvaluationPlugin {
  return {
    stepId,
    evaluate: vi.fn(() => result),
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("evaluatePipeline", () => {
  it("returns the flag default value when no plugins are registered", () => {
    const flag = makeFlag({ value: 42 });
    const result = evaluatePipeline([], flag, makeContext(), makeHelpers());
    expect(result).toBe(42);
  });

  it("returns the flag default value when all plugins return resolved: false", () => {
    const flag = makeFlag({ value: "fallback" });
    const plugins = [
      makePlugin("targeting", { resolved: false }),
      makePlugin("rollout", { resolved: false }),
    ];
    const result = evaluatePipeline(plugins, flag, makeContext(), makeHelpers());
    expect(result).toBe("fallback");
  });

  it("short-circuits on first resolved result", () => {
    const flag = makeFlag();
    const overridesPlugin = makePlugin("overrides", { resolved: true, value: "override-val" });
    const targetingPlugin = makePlugin("targeting", { resolved: true, value: "targeting-val" });

    const result = evaluatePipeline(
      [overridesPlugin, targetingPlugin],
      flag,
      makeContext(),
      makeHelpers(),
    );

    expect(result).toBe("override-val");
    // Targeting should not have been called since overrides resolved first
    expect(targetingPlugin.evaluate).not.toHaveBeenCalled();
  });

  it("skips steps with no registered plugin (Property 21)", () => {
    const flag = makeFlag();
    // Only register a targeting plugin — archived, prerequisites, overrides, schedule are skipped
    const targetingPlugin = makePlugin("targeting", { resolved: true, value: "from-targeting" });

    const result = evaluatePipeline([targetingPlugin], flag, makeContext(), makeHelpers());

    expect(result).toBe("from-targeting");
    expect(targetingPlugin.evaluate).toHaveBeenCalledOnce();
  });

  it("sorts plugins by fixed PIPELINE_ORDER regardless of registration order (Property 20)", () => {
    const flag = makeFlag();
    const callOrder: PipelineStepId[] = [];

    const rolloutPlugin: EvaluationPlugin = {
      stepId: "rollout",
      evaluate: vi.fn(() => {
        callOrder.push("rollout");
        return { resolved: false };
      }),
    };

    const archivedPlugin: EvaluationPlugin = {
      stepId: "archived",
      evaluate: vi.fn(() => {
        callOrder.push("archived");
        return { resolved: false };
      }),
    };

    const targetingPlugin: EvaluationPlugin = {
      stepId: "targeting",
      evaluate: vi.fn(() => {
        callOrder.push("targeting");
        return { resolved: false };
      }),
    };

    // Register in reverse order: rollout, targeting, archived
    evaluatePipeline(
      [rolloutPlugin, targetingPlugin, archivedPlugin],
      flag,
      makeContext(),
      makeHelpers(),
    );

    // Should execute in pipeline order: archived → targeting → rollout
    expect(callOrder).toEqual(["archived", "targeting", "rollout"]);
  });

  it("returns undefined when a resolved plugin returns undefined as value", () => {
    const flag = makeFlag();
    const archivedPlugin = makePlugin("archived", { resolved: true, value: undefined });

    const result = evaluatePipeline([archivedPlugin], flag, makeContext(), makeHelpers());

    expect(result).toBeUndefined();
  });

  it("passes flag, context, and helpers to plugin.evaluate()", () => {
    const flag = makeFlag();
    const context = makeContext({ userId: "special-user" });
    const helpers = makeHelpers();
    const plugin = makePlugin("overrides", { resolved: true, value: "x" });

    evaluatePipeline([plugin], flag, context, helpers);

    expect(plugin.evaluate).toHaveBeenCalledWith(flag, context, helpers);
  });

  it("respects full pipeline order when all steps are registered", () => {
    const flag = makeFlag();
    const callOrder: PipelineStepId[] = [];

    const steps: PipelineStepId[] = [
      "archived",
      "prerequisites",
      "overrides",
      "schedule",
      "targeting",
      "rollout",
    ];

    // Register in shuffled order
    const shuffled: PipelineStepId[] = [
      "rollout",
      "targeting",
      "prerequisites",
      "archived",
      "schedule",
      "overrides",
    ];

    const plugins = shuffled.map((stepId): EvaluationPlugin => ({
      stepId,
      evaluate: vi.fn(() => {
        callOrder.push(stepId);
        return { resolved: false };
      }),
    }));

    evaluatePipeline(plugins, flag, makeContext(), makeHelpers());

    expect(callOrder).toEqual(steps);
  });
});
