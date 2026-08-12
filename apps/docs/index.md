---
layout: home
hero:
  name: "@jewel998/config"
  tagline: Free, self-hostable feature flags and remote configuration for startups. Replace LaunchDarkly at $0/month.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Compare with Competitors
      link: /comparison/
    - theme: alt
      text: Open Portal
      link: https://jewel998.github.io/config/portal/
features:
  - title: 🎯 Segments & Targeting
    details: Create reusable audience segments. Target users by plan, country, device, or any custom attribute. Assign values directly to segments with one click.
  - title: 🚀 Percentage Rollouts
    details: Gradually roll out features to 5%, 20%, 50% of users. Deterministic bucketing ensures consistent experience per user.
  - title: 🔒 Server-Side Evaluation
    details: Client keys (cid_) never expose your targeting rules or segments. The API evaluates everything server-side and returns only resolved values.
  - title: 👥 Team Collaboration
    details: Invite team members with Viewer, Editor, or Admin roles. Full RBAC per project — no over-privileged access.
  - title: 📋 Audit Log with Diffs
    details: Track every change with who, what, when. Git-style diff viewer shows exactly what changed, unified or side-by-side.
  - title: 🔔 Webhook Notifications
    details: Get notified on Slack, Discord, Google Chat, MS Teams, or any HTTP endpoint when configs change. Filter by event type, resource, or environment.
  - title: 🌐 Multi-Environment
    details: Separate dev, staging, and production configs in one project. Each environment has its own API keys and configs.
  - title: 💰 $0/month on Firebase
    details: Runs entirely on Firebase free tier. No vendor lock-in, no usage-based pricing surprises. You own your data.
---

## Why Another Feature Flag Platform?

Most teams outgrow basic config management quickly. They need segments, targeting, rollouts, and audit trails. The options are:

| Option                 | Cost     | Problem                                     |
| ---------------------- | -------- | ------------------------------------------- |
| LaunchDarkly           | $500+/mo | Way too expensive for startups              |
| ConfigCat              | $100+/mo | Limited free tier, per-seat pricing         |
| Flagsmith              | $45+/mo  | Self-hosted is complex                      |
| Firebase Remote Config | Free     | No segments, no audit, no RBAC, no webhooks |
| Environment variables  | Free     | No targeting, no rollouts, no UI            |

**@jewel998/config** gives you LaunchDarkly-level features on Firebase's free tier. Self-host it, own your data, and never get a surprise bill.

## Quick Start

```bash
npm install @jewel998/config
```

```typescript
import { createConfig, autoContext, mergeContext } from "@jewel998/config";

// Frontend: Client key → API evaluates targeting, returns resolved values
const config = createConfig({
  clientId: "cid_xxx",
  context: mergeContext(autoContext(), {
    userId: "user_123",
    attributes: { plan: "pro" },
  }),
});

const darkMode = config.getFlag("feature.dark_mode");
const limit = config.getValue("app.upload_limit", 10);
```

[Full documentation →](/guide/getting-started)
