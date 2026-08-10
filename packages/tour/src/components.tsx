import { useEffect, useRef, useState } from "react";
import { useTour } from "./context.js";
import type {
  ModalStep,
  Position,
  SpotlightStep,
  TooltipStep,
} from "./types.js";

// ─── Main Renderer ────────────────────────────────────────────

export function TourRenderer() {
  const { currentStep, next, dismiss, goTo, currentFlow, state, totalSteps } =
    useTour();

  if (!currentStep || !currentFlow) return null;

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
      return null; // Action steps are invisible — they just trigger navigation
    default:
      return null;
  }
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
                  className={`tour-btn ${i === step.actions!.length - 1 ? "tour-btn-primary" : "tour-btn-ghost"}`}
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

// ─── Spotlight Step ───────────────────────────────────────────

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
  const pos = useElementPosition(step.target);
  const hasWaitFor = !!step.waitFor;

  if (!pos) return null;

  return (
    <>
      {/* Overlay with cutout */}
      <div className="tour-spotlight-overlay" onClick={onDismiss}>
        <div
          className="tour-spotlight-cutout"
          style={{
            top: pos.top - 4,
            left: pos.left - 4,
            width: pos.width + 8,
            height: pos.height + 8,
          }}
        />
      </div>
      {/* Tooltip */}
      <div
        className="tour-popover"
        style={getPopoverStyle(pos, step.position ?? "bottom")}
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
  const pos = useElementPosition(step.target);
  const hasWaitFor = !!step.waitFor;

  if (!pos) return null;

  return (
    <div
      className="tour-popover"
      style={getPopoverStyle(pos, step.position ?? "bottom")}
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
      </div>
    </div>
  );
}

// ─── Positioning Utilities ────────────────────────────────────

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useElementPosition(selector: string): ElementRect | null {
  const [rect, setRect] = useState<ElementRect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top + window.scrollY,
          left: r.left + window.scrollX,
          width: r.width,
          height: r.height,
        });
      } else {
        setRect(null);
      }
    };

    measure();

    // Re-measure on DOM changes (element might not exist yet)
    observerRef.current = new MutationObserver(measure);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Re-measure on scroll/resize
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [selector]);

  return rect;
}

function getPopoverStyle(
  targetRect: ElementRect,
  position: Position,
): React.CSSProperties {
  const gap = 12;
  switch (position) {
    case "top":
      return {
        position: "absolute",
        top: targetRect.top - gap,
        left: targetRect.left + targetRect.width / 2,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        position: "absolute",
        top: targetRect.top + targetRect.height + gap,
        left: targetRect.left + targetRect.width / 2,
        transform: "translateX(-50%)",
      };
    case "left":
      return {
        position: "absolute",
        top: targetRect.top + targetRect.height / 2,
        left: targetRect.left - gap,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        position: "absolute",
        top: targetRect.top + targetRect.height / 2,
        left: targetRect.left + targetRect.width + gap,
        transform: "translateY(-50%)",
      };
  }
}
