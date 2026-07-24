import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jewel998/config",
  description:
    "A lightweight, adapter-based configuration package for offline-first and remote-first apps.",
  base: "/config/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Configuration Scopes", link: "/guide/scopes" },
          { text: "Storage Adapters", link: "/guide/storage" },
          { text: "Remote Providers", link: "/guide/remote-providers" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "createConfigClient", link: "/api/" },
          { text: "Storage", link: "/api/storage" },
          { text: "Remote Providers", link: "/api/remote" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jewel998/config" },
    ],
  },
});
