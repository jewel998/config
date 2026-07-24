import { describe, expect, it } from "vitest";

import { resolveConfigValue } from "./resolver";

describe("resolveConfigValue", () => {
  it("returns default value for offline key when cache is missing", () => {
    const result = resolveConfigValue<boolean>("feature.enabled", {
      definitions: [
        {
          key: "feature.enabled",
          defaultValue: false,
          sourceMode: "offline",
          scope: "project",
        },
      ],
      cache: {},
      remote: {},
    });

    expect(result).toBe(false);
  });

  it("prefers cache value for offline key when available", () => {
    const result = resolveConfigValue<boolean>("feature.enabled", {
      definitions: [
        {
          key: "feature.enabled",
          defaultValue: false,
          sourceMode: "offline",
          scope: "project",
        },
      ],
      cache: { "feature.enabled": true },
      remote: { "feature.enabled": false },
    });

    expect(result).toBe(true);
  });

  it("prefers remote for remote-first key when available", () => {
    const result = resolveConfigValue<boolean>("feature.beta", {
      definitions: [
        {
          key: "feature.beta",
          defaultValue: false,
          sourceMode: "remote",
          scope: "project",
        },
      ],
      cache: { "feature.beta": true },
      remote: { "feature.beta": false },
    });

    expect(result).toBe(false);
  });
});
