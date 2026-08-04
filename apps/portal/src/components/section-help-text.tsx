import { Trans } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SECTION_HELP } from "@/lib/config-templates";
import type { SectionId } from "@/lib/types";

interface SectionHelpTextProps {
  sectionId: SectionId;
}

export const SectionHelpText = ({ sectionId }: SectionHelpTextProps) => {
  const help = SECTION_HELP[sectionId];
  if (!help) return null;

  return (
    <div className="px-3 pb-1 space-y-0.5">
      <p className="text-xs text-muted-foreground">{help.description}</p>
      {help.tip && (
        <p className="text-xs text-muted-foreground/70">
          <span className="font-medium">Tip:</span> {help.tip}
        </p>
      )}
      {help.learnMoreUrl && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={help.learnMoreUrl}
              className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <Trans>Learn more</Trans>
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">
              <Trans>Open documentation for this section</Trans>
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
