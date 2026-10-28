import type { ConfigFetcher, FetchResult, GetConfigResponse, HttpTransport } from "../types.js";

interface VersionResponse {
  version: string;
  changedKeys: string[];
}

export const createProjectedFetcher = (transport: HttpTransport): ConfigFetcher => {
  let pendingKeys = new Set<string>();
  let batchPromise: Promise<FetchResult> | null = null;

  return {
    async fetchAll(): Promise<FetchResult> {
      const response = await transport.request<GetConfigResponse>("v1/config");
      return { data: response.data, version: response.version ?? null };
    },

    async fetchKeys(keys: string[]): Promise<FetchResult> {
      for (const key of keys) {
        pendingKeys.add(key);
      }

      if (!batchPromise) {
        batchPromise = new Promise<FetchResult>((resolve, reject) => {
          queueMicrotask(async () => {
            const batchedKeys = Array.from(pendingKeys);
            pendingKeys = new Set();
            batchPromise = null;

            try {
              const response = await transport.request<GetConfigResponse>("v1/config", {
                keys: batchedKeys,
              });
              resolve({ data: response.data, version: response.version ?? null });
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      const result = await batchPromise;

      // Return only the keys this caller requested
      const filtered: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in result.data) {
          filtered[key] = result.data[key];
        }
      }
      return { data: filtered, version: result.version };
    },

    async checkVersion(): Promise<{ version: string; changedKeys: string[] }> {
      const response = await transport.request<VersionResponse>("v1/version");
      return {
        version: String(response.version),
        changedKeys: response.changedKeys ?? [],
      };
    },
  };
};
