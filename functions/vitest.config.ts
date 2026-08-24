import { defineConfig } from "vitest/config";
import path from "path";

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
