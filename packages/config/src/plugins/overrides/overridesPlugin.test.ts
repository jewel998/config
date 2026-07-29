import { describe, expect, it } from "vitest";

import type { ConfigFlagData } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";
import { overridesPlugin } from "./overridesPlugin.js";

/** Minimal helpers stub for tests */
const helpers: PipelineHelpers = {
  evaluateFlag: () => undefined,
  emitError: () => {},
  now: () => Date.now(),
};

/** Utility to build a minimal ConfigFlagData with overrides fields */
function makeFlag(overrides?: Partial<ConfigFlagData>): ConfigFlagData {
  return {
    key: "feature.test",
    value: "default-value",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

describe("overridesPlugin", () => {
  const plugin = overridesPlugin();

  it("has stepId 'overrides'", () => {
    expect(plugin.stepId).toBe("overrides");
  });

  describe("when no userId in context (Req 4.5)", () => {
    it("returns resolved: false when userId is undefined", () => {
      const flag = makeFlag({
        overrides: { "user-1": "override-value" },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when userId is empty string", () => {
      const flag = makeFlag({
        overrides: { "user-1": "override-value" },
      });
      const context: EvaluationContext = { userId: "" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when flag.overrides is undefined/null", () => {
    it("returns resolved: false when overrides is undefined", () => {
      const flag = makeFlag({ overrides: undefined });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when overrides is null", () => {
      const flag = makeFlag();
      (flag as Record<string, unknown>).overrides = null;
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when userId exists in overrides map with non-null value (Req 4.3)", () => {
    it("returns the override string value", () => {
      const flag = makeFlag({
        overrides: { "user-42": "special-value" },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "special-value" });
    });

    it("returns the override boolean value", () => {
      const flag = makeFlag({
        overrides: { "user-42": true },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: true });
    });

    it("returns the override numeric value", () => {
      const flag = makeFlag({
        overrides: { "user-42": 99 },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: 99 });
    });

    it("returns the override JSON object value", () => {
      const jsonValue = { theme: "dark", limit: 50 };
      const flag = makeFlag({
        overrides: { "user-42": jsonValue },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: jsonValue });
    });

    it("returns false (boolean) as a valid override value", () => {
      const flag = makeFlag({
        overrides: { "user-42": false },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: false });
    });

    it("returns 0 (number) as a valid override value", () => {
      const flag = makeFlag({
        overrides: { "user-42": 0 },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: 0 });
    });

    it("returns empty string as a valid override value", () => {
      const flag = makeFlag({
        overrides: { "user-42": "" },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "" });
    });
  });

  describe("when userId is NOT in overrides map (Req 4.4)", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag({
        overrides: { "other-user": "some-value" },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when overrides map is empty", () => {
      const flag = makeFlag({ overrides: {} });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when userId exists but value is null/undefined (Req 4.7)", () => {
    it("returns resolved: false when override value is null", () => {
      const flag = makeFlag({
        overrides: { "user-42": null },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when override value is undefined", () => {
      const flag = makeFlag({
        overrides: { "user-42": undefined },
      });
      const context: EvaluationContext = { userId: "user-42" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("multiple overrides in the map", () => {
    it("returns the correct override for the matching userId", () => {
      const flag = makeFlag({
        overrides: {
          "user-1": "value-1",
          "user-2": "value-2",
          "user-3": "value-3",
        },
      });
      const context: EvaluationContext = { userId: "user-2" };

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "value-2" });
    });
  });
});
