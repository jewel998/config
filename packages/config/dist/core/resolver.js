export const resolveConfigValue = (key, options, _context) => {
    const definition = options.definitions.find((entry) => entry.key === key);
    if (!definition) {
        return undefined;
    }
    const cachedValue = options.cache?.[key];
    const remoteValue = options.remote?.[key];
    if (definition.sourceMode === "offline") {
        return cachedValue ?? definition.defaultValue ?? definition.fallbackValue;
    }
    if (definition.sourceMode === "remote") {
        return remoteValue ?? cachedValue ?? definition.defaultValue ?? definition.fallbackValue;
    }
    return cachedValue ?? remoteValue ?? definition.defaultValue ?? definition.fallbackValue;
};
