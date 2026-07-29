import { describe, it, expect, vi } from "vitest";
import { resolveSegment } from "./segmentResolver.js";
import type { Segment } from "../models.js";

function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "seg-1",
    name: "Beta Users",
    description: "Users in the beta program",
    conditions: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    createdBy: "admin",
    ...overrides,
  };
}

describe("resolveSegment", () => {
  const attrs = {
    plan: "enterprise",
    country: "US",
    age: 30,
    email: "user@example.com",
  };

  describe("non-existent segment (Requirement 3.6)", () => {
    it("returns false when segment ID does not exist in the map", () => {
      const segments: Record<string, Segment> = {};
      expect(resolveSegment("unknown-seg", segments, attrs)).toBe(false);
    });

    it("returns false for empty segments map", () => {
      expect(resolveSegment("seg-1", {}, attrs)).toBe(false);
    });
  });

  describe("segment with empty conditions", () => {
    it("returns false when segment has no condition groups", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({ conditions: [] }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });
  });

  describe("basic predicate evaluation (Requirement 3.4)", () => {
    it("returns true when attributes match segment conditions", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "plan", operator: "equals", value: "enterprise" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(true);
    });

    it("returns false when attributes do not match segment conditions", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "plan", operator: "equals", value: "free" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });
  });

  describe("DNF evaluation (OR of ANDs)", () => {
    it("returns true when any group matches (OR logic)", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "country", operator: "equals", value: "DE" },
              ],
            },
            {
              predicates: [
                { attribute: "country", operator: "equals", value: "US" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(true);
    });

    it("returns true only when all predicates in a group match (AND logic)", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "plan", operator: "equals", value: "enterprise" },
                { attribute: "country", operator: "equals", value: "US" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(true);
    });

    it("returns false when AND group has a non-matching predicate", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "plan", operator: "equals", value: "enterprise" },
                { attribute: "country", operator: "equals", value: "DE" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });
  });

  describe("nested segment references disallowed (Requirement 3.4)", () => {
    it("returns false when segment contains in_segment predicate", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "segment", operator: "in_segment", value: "other-seg" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });

    it("returns false when segment contains not_in_segment predicate", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "segment", operator: "not_in_segment", value: "other-seg" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });

    it("in_segment predicate causes AND group to fail even with other matching predicates", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "plan", operator: "equals", value: "enterprise" },
                { attribute: "segment", operator: "in_segment", value: "other-seg" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });
  });

  describe("emitError propagation", () => {
    it("passes emitError to predicate evaluation for invalid regex", () => {
      const emitError = vi.fn();
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "email", operator: "regex_match", value: "[invalid(" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs, emitError)).toBe(false);
      expect(emitError).toHaveBeenCalledWith("Invalid regex pattern: [invalid(");
    });
  });

  describe("various predicate operators within segment", () => {
    it("supports contains operator", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "email", operator: "contains", value: "@example" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(true);
    });

    it("supports greater_than operator", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "age", operator: "greater_than", value: 25 },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(true);
    });

    it("handles missing attributes gracefully", () => {
      const segments: Record<string, Segment> = {
        "seg-1": makeSegment({
          conditions: [
            {
              predicates: [
                { attribute: "nonexistent", operator: "equals", value: "test" },
              ],
            },
          ],
        }),
      };
      expect(resolveSegment("seg-1", segments, attrs)).toBe(false);
    });
  });
});
