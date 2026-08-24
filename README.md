# @jewel998/config

[![npm version](https://img.shields.io/npm/v/@jewel998/config)](https://www.npmjs.com/package/@jewel998/config)
[![npm downloads](https://img.shields.io/npm/dm/@jewel998/config)](https://www.npmjs.com/package/@jewel998/config)
[![license](https://img.shields.io/npm/l/@jewel998/config)](./LICENSE)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/jewel998/config/publish-sdk.yml?label=publish)](https://github.com/jewel998/config/actions/workflows/publish-sdk.yml)
[![GitHub stars](https://img.shields.io/github/stars/jewel998/config)](https://github.com/jewel998/config)
[![Node.js](https://img.shields.io/node/v/@jewel998/config)](https://nodejs.org)

A free, self-hostable feature flag and remote configuration platform. Deploy to your own Firebase project. Replace LaunchDarkly at $0/month.

## Features

- **Feature flags** — Boolean, string, number, JSON, array value types
- **Targeting rules** — Serve different values based on user attributes (plan, country, etc.)
- **Segments** — Reusable audience groups with one-click targeting
- **Percentage rollouts** — Gradually roll out features with deterministic bucketing
- **Prerequisites** — Flag dependencies with operator support (equals, greater_than, etc.)
- **Scheduling** — Schedule config changes for a future date/time
- **Environments** — Separate dev/staging/production configs
- **Audit log** — Track every change with actor, timestamp, and diff viewer
- **Webhooks** — Notify Slack, Discord, Google Chat, MS Teams, or custom endpoints
- **RBAC** — Viewer, Editor, Admin roles per project
- **Server-side evaluation** — Client keys never expose targeting rules or segments
- **SDK** — Optimistic defaults, auto-context detection, instant reads
- **Self-hosted** — Runs entirely on Firebase free tier ($0/month)
- **7 languages** — English, Spanish, French, Arabic, Chinese, Hindi, Japanese

## Self-Hosting

```bash
# 1. Clone
git clone https://github.com/jewel998/config && cd config

# 2. Connect your Firebase project
firebase use --add your-project-id

# 3. Install and deploy
pnpm install && firebase deploy
```

That's it. Portal, API, and hosting — all on your Firebase project.

## SDK Quick Start

```bash
npm install @jewel998/config
```

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx", // From your Portal → API Keys
  baseUrl: "https://your-project.web.app/api", // Your Firebase URL
  defaults: {
    "feature.dark_mode": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});

// Instant — returns default value, no loading state
flags.get("feature.dark_mode"); // → false

// After API responds, returns resolved value
flags.on("updated", () => {
  flags.get("feature.dark_mode"); // → true (matched targeting rule)
});
```

### API Key Types

| Prefix | Type   | Behavior                                                                                                            |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `cid_` | Client | For frontend. API evaluates targeting server-side, returns only values. Targeting rules and segments never exposed. |
| `svr_` | Server | For backend. API returns full flag data + segments for local evaluation via plugins.                                |

The API enforces the mode based on key prefix — cannot be overridden.

### Server Key (Backend)

```typescript
import { createConfig } from "@jewel998/config";
import { targetingPlugin } from "@jewel998/config/targeting";
import { rolloutPlugin } from "@jewel998/config/rollout";

const config = createConfig({
  clientId: "svr_xxx",
  baseUrl: "https://your-project.web.app/api",
  plugins: [targetingPlugin(), rolloutPlugin()],
  context: { userId: "user_123", attributes: { plan: "pro", country: "US" } },
});

config.getFlag("feature.checkout_v2"); // Evaluated locally — no round-trip
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Your App                                            │
│                                                     │
│  import { initConfig } from "@jewel998/config"      │
│  const flags = initConfig({ clientId, baseUrl })    │
│  flags.get("feature.dark_mode") → true              │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/v1/config
                       ▼
┌──────────────────────────────────────────────────────┐
│ Your Firebase Hosting (CDN cached)                   │
└──────────────────────┬───────────────────────────────┘
                       │ cache miss
                       ▼
┌──────────────────────────────────────────────────────┐
│ Your Cloud Function: getConfig                       │
│ - Validates clientId (cid_ or svr_)                 │
│ - cid_: evaluates targeting server-side             │
│ - svr_: returns full flag data for local eval       │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│ Your Firestore (configs, segments, projects)         │
└──────────────────────────────────────────────────────┘
                       ▲
                       │
┌──────────────────────┴───────────────────────────────┐
│ Your Portal (React SPA on Firebase Hosting)          │
│ - Create/edit feature flags and segments             │
│ - Set targeting rules, rollouts, schedules           │
│ - Manage team, environments, API keys                │
│ - View audit log with diff viewer                    │
│ - Configure webhook notifications                    │
└──────────────────────────────────────────────────────┘
```

## API Reference

### POST /api/v1/config

The SDK calls this endpoint. Mode is determined by the API key prefix.

**Request:**

```json
{
  "data": {
    "clientId": "cid_xxx",
    "context": {
      "userId": "user_123",
      "attributes": { "plan": "pro", "country": "US" }
    }
  }
}
```

**Response (cid\_ key) — resolved values only:**

```json
{
  "data": { "feature.dark_mode": true, "app.upload_limit": 200 },
  "version": "3",
  "timestamp": "2025-01-15T09:30:00.000Z"
}
```

**Response (svr\_ key) — full flag data + segments:**

```json
{
  "data": {
    "feature.dark_mode": {
      "key": "feature.dark_mode",
      "value": false,
      "targetingRules": [...]
    }
  },
  "segments": { "seg_beta": { "id": "...", "conditions": [...] } },
  "version": "3",
  "timestamp": "2025-01-15T09:30:00.000Z"
}
```

**Errors:** `401` Invalid key · `403` Domain not allowed · `413` Context too large

## Monorepo Structure

```
apps/
  portal/      — Admin portal (React + Vite + TanStack Router)
  landing/     — Marketing site (Astro + React)
  docs/        — Documentation (VitePress)
packages/
  config/      — SDK (@jewel998/config)
  tour/        — Tour framework (@jewel998/tour)
functions/     — Firebase Cloud Functions (API + webhooks)
```

## Development

```bash
pnpm install                                    # Install deps
pnpm --filter @jewel998/config-portal run dev   # Portal dev server
pnpm --filter @jewel998/config-landing run dev  # Landing page dev
pnpm --filter @jewel998/config run test         # SDK tests (210 passing)
firebase deploy                                 # Deploy everything
```

## Upgrades

When new versions are released, pull the latest and redeploy:

```bash
git pull origin main
pnpm install
firebase deploy
```

Migration guides are provided for breaking changes. Your data stays in your Firestore.

## Cost

The SDK polls a lightweight version endpoint (100 bytes) every 5 minutes. CDN absorbs 99%+ of these requests. Full config fetches only happen on init or version change.

| Scale                | Monthly Cost | Notes                                         |
| -------------------- | ------------ | --------------------------------------------- |
| 1–1,000 users        | **$0**       | Well within Firebase Spark (free) tier        |
| 1,000–50,000 users   | **$0**       | CDN handles most version polls at edge        |
| 50,000–100,000 users | **$0–5**     | May slightly exceed free function invocations |
| 100,000+ users       | **$5–15**    | Blaze plan with minimal overage               |

Firebase free tier: 2M function invocations/month, 50K Firestore reads/day, 10GB bandwidth.

## License

[Elastic License 2.0](./LICENSE) — Use, modify, and self-host freely. Cannot be provided as a managed service to third parties.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, commit conventions, and PR guidelines.
