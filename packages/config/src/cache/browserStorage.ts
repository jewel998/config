/// <reference lib="dom" />

import type { BrowserStorageOptions, CacheEntry, CacheStorage } from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";
import { memoryStorage } from "./memoryStorage.js";

export const browserStorage = (options?: BrowserStorageOptions): CacheStorage => {
  const prefix = options?.prefix ?? "@jewel998/config";
  const defaultTtl = options?.defaultTtl ?? DEFAULT_CACHE_TTL;

  const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  if (!isBrowser) {
    return memoryStorage();
  }

  return {
    get<T>(key: string): T | undefined {
      const raw = window.localStorage.getItem(`${prefix}:${key}`);
      if (!raw) {
        return undefined;
      }

      try {
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (Date.now() > entry.expiresAt) {
          window.localStorage.removeItem(`${prefix}:${key}`);
          return undefined;
        }
        return entry.value;
      } catch {
        window.localStorage.removeItem(`${prefix}:${key}`);
        return undefined;
      }
    },

    set<T>(key: string, value: T, ttl: number = defaultTtl): void {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl,
      };
      window.localStorage.setItem(`${prefix}:${key}`, JSON.stringify(entry));
    },

    delete(key: string): void {
      window.localStorage.removeItem(`${prefix}:${key}`);
    },

    clear(): void {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(`${prefix}:`)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    },
  };
};
