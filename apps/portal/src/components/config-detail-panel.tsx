import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  ChevronDown,
  ChevronRight,
  Percent,
  Target,
  Timer,
  UserCheck,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { JsonHighlight } from "@/components/json-highlight";
import { OverrideManager } from "@/components/override-manager";
import { PrerequisiteUI } from "@/components/prerequisite-ui";
import { RuleBuilder } from "@/components/rule-builder";
import { ScheduleUI } from "@/components/schedule-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFullValue } from "@/components/value-preview";
import type { ConfigEntry } from "@/hooks/use-configs";
import { useSetTargetingRules } from "@/hooks/use-targeting-rules";
import { useSetOverrides } from "@/hooks/use-overrides";
import { useSetSchedule } from "@/hooks/use-schedule";
import { useSetPrerequisites } from "@/hooks/use-prerequisites";
import { useSegments } from "@/hooks/use-segments";
import { useConfigs } from "@/hooks/use-configs";
import { useProjectStore } from "@/stores/project-store";
import type { TargetingRule } from "@/lib/types";

interface ConfigDetailPanelProps {
  config: ConfigEntry;
  projectId: string;
  environmentId: string;
  canEdit: boolean;
}

type SectionId = "value" | "targeting" | "rollout" | "overrides" | "schedule" | "prerequisites";

export const ConfigDetailPanel = ({
  config,
  projectId,
  environmentId,
  canEdit,
}: ConfigDetailPanelProps) => {
  const [openSection, setOpenSection] = useState<SectionId | null>("value");

  const setTargetingRules = useSetTargetingRules();
  const setOverrides = useSetOverrides();
  const setSchedule = useSetSchedule();
  const setPrerequisites = useSetPrerequisites();
  const { data: segments = [] } = useSegments(projectId);
  const { data: allConfigs = [] } = useConfigs(projectId, environmentId);

  // Cast config to extended type for advanced fields
  const extConfig = config as unknown as Record<string, unknown>;
  const targetingRules = (extConfig.targetingRules as TargetingRule[]) ?? [];
  const rolloutPercentage = (extConfig.rolloutPercentage as number) ?? undefined;
  const rolloutValue = extConfig.rolloutValue;
  const overrides = (extConfig.overrides as Record<string, unknown>) ?? {};
  const schedule = extConfig.schedule as { targetValue: unknown; activateAt: string } | null | undefined;
  const prerequisites = (extConfig.prerequisites as Array<{ flagKey: string; requiredValue: unknown }>) ?? [];

  const toggle = (id: SectionId) => setOpenSection(openSection === id ? null : id);

  const SectionHeader = ({ id, icon: Icon, label, badge }: { id: SectionId; icon: typeof Target; label: string; badge?: string }) => (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
      onClick={() => toggle(id)}
    >
      {openSection === id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{label}</span>
      {badge && <Badge variant="secondary" className="ml-auto text-[10px]">{badge}</Badge>}
    </button>
  );

  return (
    <div className="space-y-1">
      {/* Value Section */}
      <SectionHeader id="value" icon={Target} label={t`Value`} />
      {openSection === "value" && (
        <div className="px-3 pb-3">
          {config.valueType === "json" || config.valueType === "array" ? (
            <JsonHighlight value={getFullValue(config)} />
          ) : (
            <pre className="max-h-32 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
              {getFullValue(config)}
            </pre>
          )}
        </div>
      )}

      {/* Targeting Rules */}
      <SectionHeader id="targeting" icon={Target} label={t`Targeting Rules`} badge={targetingRules.length > 0 ? `${targetingRules.length}` : undefined} />
      {openSection === "targeting" && (
        <div className="px-3 pb-3">
          <RuleBuilder
            rules={targetingRules}
            onSave={(rules) => {
              setTargetingRules.mutate(
                { projectId, environmentId, key: config.key, rules, oldRules: targetingRules },
                { onSuccess: () => toast.success(t`Targeting rules saved`), onError: () => toast.error(t`Failed to save rules`) },
              );
            }}
            disabled={!canEdit}
          />
        </div>
      )}

      {/* Percentage Rollout */}
      <SectionHeader id="rollout" icon={Percent} label={t`Rollout`} badge={rolloutPercentage != null ? `${rolloutPercentage}%` : undefined} />
      {openSection === "rollout" && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            <Trans>Gradually roll out this config value to a percentage of users.</Trans>
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="range"
              min={0}
              max={100}
              value={rolloutPercentage ?? 0}
              onChange={(e) => {
                if (!canEdit) return;
                const pct = Number(e.target.value);
                // Will be saved on blur or via a save button
              }}
              className="flex-1 h-2"
              disabled={!canEdit}
            />
            <span className="text-sm font-mono w-12 text-right">{rolloutPercentage ?? 0}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            <Trans>Rollout percentages are managed via the SDK evaluation pipeline. Edit the config document directly to set rolloutPercentage and rolloutValue fields.</Trans>
          </p>
        </div>
      )}

      {/* Per-User Overrides */}
      <SectionHeader id="overrides" icon={UserCheck} label={t`Overrides`} badge={Object.keys(overrides).length > 0 ? `${Object.keys(overrides).length}` : undefined} />
      {openSection === "overrides" && (
        <div className="px-3 pb-3">
          <OverrideManager
            overrides={overrides}
            valueType={config.valueType}
            onSave={(newOverrides) => {
              setOverrides.mutate(
                { projectId, environmentId, key: config.key, overrides: newOverrides, oldOverrides: overrides },
                { onSuccess: () => toast.success(t`Overrides saved`), onError: () => toast.error(t`Failed to save overrides`) },
              );
            }}
            disabled={!canEdit}
          />
        </div>
      )}

      {/* Schedule */}
      <SectionHeader id="schedule" icon={Timer} label={t`Schedule`} badge={schedule ? "1" : undefined} />
      {openSection === "schedule" && (
        <div className="px-3 pb-3">
          <ScheduleUI
            schedule={schedule}
            onSave={(newSchedule) => {
              setSchedule.mutate(
                { projectId, environmentId, key: config.key, schedule: newSchedule, oldSchedule: schedule },
                { onSuccess: () => toast.success(t`Schedule updated`), onError: () => toast.error(t`Failed to update schedule`) },
              );
            }}
            disabled={!canEdit}
          />
        </div>
      )}

      {/* Prerequisites */}
      <SectionHeader id="prerequisites" icon={Link2} label={t`Prerequisites`} badge={prerequisites.length > 0 ? `${prerequisites.length}` : undefined} />
      {openSection === "prerequisites" && (
        <div className="px-3 pb-3">
          <PrerequisiteUI
            prerequisites={prerequisites}
            currentFlagKey={config.key}
            allFlagKeys={allConfigs.map((c) => c.key).filter((k) => k !== config.key)}
            onSave={(newPrerequisites) => {
              setPrerequisites.mutate(
                { projectId, environmentId, key: config.key, prerequisites: newPrerequisites, oldPrerequisites: prerequisites },
                { onSuccess: () => toast.success(t`Prerequisites saved`), onError: () => toast.error(t`Failed to save prerequisites`) },
              );
            }}
            disabled={!canEdit}
          />
        </div>
      )}
    </div>
  );
};
