import { useTour } from "./context.js";

interface TourHelpButtonProps {
  /** Flow ID to trigger when clicked */
  flowId: string;
  /** Optional custom label */
  label?: string;
  /** Optional CSS class */
  className?: string;
}

/**
 * In-place help button that triggers a specific tour flow.
 * Place this next to any section/feature to give users on-demand guidance.
 *
 * Usage:
 *   <TourHelpButton flowId="tour-segments" />
 *   <TourHelpButton flowId="tour-api-keys" label="How do API keys work?" />
 */
export function TourHelpButton({ flowId, label, className }: TourHelpButtonProps) {
  const { startFlow, reset } = useTour();

  const handleClick = () => {
    // Reset the flow first (in case it was previously completed)
    reset(flowId);
    // Small delay to let state update before starting
    setTimeout(() => startFlow(flowId), 50);
  };

  return (
    <button
      type="button"
      className={className ?? "tour-help-btn"}
      onClick={handleClick}
      aria-label={label ?? "Start guided tour"}
    >
      {label ?? "?"}
    </button>
  );
}
