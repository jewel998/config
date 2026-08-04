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

import { DatePickerSchedule } from "@/components/date-picker-schedule";
import { JsonHighlight } from "@/components/json-highlight";
import { OverrideManager } from "@/components/override-manager";
import { PrerequisiteUI } from "@/components/prerequisite-ui";
import { RolloutSection } from "@/components/rollout-section";
import { RuleBuilder } from "@/components/rule-builder";
import { SectionHelpText } from "@/components/section-help-text";
import { TemplateBar } from "@/components/template-bar";
import { Badge } from "@/components/ui/badge";
import { getFullValue } from "@/components/value-preview";
import type { ConfigEntry } from "@/hooks/use-configs";
import { useSetTargetingRules } from "@/hooks/use-targeting-rules";
import { useSetOverrides } from "@/hooks/use-overrides";
import { useSetSchedule } from "@/hooks/use-schedule";
import { useSetPrerequisites } from "@/hooks/use-prerequisites";
import { useSegments } from "@/hooks/use-segments";
import { useConfigs } from "@/hooks/use-configs";
import { useSetRollout } from "@/hooks/use-set-rollout";
import { CONFIG_TEMPLATES } from "@/lib/config-templates";
import type { SectionId, TargetingRule, TemplateType } from "@/lib/types";

