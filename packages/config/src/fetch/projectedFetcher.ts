import type {
  ConfigFetcher,
  GetConfigResponse,
  HttpTransport,
} from "../types.js";

interface VersionResponse {
  version: string;
  changedKeys: string[];
}

export const createProjectedFetcher = (
  transport: HttpTransport,
): ConfigFetcher => {
  let pendingKeys = new Set<string>();
  let batchPromise: Promise<Record<string, unknown>> | null = null;

  return {
    async fetchAll(): Promise<Record<string, unknown>> {
      const response = await transport.request<GetConfigResponse>("getConfig");
      return response.data;
    },

    async fetchKeys(keys: string[]): Promise<Record<string, unknown>> {
      for (const key of keys) {
        pendingKeys.add(key);
      }

      if (!batchPromise) {
        batchPromise = new Promise<Record<string, unknown>>(
          (resolve, reject) => {
            queueMicrotask(async () => {
              const batchedKeys = Array.from(pendingKeys);
              pendingKeys = new Set();
              batchPromise = null;

              try {
                const response = await transport.request<GetConfigResponse>(
                  "getConfig",
                  {
                    keys: batchedKeys,
                  },
                );
                resolve(response.data);
              } catch (err) {
                reject(err);
              }
            });
          },
        );
      }

      const result = await batchPromise;

      // Return only the keys this caller requested
      const filtered: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in result) {
          filtered[key] = result[key];
        }
      }
      return filtered;
    },

    async checkVersion(): Promise<{ version: string; changedKeys: string[] }> {
      const response = await transport.request<VersionResponse>("getVersion");
      return {
        version: String(response.version),
        changedKeys: response.changedKeys ?? [],
      };
    },
  };
};
