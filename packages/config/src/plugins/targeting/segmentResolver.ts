// ═══════════════════════════════════════════════════════════════
// Segment Resolver — resolves segment predicates against context
// ═══════════════════════════════════════════════════════════════

import type { Segment } from "../models.js";
import { evaluatePredicateGroups } from "./predicates.js";

type AttributeValue = string | number | boolean | string[];

/**
 * Resolve a segment by ID and evaluate its predicate groups against
 * the provided attributes.
 *
 * - Returns false if the segment does not exist (Requirement 3.6)
 * - Nested segment references (in_segment/not_in_segment within a segment)
 *   are disallowed — evaluatePredicateGroups already returns false for those
 *   operators (Requirement 3.4)
 * - Evaluates the segment's conditions in DNF (OR of ANDs) using the same
 *   predicate operators as targeting rules (Requirement 3.4)
 */
export function resolveSegment(
  segmentId: string,
  segments: Record<string, Segment>,
  attributes: Record<string, AttributeValue>,
  emitError?: (message: string) => void,
): boolean {
  const segment = segments[segmentId];

  // Segment not found → non-matching (Requirement 3.6)
  if (!segment) {
    return false;
  }

  // Evaluate the segment's predicate groups in DNF against the attributes.
  // in_segment/not_in_segment predicates within a segment will automatically
  // return false (no nesting allowed, Requirement 3.4)
  return evaluatePredicateGroups(segment.conditions, attributes, emitError);
}
