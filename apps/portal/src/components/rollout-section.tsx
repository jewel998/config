import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetRollout } from "@/hooks/use-set-rollout";

interface RolloutSectionProps {
  rolloutPercentage: number;
  rolloutValue: unknown;
  configValue: unknown;
  projectId: string;
  environmentId: string;
  configKey: string;
  canEdit: boolean;
}

export const RolloutSection = ({
  rolloutPercentage,
  rolloutValue,
  configValue,
  projectId,
  environmentId,
  configKey,
  canEdit,
}: RolloutSectionProps) => {
  const [pendingPercentage, setPendingPercentage] = useState(rolloutPercentage);
  const [isDirty, setIsDirty] = useState(false);
  const setRollout = useSetRollout();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const pct = Number(e.target.value);
    setPendingPercentage(pct);
    setIsDirty(pct !== rolloutPercentage);
  };

  const handlePointerUp = () => {
    if (pendingPercentage !== rolloutPercentage) {
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    setRollout.mutate(
      {
        projectId,
        environmentId,
        key: configKey,
        rolloutPercentage: pendingPercentage,
        rolloutValue: rolloutValue ?? configValue,
        oldRolloutPercentage: rolloutPercentage,
        oldRolloutValue: rolloutValue,
      },
      {
        onSuccess: () => {
          toast.success(t`Rollout updated`);
          setIsDirty(false);
        },
        onError: () => {
          toast.error(t`Failed to update rollout`);
          setPendingPercentage(rolloutPercentage);
          setIsDirty(false);
        },
      },
    );
  };

  const isSaving = setRollout.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="range"
          min={0}
          max={100}
          value={pendingPercentage}
          onChange={handleChange}
          onPointerUp={handlePointerUp}
          onBlur={handlePointerUp}
          className="flex-1 h-2"
          disabled={!canEdit || isSaving}
        />
        <span className="text-sm font-mono w-12 text-right">
          {pendingPercentage}%
        </span>
      </div>

      {isDirty && canEdit && (
        <Button
          size="sm"
          className="rounded-full gap-1"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <Trans>Save</Trans>
        </Button>
      )}
    </div>
  );
};
