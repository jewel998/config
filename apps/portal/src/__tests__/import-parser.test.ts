import { describe, it, expect } from "vitest";

import { parseCsvFile, parseJsonFile } from "@/lib/import-parser";

// ─── CSV Parser ──────────────────────────────────────────────

describe("CSV Parser", () => {
  it("parses a valid CSV with all value types", () => {
    const csv = `key,value,valueType
feature.dark_mode,true,boolean
api.timeout,5000,number
app.title,"My App",string
theme.colors,"{""primary"":""#333""}",json
allowed.domains,"[""a.com"",""b.com""]",array`;

    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(5);
    expect(entries[0]).toEqual({
      key: "feature.dark_mode",
      value: true,
      valueType: "boolean",
    });
    expect(entries[1]).toEqual({
      key: "api.timeout",
      value: 5000,
      valueType: "number",
    });
    expect(entries[2]).toEqual({
      key: "app.title",
      value: "My App",
      valueType: "string",
    });
    expect(entries[3]).toEqual({
      key: "theme.colors",
      value: '{"primary":"#333"}',
      valueType: "json",
    });
    expect(entries[4]).toEqual({
      key: "allowed.domains",
      value: '["a.com","b.com"]',
      valueType: "array",
    });
  });

  it("handles BOM character", () => {
    const csv = `\uFEFFkey,value,valueType\ntest,hello,string`;
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
  });

  it("handles CRLF line endings", () => {
    const csv = "key,value,valueType\r\ntest,hello,string\r\n";
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
  });

  it("handles CR-only line endings", () => {
    const csv = "key,value,valueType\rtest,hello,string\r";
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
  });

  it("skips empty lines", () => {
    const csv = "key,value,valueType\n\ntest,hello,string\n\n";
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
  });

  it("errors on empty file", () => {
    const { entries, errors } = parseCsvFile("");
    expect(entries).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("errors on invalid header", () => {
    const csv = "name,val,type\ntest,hello,string";
    const { entries, errors } = parseCsvFile(csv);
    expect(entries).toHaveLength(0);
    expect(errors[0].message).toContain("Invalid header");
  });

  it("errors on row with fewer than 3 columns", () => {
    const csv = "key,value,valueType\ntest,hello";
    const { entries, errors } = parseCsvFile(csv);
    expect(entries).toHaveLength(0);
    expect(errors[0].message).toContain("Expected 3 columns");
  });

  it("handles embedded commas in quoted strings", () => {
    const csv = `key,value,valueType\napp.msg,"Hello, World!",string`;
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries[0].value).toBe("Hello, World!");
  });

  it("handles escaped quotes in quoted strings", () => {
    const csv = `key,value,valueType\napp.msg,"She said ""hi""",string`;
    const { entries, errors } = parseCsvFile(csv);
    expect(errors).toHaveLength(0);
    expect(entries[0].value).toBe('She said "hi"');
  });
});

// ─── JSON Parser ─────────────────────────────────────────────

describe("JSON Parser", () => {
  it("parses a valid JSON array", () => {
    const json = JSON.stringify([
      { key: "a", value: true, valueType: "boolean" },
      { key: "b", value: 42, valueType: "number" },
    ]);
    const { entries, errors } = parseJsonFile(json);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(2);
  });

  it("parses JSON with advanced fields", () => {
    const json = JSON.stringify([
      {
        key: "feature.x",
        value: false,
        valueType: "boolean",
        targetingRules: [{ id: "r1", priority: 1, value: true, conditions: [] }],
        rolloutPercentage: 50,
      },
    ]);
    const { entries, errors } = parseJsonFile(json);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
    expect((entries[0] as Record<string, unknown>).targetingRules).toBeDefined();
    expect((entries[0] as Record<string, unknown>).rolloutPercentage).toBe(50);
  });

  it("handles BOM", () => {
    const json = `\uFEFF[{"key":"a","value":1,"valueType":"number"}]`;
    const { entries, errors } = parseJsonFile(json);
    expect(errors).toHaveLength(0);
    expect(entries).toHaveLength(1);
  });

  it("errors on empty string", () => {
    const { entries, errors } = parseJsonFile("");
    expect(entries).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("errors on invalid JSON", () => {
    const { entries, errors } = parseJsonFile("{not valid json}");
    expect(entries).toHaveLength(0);
    expect(errors[0].message).toContain("Invalid JSON");
  });

  it("errors on non-array JSON", () => {
    const { entries, errors } = parseJsonFile('{"key":"value"}');
    expect(entries).toHaveLength(0);
    expect(errors[0].message).toContain("Expected a JSON array");
  });

  it("errors on array items that are not objects", () => {
    const json = JSON.stringify(["not", "objects"]);
    const { entries, errors } = parseJsonFile(json);
    expect(entries).toHaveLength(0);
    expect(errors.length).toBe(2);
  });

  it("handles unicode content", () => {
    const json = JSON.stringify([
      { key: "app.greeting", value: "こんにちは 🌍", valueType: "string" },
    ]);
    const { entries, errors } = parseJsonFile(json);
    expect(errors).toHaveLength(0);
    expect(entries[0].value).toBe("こんにちは 🌍");
  });
});
