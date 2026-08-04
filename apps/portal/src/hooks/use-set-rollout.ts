import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";

interface RolloutValue {
  rolloutPercentage: number;
  rolloutValue: unknown;
}

export const useSetRollout = createConfigFieldMutation<
  RolloutValue,
  {
    rolloutPercentage: number;
    rolloutValue: unknown;
    oldRolloutPercentage?: number;
    oldRolloutValue?: unknown;
  }
>({
  field: "rolloutPercentage",
  getValue: (p) => ({
    rolloutPercentage: p.rolloutPercentage,
    rolloutValue: p.rolloutValue,
  }),
  getOldValue: (p) => ({
    rolloutPercentage: p.oldRolloutPercentage,
    rolloutValue: p.oldRolloutValue,
  }),
  buildUpdate: (value, userId) => ({
    rolloutPercentage: value.rolloutPercentage,
    rolloutValue: value.rolloutValue,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }),
});
