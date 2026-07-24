export interface RemoteConfigProvider {
  getValue<T>(key: string): Promise<T | undefined>;
  refresh(): Promise<void>;
}

export const createRemoteConfigProvider = (): RemoteConfigProvider => ({
  getValue: async () => undefined,
  refresh: async () => {},
});
