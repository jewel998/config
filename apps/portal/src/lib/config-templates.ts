import { Calendar, Percent, Target, UserCheck } from "lucide-react";

import type {
  ConfigEntry,
  ConfigTemplate,
  PredicateOperator,
  SectionHelpConfig,
  SectionId,
} from "@/lib/types";

/** Map of section IDs to help configuration */
export const SECTION_HELP: Record<SectionId, SectionHelpConfig> = {
  value: {
    description: "The current resolved value for this config key.",
  },
  targeting: {
    description:
      "Route specific config values to users based on attributes like plan, country, or custom properties.",
    tip: "Rules are evaluated top-to-bottom by priority. First match wins.",
  },
  rollout: {
    description: "Gradually roll out this config value to a percentage of users.",
    tip: "Rollout uses consistent hashing — the same user always gets the same result.",
  },
  overrides: {
    description: "Force a specific value for individual user IDs, bypassing all other rules.",
  },
  schedule: {
    description: "Automatically change this config's value at a future date and time.",
  },
  prerequisites: {
    description: "Require other flags to have specific values before this config takes effect.",
    tip: "Circular dependencies are blocked automatically.",
  },
};

/** Operator description map for smart placeholders */
export const OPERATOR_DESCRIPTIONS: Record<PredicateOperator, string> = {
  equals: "exact match",
  not_equals: "does not match",
  contains: "substring match",
  starts_with: "begins with value",
  ends_with: "ends with value",
  in_list: "matches any in comma-separated list",
  not_in_list: "matches none in comma-separated list",
  greater_than: "numeric greater than",
  less_than: "numeric less than",
  regex_match: "matches regex pattern",
  in_segment: "user belongs to segment",
  not_in_segment: "user does not belong to segment",
};

/** Common attribute suggestions for autocomplete */
export const COMMON_ATTRIBUTES = [
  "plan",
  "country",
  "email",
  "userId",
  "device",
  "browser",
  "appVersion",
];

/** Operator-specific value placeholders */
export const OPERATOR_VALUE_PLACEHOLDERS: Record<PredicateOperator, string> = {
  equals: "pro",
  not_equals: "free",
  contains: "example",
  starts_with: "prefix",
  ends_with: ".com",
  in_list: "user1,user2,user3",
  not_in_list: "bot1,bot2",
  greater_than: "10",
  less_than: "100",
  regex_match: "^[a-z]+$",
  in_segment: "segment-id",
  not_in_segment: "segment-id",
};

/** Pre-built config templates */
export const CONFIG_TEMPLATES: ConfigTemplate[] = [
  {
    id: "beta-users",
    label: "Enable for beta users",
    icon: Target,
    description: "Add a targeting rule for plan=pro users",
    apply: (config: ConfigEntry) => ({
      targetingRules: [
        {
          id: crypto.randomUUID(),
          priority: 1,
          value: config.value,
          conditions: [
            {
              predicates: [{ attribute: "plan", operator: "equals", value: "pro" }],
            },
          ],
        },
      ],
    }),
  },
  {
    id: "gradual-rollout",
    label: "Gradual rollout",
    icon: Percent,
    description: "Start with 10% rollout",
    apply: (config: ConfigEntry) => ({
      rolloutPercentage: 10,
      rolloutValue: config.value,
    }),
  },
  {
    id: "internal-only",
    label: "Internal only",
    icon: UserCheck,
    description: "Add a user override with placeholder ID",
    apply: (config: ConfigEntry) => ({
      overrides: { "internal-user-id": config.value },
    }),
  },
  {
    id: "scheduled-launch",
    label: "Scheduled launch",
    icon: Calendar,
    description: "Schedule for tomorrow at 09:00",
    apply: (config: ConfigEntry) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return {
        schedule: {
          targetValue: config.value,
          activateAt: tomorrow.toISOString(),
        },
      };
    },
  },
];
