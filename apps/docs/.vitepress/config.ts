import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jewel998/config",
  description:
    "A free, self-hostable feature flag and remote configuration platform for startups.",
  base: "/config/",
  sitemap: { hostname: "https://jewel998.github.io/config/" },
  themeConfig: {
    siteTitle: "Docs",
    logoLink: "https://jewel998.github.io/config/",
    nav: [
      { text: "Home", link: "https://jewel998.github.io/config/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Features", link: "/features/segments" },
      { text: "API", link: "/api/" },
      { text: "Portal", link: "https://jewel998.github.io/config/portal/" },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Quick Start", link: "/guide/getting-started" },
          { text: "Self-Hosting Guide", link: "/guide/self-hosting" },
          { text: "Configuration Scopes", link: "/guide/scopes" },
        ],
      },
      {
        text: "Core Features",
        items: [
          { text: "Segments", link: "/features/segments" },
          { text: "Targeting Rules", link: "/features/targeting" },
          { text: "Percentage Rollouts", link: "/features/rollouts" },
          { text: "Prerequisites", link: "/features/prerequisites" },
          { text: "Scheduling", link: "/features/scheduling" },
        ],
      },
      {
        text: "Platform",
        items: [
          { text: "Environments", link: "/features/environments" },
          { text: "Team & RBAC", link: "/features/team" },
          { text: "Audit Log", link: "/features/audit-log" },
          { text: "Webhooks", link: "/features/webhooks" },
        ],
      },
      {
        text: "SDK Reference",
        items: [
          { text: "initConfig", link: "/api/" },
          { text: "Storage Adapters", link: "/guide/storage" },
          { text: "Webhook API", link: "/api/webhooks" },
        ],
      },
      {
        text: "Compliance & Security",
        items: [
          { text: "Overview", link: "/compliance/" },
          { text: "GDPR", link: "/compliance/gdpr" },
          { text: "SOC 2", link: "/compliance/soc2" },
        ],
      },
      {
        text: "Compare",
        items: [{ text: "vs. Competitors", link: "/comparison/" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jewel998/config" },
    ],
  },
});
