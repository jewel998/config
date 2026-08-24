import { Trans } from "@lingui/react/macro";
import { ChevronRight, History } from "lucide-react";

import { DateDisplay } from "@/components/date-display";
import { Badge } from "@/components/ui/badge";
import {
  ACTION_COLORS,
  ACTION_ICONS,
  ACTION_LABELS,
  CATEGORY_META,
  formatResourceName,
  getEnvironmentFromPath,
  getResourceCategory,
} from "@/lib/audit-utils";
import type { AuditEntry } from "@/lib/types";

interface AuditEntryRowProps {
  entry: AuditEntry;
  actorName: string;
  envMap: Record<string, string>;
  onViewChanges?: () => void;
}

export const AuditEntryRow = ({ entry, actorName, envMap, onViewChanges }: AuditEntryRowProps) => {
  const category = getResourceCategory(entry.resourcePath);
  const catMeta = CATEGORY_META[category];
  const ActionIcon = ACTION_ICONS[entry.action] ?? History;
  const envId = getEnvironmentFromPath(entry.resourcePath);
  const hasChanges = !!(entry.oldValue || entry.newValue);

  return (
    <div className="flex gap-3 px-4 py-3 hover:bg-muted/20 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_64px]">
      <div
        className={`shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center ${ACTION_COLORS[entry.action] ?? ""}`}
      >
        <ActionIcon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-snug">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">
            {ACTION_LABELS[entry.action] ?? entry.action}
          </span>{" "}
          <span className="font-medium font-mono">{formatResourceName(entry.resourcePath)}</span>
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
            {catMeta.label}
          </Badge>
          {envId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full font-mono">
              {envMap[envId] || envId}
            </Badge>
          )}
          <DateDisplay date={entry.timestamp} className="text-[11px] text-muted-foreground" />
          {hasChanges && onViewChanges && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors ml-auto"
              onClick={onViewChanges}
            >
              <ChevronRight className="h-3 w-3" />
              <Trans>View changes</Trans>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
