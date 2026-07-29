import { describe, expect, it } from "vitest";

import type { ConfigFlagData } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";
import { schedulePlugin } from "./schedulePlugin.js";

/** Fixed timestamp for deterministic tests: 2024-06-15T12:00:00.000Z */
const NOW = Date.parse("2024-06-15T12:00:00.000Z");

/** Helpers stub with injectable now() */
function makeHelpers(nowMs: number = NOW): PipelineHelpers {
  return {
    evaluateFlag: () => undefined,
    emitError: () => {},
    now: () => nowMs,
  };
}

/** Utility to build a minimal ConfigFlagData with schedule fields */
function makeFlag(overrides: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key: "feature.launch",
    value: "default-value",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

describe("schedulePlugin", () => {
  const plugin = schedulePlugin();

  it("has stepId 'schedule'", () => {
    expect(plugin.stepId).toBe("schedule");
  });

  describe("when schedule is undefined", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag({ schedule: undefined });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when schedule is null (explicitly missing)", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag();
      (flag as Record<string, unknown>).schedule = null;
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when activateAt is in the past (Req 6.4)", () => {
    it("returns the scheduled targetValue", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "new-value",
          activateAt: "2024-06-15T11:00:00.000Z", // 1 hour before NOW
        },
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "new-value" });
    });

    it("returns boolean targetValue", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: true,
          activateAt: "2024-06-14T00:00:00.000Z", // 1 day before NOW
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: true, value: true });
    });

    it("returns numeric targetValue", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: 42,
          activateAt: "2024-01-01T00:00:00.000Z", // far in the past
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: true, value: 42 });
    });

    it("returns object (JSON) targetValue", () => {
      const jsonValue = { theme: "dark", limit: 100 };
      const flag = makeFlag({
        schedule: {
          targetValue: jsonValue,
          activateAt: "2024-06-15T11:59:00.000Z",
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: true, value: jsonValue });
    });
  });

  describe("when activateAt is exactly now", () => {
    it("returns the scheduled targetValue (boundary: <= now)", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "activated",
          activateAt: "2024-06-15T12:00:00.000Z", // exactly NOW
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "activated" });
    });
  });

  describe("when activateAt is in the future (Req 6.5)", () => {
    it("returns resolved: false", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "future-value",
          activateAt: "2024-06-15T13:00:00.000Z", // 1 hour after NOW
        },
      });
      const context: EvaluationContext = { userId: "user-1" };

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false for far-future timestamp", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "far-future",
          activateAt: "2030-12-31T23:59:59.000Z",
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("when activateAt is an invalid date string", () => {
    it("returns resolved: false for garbage string", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "should-not-resolve",
          activateAt: "not-a-date",
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false for empty string", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "should-not-resolve",
          activateAt: "",
        },
      });
      const context: EvaluationContext = {};

      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("context independence", () => {
    it("does not depend on userId (schedule applies to all users)", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "scheduled",
          activateAt: "2024-06-15T11:00:00.000Z",
        },
      });

      const resultWithUser = plugin.evaluate(
        flag,
        { userId: "user-1" },
        makeHelpers(),
      );
      const resultWithoutUser = plugin.evaluate(flag, {}, makeHelpers());

      expect(resultWithUser).toEqual({ resolved: true, value: "scheduled" });
      expect(resultWithoutUser).toEqual({ resolved: true, value: "scheduled" });
    });
  });

  describe("helpers.now() injection", () => {
    it("uses helpers.now() for time comparison (not system clock)", () => {
      const flag = makeFlag({
        schedule: {
          targetValue: "time-test",
          activateAt: "2024-06-15T12:30:00.000Z",
        },
      });
      const context: EvaluationContext = {};

      // With now at 12:00 → future → not resolved
      const resultBefore = plugin.evaluate(
        flag,
        context,
        makeHelpers(Date.parse("2024-06-15T12:00:00.000Z")),
      );
      expect(resultBefore).toEqual({ resolved: false });

      // With now at 13:00 → past → resolved
      const resultAfter = plugin.evaluate(
        flag,
        context,
        makeHelpers(Date.parse("2024-06-15T13:00:00.000Z")),
      );
      expect(resultAfter).toEqual({ resolved: true, value: "time-test" });
    });
  });
});