interface ConfigDetailPanelProps {
  config: ConfigEntry;
  projectId: string;
  environmentId: string;
  canEdit: boolean;
}

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
  const setRollout = useSetRollout();
  const { data: segments = [] } = useSegments(projectId);
  const { data: allConfigs = [] } = useConfigs(projectId, environmentId);

  // Cast config to extended type for advanced fields
  const extConfig = config as unknown as Record<string, unknown>;
  const targetingRules = (extConfig.targetingRules as TargetingRule[]) ?? [];
  const rolloutPercentage = (extConfig.rolloutPercentage as number) ?? 0;
  const rolloutValue = extConfig.rolloutValue;
  const overrides = (extConfig.overrides as Record<string, unknown>) ?? {};
  const schedule = extConfig.schedule as
    { targetValue: unknown; activateAt: string } | null | undefined;
  const prerequisites =
    (extConfig.prerequisites as Array<{
      flagKey: string;
      requiredValue: unknown;
    }>) ?? [];

  const toggle = (id: SectionId) =>
    setOpenSection(openSection === id ? null : id);

  const handleApplyTemplate = (templateType: TemplateType) => {
    const template = CONFIG_TEMPLATES.find((t) => t.id === templateType);
    if (!template) return;

    const result = template.apply(config);

    if (result.targetingRules) {
      setTargetingRules.mutate(
        {
          projectId,
          environmentId,
          key: config.key,
          rules: result.targetingRules,
          oldRules: targetingRules,
        },
        {
          onSuccess: () => toast.success(t`Template applied`),
          onError: () => toast.error(t`Failed to apply template`),
        },
      );
    }
    if (result.rolloutPercentage != null) {
      setRollout.mutate(
        {
          projectId,
          environmentId,
          key: config.key,
          rolloutPercentage: result.rolloutPercentage,
          rolloutValue: result.rolloutValue ?? config.value,
          oldRolloutPercentage: rolloutPercentage,
          oldRolloutValue: rolloutValue,
        },
        {
          onSuccess: () => toast.success(t`Template applied`),
          onError: () => toast.error(t`Failed to apply template`),
        },
      );
    }
    if (result.overrides) {
      setOverrides.mutate(
        {
          projectId,
          environmentId,
          key: config.key,
          overrides: result.overrides,
          oldOverrides: overrides,
        },
        {
          onSuccess: () => toast.success(t`Template applied`),
          onError: () => toast.error(t`Failed to apply template`),
        },
      );
    }
    if (result.schedule) {
      setSchedule.mutate(
        {
          projectId,
          environmentId,
          key: config.key,
          schedule: result.schedule,
          oldSchedule: schedule,
        },
        {
          onSuccess: () => toast.success(t`Template applied`),
          onError: () => toast.error(t`Failed to apply template`),
        },
      );
    }
  };

  const SectionHeader = ({
    id,
    icon: Icon,
    label,
    badge,
  }: {
    id: SectionId;
    icon: typeof Target;
    label: string;
    badge?: string;
  }) => (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
      onClick={() => toggle(id)}
    >
      {openSection === id ? (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{label}</span>
      {badge && (
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {badge}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="space-y-2">
      {/* Template Bar */}
      <TemplateBar
        config={config}
        canEdit={canEdit}
        targetingRules={targetingRules}
        rolloutPercentage={rolloutPercentage}
        overrides={overrides}
        schedule={schedule}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Value Section */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader id="value" icon={Target} label={t`Value`} />
        {openSection === "value" && (
          <>
            <SectionHelpText sectionId="value" />
            <div className="px-3 pb-3">
              {config.valueType === "json" || config.valueType === "array" ? (
                <JsonHighlight value={getFullValue(config)} />
              ) : (
                <pre className="max-h-32 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
                  {getFullValue(config)}
                </pre>
              )}
            </div>
          </>
        )}
      </div>

      {/* Targeting Rules */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader
          id="targeting"
          icon={Target}
          label={t`Targeting Rules`}
          badge={
            targetingRules.length > 0 ? `${targetingRules.length}` : undefined
          }
        />
        {openSection === "targeting" && (
          <>
            <SectionHelpText sectionId="targeting" />
            <div className="px-3 pb-3">
              <RuleBuilder
                rules={targetingRules}
                onSave={(rules) => {
                  setTargetingRules.mutate(
                    {
                      projectId,
                      environmentId,
                      key: config.key,
                      rules,
                      oldRules: targetingRules,
                    },
                    {
                      onSuccess: () => toast.success(t`Targeting rules saved`),
                      onError: () => toast.error(t`Failed to save rules`),
                    },
                  );
                }}
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>

      {/* Percentage Rollout */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader
          id="rollout"
          icon={Percent}
          label={t`Rollout`}
          badge={rolloutPercentage > 0 ? `${rolloutPercentage}%` : undefined}
        />
        {openSection === "rollout" && (
          <>
            <SectionHelpText sectionId="rollout" />
            <div className="px-3 pb-3">
              <RolloutSection
                rolloutPercentage={rolloutPercentage}
                rolloutValue={rolloutValue}
                configValue={config.value}
                projectId={projectId}
                environmentId={environmentId}
                configKey={config.key}
                canEdit={canEdit}
              />
            </div>
          </>
        )}
      </div>

      {/* Per-User Overrides */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader
          id="overrides"
          icon={UserCheck}
          label={t`Overrides`}
          badge={
            Object.keys(overrides).length > 0
              ? `${Object.keys(overrides).length}`
              : undefined
          }
        />
        {openSection === "overrides" && (
          <>
            <SectionHelpText sectionId="overrides" />
            <div className="px-3 pb-3">
              <OverrideManager
                overrides={overrides}
                valueType={config.valueType}
                onSave={(newOverrides) => {
                  setOverrides.mutate(
                    {
                      projectId,
                      environmentId,
                      key: config.key,
                      overrides: newOverrides,
                      oldOverrides: overrides,
                    },
                    {
                      onSuccess: () => toast.success(t`Overrides saved`),
                      onError: () => toast.error(t`Failed to save overrides`),
                    },
                  );
                }}
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>

      {/* Schedule */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader
          id="schedule"
          icon={Timer}
          label={t`Schedule`}
          badge={schedule ? "1" : undefined}
        />
        {openSection === "schedule" && (
          <>
            <SectionHelpText sectionId="schedule" />
            <div className="px-3 pb-3">
              <DatePickerSchedule
                schedule={schedule}
                onSave={(newSchedule) => {
                  setSchedule.mutate(
                    {
                      projectId,
                      environmentId,
                      key: config.key,
                      schedule: newSchedule,
                      oldSchedule: schedule,
                    },
                    {
                      onSuccess: () => toast.success(t`Schedule updated`),
                      onError: () => toast.error(t`Failed to update schedule`),
                    },
                  );
                }}
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>

      {/* Prerequisites */}
      <div className="border-l-2 border-l-primary/10 rounded-r-lg">
        <SectionHeader
          id="prerequisites"
          icon={Link2}
          label={t`Prerequisites`}
          badge={
            prerequisites.length > 0 ? `${prerequisites.length}` : undefined
          }
        />
        {openSection === "prerequisites" && (
          <>
            <SectionHelpText sectionId="prerequisites" />
            <div className="px-3 pb-3">
              <PrerequisiteUI
                prerequisites={prerequisites}
                currentFlagKey={config.key}
                allFlagKeys={allConfigs
                  .map((c) => c.key)
                  .filter((k) => k !== config.key)}
                onSave={(newPrerequisites) => {
                  setPrerequisites.mutate(
                    {
                      projectId,
                      environmentId,
                      key: config.key,
                      prerequisites: newPrerequisites,
                      oldPrerequisites: prerequisites,
                    },
                    {
                      onSuccess: () => toast.success(t`Prerequisites saved`),
                      onError: () =>
                        toast.error(t`Failed to save prerequisites`),
                    },
                  );
                }}
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
