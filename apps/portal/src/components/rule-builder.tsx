import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Filter, Plus, Trash2, Users } from "lucide-react";

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
import {
  COMMON_ATTRIBUTES,
  OPERATOR_DESCRIPTIONS,
  OPERATOR_VALUE_PLACEHOLDERS,
} from "@/lib/config-templates";
import type {
  ConfigValueType,
  PredicateOperator,
  Segment,
  SegmentTargetingRuleUI,
  TargetingRule,
  Predicate,
} from "@/lib/types";
import { isSegmentRule, fromStorageRule, toStorageRule } from "@/lib/types";

// Condition-based rules only show these operators (no in_segment/not_in_segment —
// segment targeting is handled by the dedicated segment rule UI)
const CONDITION_OPERATORS: PredicateOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "in_list",
  "not_in_list",
  "greater_than",
  "less_than",
  "regex_match",
];

interface RuleBuilderProps {
  rules: TargetingRule[];
  onSave: (rules: TargetingRule[]) => void;
  disabled?: boolean;
  segments?: Segment[];
  valueType?: ConfigValueType;
}

export const RuleBuilder = ({
  rules,
  onSave,
  disabled,
  segments = [],
  valueType,
}: RuleBuilderProps) => {
  // ═══════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════

  const addSegmentRule = () => {
    if (rules.length >= 100) return;
    const newRule: TargetingRule = toStorageRule({
      id: crypto.randomUUID(),
      priority: rules.length + 1,
      value: "",
      segmentIds: [],
    });
    onSave([...rules, newRule]);
  };

  const addConditionRule = () => {
    if (rules.length >= 100) return;
    const newRule: TargetingRule = {
      id: crypto.randomUUID(),
      priority: rules.length + 1,
      value: "",
      conditions: [{ predicates: [{ attribute: "", operator: "equals", value: "" }] }],
    };
    onSave([...rules, newRule]);
  };

  const removeRule = (id: string) => onSave(rules.filter((r) => r.id !== id));

  const updateRule = (id: string, updates: Partial<TargetingRule>) => {
    onSave(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const addGroup = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.conditions.length >= 10) return;
    updateRule(ruleId, {
      conditions: [
        ...rule.conditions,
        { predicates: [{ attribute: "", operator: "equals", value: "" }] },
      ],
    });
  };

  const addPredicate = (ruleId: string, groupIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.conditions[groupIdx].predicates.length >= 10) return;
    const newConditions = [...rule.conditions];
    newConditions[groupIdx] = {
      predicates: [
        ...newConditions[groupIdx].predicates,
        { attribute: "", operator: "equals", value: "" },
      ],
    };
    updateRule(ruleId, { conditions: newConditions });
  };

  const updatePredicate = (
    ruleId: string,
    groupIdx: number,
    predIdx: number,
    updates: Partial<Predicate>,
  ) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions.map((g, gi) =>
      gi === groupIdx
        ? {
            predicates: g.predicates.map((p, pi) => (pi === predIdx ? { ...p, ...updates } : p)),
          }
        : g,
    );
    updateRule(ruleId, { conditions: newConditions });
  };

  const removePredicate = (ruleId: string, groupIdx: number, predIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions
      .map((g, gi) =>
        gi === groupIdx ? { predicates: g.predicates.filter((_, pi) => pi !== predIdx) } : g,
      )
      .filter((g) => g.predicates.length > 0);
    updateRule(ruleId, {
      conditions: newConditions.length > 0 ? newConditions : [{ predicates: [] }],
    });
  };

  const removeGroup = (ruleId: string, groupIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions.filter((_, i) => i !== groupIdx);
    updateRule(ruleId, {
      conditions:
        newConditions.length > 0
          ? newConditions
          : [
              {
                predicates: [{ attribute: "", operator: "equals", value: "" }],
              },
            ],
    });
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Targeting Rules</Trans>
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {rules.length}/100
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Empty state with prominent add buttons */}
        {rules.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              <Trans>No targeting rules. All users receive the default value.</Trans>
            </p>
            {!disabled && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {segments.length > 0 && (
                  <Button variant="default" className="rounded-full gap-2" onClick={addSegmentRule}>
                    <Users className="h-4 w-4" />
                    <Trans>Target a Segment</Trans>
                  </Button>
                )}
                <Button variant="outline" className="rounded-full gap-2" onClick={addConditionRule}>
                  <Filter className="h-4 w-4" />
                  <Trans>Custom Condition</Trans>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Existing rules */}
        {rules.map((rule, ruleIdx) => (
          <div key={rule.id}>
            {isSegmentRule(rule) ? (
              <SegmentRuleCard
                rule={fromStorageRule(rule)}
                segments={segments}
                index={ruleIdx}
                disabled={disabled}
                valueType={valueType}
                onChange={(updated: SegmentTargetingRuleUI) => {
                  onSave(rules.map((r) => (r.id === rule.id ? toStorageRule(updated) : r)));
                }}
                onRemove={() => removeRule(rule.id)}
              />
            ) : (
              <ConditionRuleCard
                rule={rule}
                index={ruleIdx}
                disabled={disabled}
                valueType={valueType}
                onRemove={() => removeRule(rule.id)}
                onUpdateRule={(updates) => updateRule(rule.id, updates)}
                onAddGroup={() => addGroup(rule.id)}
                onAddPredicate={(gi) => addPredicate(rule.id, gi)}
                onUpdatePredicate={(gi, pi, updates) => updatePredicate(rule.id, gi, pi, updates)}
                onRemovePredicate={(gi, pi) => removePredicate(rule.id, gi, pi)}
                onRemoveGroup={(gi) => removeGroup(rule.id, gi)}
              />
            )}
          </div>
        ))}

        {/* Add more rules (only shown when rules already exist) */}
        {rules.length > 0 && !disabled && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {segments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
                onClick={addSegmentRule}
              >
                <Users className="h-3.5 w-3.5" />
                <Trans>Target Segment</Trans>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full gap-1.5"
              onClick={addConditionRule}
            >
              <Filter className="h-3.5 w-3.5" />
              <Trans>Custom Condition</Trans>
            </Button>
          </div>
        )}
      </CardContent>

      <datalist id="common-attributes">
        {COMMON_ATTRIBUTES.map((attr) => (
          <option key={attr} value={attr} />
        ))}
      </datalist>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════
// Typed Value Input — validates based on config's valueType
// ═══════════════════════════════════════════════════════════════

const TypedValueInput = ({
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
  if (valueType === "boolean") {
    const current = String(value) === "true";
    return (
      <div className="flex gap-1 rounded-full border p-1 w-fit">
        <button
          type="button"
          disabled={disabled}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${current ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          onClick={() => onChange(true)}
        >
          true
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!current ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
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
        disabled={disabled}
        placeholder={t`e.g., 100, 0.5`}
      />
    );
  }

  if (valueType === "json" || valueType === "array") {
    return (
      <Input
        className="h-9 text-sm font-mono"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={valueType === "array" ? t`e.g., ["a","b"]` : t`e.g., {"key": "val"}`}
      />
    );
  }

  // Default: string
  return (
    <Input
      className="h-9 text-sm"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={t`e.g., "premium", "dark"`}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// Segment Rule Card — clean, visual, segment-first
// ═══════════════════════════════════════════════════════════════

const SegmentRuleCard = ({
  rule,
  segments,
  index,
  disabled,
  valueType,
  onChange,
  onRemove,
}: {
  rule: SegmentTargetingRuleUI;
  segments: Segment[];
  index: number;
  disabled?: boolean;
  valueType?: ConfigValueType;
  onChange: (updated: SegmentTargetingRuleUI) => void;
  onRemove: () => void;
}) => {
  const toggleSegment = (segId: string) => {
    const current = rule.segmentIds;
    const updated = current.includes(segId)
      ? current.filter((id) => id !== segId)
      : [...current, segId];
    onChange({ ...rule, segmentIds: updated });
  };

  const selectedSegments = segments.filter((s) => rule.segmentIds.includes(s.id));
  const availableSegments = segments.filter((s) => !rule.segmentIds.includes(s.id));

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">
            <Trans>Rule {index + 1}</Trans>
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-primary/30 text-primary"
          >
            <Trans>Segment</Trans>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={1000}
            className="w-16 h-7 text-xs text-center"
            value={rule.priority}
            onChange={(e) => onChange({ ...rule, priority: Number(e.target.value) })}
            disabled={disabled}
            title={t`Priority`}
          />
          {!disabled && (
            <Button variant="ghost" size="icon-xs" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Segment selection — the main interaction */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          <Trans>When user is in</Trans>
        </label>

        {/* Selected segments */}
        <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-center">
          {selectedSegments.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              <Trans>Click a segment below to target it</Trans>
            </span>
          )}
          {selectedSegments.map((seg) => (
            <Badge
              key={seg.id}
              className="gap-1 cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
              variant="outline"
              onClick={() => !disabled && toggleSegment(seg.id)}
            >
              <Users className="h-3 w-3" />
              {seg.name}
              {!disabled && <span className="ml-0.5 text-xs">×</span>}
            </Badge>
          ))}
          {selectedSegments.length > 1 && (
            <span className="text-[10px] text-muted-foreground uppercase font-medium px-1">
              (any)
            </span>
          )}
        </div>

        {/* Available segments to add */}
        {!disabled && availableSegments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableSegments.map((seg) => (
              <Badge
                key={seg.id}
                variant="outline"
                className="gap-1 cursor-pointer opacity-50 hover:opacity-100 hover:bg-primary/5 hover:border-primary/30 transition-all"
                onClick={() => toggleSegment(seg.id)}
              >
                <Plus className="h-2.5 w-2.5" />
                {seg.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Value — what they get */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          <Trans>Serve value</Trans>
        </label>
        <TypedValueInput
          value={rule.value}
          onChange={(val) => onChange({ ...rule, value: val })}
          valueType={valueType}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Condition Rule Card — advanced, attribute-based
// ═══════════════════════════════════════════════════════════════

const ConditionRuleCard = ({
  rule,
  index,
  disabled,
  valueType,
  onRemove,
  onUpdateRule,
  onAddGroup,
  onAddPredicate,
  onUpdatePredicate,
  onRemovePredicate,
  onRemoveGroup,
}: {
  rule: TargetingRule;
  index: number;
  disabled?: boolean;
  valueType?: ConfigValueType;
  onRemove: () => void;
  onUpdateRule: (updates: Partial<TargetingRule>) => void;
  onAddGroup: () => void;
  onAddPredicate: (groupIdx: number) => void;
  onUpdatePredicate: (groupIdx: number, predIdx: number, updates: Partial<Predicate>) => void;
  onRemovePredicate: (groupIdx: number, predIdx: number) => void;
  onRemoveGroup: (groupIdx: number) => void;
}) => {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">
            <Trans>Rule {index + 1}</Trans>
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Trans>Condition</Trans>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={1000}
            className="w-16 h-7 text-xs text-center"
            value={rule.priority}
            onChange={(e) => onUpdateRule({ priority: Number(e.target.value) })}
            disabled={disabled}
            title={t`Priority`}
          />
          {!disabled && (
            <Button variant="ghost" size="icon-xs" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          <Trans>When</Trans>
        </label>

        {rule.conditions.map((group, gi) => (
          <div key={gi} className="space-y-2">
            {gi > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase px-2">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              {group.predicates.map((pred, pi) => (
                <div key={pi} className="space-y-1">
                  {pi > 0 && <span className="text-xs font-medium text-muted-foreground">AND</span>}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                    <Input
                      className="h-9 text-sm"
                      value={pred.attribute}
                      onChange={(e) =>
                        onUpdatePredicate(gi, pi, {
                          attribute: e.target.value,
                        })
                      }
                      disabled={disabled}
                      placeholder={t`e.g., plan, country`}
                      list="common-attributes"
                    />
                    <Select
                      value={pred.operator}
                      onValueChange={(v) =>
                        onUpdatePredicate(gi, pi, {
                          operator: v as PredicateOperator,
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op} value={op} className="text-sm">
                            <span className="font-medium">{op}</span>
                            <span className="text-muted-foreground ml-1.5 text-xs hidden sm:inline">
                              — {OPERATOR_DESCRIPTIONS[op]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-9 text-sm"
                      value={String(pred.value)}
                      onChange={(e) => onUpdatePredicate(gi, pi, { value: e.target.value })}
                      disabled={disabled}
                      placeholder={OPERATOR_VALUE_PLACEHOLDERS[pred.operator]}
                    />
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 h-9 w-9"
                        onClick={() => onRemovePredicate(gi, pi)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!disabled && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onAddPredicate(gi)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <Trans>AND</Trans>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => onRemoveGroup(gi)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <Trans>Remove</Trans>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-full"
            onClick={onAddGroup}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <Trans>OR</Trans>
          </Button>
        )}
      </div>

      {/* Value */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          <Trans>Serve value</Trans>
        </label>
        <TypedValueInput
          value={rule.value}
          onChange={(val) => onUpdateRule({ value: val })}
          valueType={valueType}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
