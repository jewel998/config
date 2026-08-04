import { createConfigFieldMutation } from "@/hooks/use-config-field-mutation";

export const useSetOverrides = createConfigFieldMutation<
  Record<string, unknown>,
  { overrides: Record<string, unknown>; oldOverrides?: Record<string, unknown> }
>({
  field: "overrides",
  getValue: (p) => p.overrides,
  getOldValue: (p) => p.oldOverrides,
});
