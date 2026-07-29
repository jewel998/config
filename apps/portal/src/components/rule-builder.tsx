import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2 } from "lucide-react";

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
import type { PredicateOperator, TargetingRule, Predicate } from "@/lib/types";

const OPERATORS: PredicateOperator[] = [
  "equals", "not_equals", "contains", "starts_with", "ends_with",
  "in_list", "not_in_list", "greater_than", "less_than",
  "regex_match", "in_segment", "not_in_segment",
];

interface RuleBuilderProps {
  rules: TargetingRule[];
  onSave: (rules: TargetingRule[]) => void;
  disabled?: boolean;
}

export const RuleBuilder = ({ rules, onSave, disabled }: RuleBuilderProps) => {
  const addRule = () => {
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
    onSave(rules.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const addGroup = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.conditions.length >= 10) return;
    updateRule(ruleId, { conditions: [...rule.conditions, { predicates: [{ attribute: "", operator: "equals", value: "" }] }] });
  };

  const addPredicate = (ruleId: string, groupIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || rule.conditions[groupIdx].predicates.length >= 10) return;
    const newConditions = [...rule.conditions];
    newConditions[groupIdx] = { predicates: [...newConditions[groupIdx].predicates, { attribute: "", operator: "equals", value: "" }] };
    updateRule(ruleId, { conditions: newConditions });
  };

  const updatePredicate = (ruleId: string, groupIdx: number, predIdx: number, updates: Partial<Predicate>) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions.map((g, gi) => gi === groupIdx
      ? { predicates: g.predicates.map((p, pi) => pi === predIdx ? { ...p, ...updates } : p) }
      : g);
    updateRule(ruleId, { conditions: newConditions });
  };

  const removePredicate = (ruleId: string, groupIdx: number, predIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions.map((g, gi) => gi === groupIdx
      ? { predicates: g.predicates.filter((_, pi) => pi !== predIdx) }
      : g).filter((g) => g.predicates.length > 0);
    updateRule(ruleId, { conditions: newConditions.length > 0 ? newConditions : [{ predicates: [] }] });
  };

  const removeGroup = (ruleId: string, groupIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newConditions = rule.conditions.filter((_, i) => i !== groupIdx);
    updateRule(ruleId, { conditions: newConditions.length > 0 ? newConditions : [{ predicates: [{ attribute: "", operator: "equals", value: "" }] }] });
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base"><Trans>Targeting Rules</Trans></CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{rules.length}/100</Badge>
          {!disabled && <Button size="sm" className="rounded-full gap-1" onClick={addRule}><Plus className="h-3.5 w-3.5" /><Trans>Add Rule</Trans></Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 && <p className="text-sm text-muted-foreground text-center py-4"><Trans>No targeting rules. All users receive the default value.</Trans></p>}
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={1000} className="w-20 h-8 text-xs" value={rule.priority} onChange={(e) => updateRule(rule.id, { priority: Number(e.target.value) })} disabled={disabled} placeholder={t`Priority`} />
              <Input className="flex-1 h-8 text-xs" value={String(rule.value)} onChange={(e) => updateRule(rule.id, { value: e.target.value })} disabled={disabled} placeholder={t`Return value`} />
              {!disabled && <Button variant="ghost" size="icon-xs" onClick={() => removeRule(rule.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
            </div>
            {rule.conditions.map((group, gi) => (
              <div key={gi} className="ml-4 space-y-1.5">
                {gi > 0 && <span className="text-[10px] font-medium text-muted-foreground uppercase">OR</span>}
                <div className="rounded border bg-muted/30 p-2 space-y-1.5">
                  {group.predicates.map((pred, pi) => (
                    <div key={pi} className="flex items-center gap-1.5">
                      {pi > 0 && <span className="text-[9px] text-muted-foreground w-6">AND</span>}
                      {pi === 0 && <span className="w-6" />}
                      <Input className="flex-1 h-7 text-xs" value={pred.attribute} onChange={(e) => updatePredicate(rule.id, gi, pi, { attribute: e.target.value })} disabled={disabled} placeholder={t`Attribute`} />
                      <Select value={pred.operator} onValueChange={(v) => updatePredicate(rule.id, gi, pi, { operator: v as PredicateOperator })} disabled={disabled}>
                        <SelectTrigger className="w-32 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{OPERATORS.map((op) => <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="flex-1 h-7 text-xs" value={String(pred.value)} onChange={(e) => updatePredicate(rule.id, gi, pi, { value: e.target.value })} disabled={disabled} placeholder={t`Value`} />
                      {!disabled && <Button variant="ghost" size="icon-xs" onClick={() => removePredicate(rule.id, gi, pi)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>}
                    </div>
                  ))}
                  {!disabled && (
                    <div className="flex gap-2 pt-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => addPredicate(rule.id, gi)}><Plus className="h-3 w-3 mr-0.5" />AND</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => removeGroup(rule.id, gi)}><Trash2 className="h-3 w-3 mr-0.5" /><Trans>Group</Trans></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!disabled && <Button variant="ghost" size="sm" className="ml-4 h-6 text-[10px]" onClick={() => addGroup(rule.id)}><Plus className="h-3 w-3 mr-0.5" />OR Group</Button>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
