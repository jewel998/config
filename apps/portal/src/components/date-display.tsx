import {
  formatDistanceToNowStrict,
  differenceInMonths,
  format,
} from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DateFormat = "relative" | "short" | "medium" | "long";

interface DateDisplayProps {
  date: string | Date;
  mode?: DateFormat;
  timezone?: string;
  className?: string;
}

export const DateDisplay = ({
  date,
  mode = "relative",
  timezone,
  className,
}: DateDisplayProps) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const getRelativeDisplay = (): string => {
    const monthsDiff = differenceInMonths(new Date(), dateObj);
    if (monthsDiff >= 2) {
      // Fallback to absolute after 2 months
      return format(dateObj, "MMM d, yyyy");
    }
    return formatDistanceToNowStrict(dateObj, { addSuffix: true });
  };

  const getAbsoluteDisplay = (): string => {
    switch (mode) {
      case "short":
        return format(dateObj, "dd/MM/yy");
      case "medium":
        return format(dateObj, "MMM d, yyyy");
      case "long":
        return format(dateObj, "d MMMM, yyyy");
      default:
        return format(dateObj, "MMM d, yyyy");
    }
  };

  const displayText =
    mode === "relative" ? getRelativeDisplay() : getAbsoluteDisplay();

  // Format date and time separately for cleaner display
  const localTz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = dateObj.toLocaleDateString(undefined, {
    timeZone: localTz,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const localTimeStr = dateObj.toLocaleTimeString(undefined, {
    timeZone: localTz,
    hour: "2-digit",
    minute: "2-digit",
  });
  const utcDate = dateObj.toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const utcTimeStr = dateObj.toLocaleTimeString(undefined, {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Extract short timezone labels
  const localTzShort = localTz.split("/").pop()?.replace(/_/g, " ") ?? localTz;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={dateObj.toISOString()}
          className={
            className ?? "cursor-help font-mono text-xs text-muted-foreground"
          }
        >
          {displayText}
        </time>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-0">
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">
              {localDate}, {localTimeStr}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {localTzShort}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {utcDate}, {utcTimeStr}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              UTC
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
