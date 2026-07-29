import { describe, it, expect, vi } from "vitest";
import { evaluatePredicate, evaluatePredicateGroups } from "./predicates.js";
import type { Predicate, PredicateGroup } from "../models.js";

describe("evaluatePredicate", () => {
  const attrs = {
    plan: "enterprise",
    country: "US",
    age: 30,
    email: "user@example.com",
    tags: ["beta", "vip"],
    active: true,
  };

  describe("equals operator", () => {
    it("returns true when attribute matches value", () => {
      const p: Predicate = { attribute: "plan", operator: "equals", value: "enterprise" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute does not match value", () => {
      const p: Predicate = { attribute: "plan", operator: "equals", value: "free" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("works with boolean values", () => {
      const p: Predicate = { attribute: "active", operator: "equals", value: true };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("works with numeric values", () => {
      const p: Predicate = { attribute: "age", operator: "equals", value: 30 };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });
  });

  describe("not_equals operator", () => {
    it("returns true when attribute differs from value", () => {
      const p: Predicate = { attribute: "plan", operator: "not_equals", value: "free" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute matches value", () => {
      const p: Predicate = { attribute: "plan", operator: "not_equals", value: "enterprise" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("contains operator", () => {
    it("returns true when attribute contains value substring", () => {
      const p: Predicate = { attribute: "email", operator: "contains", value: "@example" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute does not contain value", () => {
      const p: Predicate = { attribute: "email", operator: "contains", value: "@other" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false on type mismatch (non-string attribute)", () => {
      const p: Predicate = { attribute: "age", operator: "contains", value: "3" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("starts_with operator", () => {
    it("returns true when attribute starts with value", () => {
      const p: Predicate = { attribute: "email", operator: "starts_with", value: "user@" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute does not start with value", () => {
      const p: Predicate = { attribute: "email", operator: "starts_with", value: "admin@" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("ends_with operator", () => {
    it("returns true when attribute ends with value", () => {
      const p: Predicate = { attribute: "email", operator: "ends_with", value: ".com" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute does not end with value", () => {
      const p: Predicate = { attribute: "email", operator: "ends_with", value: ".org" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("in_list operator", () => {
    it("returns true when attribute value is in the list", () => {
      const p: Predicate = { attribute: "country", operator: "in_list", value: ["US", "CA", "UK"] };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute value is not in the list", () => {
      const p: Predicate = { attribute: "country", operator: "in_list", value: ["DE", "FR"] };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false when value is not an array", () => {
      const p: Predicate = { attribute: "country", operator: "in_list", value: "US" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("not_in_list operator", () => {
    it("returns true when attribute value is not in the list", () => {
      const p: Predicate = { attribute: "country", operator: "not_in_list", value: ["DE", "FR"] };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute value is in the list", () => {
      const p: Predicate = { attribute: "country", operator: "not_in_list", value: ["US", "CA"] };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("greater_than operator", () => {
    it("returns true when attribute is greater than value", () => {
      const p: Predicate = { attribute: "age", operator: "greater_than", value: 25 };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute is not greater than value", () => {
      const p: Predicate = { attribute: "age", operator: "greater_than", value: 30 };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false on type mismatch (string attribute)", () => {
      const p: Predicate = { attribute: "plan", operator: "greater_than", value: 5 };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false on type mismatch (string value)", () => {
      const p: Predicate = { attribute: "age", operator: "greater_than", value: "25" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("less_than operator", () => {
    it("returns true when attribute is less than value", () => {
      const p: Predicate = { attribute: "age", operator: "less_than", value: 35 };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute is not less than value", () => {
      const p: Predicate = { attribute: "age", operator: "less_than", value: 30 };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("regex_match operator", () => {
    it("returns true when attribute matches regex", () => {
      const p: Predicate = { attribute: "email", operator: "regex_match", value: "^user@.*\\.com$" };
      expect(evaluatePredicate(p, attrs)).toBe(true);
    });

    it("returns false when attribute does not match regex", () => {
      const p: Predicate = { attribute: "email", operator: "regex_match", value: "^admin@" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false and calls emitError for invalid regex", () => {
      const emitError = vi.fn();
      const p: Predicate = { attribute: "email", operator: "regex_match", value: "[invalid(" };
      expect(evaluatePredicate(p, attrs, emitError)).toBe(false);
      expect(emitError).toHaveBeenCalledWith("Invalid regex pattern: [invalid(");
    });

    it("returns false for invalid regex without emitError callback", () => {
      const p: Predicate = { attribute: "email", operator: "regex_match", value: "[invalid(" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false on type mismatch (non-string attribute)", () => {
      const p: Predicate = { attribute: "age", operator: "regex_match", value: "\\d+" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("in_segment / not_in_segment operators", () => {
    it("returns false for in_segment (handled externally)", () => {
      const p: Predicate = { attribute: "segment", operator: "in_segment", value: "beta-users" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false for not_in_segment (handled externally)", () => {
      const p: Predicate = { attribute: "segment", operator: "not_in_segment", value: "beta-users" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });
  });

  describe("missing attribute handling (Property 4)", () => {
    it("returns false when attribute is not in context", () => {
      const p: Predicate = { attribute: "nonexistent", operator: "equals", value: "test" };
      expect(evaluatePredicate(p, attrs)).toBe(false);
    });

    it("returns false for missing attribute with any operator", () => {
      const operators = [
        "equals", "not_equals", "contains", "starts_with", "ends_with",
        "in_list", "not_in_list", "greater_than", "less_than", "regex_match",
      ] as const;
      for (const op of operators) {
        const p: Predicate = { attribute: "missing", operator: op, value: "x" };
        expect(evaluatePredicate(p, attrs)).toBe(false);
      }
    });
  });
});

describe("evaluatePredicateGroups (DNF logic)", () => {
  const attrs = {
    plan: "enterprise",
    country: "US",
    age: 30,
  };

  it("returns false for empty groups array", () => {
    expect(evaluatePredicateGroups([], attrs)).toBe(false);
  });

  it("returns true when a single group with a single matching predicate", () => {
    const groups: PredicateGroup[] = [
      { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(true);
  });

  it("returns false when a single group with a non-matching predicate", () => {
    const groups: PredicateGroup[] = [
      { predicates: [{ attribute: "plan", operator: "equals", value: "free" }] },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(false);
  });

  it("AND logic within a group: all predicates must match", () => {
    const groups: PredicateGroup[] = [
      {
        predicates: [
          { attribute: "plan", operator: "equals", value: "enterprise" },
          { attribute: "country", operator: "equals", value: "US" },
        ],
      },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(true);
  });

  it("AND logic: one failing predicate in group means group fails", () => {
    const groups: PredicateGroup[] = [
      {
        predicates: [
          { attribute: "plan", operator: "equals", value: "enterprise" },
          { attribute: "country", operator: "equals", value: "DE" },
        ],
      },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(false);
  });

  it("OR logic across groups: one matching group is sufficient", () => {
    const groups: PredicateGroup[] = [
      { predicates: [{ attribute: "country", operator: "equals", value: "DE" }] },
      { predicates: [{ attribute: "plan", operator: "equals", value: "enterprise" }] },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(true);
  });

  it("OR logic: all groups failing means overall false", () => {
    const groups: PredicateGroup[] = [
      { predicates: [{ attribute: "country", operator: "equals", value: "DE" }] },
      { predicates: [{ attribute: "plan", operator: "equals", value: "free" }] },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(false);
  });

  it("complex DNF: multiple groups with multiple predicates", () => {
    // Group 1: enterprise AND US (matches)
    // Group 2: free AND age > 25 (fails on plan)
    const groups: PredicateGroup[] = [
      {
        predicates: [
          { attribute: "plan", operator: "equals", value: "enterprise" },
          { attribute: "country", operator: "equals", value: "US" },
        ],
      },
      {
        predicates: [
          { attribute: "plan", operator: "equals", value: "free" },
          { attribute: "age", operator: "greater_than", value: 25 },
        ],
      },
    ];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(true);
  });

  it("propagates emitError to predicate evaluation", () => {
    const emitError = vi.fn();
    const groups: PredicateGroup[] = [
      { predicates: [{ attribute: "plan", operator: "regex_match", value: "[invalid(" }] },
    ];
    expect(evaluatePredicateGroups(groups, attrs, emitError)).toBe(false);
    expect(emitError).toHaveBeenCalledWith("Invalid regex pattern: [invalid(");
  });

  it("empty predicates array in a group means group matches (vacuous truth)", () => {
    const groups: PredicateGroup[] = [{ predicates: [] }];
    expect(evaluatePredicateGroups(groups, attrs)).toBe(true);
  });
});
