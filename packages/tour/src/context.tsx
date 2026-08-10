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
  reset: (flowId: string) => void;
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
  } catch {
    /* ignore */
  }
}

// ─── Provider ─────────────────────────────────────────────────

export function TourProvider({
  flows,
  children,
  onNavigate,
  getCurrentPath,
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

  // Persist state
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-trigger flows on first visit
  useEffect(() => {
    if (state.activeFlowId || state.dismissed) return;
    for (const flow of flows) {
      if (!flow.trigger) continue;
      if (
        flow.trigger.type === "first-visit" &&
        !state.completedFlows.includes(flow.id)
      ) {
        setState((s) => ({
          ...s,
          activeFlowId: flow.id,
          currentStepIndex: 0,
          dismissed: false,
        }));
        break;
      }
    }
  }, [flows, state.activeFlowId, state.dismissed, state.completedFlows]);

  const currentFlow = useMemo(
    () => flows.find((f) => f.id === state.activeFlowId) ?? null,
    [flows, state.activeFlowId],
  );

  const currentStep = useMemo(
    () => currentFlow?.steps[state.currentStepIndex] ?? null,
    [currentFlow, state.currentStepIndex],
  );

  const totalSteps = currentFlow?.steps.length ?? 0;

  // ─── WaitFor Engine ───────────────────────────────────────

  useEffect(() => {
    // Cleanup previous wait
    waitCleanupRef.current?.();
    waitCleanupRef.current = null;

    if (!currentStep?.waitFor) return;
    const condition = currentStep.waitFor;

    const advance = () => {
      waitCleanupRef.current?.();
      waitCleanupRef.current = null;
      setState((s) => {
        const nextIdx = s.currentStepIndex + 1;
        const flow = flows.find((f) => f.id === s.activeFlowId);
        if (!flow || nextIdx >= flow.steps.length) {
          return {
            ...s,
            activeFlowId: null,
            currentStepIndex: 0,
            completedFlows: [...s.completedFlows, s.activeFlowId!],
          };
        }
        return { ...s, currentStepIndex: nextIdx };
      });
    };

    waitCleanupRef.current = setupWait(condition, advance, getCurrentPath);

    return () => {
      waitCleanupRef.current?.();
      waitCleanupRef.current = null;
    };
  }, [
    currentStep,
    state.currentStepIndex,
    state.activeFlowId,
    flows,
    getCurrentPath,
  ]);

  // ─── Page check: hide step if on wrong page ────────────────

  const isOnCorrectPage = useMemo(() => {
    if (!currentStep?.page) return true;
    if (!getCurrentPath) return true;
    return getCurrentPath().startsWith(currentStep.page);
  }, [currentStep, getCurrentPath]);

  // ─── Handle action steps (auto-navigate) ───────────────────

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

  // ─── Actions ───────────────────────────────────────────────

  const next = useCallback(() => {
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
  }, [flows]);

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
      dismissed: true,
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

  const reset = useCallback((flowId: string) => {
    setState((s) => ({
      ...s,
      completedFlows: s.completedFlows.filter((id) => id !== flowId),
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
  getCurrentPath?: () => string,
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
      // Check immediately
      if (document.querySelector(condition.selector)) {
        onMet();
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
        onMet();
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
      if (getCurrentPath?.().startsWith(condition.path)) {
        onMet();
        return () => {};
      }
      // Poll for route changes (works with any router)
      const interval = setInterval(() => {
        if (getCurrentPath?.().startsWith(condition.path)) {
          onMet();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
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
