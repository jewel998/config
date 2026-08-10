import { useEffect, useState } from "react";
import type { Position } from "../types.js";

interface TourSpotlightProps {
  target: string;
  title: string;
  description?: string;
  position?: Position;
  onNext: () => void;
  onDismiss: () => void;
  hasWaitFor: boolean;
}

export function TourSpotlight({
  target,
  title,
  description,
  position = "bottom",
  onNext,
  onDismiss,
  hasWaitFor,
}: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(target);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Re-measure on scroll/resize
    const update = () => {
      const el = document.querySelector(target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [target]);

  if (!rect) return null;

  const padding = 8;
  const tooltipStyle = getTooltipPosition(rect, position);

  return (
    <>
      {/* Backdrop with cutout */}
      <div
        className="tour-backdrop"
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-mask)"
          />
        </svg>
      </div>

      {/* Tooltip card */}
      <div
        className="tour-tooltip"
        style={{
          position: "fixed",
          zIndex: 9999,
          ...tooltipStyle,
          maxWidth: 320,
          background: "var(--color-popover, #fff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 12,
          padding: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{title}</p>
        {description && (
          <p
            style={{
              fontSize: 13,
              color: "var(--color-muted-foreground, #6b7280)",
              marginTop: 4,
            }}
          >
            {description}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!hasWaitFor && (
            <button
              type="button"
              onClick={onNext}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: "var(--color-primary, #2563eb)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "transparent",
              color: "var(--color-muted-foreground, #6b7280)",
              fontSize: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            Skip tour
          </button>
        </div>
      </div>
    </>
  );
}

function getTooltipPosition(
  rect: DOMRect,
  position: Position,
): React.CSSProperties {
  const gap = 12;
  switch (position) {
    case "top":
      return { left: rect.left, bottom: window.innerHeight - rect.top + gap };
    case "bottom":
      return { left: rect.left, top: rect.bottom + gap };
    case "left":
      return { right: window.innerWidth - rect.left + gap, top: rect.top };
    case "right":
      return { left: rect.right + gap, top: rect.top };
    default:
      return { left: rect.left, top: rect.bottom + gap };
  }
}
