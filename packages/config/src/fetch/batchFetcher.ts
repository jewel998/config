import type { ConfigFetcher, FetchResult, GetConfigResponse, HttpTransport } from "../types.js";

interface VersionResponse {
  version: string;
  changedKeys: string[];
}

export const createBatchFetcher = (transport: HttpTransport): ConfigFetcher => ({
  async fetchAll(): Promise<FetchResult> {
    const response = await transport.request<GetConfigResponse>("v1/config");
    return { data: response.data, version: response.version ?? null };
  },

  async fetchKeys(_keys: string[]): Promise<FetchResult> {
    // Batch mode always fetches everything
    const response = await transport.request<GetConfigResponse>("v1/config");
    return { data: response.data, version: response.version ?? null };
  },

  async checkVersion(): Promise<{ version: string; changedKeys: string[] }> {
    const response = await transport.request<VersionResponse>("v1/version");
    return {
      version: String(response.version),
      changedKeys: response.changedKeys ?? [],
    };
  },
});
