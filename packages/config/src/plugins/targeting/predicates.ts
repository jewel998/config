// ═══════════════════════════════════════════════════════════════
// Predicate Evaluator — DNF logic for targeting rules
// ═══════════════════════════════════════════════════════════════

import type { Predicate, PredicateGroup } from "../models.js";

type AttributeValue = string | number | boolean | string[];

/**
 * Evaluate a single predicate against the provided attributes.
 *
 * Returns false for:
 * - Missing attributes in context
 * - Type mismatches (e.g., greater_than on a non-numeric value)
 * - Invalid regex patterns (also calls emitError)
 * - in_segment / not_in_segment (handled externally by segment resolver)
 */
export function evaluatePredicate(
  predicate: Predicate,
  attributes: Record<string, AttributeValue>,
  emitError?: (message: string) => void,
): boolean {
  const { attribute, operator, value } = predicate;

  // in_segment / not_in_segment are resolved externally by the segment resolver
  if (operator === "in_segment" || operator === "not_in_segment") {
    return false;
  }

  // Missing attribute → predicate is non-matching (Property 4)
  if (!(attribute in attributes)) {
    return false;
  }

  const attrValue = attributes[attribute];

  // Attribute value is undefined/null → non-matching
  if (attrValue === undefined || attrValue === null) {
    return false;
  }

  switch (operator) {
    case "equals":
      return attrValue === value;

    case "not_equals":
      return attrValue !== value;

    case "contains": {
      if (typeof attrValue !== "string" || typeof value !== "string") {
        return false;
      }
      return attrValue.includes(value);
    }

    case "starts_with": {
      if (typeof attrValue !== "string" || typeof value !== "string") {
        return false;
      }
      return attrValue.startsWith(value);
    }

    case "ends_with": {
      if (typeof attrValue !== "string" || typeof value !== "string") {
        return false;
      }
      return attrValue.endsWith(value);
    }

    case "in_list": {
      if (!Array.isArray(value)) {
        return false;
      }
      return value.includes(attrValue as string);
    }

    case "not_in_list": {
      if (!Array.isArray(value)) {
        return false;
      }
      return !value.includes(attrValue as string);
    }

    case "greater_than": {
      if (typeof attrValue !== "number" || typeof value !== "number") {
        return false;
      }
      return attrValue > value;
    }

    case "less_than": {
      if (typeof attrValue !== "number" || typeof value !== "number") {
        return false;
      }
      return attrValue < value;
    }

    case "regex_match": {
      if (typeof attrValue !== "string" || typeof value !== "string") {
        return false;
      }
      try {
        const regex = new RegExp(value);
        return regex.test(attrValue);
      } catch {
        emitError?.(`Invalid regex pattern: ${value}`);
        return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Evaluate predicate groups in Disjunctive Normal Form (DNF).
 *
 * Groups are OR'd — any group matching means the whole expression matches.
 * Within each group, predicates are AND'd — all must match.
 *
 * Returns false if groups array is empty.
 */
export function evaluatePredicateGroups(
  groups: PredicateGroup[],
  attributes: Record<string, AttributeValue>,
  emitError?: (message: string) => void,
): boolean {
  if (groups.length === 0) {
    return false;
  }

  // OR across groups: at least one group must fully match
  return groups.some((group) => {
    // AND within each group: all predicates must match
    return group.predicates.every((predicate) =>
      evaluatePredicate(predicate, attributes, emitError),
    );
  });
}
