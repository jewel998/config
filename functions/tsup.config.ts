import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/api/get-config.ts",
    "src/api/get-version.ts",
    "src/callables/export-configs.ts",
    "src/callables/test-webhook.ts",
    "src/triggers/on-audit-created.ts",
    "src/identity/validate-sign-in.ts",
  ],
  format: ["esm"],
  clean: true,
  target: "node22",
  outDir: "dist",
  splitting: true,
  noExternal: ["@jewel998/api"],
  external: ["firebase-functions", "firebase-admin"],
});
