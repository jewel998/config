import type { TourState } from "../types.js";

const DEFAULT_STATE: TourState = {
  activeTourId: null,
  currentStepIndex: 0,
  completedTours: [],
  dismissedTours: [],
};

export function loadTourState(prefix: string): TourState {
  try {
    const raw = localStorage.getItem(`${prefix}:state`);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveTourState(prefix: string, state: TourState): void {
  try {
    localStorage.setItem(`${prefix}:state`, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function clearTourState(prefix: string): void {
  try {
    localStorage.removeItem(`${prefix}:state`);
  } catch {
    // ignore
  }
}
