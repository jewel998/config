import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./context.js";
import type {
  ModalStep,
  Position,
  SpotlightStep,
  TooltipStep,
} from "./types.js";

// ─── Main Renderer (portaled to body to escape stacking contexts) ──

export function TourRenderer() {
  const { currentStep, next, dismiss, goTo, state, totalSteps } = useTour();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!currentStep || !mounted) return null;

  const content = (() => {
    switch (currentStep.type) {
      case "modal":
        return (
          <TourModal
            step={currentStep}
            onNext={next}
            onDismiss={dismiss}
            onGoTo={goTo}
            stepIndex={state.currentStepIndex}
            totalSteps={totalSteps}
          />
        );
      case "spotlight":
        return (
          <TourSpotlight
            step={currentStep}
            onNext={next}
            onDismiss={dismiss}
            stepIndex={state.currentStepIndex}
            totalSteps={totalSteps}
          />
        );
      case "tooltip":
        return (
          <TourTooltip
            step={currentStep}
            onNext={next}
            onDismiss={dismiss}
            stepIndex={state.currentStepIndex}
            totalSteps={totalSteps}
          />
        );
      case "action":
        return null;
      default:
        return null;
    }
  })();

  return createPortal(content, document.body);
}

// ─── Modal Step ───────────────────────────────────────────────

function TourModal({
  step,
  onNext,
  onDismiss,
  onGoTo,
  stepIndex,
  totalSteps,
}: {
  step: ModalStep;
  onNext: () => void;
  onDismiss: () => void;
  onGoTo: (id: string) => void;
  stepIndex: number;
  totalSteps: number;
}) {
  return (
    <div className="tour-overlay" onClick={onDismiss}>
      <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
        {step.image && (
          <img src={step.image} alt="" className="tour-modal-image" />
        )}
        <h2 className="tour-modal-title">{step.title}</h2>
        {step.description && (
          <p className="tour-modal-description">{step.description}</p>
        )}
        <div className="tour-modal-footer">
          <span className="tour-progress">
            {stepIndex + 1} / {totalSteps}
          </span>
          <div className="tour-modal-actions">
            {step.actions ? (
              step.actions.map((action, i) => (
                <button
                  key={i}
                  className={`tour-btn ${i === (step.actions?.length ?? 1) - 1 ? "tour-btn-primary" : "tour-btn-ghost"}`}
                  onClick={() => {
                    if (action.dismiss) onDismiss();
                    else if (action.next) onGoTo(action.next);
                    else onNext();
                  }}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <>
                <button className="tour-btn tour-btn-ghost" onClick={onDismiss}>
                  Skip
                </button>
                <button className="tour-btn tour-btn-primary" onClick={onNext}>
                  Next
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spotlight Step (box-shadow cutout — works in dark/light) ──

function TourSpotlight({
  step,
  onNext,
  onDismiss,
  stepIndex,
  totalSteps,
}: {
  step: SpotlightStep;
  onNext: () => void;
  onDismiss: () => void;
  stepIndex: number;
  totalSteps: number;
}) {
  const rect = useElementRect(step.target);
  const hasWaitFor = !!step.waitFor;

  if (!rect) return null;

  const padding = 6;

  return (
    <>
      {/* Overlay — the target element is "cut out" via box-shadow */}
      <div
        className="tour-spotlight"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999998,
          pointerEvents: hasWaitFor ? "none" : "auto",
        }}
        onClick={hasWaitFor ? undefined : onDismiss}
      >
        <div
          style={{
            position: "absolute",
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Popover */}
      <div
        className="tour-popover"
        style={getPopoverPosition(rect, step.position ?? "bottom")}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="tour-popover-title">{step.title}</h3>
        {step.description && (
          <p className="tour-popover-description">{step.description}</p>
        )}
        <div className="tour-popover-footer">
          <span className="tour-progress">
            {stepIndex + 1} / {totalSteps}
          </span>
          {!hasWaitFor && (
            <div className="tour-popover-actions">
              <button className="tour-btn tour-btn-ghost" onClick={onDismiss}>
                Skip
              </button>
              <button className="tour-btn tour-btn-primary" onClick={onNext}>
                Next
              </button>
            </div>
          )}
          {hasWaitFor && (
            <button className="tour-btn tour-btn-ghost" onClick={onDismiss}>
              Skip
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tooltip Step ─────────────────────────────────────────────

function TourTooltip({
  step,
  onNext,
  onDismiss,
  stepIndex,
  totalSteps,
}: {
  step: TooltipStep;
  onNext: () => void;
  onDismiss: () => void;
  stepIndex: number;
  totalSteps: number;
}) {
  const rect = useElementRect(step.target);
  const hasWaitFor = !!step.waitFor;

  if (!rect) return null;

  return (
    <div
      className="tour-popover"
      style={getPopoverPosition(rect, step.position ?? "bottom")}
    >
      <h3 className="tour-popover-title">{step.title}</h3>
      {step.description && (
        <p className="tour-popover-description">{step.description}</p>
      )}
      <div className="tour-popover-footer">
        <span className="tour-progress">
          {stepIndex + 1} / {totalSteps}
        </span>
        {!hasWaitFor && (
          <div className="tour-popover-actions">
            <button className="tour-btn tour-btn-ghost" onClick={onDismiss}>
              Skip
            </button>
            <button className="tour-btn tour-btn-primary" onClick={onNext}>
              Next
            </button>
          </div>
        )}
        {hasWaitFor && (
          <button className="tour-btn tour-btn-ghost" onClick={onDismiss}>
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Element Rect Hook (viewport-relative, updates on scroll) ──

function useElementRect(selector: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    function measure() {
      const el = document.querySelector(selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      frameRef.current = requestAnimationFrame(measure);
    }

    measure();
    return () => cancelAnimationFrame(frameRef.current);
  }, [selector]);

  return rect;
}

// ─── Popover Positioning (viewport-clamped) ───────────────────

const POPOVER_WIDTH = 320;
const POPOVER_MARGIN = 12;

function getPopoverPosition(
  rect: DOMRect,
  position: Position,
): React.CSSProperties {
  const gap = 12;
  const base: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    maxWidth: POPOVER_WIDTH,
  };

  // Clamp horizontal center to keep popover within viewport
  const centerX = rect.left + rect.width / 2;
  const clampedLeft = Math.max(
    POPOVER_MARGIN,
    Math.min(
      centerX - POPOVER_WIDTH / 2,
      window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN,
    ),
  );

  switch (position) {
    case "top":
      return {
        ...base,
        bottom: `${window.innerHeight - rect.top + gap}px`,
        left: `${clampedLeft}px`,
      };
    case "bottom":
      return {
        ...base,
        top: `${rect.bottom + gap}px`,
        left: `${clampedLeft}px`,
      };
    case "left":
      return {
        ...base,
        top: `${Math.max(POPOVER_MARGIN, rect.top + rect.height / 2 - 40)}px`,
        right: `${window.innerWidth - rect.left + gap}px`,
      };
    case "right":
      return {
        ...base,
        top: `${Math.max(POPOVER_MARGIN, rect.top + rect.height / 2 - 40)}px`,
        left: `${rect.right + gap}px`,
      };
  }
}
