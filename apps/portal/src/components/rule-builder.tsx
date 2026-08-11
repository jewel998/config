import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2, Users } from "lucide-react";

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
import { SegmentTargetingRule } from "@/components/segment-targeting-rule";
import {
  COMMON_ATTRIBUTES,
  OPERATOR_DESCRIPTIONS,
  OPERATOR_VALUE_PLACEHOLDERS,
} from "@/lib/config-templates";
import type {
  PredicateOperator,
  Segment,
  SegmentTargetingRuleUI,
  TargetingRule,
  Predicate,
} from "@/lib/types";
import { isSegmentRule, fromStorageRule, toStorageRule } from "@/lib/types";

const OPERATORS: PredicateOperator[] = [
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
  "in_segment",
  "not_in_segment",
];

interface RuleBuilderProps {
  rules: TargetingRule[];
  onSave: (rules: TargetingRule[]) => void;
  disabled?: boolean;
  segments?: Segment[];
}

export const RuleBuilder = ({
  rules,
  onSave,
  disabled,
  segments = [],
}: RuleBuilderProps) => {
  const addRule = () => {
    if (rules.length >= 100) return;
    const newRule: TargetingRule = {
      id: crypto.randomUUID(),
      priority: rules.length + 1,
      value: "",
      conditions: [
        { predicates: [{ attribute: "plan", operator: "equals", value: "" }] },
      ],
    };
    onSave([...rules, newRule]);
  };

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
            predicates: g.predicates.map((p, pi) =>
              pi === predIdx ? { ...p, ...updates } : p,
            ),
          }
        : g,
    );
    updateRule(ruleId, { conditions: newConditions });
  };

  const removePredicate = (
    ruleId: string,
    groupIdx: number,
    predIdx: number,
  ) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions
      .map((g, gi) =>
        gi === groupIdx
          ? { predicates: g.predicates.filter((_, pi) => pi !== predIdx) }
          : g,
      )
      .filter((g) => g.predicates.length > 0);
    updateRule(ruleId, {
      conditions:
        newConditions.length > 0 ? newConditions : [{ predicates: [] }],
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

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Targeting Rules</Trans>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {rules.length}/100
          </Badge>
          {!disabled && (
            <>
              {segments.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1"
                  onClick={addSegmentRule}
                >
                  <Users className="h-3.5 w-3.5" />
                  <Trans>Segment Rule</Trans>
                </Button>
              )}
              <Button
                size="sm"
                className="rounded-full gap-1"
                onClick={addRule}
              >
                <Plus className="h-3.5 w-3.5" />
                <Trans>Add Rule</Trans>
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Trans>
              No targeting rules. All users receive the default value.
            </Trans>
          </p>
        )}
        {rules.map((rule, ruleIdx) => (
          <div key={rule.id}>
            {isSegmentRule(rule) ? (
              <SegmentTargetingRule
                rule={fromStorageRule(rule)}
                segments={segments}
                index={ruleIdx}
                disabled={disabled}
                onChange={(updated: SegmentTargetingRuleUI) => {
                  const storageRule = toStorageRule(updated);
                  onSave(
                    rules.map((r) => (r.id === rule.id ? storageRule : r)),
                  );
                }}
                onRemove={() => removeRule(rule.id)}
              />
            ) : (
              <div className="rounded-lg border p-4 space-y-4">
                {/* Rule header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    <Trans>Rule {ruleIdx + 1}</Trans>
                  </span>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeRule(rule.id)}
                    >
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
                        updateRule(rule.id, {
                          priority: Number(e.target.value),
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">
                      <Trans>Return value</Trans>
                    </label>
                    <Input
                      className="h-9 text-sm"
                      value={String(rule.value)}
                      onChange={(e) =>
                        updateRule(rule.id, { value: e.target.value })
                      }
                      disabled={disabled}
                      placeholder={t`Value served when rule matches`}
                    />
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-3">
                  <label className="text-xs text-muted-foreground font-medium">
                    <Trans>Conditions</Trans>
                  </label>

                  {rule.conditions.map((group, gi) => (
                    <div key={gi} className="space-y-2">
                      {gi > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground uppercase px-2">
                            OR
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                        {group.predicates.map((pred, pi) => (
                          <div key={pi} className="space-y-1">
                            {pi > 0 && (
                              <span className="text-xs font-medium text-muted-foreground">
                                AND
                              </span>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                              {/* Attribute */}
                              <div className="space-y-1">
                                {pi === 0 && (
                                  <span className="text-[11px] text-muted-foreground sm:hidden">
                                    <Trans>Attribute</Trans>
                                  </span>
                                )}
                                <Input
                                  className="h-9 text-sm"
                                  value={pred.attribute}
                                  onChange={(e) =>
                                    updatePredicate(rule.id, gi, pi, {
                                      attribute: e.target.value,
                                    })
                                  }
                                  disabled={disabled}
                                  placeholder={t`e.g., plan, country, email`}
                                  list="common-attributes"
                                />
                              </div>
                              {/* Operator */}
                              <div className="space-y-1">
                                {pi === 0 && (
                                  <span className="text-[11px] text-muted-foreground sm:hidden">
                                    <Trans>Operator</Trans>
                                  </span>
                                )}
                                <Select
                                  value={pred.operator}
                                  onValueChange={(v) =>
                                    updatePredicate(rule.id, gi, pi, {
                                      operator: v as PredicateOperator,
                                    })
                                  }
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OPERATORS.map((op) => (
                                      <SelectItem
                                        key={op}
                                        value={op}
                                        className="text-sm"
                                      >
                                        <span className="font-medium">
                                          {op}
                                        </span>
                                        <span className="text-muted-foreground ml-1.5 text-xs hidden sm:inline">
                                          — {OPERATOR_DESCRIPTIONS[op]}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Value */}
                              <div className="space-y-1">
                                {pi === 0 && (
                                  <span className="text-[11px] text-muted-foreground sm:hidden">
                                    <Trans>Value</Trans>
                                  </span>
                                )}
                                <Input
                                  className="h-9 text-sm"
                                  value={String(pred.value)}
                                  onChange={(e) =>
                                    updatePredicate(rule.id, gi, pi, {
                                      value: e.target.value,
                                    })
                                  }
                                  disabled={disabled}
                                  placeholder={
                                    OPERATOR_VALUE_PLACEHOLDERS[pred.operator]
                                  }
                                />
                              </div>
                              {/* Delete */}
                              {!disabled && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="shrink-0 h-9 w-9"
                                  onClick={() =>
                                    removePredicate(rule.id, gi, pi)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Group actions */}
                        {!disabled && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addPredicate(rule.id, gi)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              <Trans>Add condition</Trans>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => removeGroup(rule.id, gi)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              <Trans>Remove group</Trans>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add OR group */}
                  {!disabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-full"
                      onClick={() => addGroup(rule.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <Trans>Add OR group</Trans>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <datalist id="common-attributes">
        {COMMON_ATTRIBUTES.map((attr) => (
          <option key={attr} value={attr} />
        ))}
      </datalist>
    </Card>
  );
};
