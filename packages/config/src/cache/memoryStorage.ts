import type { CacheEntry, CacheStorage } from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";

export const memoryStorage = (): CacheStorage => {
  const store = new Map<string, CacheEntry>();

  return {
    get<T>(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) {
        return undefined;
      }
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },

    set<T>(key: string, value: T, ttl: number = DEFAULT_CACHE_TTL): void {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
};
