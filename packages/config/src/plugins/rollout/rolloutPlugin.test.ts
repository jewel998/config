import { describe, expect, it } from "vitest";

import type { ConfigFlagData } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";
import { computeBucket } from "./computeBucket.js";
import { rolloutPlugin } from "./rolloutPlugin.js";

/** Minimal helpers stub for tests */
const helpers: PipelineHelpers = {
  evaluateFlag: () => undefined,
  emitError: () => {},
  now: () => Date.now(),
};

/** Utility to build a minimal ConfigFlagData with rollout fields */
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

describe("rolloutPlugin", () => {
  const plugin = rolloutPlugin();

  it("has stepId 'rollout'", () => {
    expect(plugin.stepId).toBe("rollout");
  });

  describe("when rolloutPercentage is undefined", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag({ rolloutPercentage: undefined });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when rolloutPercentage is null (explicitly missing)", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag();
      // Simulate null by explicitly setting
      (flag as Record<string, unknown>).rolloutPercentage = null;
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when rolloutPercentage is 0", () => {
    it("returns resolved: false (skip to default)", () => {
      const flag = makeFlag({
        rolloutPercentage: 0,
        rolloutValue: "rollout-value",
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when rolloutPercentage is 100", () => {
    it("returns the rollout value for any user", () => {
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: "rollout-value",
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "rollout-value" });
    });

    it("returns the rollout value even without userId", () => {
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: true,
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: true });
    });
  });

  describe("when rolloutPercentage is between 1–99 and no userId", () => {
    it("returns resolved: false (cannot bucket)", () => {
      const flag = makeFlag({
        rolloutPercentage: 50,
        rolloutValue: "rollout-value",
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false for empty string userId", () => {
      const flag = makeFlag({
        rolloutPercentage: 50,
        rolloutValue: "rollout-value",
      });
      const context: EvaluationContext = { userId: "" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when rolloutPercentage is between 1–99 with userId", () => {
    it("returns rollout value when bucket < rolloutPercentage", () => {
      // Find a userId whose bucket is below 50
      const flag = makeFlag({
        key: "feature.test",
        rolloutPercentage: 50,
        rolloutValue: "included",
      });

      // Find a user that would be included
      let includedUser: string | undefined;
      for (let i = 0; i < 200; i++) {
        const userId = `user-${i}`;
        if (computeBucket("feature.test", userId) < 50) {
          includedUser = userId;
          break;
        }
      }
      expect(includedUser).toBeDefined();

      const context: EvaluationContext = { userId: includedUser };
      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "included" });
    });

    it("returns resolved: false when bucket >= rolloutPercentage", () => {
      // Find a userId whose bucket is >= 50
      const flag = makeFlag({
        key: "feature.test",
        rolloutPercentage: 50,
        rolloutValue: "included",
      });

      let excludedUser: string | undefined;
      for (let i = 0; i < 200; i++) {
        const userId = `user-${i}`;
        if (computeBucket("feature.test", userId) >= 50) {
          excludedUser = userId;
          break;
        }
      }
      expect(excludedUser).toBeDefined();

      const context: EvaluationContext = { userId: excludedUser };
      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("bucket inclusion is consistent with computeBucket result", () => {
      const flagKey = "feature.consistency";
      const flag = makeFlag({
        key: flagKey,
        rolloutPercentage: 30,
        rolloutValue: "enabled",
      });

      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        const bucket = computeBucket(flagKey, userId);
        const context: EvaluationContext = { userId };
        const result = plugin.evaluate(flag, context, helpers);

        if (bucket < 30) {
          expect(result).toEqual({ resolved: true, value: "enabled" });
        } else {
          expect(result).toEqual({ resolved: false });
        }
      }
    });
  });

  describe("rollout value types", () => {
    it("supports boolean rollout values", () => {
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: true,
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: true });
    });

    it("supports numeric rollout values", () => {
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: 42,
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: 42 });
    });

    it("supports object (JSON) rollout values", () => {
      const jsonValue = { theme: "dark", limit: 100 };
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: jsonValue,
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: jsonValue });
    });

    it("supports undefined rollout value (returns undefined when resolved)", () => {
      const flag = makeFlag({
        rolloutPercentage: 100,
        rolloutValue: undefined,
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: undefined });
    });
  });
});
