import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  base: "/config/",
  output: "static",
  build: { assets: "_assets" },
});
