import { describe, it, expect } from "vitest";
import {
  validateImportEntry,
  validateImportEntries,
} from "@/lib/import-validator";

// ─── Base Field Validation ───────────────────────────────────

describe("Import Validator: Base Fields", () => {
  it("accepts a valid minimal entry", () => {
    const errors = validateImportEntry(
      { key: "app.title", value: "Hello", valueType: "string" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects missing key", () => {
    const errors = validateImportEntry(
      { value: "test", valueType: "string" },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("missing required field: key");
  });

  it("rejects empty key", () => {
    const errors = validateImportEntry(
      { key: "", value: "test", valueType: "string" },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("missing required field: key");
  });

  it("rejects missing value", () => {
    const errors = validateImportEntry({ key: "test", valueType: "string" }, 1);
    expect(
      errors.some((e) => e.reason.includes("missing required field: value")),
    ).toBe(true);
  });

  it("rejects null value", () => {
    const errors = validateImportEntry(
      { key: "test", value: null, valueType: "string" },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("missing required field: value")),
    ).toBe(true);
  });

  it("rejects missing valueType", () => {
    const errors = validateImportEntry({ key: "test", value: "hello" }, 1);
    expect(
      errors.some((e) =>
        e.reason.includes("missing required field: valueType"),
      ),
    ).toBe(true);
  });

  it("rejects key with spaces", () => {
    const errors = validateImportEntry(
      { key: "has space", value: "x", valueType: "string" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid key format"))).toBe(
      true,
    );
  });

  it("rejects key with special characters", () => {
    const errors = validateImportEntry(
      { key: "key@#$!", value: "x", valueType: "string" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid key format"))).toBe(
      true,
    );
  });

  it("accepts key with dots and underscores", () => {
    const errors = validateImportEntry(
      { key: "my.config_key.v2", value: "x", valueType: "string" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects key longer than 100 characters", () => {
    const errors = validateImportEntry(
      { key: "a".repeat(101), value: "x", valueType: "string" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("key too long"))).toBe(true);
  });

  it("accepts key at exactly 100 characters", () => {
    const errors = validateImportEntry(
      { key: "a".repeat(100), value: "x", valueType: "string" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported valueType", () => {
    const errors = validateImportEntry(
      { key: "test", value: "x", valueType: "bigint" },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("unsupported value type")),
    ).toBe(true);
  });
});

// ─── Value-Type Consistency ──────────────────────────────────

describe("Import Validator: Value-Type Consistency", () => {
  it("rejects non-numeric value for number type", () => {
    const errors = validateImportEntry(
      { key: "test", value: "not_a_number", valueType: "number" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid number value"))).toBe(
      true,
    );
  });

  it("accepts numeric string for number type", () => {
    const errors = validateImportEntry(
      { key: "test", value: "42", valueType: "number" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts actual number for number type", () => {
    const errors = validateImportEntry(
      { key: "test", value: 3.14, valueType: "number" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid boolean string", () => {
    const errors = validateImportEntry(
      { key: "test", value: "yes", valueType: "boolean" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid boolean value"))).toBe(
      true,
    );
  });

  it("accepts 'true' string for boolean type", () => {
    const errors = validateImportEntry(
      { key: "test", value: "true", valueType: "boolean" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts native boolean for boolean type", () => {
    const errors = validateImportEntry(
      { key: "test", value: false, valueType: "boolean" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects number 1 for boolean type", () => {
    const errors = validateImportEntry(
      { key: "test", value: 1, valueType: "boolean" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid boolean value"))).toBe(
      true,
    );
  });

  it("rejects invalid JSON string for json type", () => {
    const errors = validateImportEntry(
      { key: "test", value: "{not json}", valueType: "json" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid JSON value"))).toBe(
      true,
    );
  });

  it("accepts valid JSON string for json type", () => {
    const errors = validateImportEntry(
      { key: "test", value: '{"a":1}', valueType: "json" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts native object for json type", () => {
    const errors = validateImportEntry(
      { key: "test", value: { a: 1 }, valueType: "json" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects array for json type", () => {
    const errors = validateImportEntry(
      { key: "test", value: [1, 2], valueType: "json" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid JSON value"))).toBe(
      true,
    );
  });

  it("rejects non-array JSON string for array type", () => {
    const errors = validateImportEntry(
      { key: "test", value: '{"a":1}', valueType: "array" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid array value"))).toBe(
      true,
    );
  });

  it("accepts valid array JSON string for array type", () => {
    const errors = validateImportEntry(
      { key: "test", value: '["a","b"]', valueType: "array" },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts native array for array type", () => {
    const errors = validateImportEntry(
      { key: "test", value: ["a", "b"], valueType: "array" },
      1,
    );
    expect(errors).toHaveLength(0);
  });
});

// ─── Advanced Fields: Targeting Rules ────────────────────────

describe("Import Validator: Targeting Rules", () => {
  const base = { key: "test", value: false, valueType: "boolean" };

  it("accepts valid targeting rules", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [
          {
            id: "rule_1",
            priority: 1,
            value: true,
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "pro" },
                ],
              },
            ],
          },
        ],
      },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects targetingRules that is not an array", () => {
    const errors = validateImportEntry(
      { ...base, targetingRules: "invalid" },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("targetingRules must be an array")),
    ).toBe(true);
  });

  it("rejects rule without id", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [{ priority: 1, value: true, conditions: [] }],
      },
      1,
    );
    expect(errors.some((e) => e.field.includes("id"))).toBe(true);
  });

  it("rejects rule with priority out of range", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [
          { id: "r1", priority: 0, value: true, conditions: [] },
        ],
      },
      1,
    );
    expect(
      errors.some((e) =>
        e.reason.includes("priority must be a number between 1 and 1000"),
      ),
    ).toBe(true);
  });

  it("rejects rule with priority > 1000", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [
          { id: "r1", priority: 1001, value: true, conditions: [] },
        ],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("priority"))).toBe(true);
  });

  it("rejects predicate with invalid operator", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [
          {
            id: "r1",
            priority: 1,
            value: true,
            conditions: [
              {
                predicates: [
                  { attribute: "x", operator: "invalid_op", value: "y" },
                ],
              },
            ],
          },
        ],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid operator"))).toBe(
      true,
    );
  });

  it("rejects predicate without attribute", () => {
    const errors = validateImportEntry(
      {
        ...base,
        targetingRules: [
          {
            id: "r1",
            priority: 1,
            value: true,
            conditions: [{ predicates: [{ operator: "equals", value: "y" }] }],
          },
        ],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("string attribute"))).toBe(
      true,
    );
  });
});

// ─── Advanced Fields: Rollout ────────────────────────────────

describe("Import Validator: Rollout", () => {
  const base = { key: "test", value: false, valueType: "boolean" };

  it("accepts valid rolloutPercentage", () => {
    const errors = validateImportEntry({ ...base, rolloutPercentage: 50 }, 1);
    expect(errors).toHaveLength(0);
  });

  it("rejects rolloutPercentage > 100", () => {
    const errors = validateImportEntry({ ...base, rolloutPercentage: 150 }, 1);
    expect(errors.some((e) => e.reason.includes("between 0 and 100"))).toBe(
      true,
    );
  });

  it("rejects rolloutPercentage < 0", () => {
    const errors = validateImportEntry({ ...base, rolloutPercentage: -5 }, 1);
    expect(errors.some((e) => e.reason.includes("between 0 and 100"))).toBe(
      true,
    );
  });

  it("rejects non-numeric rolloutPercentage", () => {
    const errors = validateImportEntry(
      { ...base, rolloutPercentage: "fifty" },
      1,
    );
    expect(errors.some((e) => e.reason.includes("between 0 and 100"))).toBe(
      true,
    );
  });
});

// ─── Advanced Fields: Overrides ──────────────────────────────

describe("Import Validator: Overrides", () => {
  const base = { key: "test", value: false, valueType: "boolean" };

  it("accepts valid overrides object", () => {
    const errors = validateImportEntry(
      { ...base, overrides: { user_1: true, user_2: false } },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects overrides that is an array", () => {
    const errors = validateImportEntry(
      { ...base, overrides: [true, false] },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("overrides must be an object")),
    ).toBe(true);
  });

  it("rejects overrides that is a string", () => {
    const errors = validateImportEntry(
      { ...base, overrides: "not an object" },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("overrides must be an object")),
    ).toBe(true);
  });
});

// ─── Advanced Fields: Schedule ───────────────────────────────

describe("Import Validator: Schedule", () => {
  const base = { key: "test", value: false, valueType: "boolean" };

  it("accepts valid schedule", () => {
    const errors = validateImportEntry(
      {
        ...base,
        schedule: { targetValue: true, activateAt: "2027-01-15T09:00:00.000Z" },
      },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects schedule without targetValue", () => {
    const errors = validateImportEntry(
      {
        ...base,
        schedule: { activateAt: "2027-01-15T09:00:00.000Z" },
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("targetValue"))).toBe(true);
  });

  it("rejects schedule without activateAt", () => {
    const errors = validateImportEntry(
      {
        ...base,
        schedule: { targetValue: true },
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("activateAt"))).toBe(true);
  });

  it("rejects schedule with invalid date", () => {
    const errors = validateImportEntry(
      {
        ...base,
        schedule: { targetValue: true, activateAt: "not-a-date" },
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("valid ISO 8601"))).toBe(true);
  });
});

// ─── Advanced Fields: Prerequisites ──────────────────────────

describe("Import Validator: Prerequisites", () => {
  const base = { key: "test", value: false, valueType: "boolean" };

  it("accepts valid prerequisites", () => {
    const errors = validateImportEntry(
      {
        ...base,
        prerequisites: [
          { flagKey: "other.flag", operator: "equals", requiredValue: true },
        ],
      },
      1,
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects prerequisites that is not an array", () => {
    const errors = validateImportEntry(
      { ...base, prerequisites: "invalid" },
      1,
    );
    expect(
      errors.some((e) => e.reason.includes("prerequisites must be an array")),
    ).toBe(true);
  });

  it("rejects prerequisite without flagKey", () => {
    const errors = validateImportEntry(
      {
        ...base,
        prerequisites: [{ operator: "equals", requiredValue: true }],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("string flagKey"))).toBe(true);
  });

  it("rejects prerequisite with invalid operator", () => {
    const errors = validateImportEntry(
      {
        ...base,
        prerequisites: [
          { flagKey: "other", operator: "invalid_op", requiredValue: true },
        ],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("invalid operator"))).toBe(
      true,
    );
  });

  it("rejects prerequisite without requiredValue", () => {
    const errors = validateImportEntry(
      {
        ...base,
        prerequisites: [{ flagKey: "other", operator: "equals" }],
      },
      1,
    );
    expect(errors.some((e) => e.reason.includes("requiredValue"))).toBe(true);
  });
});

// ─── Duplicate Key Detection ─────────────────────────────────

describe("Import Validator: Batch Validation", () => {
  it("detects duplicate keys across entries", () => {
    const { valid, errors } = validateImportEntries([
      { key: "feature.a", value: true, valueType: "boolean" },
      { key: "feature.b", value: false, valueType: "boolean" },
      { key: "feature.a", value: false, valueType: "boolean" }, // duplicate
    ]);
    expect(valid).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("duplicate key");
  });

  it("returns all errors for invalid entries", () => {
    const { valid, errors } = validateImportEntries([
      { key: "", value: "x", valueType: "string" },
      { key: "good.key", value: "x", valueType: "string" },
      { key: "bad key!", value: "x", valueType: "string" },
    ]);
    expect(valid).toHaveLength(1);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("handles complex entry with all advanced fields", () => {
    const { valid, errors } = validateImportEntries([
      {
        key: "feature.complex",
        value: false,
        valueType: "boolean",
        lifecycleState: "active",
        targetingRules: [
          {
            id: "r1",
            priority: 1,
            value: true,
            conditions: [
              {
                predicates: [
                  { attribute: "plan", operator: "equals", value: "pro" },
                ],
              },
            ],
          },
        ],
        rolloutPercentage: 25,
        rolloutValue: true,
        overrides: { admin_user: true },
        schedule: { targetValue: true, activateAt: "2027-06-01T00:00:00.000Z" },
        prerequisites: [
          { flagKey: "feature.a", operator: "equals", requiredValue: true },
        ],
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
  });
});
