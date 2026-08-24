import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@jewel998/api": path.resolve(__dirname, "../packages/api/src/index.ts"),
    },
  },
});
