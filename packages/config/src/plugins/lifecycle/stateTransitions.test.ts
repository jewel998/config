import { describe, expect, it } from "vitest";

import {
  type LifecycleState,
  VALID_TRANSITIONS,
  validateStateTransition,
} from "./stateTransitions.js";

describe("validateStateTransition", () => {
  describe("valid transitions", () => {
    const validPairs: [LifecycleState, LifecycleState][] = [
      ["draft", "active"],
      ["active", "stale"],
      ["stale", "archived"],
      ["stale", "active"],
      ["archived", "active"],
    ];

    for (const [current, target] of validPairs) {
      it(`allows ${current} → ${target}`, () => {
        expect(validateStateTransition(current, target)).toBe(true);
      });
    }
  });

  describe("invalid transitions", () => {
    const invalidPairs: [LifecycleState, LifecycleState][] = [
      // Self-transitions
      ["draft", "draft"],
      ["active", "active"],
      ["stale", "stale"],
      ["archived", "archived"],
      // Backward transitions not allowed
      ["active", "draft"],
      // Skip transitions
      ["draft", "stale"],
      ["draft", "archived"],
      ["active", "archived"],
      ["active", "draft"],
      // Archived can only go to active
      ["archived", "draft"],
      ["archived", "stale"],
    ];

    for (const [current, target] of invalidPairs) {
      it(`rejects ${current} → ${target}`, () => {
        expect(validateStateTransition(current, target)).toBe(false);
      });
    }
  });

  describe("VALID_TRANSITIONS map", () => {
    it("defines exactly 4 states as keys", () => {
      const keys = Object.keys(VALID_TRANSITIONS);
      expect(keys).toHaveLength(4);
      expect(keys.sort()).toEqual(["active", "archived", "draft", "stale"]);
    });

    it("draft can only transition to active", () => {
      expect(VALID_TRANSITIONS.draft).toEqual(["active"]);
    });

    it("active can only transition to stale", () => {
      expect(VALID_TRANSITIONS.active).toEqual(["stale"]);
    });

    it("stale can transition to archived or active", () => {
      expect(VALID_TRANSITIONS.stale).toContain("archived");
      expect(VALID_TRANSITIONS.stale).toContain("active");
      expect(VALID_TRANSITIONS.stale).toHaveLength(2);
    });

    it("archived can only transition to active", () => {
      expect(VALID_TRANSITIONS.archived).toEqual(["active"]);
    });
  });
});
