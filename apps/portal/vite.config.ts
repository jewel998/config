import path from "path";

import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    lingui(),
    react({ babel: { plugins: ["@lingui/babel-plugin-lingui-macro"] } }),
    tailwindcss(),
  ],
  base: "/config/portal/",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/")
          ) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/firebase/") ||
            id.includes("node_modules/@firebase/")
          ) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules/@tanstack/react-router")) {
            return "vendor-router";
          }
          if (
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/sonner") ||
            id.includes("node_modules/@radix-ui/")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
});
