import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ScheduleUIProps {
  schedule?: { targetValue: unknown; activateAt: string } | null;
  onSave: (schedule: { targetValue: unknown; activateAt: string } | null) => void;
  disabled?: boolean;
}

export const ScheduleUI = ({ schedule, onSave, disabled }: ScheduleUIProps) => {
  const [targetValue, setTargetValue] = useState("");
  const [activateAt, setActivateAt] = useState("");
  const [countdown, setCountdown] = useState("");

  const isApplied = schedule ? Date.parse(schedule.activateAt) <= Date.now() : false;
  const isPending = schedule ? Date.parse(schedule.activateAt) > Date.now() : false;

  useEffect(() => {
    if (!isPending || !schedule) {
      setCountdown("");
      return;
    }
    const update = () => {
      const diff = Date.parse(schedule.activateAt) - Date.now();
      if (diff <= 0) {
        setCountdown("Activating...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isPending, schedule]);

  const handleSave = () => {
    if (!activateAt) return;
    const parsed = targetValue || null;
    onSave({ targetValue: parsed, activateAt: new Date(activateAt).toISOString() });
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Scheduled Change</Trans>
        </CardTitle>
        {isPending && (
          <Badge className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
            Pending
          </Badge>
        )}
        {isApplied && (
          <Badge className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
            Applied
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(schedule.activateAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Value:</span>
              <code className="text-xs font-mono">{JSON.stringify(schedule.targetValue)}</code>
            </div>
            {countdown && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{countdown}</span>
              </div>
            )}
            {!disabled && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => onSave(null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isApplied ? <Trans>Remove</Trans> : <Trans>Cancel</Trans>}
              </Button>
            )}
          </div>
        ) : !disabled ? (
          <div className="space-y-2">
            <Input
              placeholder={t`Target value`}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={activateAt}
              onChange={(e) => setActivateAt(e.target.value)}
            />
            <Button size="sm" className="rounded-full" onClick={handleSave} disabled={!activateAt}>
              <Trans>Schedule</Trans>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Trans>No scheduled changes.</Trans>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
