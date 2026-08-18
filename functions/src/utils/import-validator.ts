import type {
  ConfigValueType,
  FailedRow,
  ImportEntry,
  RawEntry,
  ValidationResult,
} from "../import-export-types.js";

const KEY_PATTERN = /^[a-zA-Z0-9._]+$/;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_SIZE_BYTES = 1_048_576; // 1 MB
const VALID_VALUE_TYPES: ConfigValueType[] = [
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

/**
 * Validates a single raw entry against the Config_DTO schema.
 * Returns a FailedRow if invalid, or null if valid.
 */
export function validateEntry(
  entry: RawEntry,
  rowNumber: number,
): FailedRow | null {
  // Check required fields
  if (entry.key === undefined || entry.key === null || entry.key === "") {
    return {
      rowNumber,
      entry: entry as Partial<ImportEntry>,
      reason: "missing required field: key",
    };
  }
  if (entry.value === undefined || entry.value === null) {
    return {
      rowNumber,
      entry: entry as Partial<ImportEntry>,
      reason: "missing required field: value",
    };
  }
  if (
    entry.valueType === undefined ||
    entry.valueType === null ||
    entry.valueType === ""
  ) {
    return {
      rowNumber,
      entry: entry as Partial<ImportEntry>,
      reason: "missing required field: valueType",
    };
  }

  const key = String(entry.key);
  const valueType = String(entry.valueType) as ConfigValueType;

  // Key length check
  if (key.length > MAX_KEY_LENGTH) {
    return {
      rowNumber,
      entry: { key, value: entry.value, valueType },
      reason: "key too long",
    };
  }

  // Key format check
  if (!KEY_PATTERN.test(key)) {
    return {
      rowNumber,
      entry: { key, value: entry.value, valueType },
      reason: "invalid key format",
    };
  }

  // ValueType enum check
  if (!VALID_VALUE_TYPES.includes(valueType)) {
    return {
      rowNumber,
      entry: { key, value: entry.value, valueType },
      reason: "unsupported value type",
    };
  }

  // Value size check
  const valueSerialized = JSON.stringify(entry.value);
  if (Buffer.byteLength(valueSerialized, "utf-8") > MAX_VALUE_SIZE_BYTES) {
    return {
      rowNumber,
      entry: { key, value: entry.value, valueType },
      reason: "value too large",
    };
  }

  // Value-type consistency checks
  if (valueType === "number") {
    const num = Number(entry.value);
    if (isNaN(num)) {
      return {
        rowNumber,
        entry: { key, value: entry.value, valueType },
        reason: "invalid number value",
      };
    }
  }

  if (valueType === "boolean") {
    const val = entry.value;
    if (typeof val === "string") {
      if (val !== "true" && val !== "false") {
        return {
          rowNumber,
          entry: { key, value: entry.value, valueType },
          reason: "invalid boolean value",
        };
      }
    } else if (typeof val !== "boolean") {
      return {
        rowNumber,
        entry: { key, value: entry.value, valueType },
        reason: "invalid boolean value",
      };
    }
  }

  if (valueType === "json") {
    if (typeof entry.value === "string") {
      try {
        JSON.parse(entry.value);
      } catch {
        return {
          rowNumber,
          entry: { key, value: entry.value, valueType },
          reason: "invalid JSON value",
        };
      }
    } else if (
      typeof entry.value !== "object" ||
      entry.value === null ||
      Array.isArray(entry.value)
    ) {
      // If it's not a string and not a non-null non-array object, it's invalid JSON
      return {
        rowNumber,
        entry: { key, value: entry.value, valueType },
        reason: "invalid JSON value",
      };
    }
  }

  if (valueType === "array") {
    if (typeof entry.value === "string") {
      try {
        const parsed = JSON.parse(entry.value);
        if (!Array.isArray(parsed)) {
          return {
            rowNumber,
            entry: { key, value: entry.value, valueType },
            reason: "invalid array value",
          };
        }
      } catch {
        return {
          rowNumber,
          entry: { key, value: entry.value, valueType },
          reason: "invalid array value",
        };
      }
    } else if (!Array.isArray(entry.value)) {
      return {
        rowNumber,
        entry: { key, value: entry.value, valueType },
        reason: "invalid array value",
      };
    }
  }

  return null;
}

/**
 * Validates a list of raw entries, detecting duplicates and per-row errors.
 * Returns valid entries, failed rows, and an empty conflicts array
 * (conflicts are populated later against Firestore state).
 */
export function validateEntries(entries: RawEntry[]): ValidationResult {
  const valid: ImportEntry[] = [];
  const failed: FailedRow[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const rowNumber = i + 1;
    const entry = entries[i];

    // Per-entry validation
    const error = validateEntry(entry, rowNumber);
    if (error) {
      failed.push(error);
      continue;
    }

    const key = String(entry.key);

    // Duplicate key detection
    if (seenKeys.has(key)) {
      failed.push({
        rowNumber,
        entry: {
          key,
          value: entry.value,
          valueType: String(entry.valueType) as ConfigValueType,
        },
        reason: "duplicate key in file",
      });
      continue;
    }

    seenKeys.add(key);
    valid.push({
      key,
      value: entry.value,
      valueType: String(entry.valueType) as ConfigValueType,
    });
  }

  return { valid, failed, conflicts: [] };
}
