import type { ConfigDefinition } from "./types";
export interface ConfigRegistry {
    definitions: ConfigDefinition[];
    get(key: string): ConfigDefinition | undefined;
    add(definition: ConfigDefinition): void;
    remove(key: string): void;
}
export declare const createConfigRegistry: (definitions?: ConfigDefinition[]) => ConfigRegistry;
