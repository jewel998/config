import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpTransport } from "./HttpTransport";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpTransport version requests", () => {
  it("shares concurrent version requests", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const transport = createHttpTransport({
      baseUrl: "https://example.test/api",
      clientId: "cid_test",
      evaluationMode: "server",
    });
    const secondTransport = createHttpTransport({
      baseUrl: "https://example.test/api",
      clientId: "cid_test",
      evaluationMode: "server",
    });

    const first = transport.requestVersion<{ data: { version: number } }>();
    const second = secondTransport.requestVersion<{ data: { version: number } }>();
    resolveResponse(
      new Response(JSON.stringify({ data: { version: 17 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: { version: 17 } },
      { data: { version: 17 } },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
