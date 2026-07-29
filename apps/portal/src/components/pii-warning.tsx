import { Trans } from "@lingui/react/macro";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PIIWarningProps {
  patterns: string[];
  onAcknowledge: () => void;
  onCancel: () => void;
}

export const PIIWarning = ({
  patterns,
  onAcknowledge,
  onCancel,
}: PIIWarningProps) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          <Trans>Potential PII detected in config value</Trans>
        </p>
        <div className="flex flex-wrap gap-1">
          {patterns.map((p) => (
            <Badge
              key={p}
              variant="outline"
              className="border-amber-300 text-[10px]"
            >
              {p}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <Trans>
            Storing personal data in config values may violate GDPR. Acknowledge
            to proceed.
          </Trans>
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs"
            onClick={onAcknowledge}
          >
            <Trans>I understand, save anyway</Trans>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-xs"
            onClick={onCancel}
          >
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </div>
    </div>
  </div>
);
