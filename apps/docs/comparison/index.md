# Comparison with Competitors

> See also: [Self-Hosting Guide](/guide/self-hosting) · [Cost & Scaling](/guide/cost) · [Segments](/features/segments)

How @jewel998/config stacks up against other feature flag platforms.

## Feature Comparison

| Feature                               | @jewel998/config | LaunchDarkly |   ConfigCat   |   Flagsmith   | Firebase Remote Config |
| ------------------------------------- | :--------------: | :----------: | :-----------: | :-----------: | :--------------------: |
| **Feature Flags**                     |        ✅        |      ✅      |      ✅       |      ✅       |           ✅           |
| **Segments (reusable audiences)**     |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Targeting Rules**                   |        ✅        |      ✅      |      ✅       |      ✅       |  ⚠️ Basic conditions   |
| **Percentage Rollouts**               |        ✅        |      ✅      |      ✅       |      ✅       |           ✅           |
| **Prerequisites (flag dependencies)** |        ✅        |      ✅      |      ❌       |      ❌       |           ❌           |
| **Scheduling**                        |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Multi-Environment**                 |        ✅        |      ✅      |      ✅       |      ✅       | ❌ (separate projects) |
| **Audit Log**                         |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Diff Viewer**                       |        ✅        |      ✅      |      ❌       |      ❌       |           ❌           |
| **Webhooks**                          |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Slack/Discord/Teams**               |        ✅        |      ✅      | ⚠️ Slack only | ⚠️ Slack only |           ❌           |
| **Custom Webhook Templates**          |        ✅        |      ❌      |      ❌       |      ❌       |           ❌           |
| **RBAC (roles per project)**          |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Server-Side Evaluation**            |        ✅        |      ✅      |      ✅       |      ✅       |           ❌           |
| **Auto-Context Detection**            |        ✅        |      ❌      |      ❌       |      ❌       |           ❌           |
| **GDPR Tools (data deletion)**        |        ✅        |      ✅      |      ✅       |      ⚠️       |           ❌           |
| **Self-Hostable**                     |        ✅        |      ❌      |      ❌       |      ✅       |           ❌           |
| **Open Source**                       |        ✅        |      ❌      |      ❌       |      ✅       |           ❌           |
| **API Key Security (client/server)**  |        ✅        |      ✅      |      ⚠️       |      ⚠️       |           ⚠️           |

## Pricing Comparison

| Platform               | Free Tier                | Paid Starting At | Per-Seat? |
| ---------------------- | ------------------------ | ---------------- | --------- |
| **@jewel998/config**   | Unlimited (self-hosted)  | $0 forever       | No        |
| LaunchDarkly           | None                     | ~$500/mo         | Yes       |
| ConfigCat              | 10 flags, 2 environments | $100/mo          | Yes       |
| Flagsmith              | 50K requests             | $45/mo           | Yes       |
| Firebase Remote Config | 2000 parameters          | Free             | No        |

::: info Why not Firebase Remote Config?
Firebase Remote Config is free and performs server-side evaluation, but lacks reusable segments, detailed targeting rules with DNF conditions, a diff-based audit log, webhooks, environment isolation, team RBAC, and import/export tooling. It's a great starting point for simple use cases, but @jewel998/config provides the full feature flag management platform that growing teams need.
:::

## What We Solve That Others Don't

### 1. Cost Barrier for Startups

LaunchDarkly and ConfigCat price per seat and per environment. A 5-person team with dev/staging/prod can easily hit $500+/month just for feature flags. @jewel998/config runs on Firebase's free tier — $0/month regardless of team size.

### 2. Data Ownership

With SaaS platforms, your feature flag data lives on their servers. You're subject to their uptime, their data policies, and their pricing changes. With @jewel998/config, everything runs on your own Firebase project. You control the data.

### 3. Vendor Lock-in

SaaS platforms use proprietary SDKs and APIs. Migrating away means rewriting integration code. @jewel998/config uses a standard, simple SDK with a transparent API — if you ever outgrow it, the data is in your Firestore.

### 4. Complexity of Self-Hosting

Flagsmith is open-source but requires Docker, PostgreSQL, Redis, and significant ops effort. @jewel998/config deploys with a single `firebase deploy` — no servers to manage, no databases to maintain.

### 5. Business Logic Exposure

Most platforms send full targeting rules to the client SDK. @jewel998/config's client keys (`cid_`) enforce server-side evaluation — your targeting logic, segments, and rollout percentages are never exposed to the browser.

## When to Choose Something Else

- **You need enterprise SSO/SAML** — LaunchDarkly has this, we don't (yet)
- **You need experimentation/A/B testing** — LaunchDarkly and Split.io have built-in experimentation
- **You need 99.99% SLA** — SaaS platforms offer contractual uptime guarantees
- **You have 100+ team members** — Enterprise platforms have better governance features
- **You need mobile-native SDKs** — We currently support web/JS only

For startups and small teams (1-20 people) that need real feature management without the enterprise price tag, @jewel998/config is the right choice.
