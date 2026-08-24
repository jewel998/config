import { Trans } from "@lingui/react/macro";
import { ArrowLeftRight, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { computeDiff, type DiffLine } from "@/lib/audit-utils";

// ─── Diff Line Row ────────────────────────────────────────────

const GUTTER_STYLES: Record<DiffLine["type"], string> = {
  added: "bg-green-50 dark:bg-green-950/30 text-green-600",
  removed: "bg-red-50 dark:bg-red-950/30 text-red-600",
  changed: "bg-amber-50 dark:bg-amber-950/30 text-amber-600",
  unchanged: "bg-muted/30 text-muted-foreground",
};

const ROW_STYLES: Record<DiffLine["type"], string> = {
  added: "bg-green-50/50 dark:bg-green-950/20",
  removed: "bg-red-50/50 dark:bg-red-950/20",
  changed: "bg-amber-50/50 dark:bg-amber-950/20",
  unchanged: "",
};

const GUTTER_SYMBOL: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "−",
  changed: "~",
  unchanged: " ",
};

const DiffLineRow = ({ line }: { line: DiffLine }) => (
  <div className="flex">
    <div
      className={`w-7 shrink-0 flex items-start justify-center pt-1.5 text-[10px] select-none ${GUTTER_STYLES[line.type]}`}
    >
      {GUTTER_SYMBOL[line.type]}
    </div>
    <div className={`flex-1 px-3 py-1.5 overflow-x-auto ${ROW_STYLES[line.type]}`}>
      <span className="text-muted-foreground mr-2">{line.key}:</span>
      {line.type === "changed" ? (
        <span>
          <span className="line-through text-red-600 dark:text-red-400">{line.oldValue}</span>
          <span className="mx-1.5">→</span>
          <span className="text-green-600 dark:text-green-400">{line.newValue}</span>
        </span>
      ) : line.type === "removed" ? (
        <span className="text-red-600 dark:text-red-400">{line.oldValue}</span>
      ) : line.type === "added" ? (
        <span className="text-green-600 dark:text-green-400">{line.newValue}</span>
      ) : (
        <span className="text-muted-foreground">{line.oldValue}</span>
      )}
    </div>
  </div>
);

// ─── Side-by-Side Panel ───────────────────────────────────────

const SidePanel = ({ lines, side }: { lines: DiffLine[]; side: "before" | "after" }) => {
  const isBefore = side === "before";
  const filtered = lines.filter((l) => (isBefore ? l.type !== "added" : l.type !== "removed"));
  const color = isBefore ? "red" : "green";

  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium text-${color}-600 dark:text-${color}-400`}
      >
        <span className={`h-2 w-2 rounded-full bg-${color}-500`} />
        {isBefore ? <Trans>Before</Trans> : <Trans>After</Trans>}
      </div>
      <div
        className={`rounded-lg border bg-${color}-50/30 dark:bg-${color}-950/10 overflow-auto max-h-[50vh]`}
      >
        <div className="font-mono text-xs divide-y divide-border/30">
          {filtered.map((line, i) => {
            const isHighlighted = isBefore
              ? line.type === "removed" || line.type === "changed"
              : line.type === "added" || line.type === "changed";
            return (
              <div
                key={i}
                className={`px-3 py-1 ${isHighlighted ? `bg-${color}-100/50 dark:bg-${color}-900/20` : ""}`}
              >
                <span className="text-muted-foreground">{line.key}: </span>
                <span
                  className={
                    isHighlighted
                      ? `text-${color}-700 dark:text-${color}-300`
                      : "text-muted-foreground"
                  }
                >
                  {(isBefore ? line.oldValue : line.newValue) ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Main Diff Viewer ─────────────────────────────────────────

interface AuditDiffViewerProps {
  oldValue?: string;
  newValue?: string;
}

export const AuditDiffViewer = ({ oldValue, newValue }: AuditDiffViewerProps) => {
  const [mode, setMode] = useState<"unified" | "side-by-side">("unified");
  const [showUnchanged, setShowUnchanged] = useState(false);

  const diffLines = useMemo(() => computeDiff(oldValue, newValue), [oldValue, newValue]);
  const visibleLines = useMemo(
    () => (showUnchanged ? diffLines : diffLines.filter((l) => l.type !== "unchanged")),
    [diffLines, showUnchanged],
  );
  const unchangedCount = useMemo(
    () => diffLines.filter((l) => l.type === "unchanged").length,
    [diffLines],
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={mode === "unified" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs rounded-full gap-1"
          onClick={() => setMode("unified")}
        >
          <Rows3 className="h-3 w-3" />
          <Trans>Unified</Trans>
        </Button>
        <Button
          variant={mode === "side-by-side" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs rounded-full gap-1"
          onClick={() => setMode("side-by-side")}
        >
          <ArrowLeftRight className="h-3 w-3" />
          <Trans>Side by side</Trans>
        </Button>
        {unchangedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs rounded-full ml-auto"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? (
              <Trans>Hide unchanged ({unchangedCount})</Trans>
            ) : (
              <Trans>Show unchanged ({unchangedCount})</Trans>
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {mode === "unified" ? (
        <div className="rounded-lg border overflow-hidden font-mono text-xs">
          {visibleLines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              <Trans>No changes to display</Trans>
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {visibleLines.map((line, i) => (
                <DiffLineRow key={i} line={line} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SidePanel lines={visibleLines} side="before" />
          <SidePanel lines={visibleLines} side="after" />
        </div>
      )}
    </div>
  );
};
