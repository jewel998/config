import type { ParseError, ParseResult, RawEntry } from "./types";

/**
 * Parse a CSV string into raw import entries.
 * Expects: header row "key,value,valueType", comma delimiter,
 * double-quoted JSON strings for json/array values.
 */
export function parseCsvFile(text: string): ParseResult {
  const entries: RawEntry[] = [];
  const errors: ParseError[] = [];

  // Strip BOM if present
  const cleaned = text.replace(/^\uFEFF/, "");

  // Normalize line endings
  const lines = cleaned.split(/\r\n|\r|\n/);

  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) {
    errors.push({ row: 0, message: "File is empty" });
    return { entries, errors };
  }

  // Validate header row
  const header = lines[0].trim().toLowerCase();
  if (header !== "key,value,valuetype") {
    errors.push({
      row: 1,
      message:
        'Invalid header row. Expected "key,value,valueType" but got: "' +
        lines[0].trim() +
        '"',
    });
    return { entries, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue; // skip empty lines

    const rowNumber = i + 1;
    try {
      const fields = parseCsvLine(line);
      if (fields.length < 3) {
        errors.push({
          row: rowNumber,
          message: `Expected 3 columns but found ${fields.length}`,
        });
        continue;
      }

      const [key, rawValue, valueType] = fields;
      const value = coerceCsvValue(rawValue, valueType);

      entries.push({ key, value, valueType });
    } catch (e) {
      errors.push({
        row: rowNumber,
        message: e instanceof Error ? e.message : "Parse error",
      });
    }
  }

  return { entries, errors };
}

/**
 * Parse a JSON string into raw import entries.
 * Expects: array of objects with {key, value, valueType}.
 */
export function parseJsonFile(text: string): ParseResult {
  const entries: RawEntry[] = [];
  const errors: ParseError[] = [];

  // Strip BOM if present
  const cleaned = text.replace(/^\uFEFF/, "");

  if (cleaned.trim() === "") {
    errors.push({ row: 0, message: "File is empty" });
    return { entries, errors };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    errors.push({
      row: 0,
      message:
        "Invalid JSON: " + (e instanceof Error ? e.message : "parse error"),
    });
    return { entries, errors };
  }

  if (!Array.isArray(parsed)) {
    errors.push({
      row: 0,
      message: "Expected a JSON array of objects",
    });
    return { entries, errors };
  }

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    const rowNumber = i + 1;

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push({
        row: rowNumber,
        message: "Expected an object with key, value, valueType fields",
      });
      continue;
    }

    entries.push(item as RawEntry);
  }

  return { entries, errors };
}

// ─── CSV Helpers ──────────────────────────────────────────────

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles double-quote escaping (RFC 4180).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Push the last field
  fields.push(current);

  return fields;
}

/**
 * Coerce a CSV value string to the appropriate JS type based on valueType.
 */
function coerceCsvValue(rawValue: string, valueType: string): unknown {
  switch (valueType) {
    case "number": {
      const num = Number(rawValue);
      return isNaN(num) ? rawValue : num;
    }
    case "boolean":
      return rawValue.toLowerCase() === "true";
    case "json":
    case "array":
      // JSON/array values in CSV are stored as JSON strings
      // Return as-is (string) — the validator will check if it's valid JSON
      return rawValue;
    case "string":
    default:
      return rawValue;
  }
}

/**
 * Serialize import entries to CSV format (for template download / round-trip).
 */
export function serializeToCsv(
  entries: Array<{ key: string; value: unknown; valueType: string }>,
): string {
  const header = "key,value,valueType";
  const rows = entries.map((e) => {
    const value = serializeCsvValue(e.value, e.valueType);
    return `${e.key},${value},${e.valueType}`;
  });
  return [header, ...rows].join("\n");
}

function serializeCsvValue(value: unknown, valueType: string): string {
  if (valueType === "json" || valueType === "array") {
    // If the value is already a string (JSON string), quote it for CSV
    const str = typeof value === "string" ? value : JSON.stringify(value);
    // Escape internal quotes and wrap in quotes
    return '"' + str.replace(/"/g, '""') + '"';
  }
  if (valueType === "string" && typeof value === "string") {
    // Quote strings that contain commas or quotes
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
  return String(value);
}
