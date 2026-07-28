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

  // Tooltip shows both local timezone and UTC
  const localTime = dateObj.toLocaleString(undefined, {
    timeZone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateStyle: "full",
    timeStyle: "long",
  });
  const utcTime = dateObj.toLocaleString(undefined, {
    timeZone: "UTC",
    dateStyle: "full",
    timeStyle: "long",
  });

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
      <TooltipContent side="top" className="max-w-xs space-y-1 text-xs">
        <p>
          <span className="font-medium">Local:</span> {localTime}
        </p>
        <p>
          <span className="font-medium">UTC:</span> {utcTime}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
