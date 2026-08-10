import { useCallback, useEffect, useRef, useState } from "react";

import { waitForCondition } from "../engine/wait-for.js";
import { loadTourState, saveTourState } from "../engine/storage.js";
import type { TourFlow, TourState, TourStep } from "../types.js";

interface UseTourEngineOptions {
  flows: TourFlow[];
  getRoutePath: () => string;
  onNavigate?: (path: string) => void;
  storagePrefix: string;
}

export function useTourEngine(options: UseTourEngineOptions) {
  const { flows, getRoutePath, onNavigate, storagePrefix } = options;
  const [state, setState] = useState<TourState>(() =>
    loadTourState(storagePrefix),
  );
  const cleanupRef = useRef<(() => void) | null>(null);

  // Persist state changes
  useEffect(() => {
    saveTourState(storagePrefix, state);
  }, [state, storagePrefix]);

  // Auto-trigger flows on mount
  useEffect(() => {
    if (state.activeTourId) return; // Already in a tour

    for (const flow of flows) {
      if (state.completedTours.includes(flow.id)) continue;
      if (state.dismissedTours.includes(flow.id)) continue;

      if (!flow.trigger || flow.trigger.type === "first-visit") {
        setState((s) => ({ ...s, activeTourId: flow.id, currentStepIndex: 0 }));
        break;
      }
    }
  }, [flows, state.activeTourId, state.completedTours, state.dismissedTours]);

  // Get current flow and step
  const activeFlow = flows.find((f) => f.id === state.activeTourId) ?? null;
  const currentStep: TourStep | null =
    activeFlow?.steps[state.currentStepIndex] ?? null;

  // Check if step should be visible (page matching)
  const isStepVisible = useCallback(() => {
    if (!currentStep) return false;
    if (!currentStep.page) return true;
    return getRoutePath().startsWith(currentStep.page);
  }, [currentStep, getRoutePath]);

  // Advance to next step
  const nextStep = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setState((s) => {
      if (!activeFlow) return s;
      const nextIndex = s.currentStepIndex + 1;
      if (nextIndex >= activeFlow.steps.length) {
        // Tour completed
        return {
          ...s,
          activeTourId: null,
          currentStepIndex: 0,
          completedTours: [...s.completedTours, activeFlow.id],
        };
      }
      return { ...s, currentStepIndex: nextIndex };
    });
  }, [activeFlow]);

  // Go to a specific step by ID
  const goToStep = useCallback(
    (stepId: string) => {
      if (!activeFlow) return;
      const index = activeFlow.steps.findIndex((s) => s.id === stepId);
      if (index >= 0) {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        setState((s) => ({ ...s, currentStepIndex: index }));
      }
    },
    [activeFlow],
  );

  // Dismiss the current tour
  const dismiss = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setState((s) => ({
      ...s,
      activeTourId: null,
      currentStepIndex: 0,
      dismissedTours: s.activeTourId
        ? [...s.dismissedTours, s.activeTourId]
        : s.dismissedTours,
    }));
  }, []);

  // Start a specific tour manually
  const startTour = useCallback((tourId: string) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setState((s) => ({ ...s, activeTourId: tourId, currentStepIndex: 0 }));
  }, []);

  // Handle waitFor conditions
  useEffect(() => {
    if (!currentStep?.waitFor) return;
    if (!isStepVisible()) return;

    const cleanup = waitForCondition(
      currentStep.waitFor,
      getRoutePath,
      nextStep,
    );
    cleanupRef.current = cleanup;
    return cleanup;
  }, [currentStep, isStepVisible, getRoutePath, nextStep]);

  // Handle auto-navigation
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.type === "action" && currentStep.navigateTo && onNavigate) {
      onNavigate(currentStep.navigateTo);
    } else if (currentStep.navigate && currentStep.page && onNavigate) {
      if (!getRoutePath().startsWith(currentStep.page)) {
        onNavigate(currentStep.page);
      }
    }
  }, [currentStep, onNavigate, getRoutePath]);

  return {
    activeFlow,
    currentStep,
    isStepVisible: isStepVisible(),
    state,
    nextStep,
    goToStep,
    dismiss,
    startTour,
  };
}
