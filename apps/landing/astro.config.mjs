import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react()],
  base: "/config/",
  output: "static",
  build: { assets: "_assets" },
});
