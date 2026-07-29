import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { AlertTriangle, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PrerequisiteUIProps {
  prerequisites: Array<{ flagKey: string; requiredValue: unknown }>;
  currentFlagKey: string;
  allFlagKeys: string[];
  onSave: (prerequisites: Array<{ flagKey: string; requiredValue: unknown }>) => void;
  disabled?: boolean;
}

export const PrerequisiteUI = ({ prerequisites, currentFlagKey, allFlagKeys, onSave, disabled }: PrerequisiteUIProps) => {
  const [flagKey, setFlagKey] = useState("");
  const [requiredValue, setRequiredValue] = useState("");

  const detectCycle = (newKey: string): boolean => {
    // Simple cycle detection: check if adding this would create a self-reference
    return newKey === currentFlagKey;
  };

  const handleAdd = () => {
    if (!flagKey.trim() || prerequisites.length >= 10) return;
    if (detectCycle(flagKey.trim())) return;
    const parsed = requiredValue === "true" ? true : requiredValue === "false" ? false : !isNaN(Number(requiredValue)) ? Number(requiredValue) : requiredValue;
    onSave([...prerequisites, { flagKey: flagKey.trim(), requiredValue: parsed }]);
    setFlagKey("");
    setRequiredValue("");
  };

  const handleRemove = (index: number) => {
    onSave(prerequisites.filter((_, i) => i !== index));
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base"><Trans>Prerequisites</Trans></CardTitle>
        <Badge variant="secondary" className="text-xs">{prerequisites.length}/10</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!disabled && (
          <div className="flex gap-2">
            <Input placeholder={t`Flag key`} value={flagKey} onChange={(e) => setFlagKey(e.target.value)} className="flex-1" list="flag-keys" />
            <datalist id="flag-keys">
              {allFlagKeys.filter((k) => k !== currentFlagKey).map((k) => <option key={k} value={k} />)}
            </datalist>
            <Input placeholder={t`Required value`} value={requiredValue} onChange={(e) => setRequiredValue(e.target.value)} className="w-32" />
            <Button size="sm" className="rounded-full" onClick={handleAdd} disabled={!flagKey.trim() || prerequisites.length >= 10}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {flagKey && detectCycle(flagKey) && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <Trans>Cannot add self as prerequisite (circular dependency).</Trans>
          </div>
        )}
        {prerequisites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4"><Trans>No prerequisites configured.</Trans></p>
        ) : (
          <div className="space-y-2">
            {prerequisites.map((prereq, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <code className="text-xs font-mono">{prereq.flagKey}</code>
                  <span className="text-xs text-muted-foreground">must be</span>
                  <code className="text-xs font-mono">{JSON.stringify(prereq.requiredValue)}</code>
                </div>
                {!disabled && (
                  <Button variant="ghost" size="icon-xs" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
