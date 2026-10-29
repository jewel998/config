import { API_ENDPOINTS } from "../constants.js";
import type { ConfigFetcher, FetchResult, GetConfigResponse, HttpTransport } from "../types.js";

interface VersionResponse {
  data?: {
    version?: string | number;
    changedKeys?: string[];
  };
  version?: string | number;
  changedKeys?: string[];
}

export const createBatchFetcher = (transport: HttpTransport): ConfigFetcher => ({
  async fetchAll(): Promise<FetchResult> {
    const response = await transport.request<GetConfigResponse>(API_ENDPOINTS.config);
    return { data: response.data, version: response.version ?? null };
  },

  async fetchKeys(_keys: string[]): Promise<FetchResult> {
    // Batch mode always fetches everything
    const response = await transport.request<GetConfigResponse>(API_ENDPOINTS.config);
    return { data: response.data, version: response.version ?? null };
  },

  async checkVersion(): Promise<{ version: string; changedKeys: string[] }> {
    const response = await transport.requestVersion<VersionResponse>();
    const version = response.data?.version ?? response.version;
    return {
      version: String(version),
      changedKeys: response.data?.changedKeys ?? response.changedKeys ?? [],
    };
  },
});
