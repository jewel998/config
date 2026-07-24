import { resolveConfigValue } from "./core/resolver";
const buildScopedKey = (key, context) => {
    if (!context) {
        return key;
    }
    const parts = [key];
    if (context.tenantId) {
        parts.push(`tenant:${context.tenantId}`);
    }
    if (context.projectId) {
        parts.push(`project:${context.projectId}`);
    }
    if (context.environment) {
        parts.push(`environment:${context.environment}`);
    }
    return parts.join(":");
};
const resolveCachedValue = async (storage, key, context) => {
    const candidates = [key];
    if (context?.projectId) {
        candidates.push(`${key}:${context.projectId}`);
        candidates.push(`${key}:project:${context.projectId}`);
    }
    if (context?.tenantId) {
        candidates.push(`${key}:${context.tenantId}`);
        candidates.push(`${key}:tenant:${context.tenantId}`);
    }
    if (context?.environment) {
        candidates.push(`${key}:${context.environment}`);
        candidates.push(`${key}:environment:${context.environment}`);
    }
    if (context?.tenantId && context?.projectId) {
        candidates.push(`${key}:${context.tenantId}:${context.projectId}`);
    }
    candidates.push(buildScopedKey(key, context));
    for (const candidate of candidates) {
        const value = await storage.get(candidate);
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
};
export const createConfigClient = (options) => {
    const storage = options.storage;
    const remoteProvider = options.remoteProvider;
    const definitions = options.definitions;
    const getValue = async (key, context) => {
        if (!storage) {
            return undefined;
        }
        const cachedValue = await resolveCachedValue(storage, key, context);
        const remoteValue = remoteProvider ? await remoteProvider.getValue(key) : undefined;
        return resolveConfigValue(key, {
            definitions,
            cache: cachedValue !== undefined ? { [key]: cachedValue } : {},
            remote: remoteValue !== undefined ? { [key]: remoteValue } : {},
        });
    };
    return {
        getValue,
        getFlag: async (key, context) => {
            const value = await getValue(key, context);
            return Boolean(value);
        },
        refresh: async () => {
            if (!storage || !remoteProvider) {
                return;
            }
            const values = definitions.map(async (definition) => {
                const remoteValue = await remoteProvider.getValue(definition.key);
                if (remoteValue !== undefined) {
                    await storage.set(definition.key, remoteValue);
                }
            });
            await Promise.all(values);
        },
    };
};
