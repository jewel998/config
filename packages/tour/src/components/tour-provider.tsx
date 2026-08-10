import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

import { useTourEngine } from "../hooks/use-tour-engine.js";
import type { TourFlow, TourProviderProps, TourStep } from "../types.js";
import { TourModal } from "./tour-modal.js";
import { TourSpotlight } from "./tour-spotlight.js";

// ─── Context ──────────────────────────────────────────────────

interface TourContextValue {
  startTour: (tourId: string) => void;
  dismiss: () => void;
  isActive: boolean;
  activeTourId: string | null;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  dismiss: () => {},
  isActive: false,
  activeTourId: null,
});

export const useTour = () => useContext(TourContext);

// ─── Provider ─────────────────────────────────────────────────

export function TourProvider({
  flows,
  children,
  getRoutePath = () => window.location.pathname,
  onNavigate,
  storagePrefix = "tour",
}: TourProviderProps) {
  const engine = useTourEngine({
    flows,
    getRoutePath,
    onNavigate,
    storagePrefix,
  });
  const {
    currentStep,
    isStepVisible,
    nextStep,
    dismiss,
    goToStep,
    startTour,
    activeFlow,
  } = engine;

  const contextValue: TourContextValue = {
    startTour,
    dismiss,
    isActive: !!activeFlow,
    activeTourId: activeFlow?.id ?? null,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {currentStep &&
        isStepVisible &&
        createPortal(
          <StepRenderer
            step={currentStep}
            onNext={nextStep}
            onDismiss={dismiss}
            onGoToStep={goToStep}
          />,
          document.body,
        )}
    </TourContext.Provider>
  );
}

// ─── Step Renderer ────────────────────────────────────────────

function StepRenderer({
  step,
  onNext,
  onDismiss,
  onGoToStep,
}: {
  step: TourStep;
  onNext: () => void;
  onDismiss: () => void;
  onGoToStep: (id: string) => void;
}) {
  switch (step.type) {
    case "spotlight":
      return (
        <TourSpotlight
          target={step.target}
          title={step.title}
          description={step.description}
          position={step.position}
          onNext={onNext}
          onDismiss={onDismiss}
          hasWaitFor={!!step.waitFor}
        />
      );
    case "tooltip":
      return (
        <TourSpotlight
          target={step.target}
          title={step.title}
          description={step.description}
          position={step.position}
          onNext={onNext}
          onDismiss={onDismiss}
          hasWaitFor={!!step.waitFor}
        />
      );
    case "modal":
      return (
        <TourModal
          title={step.title}
          description={step.description}
          actions={step.actions}
          onNext={onNext}
          onDismiss={onDismiss}
          onGoToStep={onGoToStep}
        />
      );
    case "action":
      // Action steps are invisible — they just trigger navigation
      return null;
    default:
      return null;
  }
}
