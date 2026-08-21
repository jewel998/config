import type {
  ConfigFetcher,
  GetConfigResponse,
  HttpTransport,
} from "../types.js";

interface VersionResponse {
  version: string;
  changedKeys: string[];
}

export const createBatchFetcher = (
  transport: HttpTransport,
): ConfigFetcher => ({
  async fetchAll(): Promise<Record<string, unknown>> {
    const response = await transport.request<GetConfigResponse>("getConfig");
    return response.data;
  },

  async fetchKeys(_keys: string[]): Promise<Record<string, unknown>> {
    // Batch mode always fetches everything
    const response = await transport.request<GetConfigResponse>("getConfig");
    return response.data;
  },

  async checkVersion(): Promise<{ version: string; changedKeys: string[] }> {
    const response = await transport.request<VersionResponse>("getVersion");
    return {
      version: String(response.version),
      changedKeys: response.changedKeys ?? [],
    };
  },
});
