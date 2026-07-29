import type { ConfigEntry } from "@/lib/types";

export const ENV_COLOR_PRESETS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#6b7280",
] as const;

export const DEFAULT_ENV_COLOR = ENV_COLOR_PRESETS[5];

export const CONFIG_TEMPLATES: Record<
  string,
  Array<{ key: string; value: unknown; valueType: ConfigEntry["valueType"] }>
> = {
  "feature-flags": [
    { key: "feature.maintenance_mode", value: false, valueType: "boolean" },
    { key: "feature.beta_enabled", value: false, valueType: "boolean" },
    { key: "feature.signup_enabled", value: true, valueType: "boolean" },
    { key: "feature.dark_mode", value: true, valueType: "boolean" },
  ],
  "app-settings": [
    { key: "app.name", value: "My App", valueType: "string" },
    { key: "app.max_upload_size_mb", value: 10, valueType: "number" },
    {
      key: "app.supported_locales",
      value: '["en","es","fr"]',
      valueType: "array",
    },
    { key: "app.api_timeout_ms", value: 5000, valueType: "number" },
  ],
};
