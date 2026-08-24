import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ChevronDown, ChevronRight, Percent, Target, Timer, UserCheck, Link2 } from "lucide-react";
import { useState } from "react";
import React from "react";
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
import { Button } from "@/components/ui/button";
import { getFullValue } from "@/components/value-preview";
import { useConfigs } from "@/hooks/use-configs";
import { useSetOverrides } from "@/hooks/use-overrides";
import { useSetPrerequisites } from "@/hooks/use-prerequisites";
import { useSetSchedule } from "@/hooks/use-schedule";
import { useSegments } from "@/hooks/use-segments";
import { useSetRollout } from "@/hooks/use-set-rollout";
import { useSetTargetingRules } from "@/hooks/use-targeting-rules";
import { CONFIG_TEMPLATES } from "@/lib/config-templates";
import type { ConfigFlagExtended, SectionId, TargetingRule, TemplateType } from "@/lib/types";

const EMPTY_RULES: TargetingRule[] = [];
const EMPTY_OVERRIDES: Record<string, unknown> = {};
const EMPTY_PREREQUISITES: Array<{
  flagKey: string;
  operator: import("@/lib/types").PrerequisiteOperator;
  requiredValue: unknown;
}> = [];

interface SectionHeaderProps {
  id: SectionId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
}

const SectionHeader = ({ id, icon: Icon, label, badge, isOpen, onToggle }: SectionHeaderProps) => (
  <button
    type="button"
    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
    onClick={() => onToggle(id)}
  >
    {isOpen ? (
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

interface ConfigDetailPanelProps {
  config: ConfigFlagExtended;
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
  const [localRules, setLocalRules] = useState<TargetingRule[] | null>(null);
  const rulesDirty = localRules !== null;

  const setTargetingRules = useSetTargetingRules();
  const setOverrides = useSetOverrides();
  const setSchedule = useSetSchedule();
  const setPrerequisites = useSetPrerequisites();
  const setRollout = useSetRollout();
  const { data: segments = [] } = useSegments(projectId);
  const { data: allConfigs = [] } = useConfigs(projectId, environmentId);

  const targetingRules = config.targetingRules ?? EMPTY_RULES;
  const rolloutPercentage = config.rolloutPercentage ?? 0;
  const rolloutValue = config.rolloutValue;
  const overrides = config.overrides ?? EMPTY_OVERRIDES;
  const schedule = config.schedule ?? null;
  const prerequisites = (config.prerequisites ?? EMPTY_PREREQUISITES).map((p) => ({
    ...p,
    operator: p.operator ?? ("equals" as const),
  }));

  const toggle = (id: SectionId) => setOpenSection(openSection === id ? null : id);

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
        <SectionHeader
          id="value"
          icon={Target}
          label={t`Value`}
          isOpen={openSection === "value"}
          onToggle={toggle}
        />
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
          badge={targetingRules.length > 0 ? `${targetingRules.length}` : undefined}
          isOpen={openSection === "targeting"}
          onToggle={toggle}
        />
        {openSection === "targeting" && (
          <>
            <SectionHelpText sectionId="targeting" />
            <div className="px-3 pb-3 space-y-3">
              <RuleBuilder
                rules={localRules ?? targetingRules}
                onSave={(rules) => setLocalRules(rules)}
                disabled={!canEdit}
                segments={segments}
                valueType={config.valueType}
              />
              {rulesDirty && canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setTargetingRules.mutate(
                        {
                          projectId,
                          environmentId,
                          key: config.key,
                          rules: localRules!,
                          oldRules: targetingRules,
                        },
                        {
                          onSuccess: () => {
                            toast.success(t`Targeting rules saved`);
                            setLocalRules(null);
                          },
                          onError: () => toast.error(t`Failed to save rules`),
                        },
                      );
                    }}
                    disabled={setTargetingRules.isPending}
                  >
                    <Trans>Save rules</Trans>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setLocalRules(null)}
                  >
                    <Trans>Discard</Trans>
                  </Button>
                </div>
              )}
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
          isOpen={openSection === "rollout"}
          onToggle={toggle}
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
          badge={Object.keys(overrides).length > 0 ? `${Object.keys(overrides).length}` : undefined}
          isOpen={openSection === "overrides"}
          onToggle={toggle}
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
          isOpen={openSection === "schedule"}
          onToggle={toggle}
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
          badge={prerequisites.length > 0 ? `${prerequisites.length}` : undefined}
          isOpen={openSection === "prerequisites"}
          onToggle={toggle}
        />
        {openSection === "prerequisites" && (
          <>
            <SectionHelpText sectionId="prerequisites" />
            <div className="px-3 pb-3">
              <PrerequisiteUI
                prerequisites={prerequisites}
                currentFlagKey={config.key}
                allConfigs={allConfigs.filter((c) => c.key !== config.key)}
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
                      onError: () => toast.error(t`Failed to save prerequisites`),
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
