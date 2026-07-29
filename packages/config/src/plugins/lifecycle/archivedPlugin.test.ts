import { describe, expect, it } from "vitest";

import type { ConfigFlagData } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";
import { archivedPlugin } from "./archivedPlugin.js";

/** Minimal helpers stub for tests */
const helpers: PipelineHelpers = {
  evaluateFlag: () => undefined,
  emitError: () => {},
  now: () => Date.now(),
};

/** Utility to build a minimal ConfigFlagData */
function makeFlag(overrides: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key: "feature.beta",
    value: "default-value",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

describe("archivedPlugin", () => {
  const plugin = archivedPlugin();

  it("has stepId 'archived'", () => {
    expect(plugin.stepId).toBe("archived");
  });

  describe("when lifecycleState is 'archived'", () => {
    it("returns resolved: true with value undefined", () => {
      const flag = makeFlag({ lifecycleState: "archived" });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined regardless of configured targeting rules", () => {
      const flag = makeFlag({
        lifecycleState: "archived",
        targetingRules: [
          {
            id: "rule-1",
            priority: 1,
            value: "targeted-value",
            conditions: [{ predicates: [{ attribute: "plan", operator: "equals", value: "pro" }] }],
          },
        ],
      });
      const context: EvaluationContext = {
        userId: "user-1",
        attributes: { plan: "pro" },
      };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined regardless of configured overrides", () => {
      const flag = makeFlag({
        lifecycleState: "archived",
        overrides: { "user-1": "override-value" },
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined regardless of configured rollout", () => {
      const flag = makeFlag({
        lifecycleState: "archived",
        rolloutPercentage: 100,
        rolloutValue: "rollout-value",
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined regardless of configured schedule", () => {
      const flag = makeFlag({
        lifecycleState: "archived",
        schedule: {
          targetValue: "scheduled-value",
          activateAt: "2020-01-01T00:00:00Z",
        },
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined regardless of configured prerequisites", () => {
      const flag = makeFlag({
        lifecycleState: "archived",
        prerequisites: [{ flagKey: "other-flag", requiredValue: true }],
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });

    it("returns undefined even without a userId in context", () => {
      const flag = makeFlag({ lifecycleState: "archived" });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });
  });

  describe("when lifecycleState is not 'archived'", () => {
    it("returns resolved: false for 'active' state", () => {
      const flag = makeFlag({ lifecycleState: "active" });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false for 'draft' state", () => {
      const flag = makeFlag({ lifecycleState: "draft" });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false for 'stale' state", () => {
      const flag = makeFlag({ lifecycleState: "stale" });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });
});
