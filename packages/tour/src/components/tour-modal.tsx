import type { ModalAction } from "../types.js";

interface TourModalProps {
  title: string;
  description?: string;
  actions?: ModalAction[];
  onNext: () => void;
  onDismiss: () => void;
  onGoToStep: (stepId: string) => void;
}

export function TourModal({
  title,
  description,
  actions,
  onNext,
  onDismiss,
  onGoToStep,
}: TourModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: 420,
          width: "90%",
          background: "var(--color-popover, #fff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 16,
          padding: "24px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
        {description && (
          <p
            style={{
              fontSize: 14,
              color: "var(--color-muted-foreground, #6b7280)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
        <div
          style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}
        >
          {actions?.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (action.dismiss) onDismiss();
                else if (action.next) onGoToStep(action.next);
                else onNext();
              }}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                background:
                  i === 0 ? "var(--color-primary, #2563eb)" : "transparent",
                color:
                  i === 0 ? "#fff" : "var(--color-muted-foreground, #6b7280)",
                fontSize: 13,
                fontWeight: 500,
                border:
                  i === 0 ? "none" : "1px solid var(--color-border, #e5e7eb)",
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          )) ?? (
            <button
              type="button"
              onClick={onNext}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                background: "var(--color-primary, #2563eb)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </>
  );
}
