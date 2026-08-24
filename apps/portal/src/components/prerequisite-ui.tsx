import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
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
import type { ConfigEntry, ConfigValueType, PrerequisiteOperator } from "@/lib/types";

const PREREQ_OPERATORS: {
  value: PrerequisiteOperator;
  label: string;
  description: string;
}[] = [
  { value: "equals", label: "equals", description: "exact match" },
  { value: "not_equals", label: "not equals", description: "does not match" },
  {
    value: "greater_than",
    label: "greater than",
    description: "numeric greater",
  },
  { value: "less_than", label: "less than", description: "numeric less" },
  { value: "contains", label: "contains", description: "substring match" },
];

/** Operators valid for each value type */
const OPERATORS_FOR_TYPE: Record<ConfigValueType, PrerequisiteOperator[]> = {
  boolean: ["equals", "not_equals"],
  number: ["equals", "not_equals", "greater_than", "less_than"],
  string: ["equals", "not_equals", "contains"],
  json: ["equals", "not_equals"],
  array: ["equals", "not_equals", "contains"],
};

interface PrerequisiteUIProps {
  prerequisites: Array<{
    flagKey: string;
    operator: PrerequisiteOperator;
    requiredValue: unknown;
  }>;
  currentFlagKey: string;
  allConfigs: ConfigEntry[];
  onSave: (
    prerequisites: Array<{
      flagKey: string;
      operator: PrerequisiteOperator;
      requiredValue: unknown;
    }>,
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
  const [operator, setOperator] = useState<PrerequisiteOperator>("equals");
  const [requiredValue, setRequiredValue] = useState<unknown>("");

  const selectedConfig = allConfigs.find((c) => c.key === flagKey);
  const availableFlags = allConfigs.filter(
    (c) => c.key !== currentFlagKey && !prerequisites.some((p) => p.flagKey === c.key),
  );

  const validOperators = selectedConfig
    ? (OPERATORS_FOR_TYPE[selectedConfig.valueType] ?? PREREQ_OPERATORS.map((o) => o.value))
    : PREREQ_OPERATORS.map((o) => o.value);

  const handleAdd = () => {
    if (!flagKey.trim() || prerequisites.length >= 10) return;
    if (flagKey === currentFlagKey) return;
    onSave([...prerequisites, { flagKey: flagKey.trim(), operator, requiredValue }]);
    setFlagKey("");
    setOperator("equals");
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
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            {/* Row 1: Flag select + Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <Select
                value={flagKey}
                onValueChange={(v) => {
                  setFlagKey(v);
                  setOperator("equals");
                  setRequiredValue("");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t`Select a flag...`} />
                </SelectTrigger>
                <SelectContent>
                  {availableFlags.map((c) => (
                    <SelectItem key={c.key} value={c.key} className="text-sm">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs">{c.key}</code>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {c.valueType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={operator}
                onValueChange={(v) => setOperator(v as PrerequisiteOperator)}
                disabled={!flagKey}
              >
                <SelectTrigger className="h-9 text-sm w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREREQ_OPERATORS.filter((op) => validOperators.includes(op.value)).map((op) => (
                    <SelectItem key={op.value} value={op.value} className="text-sm">
                      <span className="font-medium">{op.label}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        — {op.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Value + Add button */}
            <div className="flex gap-2">
              <div className="flex-1">
                <TypedPrereqValue
                  value={requiredValue}
                  onChange={setRequiredValue}
                  valueType={selectedConfig?.valueType}
                  disabled={!flagKey}
                />
              </div>
              <Button
                size="sm"
                className="rounded-full h-9 px-4"
                onClick={handleAdd}
                disabled={!flagKey.trim() || prerequisites.length >= 10}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <Trans>Add</Trans>
              </Button>
            </div>
          </div>
        )}

        {flagKey === currentFlagKey && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <Trans>Cannot add self as prerequisite (circular dependency).</Trans>
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
              const prereqConfig = allConfigs.find((c) => c.key === prereq.flagKey);
              const opLabel =
                PREREQ_OPERATORS.find((o) => o.value === prereq.operator)?.label ?? prereq.operator;
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {prereq.flagKey}
                    </code>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {opLabel}
                    </Badge>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {JSON.stringify(prereq.requiredValue)}
                    </code>
                    {prereqConfig && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {prereqConfig.valueType}
                      </Badge>
                    )}
                  </div>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 ml-2"
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
              <Trans>All available flags are already added as prerequisites.</Trans>
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
    return <Input className="h-9 text-sm" placeholder={t`Select a flag first`} disabled />;
  }

  if (valueType === "boolean") {
    return (
      <div className="flex gap-1 rounded-full border p-0.5 h-9 items-center w-fit">
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${String(value) === "true" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          onClick={() => onChange(true)}
        >
          true
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${String(value) === "false" ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
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
        placeholder={t`e.g., 100, 0.5`}
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
          ? t`e.g., {"key": "value"}`
          : valueType === "array"
            ? t`e.g., ["item1", "item2"]`
            : t`e.g., premium, dark-mode`
      }
    />
  );
};
