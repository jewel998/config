import { Trans } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LifecycleState } from "@/lib/types";

const STATE_COLORS: Record<LifecycleState, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  stale: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  draft: ["active"],
  active: ["stale"],
  stale: ["archived", "active"],
  archived: ["active"],
};

interface LifecycleStateBadgeProps {
  state: "draft" | "active" | "stale" | "archived";
  stateChangedAt?: string;
  onTransition: (newState: "draft" | "active" | "stale" | "archived") => void;
  disabled?: boolean;
}

export const LifecycleStateBadge = ({
  state,
  stateChangedAt,
  onTransition,
  disabled,
}: LifecycleStateBadgeProps) => {
  const transitions = VALID_TRANSITIONS[state];

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`rounded-full text-xs ${STATE_COLORS[state]}`}>{state}</Badge>
        </TooltipTrigger>
        {stateChangedAt && (
          <TooltipContent>
            <Trans>Changed</Trans> {new Date(stateChangedAt).toLocaleDateString()}
          </TooltipContent>
        )}
      </Tooltip>
      {stateChangedAt && (
        <span className="text-[10px] text-muted-foreground">
          {new Date(stateChangedAt).toLocaleDateString()}
        </span>
      )}
      {!disabled &&
        transitions.map((next) => (
          <Button
            key={next}
            variant="ghost"
            size="sm"
            className="h-6 gap-1 rounded-full px-2 text-[10px]"
            onClick={() => onTransition(next)}
          >
            <ArrowRight className="h-3 w-3" />
            {next}
          </Button>
        ))}
    </div>
  );
};
