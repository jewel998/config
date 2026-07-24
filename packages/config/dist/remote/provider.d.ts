export interface RemoteConfigProvider {
  getValue<T>(key: string): Promise<T | undefined>;
  refresh(): Promise<void>;
}
export declare const createRemoteConfigProvider: () => RemoteConfigProvider;
