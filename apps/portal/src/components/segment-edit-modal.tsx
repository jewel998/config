import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { ResponsiveModal } from "@/components/responsive-modal";
import { RuleBuilder } from "@/components/rule-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validateSegmentName } from "@/lib/config-utils";
import type { PredicateGroup, Segment, TargetingRule } from "@/lib/types";

interface SegmentEditModalProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; conditions: PredicateGroup[] }) => void;
  disabled?: boolean;
}

export const SegmentEditModal = ({
  segment,
  open,
  onOpenChange,
  onSave,
  disabled,
}: SegmentEditModalProps) => {
  const [name, setName] = useState(segment.name);
  const [description, setDescription] = useState(segment.description);
  const [conditions, setConditions] = useState<PredicateGroup[]>(segment.conditions);
  const [nameError, setNameError] = useState(false);

  // Convert conditions to TargetingRule format for the RuleBuilder
  const rulesFromConditions: TargetingRule[] =
    conditions.length > 0
      ? [
          {
            id: "segment-conditions",
            priority: 1,
            value: "",
            conditions,
          },
        ]
      : [];

  const handleRuleSave = (rules: TargetingRule[]) => {
    if (rules.length > 0) {
      setConditions(rules[0].conditions);
    } else {
      setConditions([]);
    }
  };

  const handleSave = () => {
    if (!validateSegmentName(name)) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onSave({ name: name.trim(), description: description.trim(), conditions });
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Edit Segment</Trans>}
      description={<Trans>Update the segment name, description, and conditions.</Trans>}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Name</Trans>
          </label>
          <Input
            placeholder={t`Segment name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            maxLength={100}
            autoFocus
            disabled={disabled}
          />
          {nameError && (
            <p className="text-xs text-destructive">
              <Trans>Segment name is required.</Trans>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Description</Trans>
          </label>
          <Textarea
            placeholder={t`What does this segment represent?`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="min-h-20 text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Conditions</Trans>
          </label>
          <RuleBuilder rules={rulesFromConditions} onSave={handleRuleSave} disabled={disabled} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            className="min-w-20 rounded-full"
            onClick={handleSave}
            disabled={disabled || !validateSegmentName(name)}
          >
            <Trans>Save</Trans>
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
