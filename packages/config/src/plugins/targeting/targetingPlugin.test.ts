import { describe, it, expect, vi } from "vitest";
import { targetingPlugin } from "./targetingPlugin.js";
import type { ConfigFlagData, Segment, TargetingRule } from "../models.js";
import type { EvaluationContext, PipelineHelpers } from "../types.js";

function makeFlag(overrides: Partial<ConfigFlagData> = {}): ConfigFlagData {
  return {
    key: "test.flag",
    value: "default",
    valueType: "string",
    version: "1",
    lifecycleState: "active",
    ...overrides,
  };
}

function makeHelpers(overrides: Partial<PipelineHelpers> = {}): PipelineHelpers {
  return {
    evaluateFlag: vi.fn(),
    emitError: vi.fn(),
    now: () => Date.now(),
    ...overrides,
  };
}

function makeRule(overrides: Partial<TargetingRule> = {}): TargetingRule {
  return {
    id: "rule-1",
    priority: 1,
    value: "rule-value",
    conditions: [],
    ...overrides,
  };
}

describe("targetingPlugin", () => {
  const defaultContext: EvaluationContext = {
    userId: "user-1",
    attributes: { plan: "enterprise", country: "US", age: 30 },
  };

  describe("stepId", () => {
    it('has stepId "targeting"', () => {
      const plugin = targetingPlugin();
      expect(plugin.stepId).toBe("targeting");
    });
  });

  describe("no targeting rules (Requirement 1.2)", () => {
    it("returns resolved: false when targetingRules is undefined", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({ targetingRules: undefined });
      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when targetingRules is empty array", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({ targetingRules: [] });
      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("priority ordering (Requirement 1.1)", () => {
    it("evaluates rules in priority order (lowest number first)", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            id: "low-priority",
            priority: 10,
            value: "low-priority-value",
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
          makeRule({
            id: "high-priority",
            priority: 1,
            value: "high-priority-value",
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "high-priority-value" });
    });

    it("preserves insertion order for same priority", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            id: "first",
            priority: 5,
            value: "first-value",
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
          makeRule({
            id: "second",
            priority: 5,
            value: "second-value",
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "first-value" });
    });
  });

  describe("DNF predicate evaluation (Requirement 1.5)", () => {
    it("matches when any predicate group matches (OR logic)", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              { predicates: [{ attribute: "country", operator: "equals", value: "DE" }] },
              { predicates: [{ attribute: "country", operator: "equals", value: "US" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "rule-value" });
    });

    it("requires all predicates in a group to match (AND logic)", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "enterprise" },
                  { attribute: "country", operator: "equals", value: "DE" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("returns resolved: false when rule conditions are empty array", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [makeRule({ conditions: [] })],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("first match wins (Requirement 1.1)", () => {
    it("returns the value of the first matching rule", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            id: "rule-1",
            priority: 1,
            value: "first-match",
            conditions: [
              { predicates: [{ attribute: "country", operator: "equals", value: "DE" }] },
            ],
          }),
          makeRule({
            id: "rule-2",
            priority: 2,
            value: "second-match",
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
          makeRule({
            id: "rule-3",
            priority: 3,
            value: "third-match",
            conditions: [
              { predicates: [{ attribute: "country", operator: "equals", value: "US" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "second-match" });
    });
  });

  describe("segment resolution (Requirement 1.4, 3.4)", () => {
    const betaSegment: Segment = {
      id: "seg-beta",
      name: "Beta Users",
      description: "Enterprise users from US",
      conditions: [
        {
          predicates: [
            { attribute: "plan", operator: "equals", value: "enterprise" },
            { attribute: "country", operator: "equals", value: "US" },
          ],
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      createdBy: "admin",
    };

    const freeSegment: Segment = {
      id: "seg-free",
      name: "Free Users",
      description: "Users on free plan",
      conditions: [
        {
          predicates: [
            { attribute: "plan", operator: "equals", value: "free" },
          ],
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      createdBy: "admin",
    };

    it("resolves in_segment predicate correctly", () => {
      const segments = { "seg-beta": betaSegment };
      const plugin = targetingPlugin(segments);

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "segment", operator: "in_segment", value: "seg-beta" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "rule-value" });
    });

    it("resolves not_in_segment predicate correctly", () => {
      const segments = { "seg-free": freeSegment };
      const plugin = targetingPlugin(segments);

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "segment", operator: "not_in_segment", value: "seg-free" },
                ],
              },
            ],
          }),
        ],
      });

      // User is on enterprise plan, not in "free" segment → not_in_segment returns true
      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "rule-value" });
    });

    it("in_segment returns false when user does not match segment", () => {
      const segments = { "seg-free": freeSegment };
      const plugin = targetingPlugin(segments);

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "segment", operator: "in_segment", value: "seg-free" },
                ],
              },
            ],
          }),
        ],
      });

      // User is on enterprise plan, not in "free" segment
      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("returns false for non-existent segment (Requirement 3.6)", () => {
      const plugin = targetingPlugin({});

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "segment", operator: "in_segment", value: "non-existent" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("combines segment predicates with other predicates in AND logic", () => {
      const segments = { "seg-beta": betaSegment };
      const plugin = targetingPlugin(segments);

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "segment", operator: "in_segment", value: "seg-beta" },
                  { attribute: "age", operator: "greater_than", value: 25 },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "rule-value" });
    });
  });

  describe("missing attributes (Requirement 1.6)", () => {
    it("returns resolved: false when predicate references missing attribute", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "nonexistent", operator: "equals", value: "test" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });

    it("handles context with no attributes (undefined)", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "enterprise" },
                ],
              },
            ],
          }),
        ],
      });

      const context: EvaluationContext = { userId: "user-1" };
      const result = plugin.evaluate(flag, context, makeHelpers());
      expect(result).toEqual({ resolved: false });
    });
  });

  describe("emitError on invalid regex", () => {
    it("calls helpers.emitError for invalid regex and continues evaluation", () => {
      const helpers = makeHelpers();
      const plugin = targetingPlugin();

      const flag = makeFlag({
        targetingRules: [
          makeRule({
            id: "bad-regex-rule",
            priority: 1,
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "regex_match", value: "[invalid(" },
                ],
              },
            ],
          }),
          makeRule({
            id: "good-rule",
            priority: 2,
            value: "fallback",
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "enterprise" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, helpers);
      expect(helpers.emitError).toHaveBeenCalledWith("Invalid regex pattern: [invalid(");
      expect(result).toEqual({ resolved: true, value: "fallback" });
    });
  });

  describe("no segments provided", () => {
    it("works correctly without segments argument (defaults to empty)", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "enterprise" },
                ],
              },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: "rule-value" });
    });
  });

  describe("various value types returned", () => {
    it("returns boolean values", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            value: true,
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: true });
    });

    it("returns numeric values", () => {
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            value: 42,
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: 42 });
    });

    it("returns object values (JSON)", () => {
      const jsonValue = { feature: true, limit: 100 };
      const plugin = targetingPlugin();
      const flag = makeFlag({
        targetingRules: [
          makeRule({
            value: jsonValue,
            conditions: [
              { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
            ],
          }),
        ],
      });

      const result = plugin.evaluate(flag, defaultContext, makeHelpers());
      expect(result).toEqual({ resolved: true, value: jsonValue });
    });
  });
});
