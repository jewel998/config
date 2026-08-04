import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";
import type { TargetingRule } from "@/lib/types";

export const useSetTargetingRules = createConfigFieldMutation<
  TargetingRule[],
  { rules: TargetingRule[]; oldRules?: TargetingRule[] }
>({
  field: "targetingRules",
  getValue: (p) => p.rules,
  getOldValue: (p) => p.oldRules,
});
