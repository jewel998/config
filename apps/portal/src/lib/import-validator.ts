import type { ImportEntryFull, ImportValidationError } from "./import-types";

const KEY_PATTERN = /^[a-zA-Z0-9._]+$/;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_SIZE_BYTES = 1_048_576; // 1 MB
const VALID_VALUE_TYPES = ["string", "number", "boolean", "json", "array"];
const VALID_LIFECYCLE_STATES = ["draft", "active", "stale", "archived"];
const VALID_PREDICATE_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "in_list",
  "not_in_list",
  "greater_than",
  "less_than",
  "regex_match",
  "in_segment",
  "not_in_segment",
];
const VALID_PREREQUISITE_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "contains",
];

/**
 * Validates a single import entry (base + advanced fields).
 * Returns an array of errors (empty if valid).
 */
export function validateImportEntry(
  entry: Record<string, unknown>,
  rowNumber: number,
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  const key = String(entry.key ?? "");

  // ─── Required field checks ─────────────────────────────────
  if (!entry.key || entry.key === "") {
    errors.push({
      rowNumber,
      key: "",
      field: "key",
      reason: "missing required field: key",
    });
    return errors; // can't validate further without a key
  }

  if (entry.value === undefined || entry.value === null) {
    errors.push({
      rowNumber,
      key,
      field: "value",
      reason: "missing required field: value",
    });
  }

  if (!entry.valueType || entry.valueType === "") {
    errors.push({
      rowNumber,
      key,
      field: "valueType",
      reason: "missing required field: valueType",
    });
    return errors;
  }

  // ─── Key validation ────────────────────────────────────────
  if (key.length > MAX_KEY_LENGTH) {
    errors.push({
      rowNumber,
      key,
      field: "key",
      reason: "key too long (max 100 characters)",
    });
  } else if (!KEY_PATTERN.test(key)) {
    errors.push({
      rowNumber,
      key,
      field: "key",
      reason: "invalid key format (only alphanumeric, dots, underscores)",
    });
  }

  // ─── ValueType validation ──────────────────────────────────
  const valueType = String(entry.valueType);
  if (!VALID_VALUE_TYPES.includes(valueType)) {
    errors.push({
      rowNumber,
      key,
      field: "valueType",
      reason: `unsupported value type "${valueType}"`,
    });
    return errors;
  }

  // ─── Value size check ──────────────────────────────────────
  try {
    const serialized = JSON.stringify(entry.value);
    if (new TextEncoder().encode(serialized).length > MAX_VALUE_SIZE_BYTES) {
      errors.push({
        rowNumber,
        key,
        field: "value",
        reason: "value too large (max 1 MB)",
      });
    }
  } catch {
    errors.push({
      rowNumber,
      key,
      field: "value",
      reason: "value cannot be serialized",
    });
  }

  // ─── Value-type consistency ────────────────────────────────
  if (entry.value !== undefined && entry.value !== null) {
    switch (valueType) {
      case "number": {
        const num = Number(entry.value);
        if (isNaN(num)) {
          errors.push({
            rowNumber,
            key,
            field: "value",
            reason: "invalid number value",
          });
        }
        break;
      }
      case "boolean": {
        const val = entry.value;
        if (typeof val === "string") {
          if (val !== "true" && val !== "false") {
            errors.push({
              rowNumber,
              key,
              field: "value",
              reason: "invalid boolean value (must be true or false)",
            });
          }
        } else if (typeof val !== "boolean") {
          errors.push({
            rowNumber,
            key,
            field: "value",
            reason: "invalid boolean value (must be true or false)",
          });
        }
        break;
      }
      case "json": {
        if (typeof entry.value === "string") {
          try {
            JSON.parse(entry.value);
          } catch {
            errors.push({
              rowNumber,
              key,
              field: "value",
              reason: "invalid JSON value",
            });
          }
        } else if (
          typeof entry.value !== "object" ||
          entry.value === null ||
          Array.isArray(entry.value)
        ) {
          errors.push({
            rowNumber,
            key,
            field: "value",
            reason: "invalid JSON value (must be object or JSON string)",
          });
        }
        break;
      }
      case "array": {
        if (typeof entry.value === "string") {
          try {
            const parsed = JSON.parse(entry.value);
            if (!Array.isArray(parsed)) {
              errors.push({
                rowNumber,
                key,
                field: "value",
                reason: "invalid array value (must parse to array)",
              });
            }
          } catch {
            errors.push({
              rowNumber,
              key,
              field: "value",
              reason: "invalid array value (not valid JSON)",
            });
          }
        } else if (!Array.isArray(entry.value)) {
          errors.push({
            rowNumber,
            key,
            field: "value",
            reason: "invalid array value",
          });
        }
        break;
      }
    }
  }

  // ─── Lifecycle state validation ────────────────────────────
  if (entry.lifecycleState !== undefined) {
    if (!VALID_LIFECYCLE_STATES.includes(String(entry.lifecycleState))) {
      errors.push({
        rowNumber,
        key,
        field: "lifecycleState",
        reason: `invalid lifecycle state (must be one of: ${VALID_LIFECYCLE_STATES.join(", ")})`,
      });
    }
  }

  // ─── Targeting rules validation ────────────────────────────
  if (entry.targetingRules !== undefined) {
    if (!Array.isArray(entry.targetingRules)) {
      errors.push({
        rowNumber,
        key,
        field: "targetingRules",
        reason: "targetingRules must be an array",
      });
    } else {
      for (let i = 0; i < entry.targetingRules.length; i++) {
        const rule = entry.targetingRules[i] as Record<string, unknown>;
        if (!rule.id || typeof rule.id !== "string") {
          errors.push({
            rowNumber,
            key,
            field: `targetingRules[${i}].id`,
            reason: "targeting rule must have a string id",
          });
        }
        if (
          typeof rule.priority !== "number" ||
          rule.priority < 1 ||
          rule.priority > 1000
        ) {
          errors.push({
            rowNumber,
            key,
            field: `targetingRules[${i}].priority`,
            reason: "priority must be a number between 1 and 1000",
          });
        }
        if (rule.value === undefined) {
          errors.push({
            rowNumber,
            key,
            field: `targetingRules[${i}].value`,
            reason: "targeting rule must have a value",
          });
        }
        if (!Array.isArray(rule.conditions)) {
          errors.push({
            rowNumber,
            key,
            field: `targetingRules[${i}].conditions`,
            reason: "targeting rule must have conditions array",
          });
        } else {
          for (let g = 0; g < (rule.conditions as unknown[]).length; g++) {
            const group = (rule.conditions as Array<Record<string, unknown>>)[
              g
            ];
            if (!Array.isArray(group?.predicates)) {
              errors.push({
                rowNumber,
                key,
                field: `targetingRules[${i}].conditions[${g}].predicates`,
                reason: "condition group must have predicates array",
              });
            } else {
              for (let p = 0; p < (group.predicates as unknown[]).length; p++) {
                const pred = (
                  group.predicates as Array<Record<string, unknown>>
                )[p];
                if (!pred?.attribute || typeof pred.attribute !== "string") {
                  errors.push({
                    rowNumber,
                    key,
                    field: `targetingRules[${i}].conditions[${g}].predicates[${p}].attribute`,
                    reason: "predicate must have string attribute",
                  });
                }
                if (
                  !pred?.operator ||
                  !VALID_PREDICATE_OPERATORS.includes(String(pred.operator))
                ) {
                  errors.push({
                    rowNumber,
                    key,
                    field: `targetingRules[${i}].conditions[${g}].predicates[${p}].operator`,
                    reason: `invalid operator (must be one of: ${VALID_PREDICATE_OPERATORS.join(", ")})`,
                  });
                }
                if (pred?.value === undefined) {
                  errors.push({
                    rowNumber,
                    key,
                    field: `targetingRules[${i}].conditions[${g}].predicates[${p}].value`,
                    reason: "predicate must have a value",
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // ─── Rollout validation ────────────────────────────────────
  if (entry.rolloutPercentage !== undefined) {
    const pct = Number(entry.rolloutPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      errors.push({
        rowNumber,
        key,
        field: "rolloutPercentage",
        reason: "rolloutPercentage must be a number between 0 and 100",
      });
    }
  }

  // ─── Overrides validation ──────────────────────────────────
  if (entry.overrides !== undefined) {
    if (
      typeof entry.overrides !== "object" ||
      entry.overrides === null ||
      Array.isArray(entry.overrides)
    ) {
      errors.push({
        rowNumber,
        key,
        field: "overrides",
        reason: "overrides must be an object (userId → value)",
      });
    }
  }

  // ─── Schedule validation ───────────────────────────────────
  if (entry.schedule !== undefined) {
    const schedule = entry.schedule as Record<string, unknown> | null;
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      errors.push({
        rowNumber,
        key,
        field: "schedule",
        reason: "schedule must be an object with targetValue and activateAt",
      });
    } else {
      if (schedule.targetValue === undefined) {
        errors.push({
          rowNumber,
          key,
          field: "schedule.targetValue",
          reason: "schedule must have a targetValue",
        });
      }
      if (!schedule.activateAt || typeof schedule.activateAt !== "string") {
        errors.push({
          rowNumber,
          key,
          field: "schedule.activateAt",
          reason: "schedule must have a string activateAt (ISO 8601)",
        });
      } else {
        const date = new Date(schedule.activateAt as string);
        if (isNaN(date.getTime())) {
          errors.push({
            rowNumber,
            key,
            field: "schedule.activateAt",
            reason: "activateAt must be a valid ISO 8601 datetime",
          });
        }
      }
    }
  }

  // ─── Prerequisites validation ──────────────────────────────
  if (entry.prerequisites !== undefined) {
    if (!Array.isArray(entry.prerequisites)) {
      errors.push({
        rowNumber,
        key,
        field: "prerequisites",
        reason: "prerequisites must be an array",
      });
    } else {
      for (let i = 0; i < entry.prerequisites.length; i++) {
        const prereq = entry.prerequisites[i] as Record<string, unknown>;
        if (!prereq?.flagKey || typeof prereq.flagKey !== "string") {
          errors.push({
            rowNumber,
            key,
            field: `prerequisites[${i}].flagKey`,
            reason: "prerequisite must have a string flagKey",
          });
        }
        if (
          prereq?.operator !== undefined &&
          !VALID_PREREQUISITE_OPERATORS.includes(String(prereq.operator))
        ) {
          errors.push({
            rowNumber,
            key,
            field: `prerequisites[${i}].operator`,
            reason: `invalid operator (must be one of: ${VALID_PREREQUISITE_OPERATORS.join(", ")})`,
          });
        }
        if (prereq?.requiredValue === undefined) {
          errors.push({
            rowNumber,
            key,
            field: `prerequisites[${i}].requiredValue`,
            reason: "prerequisite must have a requiredValue",
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validates an array of import entries. Returns all errors grouped by row,
 * plus detects duplicate keys.
 */
export function validateImportEntries(
  entries: Array<Record<string, unknown>>,
): { valid: ImportEntryFull[]; errors: ImportValidationError[] } {
  const allErrors: ImportValidationError[] = [];
  const valid: ImportEntryFull[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const rowNumber = i + 1;
    const entry = entries[i];
    const entryErrors = validateImportEntry(entry, rowNumber);

    if (entryErrors.length > 0) {
      allErrors.push(...entryErrors);
      continue;
    }

    const key = String(entry.key);
    if (seenKeys.has(key)) {
      allErrors.push({
        rowNumber,
        key,
        field: "key",
        reason: "duplicate key in file",
      });
      continue;
    }

    seenKeys.add(key);
    valid.push(entry as unknown as ImportEntryFull);
  }

  return { valid, errors: allErrors };
}
