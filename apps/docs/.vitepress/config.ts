import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import taskLists from "markdown-it-task-lists";

export default withMermaid(
  defineConfig({
    title: "@jewel998/config",
    description:
      "A free, self-hostable feature flag and remote configuration platform for startups.",
    base: "/config/",
    sitemap: { hostname: "https://jewel998.github.io/config/" },
    markdown: {
      config: (md) => {
        md.use(taskLists);
      },
    },
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
            { text: "Concepts & Glossary", link: "/guide/concepts" },
            { text: "Self-Hosting", link: "/guide/self-hosting" },
            { text: "Performance Tuning", link: "/guide/performance" },
            { text: "Cost & Scaling", link: "/guide/cost" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
          ],
        },
        {
          text: "SDK Guide",
          items: [
            { text: "Loading Strategies", link: "/guide/loading-strategies" },
            { text: "Storage & Caching", link: "/guide/storage" },
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
            { text: "Import", link: "/features/import" },
            { text: "Export", link: "/features/export" },
          ],
        },
        {
          text: "SDK Reference",
          items: [
            { text: "initConfig", link: "/api/" },
            { text: "Cloud Functions", link: "/api/cloud-functions" },
            { text: "Webhook API", link: "/api/webhooks" },
          ],
        },
        {
          text: "Operations",
          items: [
            { text: "Backup & Restore", link: "/guide/backup-restore" },
            { text: "Versioning", link: "/guide/versioning" },
            { text: "Migration Guides", link: "/guide/migrations/" },
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
        {
          text: "Contributing",
          items: [
            { text: "Architecture", link: "/contributing/architecture" },
            { text: "Local Development", link: "/contributing/development" },
          ],
        },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/jewel998/config" },
      ],
    },
  }),
);
