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
export declare const memoryStorage: () => CacheStorage;
export declare const createDriverStorage: (driver: CacheDriver, storageKey?: string) => CacheStorage;
export declare const browserStorage: (storageKey?: string) => CacheStorage;
