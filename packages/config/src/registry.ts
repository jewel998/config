import type { ConfigDefinition } from "./types";

export interface ConfigRegistry {
  definitions: ConfigDefinition[];
  get(key: string): ConfigDefinition | undefined;
  add(definition: ConfigDefinition): void;
  remove(key: string): void;
}

export const createConfigRegistry = (
  definitions: ConfigDefinition[] = [],
): ConfigRegistry => {
  const items = [...definitions];

  return {
    definitions: items,
    get: (key: string) => items.find((definition) => definition.key === key),
    add: (definition: ConfigDefinition) => {
      const existingIndex = items.findIndex(
        (entry) => entry.key === definition.key,
      );
      if (existingIndex >= 0) {
        items[existingIndex] = definition;
        return;
      }
      items.push(definition);
    },
    remove: (key: string) => {
      const index = items.findIndex((definition) => definition.key === key);
      if (index >= 0) {
        items.splice(index, 1);
      }
    },
  };
};
