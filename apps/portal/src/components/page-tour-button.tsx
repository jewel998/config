import { t } from "@lingui/core/macro";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTour } from "@jewel998/tour";

interface PageTourButtonProps {
  flowId: string;
  label?: string;
}

/**
 * A help button for page headers that triggers a contextual tour.
 * Shows a "?" icon with tooltip. Resets and replays the tour on click.
 */
export const PageTourButton = ({ flowId, label }: PageTourButtonProps) => {
  const { startFlow, reset } = useTour();

  const handleClick = () => {
    reset(flowId);
    setTimeout(() => startFlow(flowId), 50);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          onClick={handleClick}
          aria-label={label ?? t`Feature guide`}
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label ?? t`Learn how this works`}</TooltipContent>
    </Tooltip>
  );
};
