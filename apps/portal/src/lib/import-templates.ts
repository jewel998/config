import type { ImportEntryFull } from "./import-types";

/**
 * Comprehensive JSON template covering all value types and advanced features.
 */
export const JSON_TEMPLATE: ImportEntryFull[] = [
  // ─── Basic value types ─────────────────────────────────────
  {
    key: "feature.dark_mode",
    value: true,
    valueType: "boolean",
  },
  {
    key: "api.timeout_ms",
    value: 5000,
    valueType: "number",
  },
  {
    key: "app.title",
    value: "My Application",
    valueType: "string",
  },
  {
    key: "theme.colors",
    value: '{"primary":"#3B82F6","secondary":"#10B981","danger":"#EF4444"}',
    valueType: "json",
  },
  {
    key: "allowed.origins",
    value: '["https://app.example.com","https://staging.example.com"]',
    valueType: "array",
  },

  // ─── With lifecycle state ──────────────────────────────────
  {
    key: "feature.new_dashboard",
    value: false,
    valueType: "boolean",
    lifecycleState: "draft",
  },
  {
    key: "feature.legacy_api",
    value: true,
    valueType: "boolean",
    lifecycleState: "stale",
  },

  // ─── With targeting rules ──────────────────────────────────
  {
    key: "feature.premium_widget",
    value: false,
    valueType: "boolean",
    lifecycleState: "active",
    targetingRules: [
      {
        id: "rule_premium_users",
        priority: 1,
        value: true,
        conditions: [
          {
            predicates: [
              {
                attribute: "plan",
                operator: "equals",
                value: "premium",
              },
            ],
          },
        ],
      },
      {
        id: "rule_beta_testers",
        priority: 2,
        value: true,
        conditions: [
          {
            predicates: [
              {
                attribute: "role",
                operator: "in_list",
                value: ["beta_tester", "internal"],
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── With percentage rollout ───────────────────────────────
  {
    key: "feature.new_checkout",
    value: false,
    valueType: "boolean",
    lifecycleState: "active",
    rolloutPercentage: 25,
    rolloutValue: true,
  },

  // ─── With user overrides ───────────────────────────────────
  {
    key: "feature.admin_panel",
    value: false,
    valueType: "boolean",
    overrides: {
      user_001: true,
      user_002: true,
      user_ceo: true,
    },
  },

  // ─── With schedule ─────────────────────────────────────────
  {
    key: "feature.holiday_theme",
    value: false,
    valueType: "boolean",
    schedule: {
      targetValue: true,
      activateAt: "2026-12-20T00:00:00.000Z",
    },
  },

  // ─── With prerequisites ────────────────────────────────────
  {
    key: "feature.advanced_analytics",
    value: false,
    valueType: "boolean",
    prerequisites: [
      {
        flagKey: "feature.premium_widget",
        operator: "equals",
        requiredValue: true,
      },
    ],
  },

  // ─── Complex: multiple advanced features combined ──────────
  {
    key: "feature.ai_suggestions",
    value: false,
    valueType: "boolean",
    lifecycleState: "active",
    targetingRules: [
      {
        id: "rule_ai_early_access",
        priority: 1,
        value: true,
        conditions: [
          {
            predicates: [
              {
                attribute: "plan",
                operator: "in_list",
                value: ["enterprise", "business"],
              },
              { attribute: "region", operator: "not_equals", value: "EU" },
            ],
          },
        ],
      },
    ],
    rolloutPercentage: 10,
    rolloutValue: true,
    prerequisites: [
      {
        flagKey: "feature.premium_widget",
        operator: "equals",
        requiredValue: true,
      },
      {
        flagKey: "api.timeout_ms",
        operator: "greater_than",
        requiredValue: 1000,
      },
    ],
    schedule: {
      targetValue: true,
      activateAt: "2027-01-15T09:00:00.000Z",
    },
  },
];

/**
 * CSV template string (basic fields only — advanced fields require JSON format).
 */
export const CSV_TEMPLATE = `key,value,valueType
feature.dark_mode,true,boolean
feature.signup_v2,false,boolean
api.timeout_ms,5000,number
api.max_retries,3,number
app.title,"My Application",string
app.support_email,support@example.com,string
theme.colors,"{""primary"":""#3B82F6"",""secondary"":""#10B981""}",json
theme.font_sizes,"{""sm"":12,""md"":14,""lg"":18,""xl"":24}",json
allowed.origins,"[""https://app.example.com"",""https://staging.example.com""]",array
feature.enabled_modules,"[""dashboard"",""settings"",""billing""]",array`;

/**
 * Download a template file in the specified format.
 */
export function downloadTemplate(format: "csv" | "json"): void {
  let content: string;
  let mimeType: string;

  if (format === "csv") {
    content = CSV_TEMPLATE;
    mimeType = "text/csv";
  } else {
    content = JSON.stringify(JSON_TEMPLATE, null, 2);
    mimeType = "application/json";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-template.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
