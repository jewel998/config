export const createConfigRegistry = (definitions = []) => {
    const items = [...definitions];
    return {
        definitions: items,
        get: (key) => items.find((definition) => definition.key === key),
        add: (definition) => {
            const existingIndex = items.findIndex((entry) => entry.key === definition.key);
            if (existingIndex >= 0) {
                items[existingIndex] = definition;
                return;
            }
            items.push(definition);
        },
        remove: (key) => {
            const index = items.findIndex((definition) => definition.key === key);
            if (index >= 0) {
                items.splice(index, 1);
            }
        },
    };
};
