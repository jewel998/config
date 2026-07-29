// ═══════════════════════════════════════════════════════════════
// Lifecycle State Machine Validator
// ═══════════════════════════════════════════════════════════════

/**
 * Valid lifecycle states for a config flag.
 */
export type LifecycleState = "draft" | "active" | "stale" | "archived";

/**
 * Map of valid state transitions.
 *
 * Allowed transitions:
 * - draft → active
 * - active → stale
 * - stale → archived
 * - stale → active (reactivation)
 * - archived → active (unarchive)
 *
 * All other transitions are rejected.
 */
export const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  draft: ["active"],
  active: ["stale"],
  stale: ["archived", "active"],
  archived: ["active"],
};

/**
 * Validates whether a state transition from `current` to `target` is allowed
 * by the lifecycle state machine.
 *
 * @param current - The current lifecycle state of the flag
 * @param target - The desired target lifecycle state
 * @returns `true` if the transition is valid, `false` otherwise
 */
export function validateStateTransition(
  current: LifecycleState,
  target: LifecycleState,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(target) ?? false;
}
