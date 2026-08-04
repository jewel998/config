import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";

type Prerequisite = { flagKey: string; requiredValue: unknown };

export const useSetPrerequisites = createConfigFieldMutation<
  Prerequisite[],
  { prerequisites: Prerequisite[]; oldPrerequisites?: Prerequisite[] }
>({
  field: "prerequisites",
  getValue: (p) => p.prerequisites,
  getOldValue: (p) => p.oldPrerequisites,
});
