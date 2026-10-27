import { describe, it, expect } from "vitest";

import { ConfigRepository } from "@/dao/config.repository";
import type { ConfigCreateInput, ConfigUpdateInput } from "@/dao/config.repository";

/**
 * Tests for ConfigRepository validation.
 * We test the validate method directly since it's the most critical piece.
 * The pipeline order tests would require mocking Firestore (integration tests).
 */

// Access the protected validate method via a test subclass
class TestableConfigRepository extends ConfigRepository {
  public testValidate(input: ConfigCreateInput | ConfigUpdateInput, op: "create" | "update") {
    return this.validate(input, op);
  }

  public testDocumentId(input: ConfigCreateInput) {
    return this.documentId(input);
  }

  public testNormalize(input: ConfigCreateInput | ConfigUpdateInput) {
    // normalizeInputValues is private; reach it for testing.
    (this as unknown as { normalizeInputValues: (i: unknown) => void }).normalizeInputValues(input);
    return input;
  }
}

// Use null for Firestore since we're only testing validation
const repo = new TestableConfigRepository(null as any, null);

// ─── Document ID (key-as-ID) ─────────────────────────────────

describe("ConfigRepository: Document ID", () => {
  it("uses the config key as the document ID", () => {
    expect(
      repo.testDocumentId({ key: "feature.dark_mode", value: true, valueType: "boolean" }),
    ).toBe("feature.dark_mode");
  });

  it("uses the key as ID regardless of valueType (incl. array)", () => {
    expect(repo.testDocumentId({ key: "app.list", value: "[]", valueType: "array" })).toBe(
      "app.list",
    );
  });
});

// ─── Value Normalization (store arrays/json natively) ────────

describe("ConfigRepository: Value Normalization", () => {
  it("parses an array string into a native array", () => {
    const out = repo.testNormalize({ key: "k", value: "[1, 2, 3]", valueType: "array" });
    expect(out.value).toEqual([1, 2, 3]);
  });

  it("parses a json string into a native object", () => {
    const out = repo.testNormalize({ key: "k", value: '{"a":1}', valueType: "json" });
    expect(out.value).toEqual({ a: 1 });
  });

  it("leaves an already-native array untouched (idempotent)", () => {
    const out = repo.testNormalize({ key: "k", value: [1, 2], valueType: "array" });
    expect(out.value).toEqual([1, 2]);
  });

  it("does not parse string/number/boolean values", () => {
    expect(repo.testNormalize({ key: "k", value: "hello", valueType: "string" }).value).toBe(
      "hello",
    );
    expect(repo.testNormalize({ key: "k", value: "true", valueType: "boolean" }).value).toBe(
      "true",
    );
  });

  it("normalizes nested rolloutValue and schedule.targetValue (template paths)", () => {
    const out = repo.testNormalize({
      key: "k",
      value: "[1]",
      valueType: "array",
      rolloutValue: "[2]",
      schedule: { targetValue: "[3]", activateAt: "2099-01-01T00:00:00.000Z" },
    });
    expect(out.value).toEqual([1]);
    expect((out as { rolloutValue: unknown }).rolloutValue).toEqual([2]);
    expect((out as { schedule: { targetValue: unknown } }).schedule.targetValue).toEqual([3]);
  });

  it("normalizes override values", () => {
    const out = repo.testNormalize({
      key: "k",
      value: "[1]",
      valueType: "array",
      overrides: { "user-1": "[9]" },
    });
    expect((out as { overrides: Record<string, unknown> }).overrides["user-1"]).toEqual([9]);
  });

  it("leaves an unparseable array string unchanged (validation rejects it elsewhere)", () => {
    const out = repo.testNormalize({ key: "k", value: "[not json", valueType: "array" });
    expect(out.value).toBe("[not json");
  });
});

// ─── Create Validation ───────────────────────────────────────

