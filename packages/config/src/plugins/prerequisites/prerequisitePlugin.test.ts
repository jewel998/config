import { describe, expect, it, vi } from "vitest";

import type { ConfigFlagData } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";
import { prerequisitePlugin } from "./prerequisitePlugin.js";

/** Utility to build minimal PipelineHelpers with overridable evaluateFlag */
function makeHelpers(
  overrides: Partial<PipelineHelpers> = {},
): PipelineHelpers {
  return {
    evaluateFlag: () => undefined,
    emitError: vi.fn(),
    now: () => Date.now(),
    ...overrides,
  };
}

/** Utility to build a minimal ConfigFlagData */
function makeFlag(overrides: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key: "feature.dependent",
    value: "default-value",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

describe("prerequisitePlugin", () => {
  it("has stepId 'prerequisites'", () => {
    const plugin = prerequisitePlugin();
    expect(plugin.stepId).toBe("prerequisites");
  });

  describe("when prerequisites is undefined", () => {
    it("returns resolved: false (skip)", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({ prerequisites: undefined });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when prerequisites is an empty array", () => {
    it("returns resolved: false (skip)", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({ prerequisites: [] });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when all prerequisites are met", () => {
    it("returns resolved: false (let pipeline continue)", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        prerequisites: [
          { flagKey: "feature.prereq1", requiredValue: true },
          { flagKey: "feature.prereq2", requiredValue: "enabled" },
        ],
      });
      const context: EvaluationContext = { userId: "user-1" };
      const helpers = makeHelpers({
        evaluateFlag: (key: string) => {
          if (key === "feature.prereq1") return true;
          if (key === "feature.prereq2") return "enabled";
          return undefined;
        },
      });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when a prerequisite is unmet", () => {
    it("returns the flag default value", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        value: "my-default",
        prerequisites: [{ flagKey: "feature.prereq1", requiredValue: true }],
      });
      const context: EvaluationContext = { userId: "user-1" };
      const helpers = makeHelpers({
        evaluateFlag: () => false, // prereq returns false instead of true
      });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "my-default" });
    });

    it("returns default when prerequisite returns undefined (non-existent flag)", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        value: 42,
        valueType: "number",
        prerequisites: [
          { flagKey: "feature.nonexistent", requiredValue: true },
        ],
      });
      const context: EvaluationContext = { userId: "user-1" };
      const helpers = makeHelpers({
        evaluateFlag: () => undefined,
      });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: 42 });
    });

    it("uses string-coerced equality — '1' equals 1", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        value: "default",
        prerequisites: [{ flagKey: "feature.prereq", requiredValue: 1 }],
      });
      const context: EvaluationContext = {};
      const helpers = makeHelpers({
        evaluateFlag: () => "1", // string "1" coerces to match number 1
      });

      const result = plugin.evaluate(flag, context, helpers);
      // equals operator coerces to string: "1" === "1" → met
      expect(result).toEqual({ resolved: false });
    });

    it("short-circuits on first unmet prerequisite", () => {
      const plugin = prerequisitePlugin();
      const evaluateFlag = vi.fn();
      evaluateFlag.mockReturnValueOnce(false); // first prereq unmet

      const flag = makeFlag({
        value: "default",
        prerequisites: [
          { flagKey: "feature.prereq1", requiredValue: true },
          { flagKey: "feature.prereq2", requiredValue: true },
        ],
      });
      const context: EvaluationContext = {};
      const helpers = makeHelpers({ evaluateFlag });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "default" });
      // Only the first prerequisite was evaluated
      expect(evaluateFlag).toHaveBeenCalledTimes(1);
    });
  });

  describe("circular dependency detection", () => {
    it("detects direct cycle and returns default with error", () => {
      const plugin = prerequisitePlugin();
      const emitError = vi.fn();

      // Simulate: flag A requires flag A (direct self-reference via evaluateFlag recursion)
      const flagA = makeFlag({
        key: "feature.a",
        value: "a-default",
        prerequisites: [{ flagKey: "feature.a", requiredValue: true }],
      });

      const context: EvaluationContext = {};

      // When evaluateFlag("feature.a") is called for the prerequisite,
      // it triggers another evaluation of the same flag via the plugin
      const helpers = makeHelpers({
        evaluateFlag: (key: string) => {
          if (key === "feature.a") {
            // Simulate the pipeline re-entering the prerequisite plugin
            // for the same flag — this will detect the cycle
            const innerResult = plugin.evaluate(flagA, context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return undefined;
          }
          return undefined;
        },
        emitError,
      });

      const result = plugin.evaluate(flagA, context, helpers);
      // The outer call should succeed (first call adds to stack),
      // but the recursive inner call should detect the cycle
      // Since the prerequisite evaluates flagA which triggers cycle detection
      // and returns default "a-default", which is checked against requiredValue true
      // "a-default" !== true → prerequisite is unmet → returns default
      expect(result).toEqual({ resolved: true, value: "a-default" });
      expect(emitError).toHaveBeenCalledWith(
        expect.stringContaining("Circular dependency detected"),
      );
    });

    it("detects indirect cycle (A → B → A)", () => {
      const plugin = prerequisitePlugin();
      const emitError = vi.fn();

      const flagA = makeFlag({
        key: "feature.a",
        value: "a-default",
        prerequisites: [{ flagKey: "feature.b", requiredValue: true }],
      });

      const flagB = makeFlag({
        key: "feature.b",
        value: "b-default",
        prerequisites: [{ flagKey: "feature.a", requiredValue: true }],
      });

      const context: EvaluationContext = {};

      const helpers: PipelineHelpers = {
        evaluateFlag: (key: string) => {
          if (key === "feature.b") {
            const innerResult = plugin.evaluate(flagB, context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return undefined;
          }
          if (key === "feature.a") {
            const innerResult = plugin.evaluate(flagA, context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return undefined;
          }
          return undefined;
        },
        emitError,
        now: () => Date.now(),
      };

      const result = plugin.evaluate(flagA, context, helpers);
      expect(result).toEqual({ resolved: true, value: "a-default" });
      expect(emitError).toHaveBeenCalledWith(
        expect.stringContaining("Circular dependency detected"),
      );
    });
  });

  describe("depth limiting", () => {
    it("stops evaluation when depth exceeds maxDepth", () => {
      const plugin = prerequisitePlugin({ maxDepth: 3 });
      const emitError = vi.fn();
      const context: EvaluationContext = {};

      // Create a chain: flag0 → flag1 → flag2 → flag3 → flag4
      const flags: ConfigFlagData[] = [];
      for (let i = 0; i < 5; i++) {
        flags.push(
          makeFlag({
            key: `feature.level${i}`,
            value: `default-${i}`,
            prerequisites:
              i < 4
                ? [{ flagKey: `feature.level${i + 1}`, requiredValue: true }]
                : undefined,
          }),
        );
      }

      const helpers: PipelineHelpers = {
        evaluateFlag: (key: string) => {
          const idx = flags.findIndex((f) => f.key === key);
          if (idx >= 0) {
            const innerResult = plugin.evaluate(flags[idx], context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return true; // prerequisite met if no more prerequisites
          }
          return undefined;
        },
        emitError,
        now: () => Date.now(),
      };

      const result = plugin.evaluate(flags[0], context, helpers);
      // Depth should be exceeded at level 3 (0, 1, 2 in stack, trying to add 3)
      expect(result).toEqual({ resolved: true, value: "default-0" });
      expect(emitError).toHaveBeenCalledWith(
        expect.stringContaining("depth exceeded"),
      );
    });

    it("uses default maxDepth of 5", () => {
      const plugin = prerequisitePlugin();
      const emitError = vi.fn();
      const context: EvaluationContext = {};

      // Create a chain of 6 flags: flag0 → flag1 → ... → flag5
      const flags: ConfigFlagData[] = [];
      for (let i = 0; i < 7; i++) {
        flags.push(
          makeFlag({
            key: `feature.deep${i}`,
            value: `default-${i}`,
            prerequisites:
              i < 6
                ? [{ flagKey: `feature.deep${i + 1}`, requiredValue: true }]
                : undefined,
          }),
        );
      }

      const helpers: PipelineHelpers = {
        evaluateFlag: (key: string) => {
          const idx = flags.findIndex((f) => f.key === key);
          if (idx >= 0) {
            const innerResult = plugin.evaluate(flags[idx], context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return true;
          }
          return undefined;
        },
        emitError,
        now: () => Date.now(),
      };

      const result = plugin.evaluate(flags[0], context, helpers);
      expect(result).toEqual({ resolved: true, value: "default-0" });
      expect(emitError).toHaveBeenCalledWith(
        expect.stringContaining("depth exceeded"),
      );
    });

    it("allows evaluation within max depth limit", () => {
      const plugin = prerequisitePlugin({ maxDepth: 5 });
      const emitError = vi.fn();
      const context: EvaluationContext = {};

      // Chain of 3 deep (within maxDepth of 5): flag0 → flag1 → flag2
      // flag2 has no prerequisites and evaluateFlag returns the required value
      const flags: ConfigFlagData[] = [
        makeFlag({
          key: "feature.chain0",
          value: "default-0",
          prerequisites: [{ flagKey: "feature.chain1", requiredValue: true }],
        }),
        makeFlag({
          key: "feature.chain1",
          value: "default-1",
          prerequisites: [{ flagKey: "feature.chain2", requiredValue: true }],
        }),
        makeFlag({
          key: "feature.chain2",
          value: "default-2",
          prerequisites: [], // no prerequisites, pipeline continues
        }),
      ];

      const helpers: PipelineHelpers = {
        evaluateFlag: (key: string) => {
          const idx = flags.findIndex((f) => f.key === key);
          if (idx >= 0) {
            const innerResult = plugin.evaluate(flags[idx], context, {
              ...helpers,
              emitError,
            });
            if (innerResult.resolved) return innerResult.value;
            return true; // resolved: false means pipeline continues → return "met"
          }
          return undefined;
        },
        emitError,
        now: () => Date.now(),
      };

      const result = plugin.evaluate(flags[0], context, helpers);
      // All prerequisites met (chain within depth), pipeline continues
      expect(result).toEqual({ resolved: false });
      expect(emitError).not.toHaveBeenCalled();
    });
  });

  describe("evaluation stack cleanup", () => {
    it("cleans up the evaluation stack even when prerequisites fail", () => {
      const plugin = prerequisitePlugin();
      const context: EvaluationContext = {};

      const flag = makeFlag({
        key: "feature.cleanup",
        value: "default",
        prerequisites: [{ flagKey: "feature.prereq", requiredValue: true }],
      });

      const helpers = makeHelpers({
        evaluateFlag: () => false, // unmet
      });

      // First evaluation
      plugin.evaluate(flag, context, helpers);

      // Second evaluation should work fine (stack was cleaned)
      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "default" });
    });

    it("cleans up the evaluation stack on subsequent successful evaluations", () => {
      const plugin = prerequisitePlugin();
      const context: EvaluationContext = {};

      const flag = makeFlag({
        key: "feature.reuse",
        value: "default",
        prerequisites: [{ flagKey: "feature.prereq", requiredValue: true }],
      });

      const helpers = makeHelpers({
        evaluateFlag: () => true, // met
      });

      // Multiple evaluations should all succeed
      const result1 = plugin.evaluate(flag, context, helpers);
      const result2 = plugin.evaluate(flag, context, helpers);
      expect(result1).toEqual({ resolved: false });
      expect(result2).toEqual({ resolved: false });
    });
  });

  describe("multiple prerequisites", () => {
    it("returns default when second prerequisite is unmet", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        value: "default",
        prerequisites: [
          { flagKey: "feature.a", requiredValue: true },
          { flagKey: "feature.b", requiredValue: "on" },
          { flagKey: "feature.c", requiredValue: 100 },
        ],
      });
      const context: EvaluationContext = {};
      const helpers = makeHelpers({
        evaluateFlag: (key: string) => {
          if (key === "feature.a") return true;
          if (key === "feature.b") return "off"; // unmet
          if (key === "feature.c") return 100;
          return undefined;
        },
      });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: true, value: "default" });
    });

    it("continues pipeline when all multiple prerequisites are met", () => {
      const plugin = prerequisitePlugin();
      const flag = makeFlag({
        value: "default",
        prerequisites: [
          { flagKey: "feature.a", requiredValue: true },
          { flagKey: "feature.b", requiredValue: "on" },
          { flagKey: "feature.c", requiredValue: 100 },
        ],
      });
      const context: EvaluationContext = {};
      const helpers = makeHelpers({
        evaluateFlag: (key: string) => {
          if (key === "feature.a") return true;
          if (key === "feature.b") return "on";
          if (key === "feature.c") return 100;
          return undefined;
        },
      });

      const result = plugin.evaluate(flag, context, helpers);
      expect(result).toEqual({ resolved: false });
    });
  });
});
