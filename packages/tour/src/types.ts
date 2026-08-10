// ─── Flow Definition (the JSON schema) ────────────────────────

export interface TourFlow {
  id: string;
  name: string;
  trigger?: TourTrigger;
  steps: TourStep[];
}

export interface TourTrigger {
  type: "first-visit" | "manual" | "event" | "context";
  storage?: string;
  eventName?: string;
  /** For "context" trigger: only start when this condition is true */
  condition?: StepCondition;
}

// ─── Step Types ───────────────────────────────────────────────

export type TourStep = ModalStep | SpotlightStep | TooltipStep | ActionStep;

interface BaseStep {
  id: string;
  /** Which route this step expects */
  page?: string;
  /** Condition to auto-advance to next step */
  waitFor?: WaitCondition;
  /** Skip this step if condition is true (evaluated against context) */
  skipIf?: StepCondition;
  /** Only show this step if condition is true */
  showIf?: StepCondition;
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
  target: string;
  title: string;
  description?: string;
  position?: Position;
}

export interface TooltipStep extends BaseStep {
  type: "tooltip";
  target: string;
  title: string;
  description?: string;
  position?: Position;
}

export interface ActionStep extends BaseStep {
  type: "action";
  navigate?: string;
}

// ─── Conditions ───────────────────────────────────────────────

export interface StepCondition {
  /** Check a context key — e.g. "hasProject", "hasEnvironment" */
  key: string;
  /** Operator: exists (truthy), equals, not_equals */
  op?: "exists" | "equals" | "not_equals";
  /** Value to compare against (for equals/not_equals) */
  value?: unknown;
}

export interface StepAction {
  label: string;
  next?: string;
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
  /** Current route path — pass from your router reactively */
  currentPath?: string;
  /** Callback to navigate programmatically */
  onNavigate?: (path: string) => void;
  /** Dynamic context for conditional steps (e.g., { hasProject: true }) */
  context?: Record<string, unknown>;
}

// ─── Internal State ───────────────────────────────────────────

export interface TourState {
  activeFlowId: string | null;
  currentStepIndex: number;
  completedFlows: string[];
  dismissed: boolean;
}
