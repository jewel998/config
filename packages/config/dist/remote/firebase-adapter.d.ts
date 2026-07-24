import type { RemoteConfigProvider } from "./provider";
export interface FirebaseRemoteConfigOptions {
    fetcher?: (key: string) => Promise<unknown>;
}
export declare const createFirebaseRemoteConfigProvider: (options?: FirebaseRemoteConfigOptions) => RemoteConfigProvider;
