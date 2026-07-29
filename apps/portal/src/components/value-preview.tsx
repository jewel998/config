import { Badge } from "@/components/ui/badge";
import type { ConfigEntry } from "@/hooks/use-configs";

export const ValuePreview = ({ config }: { config: ConfigEntry }) => {
  switch (config.valueType) {
    case "boolean":
      return (
        <Badge
          className={`rounded-full text-xs ${
            config.value === true || config.value === "true"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {String(config.value)}
        </Badge>
      );
    case "json": {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      let count = 0;
      try {
        const parsed = JSON.parse(str);
        count = Object.keys(parsed).length;
      } catch {
        /* ignore */
      }
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {`{...}`} <span className="text-[10px]">({count} keys)</span>
        </span>
      );
    }
    case "array": {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      let count = 0;
      try {
        const parsed = JSON.parse(str);
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        /* ignore */
      }
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {`[...]`} <span className="text-[10px]">({count} items)</span>
        </span>
      );
    }
    case "number":
      return <span className="font-mono text-xs">{String(config.value)}</span>;
    default: {
      const str = String(config.value ?? "");
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {str.length > 40 ? str.slice(0, 40) + "…" : str}
        </span>
      );
    }
  }
};

/** Format a full config value for expanded view */
export const getFullValue = (config: ConfigEntry): string => {
  if (config.valueType === "json" || config.valueType === "array") {
    try {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return String(config.value);
    }
  }
  return String(config.value ?? "");
};
