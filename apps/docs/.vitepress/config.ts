import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jewel998/config",
  description:
    "A free, self-hostable feature flag and remote configuration platform for startups.",
  base: "/config/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Features", link: "/features/segments" },
      { text: "API", link: "/api/" },
      { text: "Compliance", link: "/compliance/" },
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
        text: "Features",
        items: [
          { text: "Segments", link: "/features/segments" },
          { text: "Targeting Rules", link: "/features/targeting" },
          { text: "Percentage Rollouts", link: "/features/rollouts" },
          { text: "Prerequisites", link: "/features/prerequisites" },
          { text: "Scheduling", link: "/features/scheduling" },
          { text: "Environments", link: "/features/environments" },
          { text: "Team Collaboration", link: "/features/team" },
          { text: "Audit Log", link: "/features/audit-log" },
          { text: "Webhooks", link: "/features/webhooks" },
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
      {
        text: "Compliance",
        items: [
          { text: "Overview", link: "/compliance/" },
          { text: "GDPR", link: "/compliance/gdpr" },
          { text: "SOC 2", link: "/compliance/soc2" },
        ],
      },
      {
        text: "Comparison",
        items: [{ text: "vs. Competitors", link: "/comparison/" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jewel998/config" },
    ],
  },
});
