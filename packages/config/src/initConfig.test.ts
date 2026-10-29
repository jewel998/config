import { afterEach, describe, expect, it, vi } from "vitest";

import { initConfig } from "./initConfig";

function makeLocalStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function cacheEntry(value: unknown): string {
  return JSON.stringify({ value, expiresAt: Date.now() + 60_000 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initConfig version gating", () => {
  it("uses the wrapped version response and avoids duplicate startup checks", async () => {
    const localStorage = makeLocalStorage({
      "@jewel998/config:__version__": cacheEntry(17),
      "@jewel998/config:__ctx__": cacheEntry("{}"),
      "@jewel998/config:app.jobs": cacheEntry("cached"),
      "@jewel998/config:__all__": cacheEntry({ "app.jobs": "cached" }),
    });

    vi.stubGlobal("window", {
      localStorage,
      requestIdleCallback: vi.fn(),
    });
    vi.stubGlobal("document", { addEventListener: vi.fn() });
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { version: 17, changedKeys: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const flags = initConfig({
      clientId: "cid_test",
      prefetch: ["app.jobs"],
      pollInterval: 1_000,
    });

    await flags.ready();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/version");
    expect(await flags.get("app.jobs")).toBe("cached");
  });
});
