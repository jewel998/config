import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jewel998/config",
  description:
    "A free, self-hostable feature flag and remote configuration platform for startups.",
  base: "/config/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
      { text: "Webhooks", link: "/api/webhooks" },
      { text: "Portal", link: "https://jewel998.github.io/config/portal/" },
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
          { text: "SDK Reference", link: "/api/" },
          { text: "Storage", link: "/api/storage" },
          { text: "Remote Providers", link: "/api/remote" },
          { text: "Webhooks", link: "/api/webhooks" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jewel998/config" },
    ],
  },
});
