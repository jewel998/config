import { describe, expect, it } from "vitest";

import { createConfigRegistry } from "./registry";

describe("createConfigRegistry", () => {
  it("stores and retrieves definitions by key", () => {
    const registry = createConfigRegistry();

    registry.add({
      key: "feature.beta",
      defaultValue: false,
      sourceMode: "remote",
      scope: "project",
    });

    expect(registry.get("feature.beta")?.defaultValue).toBe(false);
  });

  it("removes definitions by key", () => {
    const registry = createConfigRegistry();

    registry.add({
      key: "feature.beta",
      defaultValue: false,
      sourceMode: "remote",
      scope: "project",
    });

    registry.remove("feature.beta");

    expect(registry.get("feature.beta")).toBeUndefined();
  });
});
