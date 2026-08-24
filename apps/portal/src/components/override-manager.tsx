import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface OverrideManagerProps {
  overrides: Record<string, unknown>;
  valueType: string;
  onSave: (overrides: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const OverrideManager = ({
  overrides,
  valueType,
  onSave,
  disabled,
}: OverrideManagerProps) => {
  const [userId, setUserId] = useState("");
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (!userId.trim() || Object.keys(overrides).length >= 100) return;
    const parsed =
      valueType === "number" ? Number(value) : valueType === "boolean" ? value === "true" : value;
    onSave({ ...overrides, [userId.trim()]: parsed });
    setUserId("");
    setValue("");
  };

  const handleRemove = (key: string) => {
    const next = { ...overrides };
    delete next[key];
    onSave(next);
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Per-User Overrides</Trans>
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {Object.keys(overrides).length}/100
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!disabled && (
          <div className="flex gap-2">
            <Input
              placeholder={t`User ID`}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t`Value`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              className="rounded-full"
              onClick={handleAdd}
              disabled={!userId.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {Object.keys(overrides).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Trans>No overrides configured.</Trans>
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(overrides).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-2">
                <div className="flex items-center gap-2 truncate">
                  <code className="text-xs font-mono">{key}</code>
                  <span className="text-xs text-muted-foreground">→</span>
                  <code className="text-xs font-mono truncate">{JSON.stringify(val)}</code>
                </div>
                {!disabled && (
                  <Button variant="ghost" size="icon-xs" onClick={() => handleRemove(key)}>
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
