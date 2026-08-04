import { Trans } from "@lingui/react/macro";
import { Link2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSegmentUsage } from "@/hooks/use-segment-usage";

interface UsageIndicatorProps {
  segmentId: string;
  projectId: string;
  environmentId: string;
}

export const UsageIndicator = ({
  segmentId,
  projectId,
  environmentId,
}: UsageIndicatorProps) => {
  const { data, isLoading } = useSegmentUsage(
    projectId,
    environmentId,
    segmentId,
  );
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        —
      </Badge>
    );
  }

  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <div className="inline-flex flex-col">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-[10px] cursor-pointer gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <Link2 className="h-2.5 w-2.5" />
            {count} <Trans>config{count > 1 ? "s" : ""}</Trans>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            <Trans>Click to see which configs use this segment</Trans>
          </p>
        </TooltipContent>
      </Tooltip>

      {expanded && data && (
        <div className="mt-1 pl-1 space-y-0.5">
          {data.configKeys.map((key) => (
            <p
              key={key}
              className="text-[10px] font-mono text-muted-foreground"
            >
              {key}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
