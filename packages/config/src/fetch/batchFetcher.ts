import type {
  ConfigFetcher,
  GetConfigResponse,
  HttpTransport,
} from "../types.js";

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
});
