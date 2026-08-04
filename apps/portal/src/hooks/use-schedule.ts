import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";

type Schedule = { targetValue: unknown; activateAt: string } | null;

export const useSetSchedule = createConfigFieldMutation<
  Schedule,
  { schedule: Schedule; oldSchedule?: Schedule }
>({
  field: "schedule",
  getValue: (p) => p.schedule,
  getOldValue: (p) => p.oldSchedule,
  auditAction: (p) => (p.schedule ? "update" : "delete"),
  buildUpdate: (value, userId) => ({
    schedule: value ?? null,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }),
});
