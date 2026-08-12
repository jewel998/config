import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { AlertTriangle, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConfigEntry, ConfigValueType } from "@/lib/types";

interface PrerequisiteUIProps {
  prerequisites: Array<{ flagKey: string; requiredValue: unknown }>;
  currentFlagKey: string;
  allConfigs: ConfigEntry[];
  onSave: (
    prerequisites: Array<{ flagKey: string; requiredValue: unknown }>,
  ) => void;
  disabled?: boolean;
}

export const PrerequisiteUI = ({
  prerequisites,
  currentFlagKey,
  allConfigs,
  onSave,
  disabled,
}: PrerequisiteUIProps) => {
  const [flagKey, setFlagKey] = useState("");
  const [requiredValue, setRequiredValue] = useState<unknown>("");

  const selectedConfig = allConfigs.find((c) => c.key === flagKey);
  const availableFlags = allConfigs.filter(
    (c) =>
      c.key !== currentFlagKey &&
      !prerequisites.some((p) => p.flagKey === c.key),
  );

  const handleAdd = () => {
    if (!flagKey.trim() || prerequisites.length >= 10) return;
    if (flagKey === currentFlagKey) return;
    onSave([...prerequisites, { flagKey: flagKey.trim(), requiredValue }]);
    setFlagKey("");
    setRequiredValue("");
  };

  const handleRemove = (index: number) => {
    onSave(prerequisites.filter((_, i) => i !== index));
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Prerequisites</Trans>
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {prerequisites.length}/10
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new prerequisite */}
        {!disabled && availableFlags.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Flag key select */}
            <Select
              value={flagKey}
              onValueChange={(v) => {
                setFlagKey(v);
                setRequiredValue("");
              }}
            >
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue placeholder={t`Select a flag...`} />
              </SelectTrigger>
              <SelectContent>
                {availableFlags.map((c) => (
                  <SelectItem key={c.key} value={c.key} className="text-sm">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs">{c.key}</code>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0"
                      >
                        {c.valueType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Required value — typed based on selected flag */}
            <div className="w-full sm:w-40">
              <TypedPrereqValue
                value={requiredValue}
                onChange={setRequiredValue}
                valueType={selectedConfig?.valueType}
                disabled={!flagKey}
              />
            </div>

            <Button
              size="sm"
              className="rounded-full h-9 px-3"
              onClick={handleAdd}
              disabled={!flagKey.trim() || prerequisites.length >= 10}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {flagKey === currentFlagKey && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <Trans>
              Cannot add self as prerequisite (circular dependency).
            </Trans>
          </div>
        )}

        {/* Existing prerequisites */}
        {prerequisites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Trans>No prerequisites configured.</Trans>
          </p>
        ) : (
          <div className="space-y-2">
            {prerequisites.map((prereq, i) => {
              const prereqConfig = allConfigs.find(
                (c) => c.key === prereq.flagKey,
              );
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {prereq.flagKey}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      <Trans>must be</Trans>
                    </span>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {JSON.stringify(prereq.requiredValue)}
                    </code>
                    {prereqConfig && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0"
                      >
                        {prereqConfig.valueType}
                      </Badge>
                    )}
                  </div>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!disabled &&
          availableFlags.length === 0 &&
          prerequisites.length < 10 &&
          allConfigs.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              <Trans>
                All available flags are already added as prerequisites.
              </Trans>
            </p>
          )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════
// Typed Prerequisite Value Input
// ═══════════════════════════════════════════════════════════════

const TypedPrereqValue = ({
  value,
  onChange,
  valueType,
  disabled,
}: {
  value: unknown;
  onChange: (val: unknown) => void;
  valueType?: ConfigValueType;
  disabled?: boolean;
}) => {
  if (disabled || !valueType) {
    return (
      <Input
        className="h-9 text-sm"
        placeholder={t`Select a flag first`}
        disabled
      />
    );
  }

  if (valueType === "boolean") {
    return (
      <div className="flex gap-1 rounded-full border p-0.5 h-9 items-center">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${String(value) === "true" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          onClick={() => onChange(true)}
        >
          true
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${String(value) === "false" ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          onClick={() => onChange(false)}
        >
          false
        </button>
      </div>
    );
  }

  if (valueType === "number") {
    return (
      <Input
        type="number"
        className="h-9 text-sm"
        value={String(value ?? "")}
        onChange={(e) => {
          const num = Number(e.target.value);
          onChange(Number.isNaN(num) ? e.target.value : num);
        }}
        placeholder={t`e.g., 100`}
      />
    );
  }

  return (
    <Input
      className="h-9 text-sm"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        valueType === "json"
          ? t`e.g., {"key":"val"}`
          : valueType === "array"
            ? t`e.g., ["a","b"]`
            : t`e.g., "value"`
      }
    />
  );
};
