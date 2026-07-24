export const createFirebaseRemoteConfigProvider = (options = {}) => ({
    getValue: async (key) => {
        const fetcher = options.fetcher;
        if (!fetcher) {
            return undefined;
        }
        const value = await fetcher(key);
        return value;
    },
    refresh: async () => { },
});
