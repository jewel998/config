import { describe, expect, it, vi } from "vitest";

import { TierFetcher } from "./TierFetcher";

describe("TierFetcher", () => {
  it("deduplicates concurrent full fetches", async () => {
    let resolveFetch!: (result: { data: Record<string, unknown>; version: string }) => void;
    const fetchAll = vi.fn(
      () =>
        new Promise<{ data: Record<string, unknown>; version: string }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const fetcher = new TierFetcher({
      fetchAll,
      fetchKeys: vi.fn(),
      checkVersion: vi.fn(),
    });

    const first = fetcher.fetchAll();
    const second = fetcher.fetchAll();
    resolveFetch({ data: { "feature.enabled": true }, version: "17" });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: { "feature.enabled": true }, version: "17" },
      { data: { "feature.enabled": true }, version: "17" },
    ]);
    expect(fetchAll).toHaveBeenCalledTimes(1);
  });
});
