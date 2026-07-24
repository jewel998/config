import { describe, expect, it } from "vitest";
import { createFirebaseRemoteConfigProvider } from "./firebase-adapter";
describe("createFirebaseRemoteConfigProvider", () => {
  it("returns a remote value from a supplied fetcher", async () => {
    const provider = createFirebaseRemoteConfigProvider({
      fetcher: async (key) => {
        if (key === "feature.beta") {
          return true;
        }
        return undefined;
      },
    });
    await expect(provider.getValue("feature.beta")).resolves.toBe(true);
  });
});
