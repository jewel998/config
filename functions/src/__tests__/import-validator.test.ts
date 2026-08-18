import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateEntry, validateEntries } from "../utils/import-validator.js";
import type { RawEntry } from "../import-export-types.js";

// ─── Arbitraries ─────────────────────────────────────────────

const validKey = fc.stringMatching(/^[a-zA-Z0-9._]{1,100}$/);
const validValueType = fc.constantFrom(
  "string",
  "number",
  "boolean",
  "json",
  "array",
);
const validStringValue = fc.string();
const validNumberValue = fc.double({ noNaN: true });
const validBooleanValue = fc.boolean();
const validJsonValue = fc.json().map((j) => j); // valid JSON string
const validArrayValue = fc.array(fc.string()).map((arr) => JSON.stringify(arr));

const validEntry = fc
  .tuple(validKey, validValueType)
  .chain(([key, valueType]) => {
    let valueArb: fc.Arbitrary<unknown>;
    switch (valueType) {
      case "string":
        valueArb = validStringValue;
        break;
      case "number":
        valueArb = validNumberValue;
        break;
      case "boolean":
        valueArb = validBooleanValue;
        break;
      case "json":
        valueArb = validJsonValue;
        break;
      case "array":
        valueArb = validArrayValue;
        break;
      default:
        valueArb = validStringValue;
    }
    return valueArb.map((value) => ({ key, value, valueType }));
  });

// ─── Property 5: Missing field detection ─────────────────────

describe("Property 5: Missing field detection", () => {
  it("removing key field fails with 'missing required field: key'", () => {
    fc.assert(
      fc.property(validEntry, (entry) => {
        const withoutKey: RawEntry = {
          value: entry.value,
          valueType: entry.valueType,
        };
        const result = validateEntry(withoutKey, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("missing required field: key");
      }),
      { numRuns: 100 },
    );
  });

  it("removing value field fails with 'missing required field: value'", () => {
    fc.assert(
      fc.property(validEntry, (entry) => {
        const withoutValue: RawEntry = {
          key: entry.key,
          valueType: entry.valueType,
        };
        const result = validateEntry(withoutValue, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("missing required field: value");
      }),
      { numRuns: 100 },
    );
  });

  it("removing valueType field fails with 'missing required field: valueType'", () => {
    fc.assert(
      fc.property(validEntry, (entry) => {
        const withoutValueType: RawEntry = {
          key: entry.key,
          value: entry.value,
        };
        const result = validateEntry(withoutValueType, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("missing required field: valueType");
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Key format validation ───────────────────────

describe("Property 6: Key format validation", () => {
  it("valid keys pass validation", () => {
    fc.assert(
      fc.property(validKey, (key) => {
        const entry: RawEntry = { key, value: "test", valueType: "string" };
        const result = validateEntry(entry, 1);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it("keys with invalid characters fail with 'invalid key format'", () => {
    const invalidKey = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => !/^[a-zA-Z0-9._]+$/.test(s));

    fc.assert(
      fc.property(invalidKey, (key) => {
        const entry: RawEntry = { key, value: "test", valueType: "string" };
        const result = validateEntry(entry, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("invalid key format");
      }),
      { numRuns: 100 },
    );
  });

  it("keys exceeding 100 characters fail with 'key too long'", () => {
    const longKey = fc.stringMatching(/^[a-zA-Z0-9._]{101,200}$/);

    fc.assert(
      fc.property(longKey, (key) => {
        const entry: RawEntry = { key, value: "test", valueType: "string" };
        const result = validateEntry(entry, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("key too long");
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: ValueType enum validation ───────────────────

describe("Property 7: ValueType enum validation", () => {
  it("valid valueTypes pass", () => {
    fc.assert(
      fc.property(validValueType, (valueType) => {
        const entry: RawEntry = { key: "test.key", value: "test", valueType };
        const result = validateEntry(entry, 1);
        // Might fail for type-value consistency, but NOT for unsupported value type
        if (result) {
          expect(result.reason).not.toBe("unsupported value type");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("invalid valueTypes fail with 'unsupported value type'", () => {
    const invalidType = fc
      .string({ minLength: 1 })
      .filter(
        (s) => !["string", "number", "boolean", "json", "array"].includes(s),
      );

    fc.assert(
      fc.property(invalidType, (valueType) => {
        const entry: RawEntry = { key: "test.key", value: "x", valueType };
        const result = validateEntry(entry, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("unsupported value type");
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: Duplicate key detection ─────────────────────

describe("Property 9: Duplicate key detection", () => {
  it("duplicate keys mark subsequent occurrences as failed", () => {
    fc.assert(
      fc.property(validKey, fc.integer({ min: 2, max: 5 }), (key, count) => {
        const entries: RawEntry[] = Array.from({ length: count }, () => ({
          key,
          value: "test",
          valueType: "string",
        }));
        const result = validateEntries(entries);
        // First occurrence should pass
        expect(result.valid.length).toBe(1);
        // Rest should fail
        expect(result.failed.length).toBe(count - 1);
        for (const failed of result.failed) {
          expect(failed.reason).toBe("duplicate key in file");
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Value-type consistency ──────────────────────

describe("Property 8: Value-type consistency", () => {
  it("invalid number values fail with 'invalid number value'", () => {
    const nonNumeric = fc
      .string({ minLength: 1 })
      .filter((s) => isNaN(Number(s)));

    fc.assert(
      fc.property(nonNumeric, (value) => {
        const entry: RawEntry = {
          key: "test.key",
          value,
          valueType: "number",
        };
        const result = validateEntry(entry, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("invalid number value");
      }),
      { numRuns: 100 },
    );
  });

  it("invalid JSON strings fail with 'invalid JSON value'", () => {
    const invalidJson = fc.string({ minLength: 1 }).filter((s) => {
      try {
        JSON.parse(s);
        return false;
      } catch {
        return true;
      }
    });

    fc.assert(
      fc.property(invalidJson, (value) => {
        const entry: RawEntry = {
          key: "test.key",
          value,
          valueType: "json",
        };
        const result = validateEntry(entry, 1);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("invalid JSON value");
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Unit Tests: Boundary conditions ─────────────────────────

describe("Validator boundary conditions", () => {
  it("key at exactly 100 characters passes", () => {
    const key = "a".repeat(100);
    const entry: RawEntry = { key, value: "test", valueType: "string" };
    expect(validateEntry(entry, 1)).toBeNull();
  });

  it("key at 101 characters fails", () => {
    const key = "a".repeat(101);
    const entry: RawEntry = { key, value: "test", valueType: "string" };
    const result = validateEntry(entry, 1);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("key too long");
  });

  it("empty entries list returns empty valid and failed", () => {
    const result = validateEntries([]);
    expect(result.valid).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  it("boolean value 'true' as string passes", () => {
    const entry: RawEntry = {
      key: "test",
      value: "true",
      valueType: "boolean",
    };
    expect(validateEntry(entry, 1)).toBeNull();
  });

  it("boolean value 'maybe' as string fails", () => {
    const entry: RawEntry = {
      key: "test",
      value: "maybe",
      valueType: "boolean",
    };
    const result = validateEntry(entry, 1);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("invalid boolean value");
  });

  it("boolean value true (actual boolean) passes", () => {
    const entry: RawEntry = { key: "test", value: true, valueType: "boolean" };
    expect(validateEntry(entry, 1)).toBeNull();
  });
});
