import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CONFIG_TEMPLATES } from "@/lib/config-templates";
import { shouldConfirmOverwrite } from "@/lib/config-utils";
import type { ConfigEntry, TargetingRule, TemplateType } from "@/lib/types";

interface TemplateBarProps {
  config: ConfigEntry;
  canEdit: boolean;
  targetingRules: TargetingRule[];
  rolloutPercentage?: number;
  overrides: Record<string, unknown>;
  schedule?: { targetValue: unknown; activateAt: string } | null;
  onApplyTemplate: (template: TemplateType) => void;
}

export const TemplateBar = ({
  config,
  canEdit,
  targetingRules,
  rolloutPercentage,
  overrides,
  schedule,
  onApplyTemplate,
}: TemplateBarProps) => {
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateType | null>(
    null,
  );

  const handleClick = (templateId: TemplateType) => {
    const needsConfirm = shouldConfirmOverwrite(templateId, {
      targetingRules,
      rolloutPercentage,
      overrides,
      schedule,
    });

    if (needsConfirm) {
      setConfirmTemplate(templateId);
    } else {
      onApplyTemplate(templateId);
    }
  };

  const handleConfirm = () => {
    if (confirmTemplate) {
      onApplyTemplate(confirmTemplate);
      setConfirmTemplate(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground font-medium uppercase shrink-0">
          <Trans>Templates</Trans>
        </span>
        {CONFIG_TEMPLATES.map((tmpl) => (
          <Tooltip key={tmpl.id}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] rounded-full gap-1 shrink-0"
                disabled={!canEdit}
                onClick={() => handleClick(tmpl.id)}
              >
                <tmpl.icon className="h-3 w-3" />
                {tmpl.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tmpl.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Dialog
        open={confirmTemplate !== null}
        onOpenChange={(open) => !open && setConfirmTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Overwrite existing data?</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                This template will replace existing configuration in the target
                section. This action cannot be undone.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setConfirmTemplate(null)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button className="rounded-full" onClick={handleConfirm}>
              <Trans>Apply template</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
