import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Segment, SegmentTargetingRuleUI } from "@/lib/types";

interface SegmentTargetingRuleProps {
  rule: SegmentTargetingRuleUI;
  segments: Segment[];
  onChange: (updated: SegmentTargetingRuleUI) => void;
  onRemove: () => void;
  disabled?: boolean;
  index: number;
}

export const SegmentTargetingRule = ({
  rule,
  segments,
  onChange,
  onRemove,
  disabled,
  index,
}: SegmentTargetingRuleProps) => {
  const toggleSegment = (segId: string) => {
    const current = rule.segmentIds;
    const updated = current.includes(segId)
      ? current.filter((id) => id !== segId)
      : [...current, segId];
    onChange({ ...rule, segmentIds: updated });
  };

  const selectedSegments = segments.filter((s) =>
    rule.segmentIds.includes(s.id),
  );

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            <Trans>Segment Rule {index + 1}</Trans>
          </span>
          <Badge variant="outline" className="text-xs">
            <Trans>Segment-based</Trans>
          </Badge>
        </div>
        {!disabled && (
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Priority + Return value */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            <Trans>Priority</Trans>
          </label>
          <Input
            type="number"
            min={1}
            max={1000}
            className="w-full sm:w-24 h-9 text-sm"
            value={rule.priority}
            onChange={(e) =>
              onChange({ ...rule, priority: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            <Trans>Return value for matching segments</Trans>
          </label>
          <Input
            className="h-9 text-sm"
            value={String(rule.value)}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            disabled={disabled}
            placeholder={t`Value served when user is in selected segments`}
          />
        </div>
      </div>

      {/* Segment picker */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">
          <Trans>Target Segments</Trans>{" "}
          <span className="text-muted-foreground/60">
            (<Trans>user must be in ANY selected segment</Trans>)
          </span>
        </label>

        {/* Selected segments as badges */}
        {selectedSegments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSegments.map((seg) => (
              <Badge
                key={seg.id}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => !disabled && toggleSegment(seg.id)}
              >
                {seg.name}
                {!disabled && <span className="ml-1">×</span>}
              </Badge>
            ))}
          </div>
        )}

        {/* Available segments to add */}
        {!disabled && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {segments
              .filter((s) => !rule.segmentIds.includes(s.id))
              .map((seg) => (
                <Badge
                  key={seg.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors opacity-60 hover:opacity-100"
                  onClick={() => toggleSegment(seg.id)}
                >
                  + {seg.name}
                </Badge>
              ))}
            {segments.filter((s) => !rule.segmentIds.includes(s.id)).length ===
              0 &&
              segments.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  <Trans>All segments selected</Trans>
                </span>
              )}
            {segments.length === 0 && (
              <span className="text-xs text-muted-foreground">
                <Trans>
                  No segments available. Create segments first in the Segments
                  section.
                </Trans>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
