import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";
import type { PrerequisiteOperator } from "@/lib/types";

type Prerequisite = {
  flagKey: string;
  operator: PrerequisiteOperator;
  requiredValue: unknown;
};

export const useSetPrerequisites = createConfigFieldMutation<
  Prerequisite[],
  { prerequisites: Prerequisite[]; oldPrerequisites?: Prerequisite[] }
>({
  field: "prerequisites",
  getValue: (p) => p.prerequisites,
  getOldValue: (p) => p.oldPrerequisites,
});
