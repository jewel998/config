import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { combineDateAndTime } from "@/lib/config-utils";

interface DatePickerScheduleProps {
  schedule?: { targetValue: unknown; activateAt: string } | null;
  onSave: (schedule: { targetValue: unknown; activateAt: string } | null) => void;
  disabled?: boolean;
}

export const DatePickerSchedule = ({ schedule, onSave, disabled }: DatePickerScheduleProps) => {
  const [targetValue, setTargetValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hours, setHours] = useState("09");
  const [minutes, setMinutes] = useState("00");
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
    if (!selectedDate) return;
    const isoString = combineDateAndTime(selectedDate, Number(hours), Number(minutes));
    const parsed = targetValue || null;
    onSave({ targetValue: parsed, activateAt: isoString });
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setHours("09");
    setMinutes("00");
    setTargetValue("");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(schedule.activateAt), "PPP 'at' HH:mm")}</span>
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
          <div className="space-y-3">
            <Input
              placeholder={t`Target value`}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal text-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">
                      <Trans>Pick a date</Trans>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={{ before: today }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            {/* Time Selection */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm font-medium">:</span>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="rounded-full"
                onClick={handleSave}
                disabled={!selectedDate}
              >
                <Trans>Schedule</Trans>
              </Button>
              {selectedDate && (
                <Button variant="ghost" size="sm" className="rounded-full" onClick={handleClear}>
                  <Trans>Clear</Trans>
                </Button>
              )}
            </div>
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