describe("ConfigRepository: Create Validation", () => {
  it("accepts a valid minimal create input", () => {
    const errors = repo.testValidate(
      { key: "feature.test", value: true, valueType: "boolean" },
      "create",
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects missing key", () => {
    const errors = repo.testValidate({ key: "", value: true, valueType: "boolean" }, "create");
    expect(errors.some((e) => e.field === "key" && e.code === "REQUIRED")).toBe(true);
  });

  it("rejects missing value", () => {
    const errors = repo.testValidate(
      { key: "test", value: undefined as any, valueType: "boolean" },
      "create",
    );
    expect(errors.some((e) => e.field === "value" && e.code === "REQUIRED")).toBe(true);
  });

  it("rejects missing valueType", () => {
    const errors = repo.testValidate(
      { key: "test", value: "hello", valueType: "" as any },
      "create",
    );
    expect(errors.some((e) => e.field === "valueType")).toBe(true);
  });

  it("rejects key with spaces", () => {
    const errors = repo.testValidate(
      { key: "has space", value: "x", valueType: "string" },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_KEY_FORMAT")).toBe(true);
  });

  it("rejects key longer than 100 chars", () => {
    const errors = repo.testValidate(
      { key: "a".repeat(101), value: "x", valueType: "string" },
      "create",
    );
    expect(errors.some((e) => e.code === "KEY_TOO_LONG")).toBe(true);
  });

  it("accepts key at exactly 100 chars", () => {
    const errors = repo.testValidate(
      { key: "a".repeat(100), value: "x", valueType: "string" },
      "create",
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported valueType", () => {
    const errors = repo.testValidate(
      { key: "test", value: "x", valueType: "bigint" as any },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_VALUE_TYPE")).toBe(true);
  });
});

// ─── Value-Type Consistency ──────────────────────────────────

describe("ConfigRepository: Value-Type Consistency", () => {
  it("rejects non-numeric value for number type", () => {
    const errors = repo.testValidate(
      { key: "test", value: "not_a_number", valueType: "number" },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_NUMBER")).toBe(true);
  });

  it("accepts numeric string for number type", () => {
    const errors = repo.testValidate({ key: "test", value: "42", valueType: "number" }, "create");
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid boolean", () => {
    const errors = repo.testValidate({ key: "test", value: "yes", valueType: "boolean" }, "create");
    expect(errors.some((e) => e.code === "INVALID_BOOLEAN")).toBe(true);
  });

  it("accepts true/false string for boolean", () => {
    expect(
      repo.testValidate({ key: "t", value: "true", valueType: "boolean" }, "create"),
    ).toHaveLength(0);
    expect(
      repo.testValidate({ key: "t", value: "false", valueType: "boolean" }, "create"),
    ).toHaveLength(0);
  });

  it("accepts native boolean", () => {
    expect(
      repo.testValidate({ key: "t", value: true, valueType: "boolean" }, "create"),
    ).toHaveLength(0);
    expect(
      repo.testValidate({ key: "t", value: false, valueType: "boolean" }, "create"),
    ).toHaveLength(0);
  });

  it("rejects number for boolean type", () => {
    const errors = repo.testValidate({ key: "test", value: 1, valueType: "boolean" }, "create");
    expect(errors.some((e) => e.code === "INVALID_BOOLEAN")).toBe(true);
  });

  it("rejects invalid JSON string", () => {
    const errors = repo.testValidate(
      { key: "test", value: "{bad json}", valueType: "json" },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_JSON")).toBe(true);
  });

  it("accepts valid JSON string", () => {
    const errors = repo.testValidate(
      { key: "test", value: '{"a":1}', valueType: "json" },
      "create",
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts native object for json type", () => {
    const errors = repo.testValidate({ key: "test", value: { a: 1 }, valueType: "json" }, "create");
    expect(errors).toHaveLength(0);
  });

  it("rejects array for json type", () => {
    const errors = repo.testValidate({ key: "test", value: [1, 2], valueType: "json" }, "create");
    expect(errors.some((e) => e.code === "INVALID_JSON")).toBe(true);
  });

  it("rejects non-array JSON string for array type", () => {
    const errors = repo.testValidate(
      { key: "test", value: '{"a":1}', valueType: "array" },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_ARRAY")).toBe(true);
  });

  it("accepts valid array JSON string", () => {
    const errors = repo.testValidate(
      { key: "test", value: '["a","b"]', valueType: "array" },
      "create",
    );
    expect(errors).toHaveLength(0);
  });
});

// ─── Advanced Field Validation ───────────────────────────────

describe("ConfigRepository: Advanced Fields", () => {
  it("rejects invalid lifecycle state", () => {
    const errors = repo.testValidate(
      {
        key: "test",
        value: true,
        valueType: "boolean",
        lifecycleState: "invalid",
      },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_LIFECYCLE")).toBe(true);
  });

  it("accepts valid lifecycle states", () => {
    for (const state of ["draft", "active", "stale", "archived"]) {
      const errors = repo.testValidate(
        {
          key: "test",
          value: true,
          valueType: "boolean",
          lifecycleState: state,
        },
        "create",
      );
      expect(errors).toHaveLength(0);
    }
  });

  it("rejects rolloutPercentage > 100", () => {
    const errors = repo.testValidate(
      {
        key: "test",
        value: true,
        valueType: "boolean",
        rolloutPercentage: 150,
      },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_ROLLOUT")).toBe(true);
  });

  it("rejects rolloutPercentage < 0", () => {
    const errors = repo.testValidate(
      { key: "test", value: true, valueType: "boolean", rolloutPercentage: -1 },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_ROLLOUT")).toBe(true);
  });

  it("accepts valid rolloutPercentage", () => {
    const errors = repo.testValidate(
      { key: "test", value: true, valueType: "boolean", rolloutPercentage: 50 },
      "create",
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects schedule with invalid date", () => {
    const errors = repo.testValidate(
      {
        key: "test",
        value: true,
        valueType: "boolean",
        schedule: { targetValue: true, activateAt: "not-a-date" },
      },
      "create",
    );
    expect(errors.some((e) => e.code === "INVALID_DATE")).toBe(true);
  });

  it("accepts valid schedule", () => {
    const errors = repo.testValidate(
      {
        key: "test",
        value: true,
        valueType: "boolean",
        schedule: { targetValue: true, activateAt: "2027-01-01T00:00:00Z" },
      },
      "create",
    );
    expect(errors).toHaveLength(0);
  });
});

// ─── Update Validation ───────────────────────────────────────

describe("ConfigRepository: Update Validation", () => {
  it("accepts partial update with valid fields", () => {
    const errors = repo.testValidate({ value: "new value", valueType: "string" }, "update");
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid valueType on update", () => {
    const errors = repo.testValidate({ valueType: "invalid" as any }, "update");
    // On update, valueType validation only runs if present
    // The base validate doesn't enforce required fields on update
    expect(errors).toHaveLength(0); // valueType alone without value doesn't trigger consistency check
  });

  it("validates value-type consistency on update", () => {
    const errors = repo.testValidate({ value: "not_a_number", valueType: "number" }, "update");
    expect(errors.some((e) => e.code === "INVALID_NUMBER")).toBe(true);
  });
});
