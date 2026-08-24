import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StepCondition,
  TourFlow,
  TourProviderProps,
  TourState,
  TourStep,
  WaitCondition,
} from "./types.js";

// ─── Context ──────────────────────────────────────────────────

interface TourContextValue {
  state: TourState;
  currentStep: TourStep | null;
  currentFlow: TourFlow | null;
  totalSteps: number;
  next: () => void;
  prev: () => void;
  goTo: (stepId: string) => void;
  dismiss: () => void;
  startFlow: (flowId: string) => void;
  reset: (flowId?: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

// ─── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = "__tour_state__";

function loadState(): Partial<TourState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: TourState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Condition Evaluation ─────────────────────────────────────

function evaluateCondition(condition: StepCondition, context: Record<string, unknown>): boolean {
  const value = context[condition.key];
  const op = condition.op ?? "exists";

  switch (op) {
    case "exists":
      return !!value;
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    default:
      return false;
  }
}

// ─── Provider ─────────────────────────────────────────────────

export function TourProvider({
  flows,
  children,
  currentPath = "",
  onNavigate,
  context = {},
}: TourProviderProps) {
  const [state, setState] = useState<TourState>(() => {
    const saved = loadState();
    return {
      activeFlowId: saved.activeFlowId ?? null,
      currentStepIndex: saved.currentStepIndex ?? 0,
      completedFlows: saved.completedFlows ?? [],
      dismissed: saved.dismissed ?? false,
    };
  });

  const waitCleanupRef = useRef<(() => void) | null>(null);
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  // Persist state
  useEffect(() => {
    saveState(state);
  }, [state]);

  // ─── Auto-trigger flows based on context conditions ─────────

  useEffect(() => {
    if (state.activeFlowId) return;

    for (const flow of flows) {
      if (!flow.trigger) continue;
      if (state.completedFlows.includes(flow.id)) continue;

      let shouldTrigger = false;

      if (flow.trigger.type === "first-visit") {
        shouldTrigger = true;
      } else if (flow.trigger.type === "context" && flow.trigger.condition) {
        shouldTrigger = evaluateCondition(flow.trigger.condition, context);
      }

      if (shouldTrigger) {
        setState((s) => ({
          ...s,
          activeFlowId: flow.id,
          currentStepIndex: 0,
          dismissed: false,
        }));
        break;
      }
    }
  }, [flows, state.activeFlowId, state.completedFlows, context]);

  // ─── Resolve current flow/step (with skipIf/showIf) ─────────

  const currentFlow = useMemo(
    () => flows.find((f) => f.id === state.activeFlowId) ?? null,
    [flows, state.activeFlowId],
  );

  const resolvedStepIndex = useMemo(() => {
    if (!currentFlow) return state.currentStepIndex;
    let idx = state.currentStepIndex;

    // Skip steps that have skipIf=true or showIf=false
    while (idx < currentFlow.steps.length) {
      const step = currentFlow.steps[idx];
      if (step.skipIf && evaluateCondition(step.skipIf, context)) {
        idx++;
        continue;
      }
      if (step.showIf && !evaluateCondition(step.showIf, context)) {
        idx++;
        continue;
      }
      break;
    }
    return idx;
  }, [currentFlow, state.currentStepIndex, context]);

  const currentStep = useMemo(() => {
    if (!currentFlow || resolvedStepIndex >= currentFlow.steps.length) return null;
    return currentFlow.steps[resolvedStepIndex];
  }, [currentFlow, resolvedStepIndex]);

  const totalSteps = currentFlow?.steps.length ?? 0;

  // ─── Page check ─────────────────────────────────────────────

  const isOnCorrectPage = useMemo(() => {
    if (!currentStep?.page) return true;
    return currentPath.startsWith(currentStep.page);
  }, [currentStep, currentPath]);

  // ─── WaitFor Engine ─────────────────────────────────────────

  useEffect(() => {
    waitCleanupRef.current?.();
    waitCleanupRef.current = null;

    if (!currentStep?.waitFor || !isOnCorrectPage) return;

    const advance = () => {
      waitCleanupRef.current?.();
      waitCleanupRef.current = null;
      advanceStep();
    };

    waitCleanupRef.current = setupWait(currentStep.waitFor, advance, currentPathRef);

    return () => {
      waitCleanupRef.current?.();
      waitCleanupRef.current = null;
    };
  }, [currentStep, isOnCorrectPage, resolvedStepIndex, state.activeFlowId]);

  // ─── Route-change detection (reactive via prop) ─────────────

  const prevPathRef = useRef(currentPath);
  useEffect(() => {
    if (prevPathRef.current === currentPath) return;
    prevPathRef.current = currentPath;

    // Check if current waitFor is route-change and matches
    if (
      currentStep?.waitFor?.type === "route-change" &&
      currentPath.startsWith(currentStep.waitFor.path)
    ) {
      waitCleanupRef.current?.();
      waitCleanupRef.current = null;
      advanceStep();
    }
  }, [currentPath]);

  // ─── Auto-navigate for action steps ─────────────────────────

  useEffect(() => {
    if (
      currentStep?.type === "action" &&
      "navigate" in currentStep &&
      currentStep.navigate &&
      onNavigate
    ) {
      onNavigate(currentStep.navigate);
    }
  }, [currentStep, onNavigate]);

  // ─── Actions ────────────────────────────────────────────────

  function advanceStep() {
    setState((s) => {
      const flow = flows.find((f) => f.id === s.activeFlowId);
      if (!flow) return s;
      const nextIdx = s.currentStepIndex + 1;
      if (nextIdx >= flow.steps.length) {
        return {
          ...s,
          activeFlowId: null,
          currentStepIndex: 0,
          completedFlows: [...s.completedFlows, flow.id],
        };
      }
      return { ...s, currentStepIndex: nextIdx };
    });
  }

  const next = useCallback(() => advanceStep(), [flows]);

  const prev = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStepIndex: Math.max(0, s.currentStepIndex - 1),
    }));
  }, []);

  const goTo = useCallback(
    (stepId: string) => {
      setState((s) => {
        const flow = flows.find((f) => f.id === s.activeFlowId);
        if (!flow) return s;
        const idx = flow.steps.findIndex((st) => st.id === stepId);
        if (idx === -1) return s;
        return { ...s, currentStepIndex: idx };
      });
    },
    [flows],
  );

  const dismiss = useCallback(() => {
    setState((s) => ({
      ...s,
      activeFlowId: null,
      currentStepIndex: 0,
      completedFlows: s.activeFlowId ? [...s.completedFlows, s.activeFlowId] : s.completedFlows,
    }));
  }, []);

  const startFlow = useCallback((flowId: string) => {
    setState((s) => ({
      ...s,
      activeFlowId: flowId,
      currentStepIndex: 0,
      dismissed: false,
    }));
  }, []);

  const reset = useCallback((flowId?: string) => {
    setState((s) => ({
      ...s,
      activeFlowId: null,
      currentStepIndex: 0,
      dismissed: false,
      completedFlows: flowId ? s.completedFlows.filter((id) => id !== flowId) : [],
    }));
  }, []);

  const value: TourContextValue = {
    state,
    currentStep: isOnCorrectPage ? currentStep : null,
    currentFlow,
    totalSteps,
    next,
    prev,
    goTo,
    dismiss,
    startFlow,
    reset,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// ─── WaitFor Setup ────────────────────────────────────────────

function setupWait(
  condition: WaitCondition,
  onMet: () => void,
  currentPathRef: React.RefObject<string>,
): () => void {
  switch (condition.type) {
    case "delay": {
      const timer = setTimeout(onMet, condition.ms);
      return () => clearTimeout(timer);
    }

    case "click": {
      const handler = (e: Event) => {
        if (!condition.target) {
          onMet();
          return;
        }
        const el = document.querySelector(condition.target);
        if (el && (el === e.target || el.contains(e.target as Node))) onMet();
      };
      document.addEventListener("click", handler, true);
      return () => document.removeEventListener("click", handler, true);
    }

    case "element-visible": {
      if (document.querySelector(condition.selector)) {
        setTimeout(onMet, 100); // Small delay to let DOM settle
        return () => {};
      }
      const observer = new MutationObserver(() => {
        if (document.querySelector(condition.selector)) {
          onMet();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    case "element-hidden": {
      if (!document.querySelector(condition.selector)) {
        setTimeout(onMet, 100);
        return () => {};
      }
      const observer = new MutationObserver(() => {
        if (!document.querySelector(condition.selector)) {
          onMet();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    case "route-change": {
      // Route changes are handled reactively via currentPath prop
      // This is a fallback check in case the effect fires after path changed
      if (currentPathRef.current?.startsWith(condition.path)) {
        setTimeout(onMet, 100);
        return () => {};
      }
      // The actual route-change detection happens in the useEffect above
      return () => {};
    }

    case "event": {
      const handler = () => onMet();
      window.addEventListener(condition.name, handler);
      return () => window.removeEventListener(condition.name, handler);
    }

    default:
      return () => {};
  }
}
