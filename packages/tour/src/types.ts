// ─── Flow Definition (the JSON schema) ────────────────────────

export interface TourFlow {
  id: string;
  name: string;
  trigger?: TourTrigger;
  steps: TourStep[];
}

export interface TourTrigger {
  /** When to auto-start this flow */
  type: "first-visit" | "manual" | "event";
  /** For "first-visit": localStorage key to track completion */
  storage?: string;
  /** For "event": custom DOM event name */
  eventName?: string;
}

// ─── Step Types ───────────────────────────────────────────────

export type TourStep = ModalStep | SpotlightStep | TooltipStep | ActionStep;

interface BaseStep {
  id: string;
  /** Which page/route this step expects (optional, for multi-page tours) */
  page?: string;
  /** Condition to advance to next step automatically */
  waitFor?: WaitCondition;
}

export interface ModalStep extends BaseStep {
  type: "modal";
  title: string;
  description?: string;
  image?: string;
  actions?: StepAction[];
}

export interface SpotlightStep extends BaseStep {
  type: "spotlight";
  target: string; // CSS selector
  title: string;
  description?: string;
  position?: Position;
}

export interface TooltipStep extends BaseStep {
  type: "tooltip";
  target: string; // CSS selector
  title: string;
  description?: string;
  position?: Position;
}

export interface ActionStep extends BaseStep {
  type: "action";
  /** Navigate to this path programmatically */
  navigate?: string;
}

// ─── Step Actions & Conditions ────────────────────────────────

export interface StepAction {
  label: string;
  /** Go to a specific step by id */
  next?: string;
  /** Dismiss the entire tour */
  dismiss?: boolean;
}

export type WaitCondition =
  | { type: "click"; target?: string }
  | { type: "element-visible"; selector: string }
  | { type: "element-hidden"; selector: string }
  | { type: "route-change"; path: string }
  | { type: "event"; name: string }
  | { type: "delay"; ms: number };

export type Position = "top" | "bottom" | "left" | "right";

// ─── Provider Props ───────────────────────────────────────────

export interface TourProviderProps {
  flows: TourFlow[];
  children: React.ReactNode;
  /** Optional callback when route navigation is needed */
  onNavigate?: (path: string) => void;
  /** Optional callback for getting current route path */
  getCurrentPath?: () => string;
}

// ─── Internal State ───────────────────────────────────────────

export interface TourState {
  activeFlowId: string | null;
  currentStepIndex: number;
  completedFlows: string[];
  dismissed: boolean;
}
