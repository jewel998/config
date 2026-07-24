export interface CacheStorage {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

export interface CacheDriver {
  name: string;
  getItem<T>(key: string): Promise<T | undefined>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const memoryStorage = (): CacheStorage => {
  const store = new Map<string, unknown>();

  return {
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: <T>(key: string, value: T) => {
      store.set(key, value);
    },
    delete: (key: string) => {
      store.delete(key);
    },
  };
};

export const createDriverStorage = (
  driver: CacheDriver,
  storageKey = "@jewel998/config",
): CacheStorage => ({
  get: async <T>(key: string) => driver.getItem<T>(`${storageKey}:${key}`),
  set: async <T>(key: string, value: T) => {
    await driver.setItem(`${storageKey}:${key}`, value);
  },
  delete: async (key: string) => {
    await driver.removeItem(`${storageKey}:${key}`);
  },
});

export const browserStorage = (
  storageKey = "@jewel998/config",
): CacheStorage => {
  const isBrowser =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  if (!isBrowser) {
    return memoryStorage();
  }

  const driver: CacheDriver = {
    name: "localStorage",
    getItem: async <T>(key: string) => {
      const serialized = window.localStorage.getItem(key);
      return serialized ? (JSON.parse(serialized) as T) : undefined;
    },
    setItem: async <T>(key: string, value: T) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: async (key: string) => {
      window.localStorage.removeItem(key);
    },
  };

  return createDriverStorage(driver, storageKey);
};
