export const memoryStorage = () => {
  const store = new Map();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    delete: (key) => {
      store.delete(key);
    },
  };
};
export const createDriverStorage = (
  driver,
  storageKey = "@jewel998/config",
) => ({
  get: async (key) => driver.getItem(`${storageKey}:${key}`),
  set: async (key, value) => {
    await driver.setItem(`${storageKey}:${key}`, value);
  },
  delete: async (key) => {
    await driver.removeItem(`${storageKey}:${key}`);
  },
});
export const browserStorage = (storageKey = "@jewel998/config") => {
  const isBrowser =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  if (!isBrowser) {
    return memoryStorage();
  }
  const driver = {
    name: "localStorage",
    getItem: async (key) => {
      const serialized = window.localStorage.getItem(key);
      return serialized ? JSON.parse(serialized) : undefined;
    },
    setItem: async (key, value) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: async (key) => {
      window.localStorage.removeItem(key);
    },
  };
  return createDriverStorage(driver, storageKey);
};
