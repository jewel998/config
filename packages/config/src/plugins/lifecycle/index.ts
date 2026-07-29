// ═══════════════════════════════════════════════════════════════
// Lifecycle Plugin — Public Barrel Export
// ═══════════════════════════════════════════════════════════════

export { archivedPlugin } from "./archivedPlugin.js";
export {
  validateStateTransition,
  VALID_TRANSITIONS,
} from "./stateTransitions.js";
export type { LifecycleState } from "./stateTransitions.js";
