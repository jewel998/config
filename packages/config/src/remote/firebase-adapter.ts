import type { RemoteConfigProvider } from "./provider";

export interface FirebaseRemoteConfigOptions {
  fetcher?: (key: string) => Promise<unknown>;
}

export const createFirebaseRemoteConfigProvider = (
  options: FirebaseRemoteConfigOptions = {},
): RemoteConfigProvider => ({
  getValue: async <T>(key: string) => {
    const fetcher = options.fetcher;
    if (!fetcher) {
      return undefined as T | undefined;
    }

    const value = await fetcher(key);
    return value as T | undefined;
  },
  refresh: async () => {},
});
