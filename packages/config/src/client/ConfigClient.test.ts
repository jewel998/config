import { describe, expect, it, vi } from "vitest";

import type { ConfigFlagData } from "../plugins/models.js";
import type {
  EvaluationContext,
  EvaluationPlugin,
  PipelineHelpers,
  PipelineStepId,
} from "../plugins/types.js";
import { buildConfigClient } from "./ConfigClient";
import type { ConfigClientInternals } from "./ConfigClient";
import { memoryStorage } from "../cache/memoryStorage";

// ─── Helpers ─────────────────────────────────────────────────

function makeInternals(
  overrides: Partial<ConfigClientInternals> = {},
): ConfigClientInternals {
  return {
    data: {},
    cache: memoryStorage(),
    fetcher: { fetchAll: vi.fn(async () => ({})), fetchKeys: vi.fn(async () => ({})) },
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    retry: { maxRetries: 3, baseDelay: 1000, multiplier: 2, maxDelay: 30000 },
    granularity: "batch",
    isDeferred: false,
    ...overrides,
  };
}

function makeFlagData(key: string, value: unknown, extras: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key,
    value,
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...extras,
  };
}

function makePlugin(
  stepId: PipelineStepId,
  evaluateFn: (flag: ConfigFlagData, ctx: EvaluationContext, helpers: PipelineHelpers) => { resolved: true; value: unknown } | { resolved: false },
): EvaluationPlugin {
  return { stepId, evaluate: evaluateFn };
}

// ─── Tests ───────────────────────────────────────────────────

describe("ConfigClient plugin integration", () => {
  describe("backward compatibility (no plugins)", () => {
    it("returns value from data when no plugins are registered", () => {
      const client = buildConfigClient(
        makeInternals({ data: { "my-key": "hello" } }),
      );
      expect(client.getValue("my-key")).toBe("hello");
    });

    it("returns defaultValue when key is missing and no plugins", () => {
      const client = buildConfigClient(makeInternals());
      expect(client.getValue("missing", "fallback")).toBe("fallback");
    });
  });

  describe("with plugins registered", () => {
    it("runs the evaluation pipeline when plugins are provided", () => {
      const flagData = makeFlagData("feature.x", "default-val", {
        overrides: { "user-42": "override-val" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.x": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-42" },
        }),
      );

      expect(client.getValue("feature.x")).toBe("override-val");
    });

    it("returns the flag default value when no plugin resolves", () => {
      const flagData = makeFlagData("feature.y", "the-default");

      const noopPlugin = makePlugin("targeting", () => ({ resolved: false }));

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.y": flagData },
          plugins: [noopPlugin],
          context: { userId: "user-1" },
        }),
      );

      expect(client.getValue("feature.y")).toBe("the-default");
    });

    it("returns defaultValue arg when key is completely missing", () => {
      const noopPlugin = makePlugin("targeting", () => ({ resolved: false }));

      const client = buildConfigClient(
        makeInternals({
          plugins: [noopPlugin],
          context: { userId: "user-1" },
        }),
      );

      expect(client.getValue("missing-key", "my-default")).toBe("my-default");
    });

    it("wraps raw values as ConfigFlagData for pipeline evaluation", () => {
      // Data stored as a raw value (not a full ConfigFlagData object)
      const targetingPlugin = makePlugin("targeting", (flag) => {
        // Should still receive a ConfigFlagData wrapper
        if (flag.key === "raw-key" && flag.value === "raw-value") {
          return { resolved: true, value: "from-pipeline" };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "raw-key": "raw-value" },
          plugins: [targetingPlugin],
          context: {},
        }),
      );

      expect(client.getValue("raw-key")).toBe("from-pipeline");
    });
  });

  describe("consent-aware mode", () => {
    it("returns default when consentAware is true and consentGranted is false", () => {
      const flagData = makeFlagData("feature.z", "default-val", {
        overrides: { "user-1": "should-not-get-this" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.z": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-1", consentGranted: false },
          consentAware: true,
        }),
      );

      expect(client.getValue("feature.z", "consent-default")).toBe("consent-default");
    });

    it("returns default when consentAware is true and consentGranted is missing", () => {
      const flagData = makeFlagData("feature.z", "default-val");

      const noopPlugin = makePlugin("targeting", () => ({ resolved: true, value: "nope" }));

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.z": flagData },
          plugins: [noopPlugin],
          context: { userId: "user-1" }, // no consentGranted
          consentAware: true,
        }),
      );

      expect(client.getValue("feature.z", "fallback")).toBe("fallback");
    });

    it("evaluates pipeline normally when consentGranted is true", () => {
      const flagData = makeFlagData("feature.z", "default-val", {
        overrides: { "user-1": "override-result" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.z": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-1", consentGranted: true },
          consentAware: true,
        }),
      );

      expect(client.getValue("feature.z")).toBe("override-result");
    });

    it("does not block evaluation when consentAware is false (default)", () => {
      const flagData = makeFlagData("feature.z", "default-val", {
        overrides: { "user-1": "override-here" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.z": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-1", consentGranted: false },
          // consentAware not set (defaults to false)
        }),
      );

      expect(client.getValue("feature.z")).toBe("override-here");
    });
  });

  describe("setContext()", () => {
    it("updates the evaluation context post-init", () => {
      const flagData = makeFlagData("feature.ctx", "default-val", {
        overrides: { "user-A": "val-A", "user-B": "val-B" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.ctx": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-A" },
        }),
      );

      expect(client.getValue("feature.ctx")).toBe("val-A");

      // Update context
      client.setContext({ userId: "user-B" });
      expect(client.getValue("feature.ctx")).toBe("val-B");
    });

    it("can grant consent after initialization", () => {
      const flagData = makeFlagData("feature.consent", "default-val", {
        overrides: { "user-1": "override-val" },
      });

      const overridesPlugin = makePlugin("overrides", (flag, ctx) => {
        if (ctx.userId && flag.overrides?.[ctx.userId] != null) {
          return { resolved: true, value: flag.overrides[ctx.userId] };
        }
        return { resolved: false };
      });

      const client = buildConfigClient(
        makeInternals({
          data: { "feature.consent": flagData },
          plugins: [overridesPlugin],
          context: { userId: "user-1" },
          consentAware: true,
        }),
      );

      // No consent yet — returns default
      expect(client.getValue("feature.consent", "no-consent")).toBe("no-consent");

      // Grant consent via setContext
      client.setContext({ userId: "user-1", consentGranted: true });
      expect(client.getValue("feature.consent")).toBe("override-val");
    });
  });
});
