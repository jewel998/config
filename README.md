# @jewel998/config

A free, self-hostable feature flag and remote configuration platform for startups and small teams. Replace expensive services like LaunchDarkly and ConfigCat with a platform you control — running entirely on Firebase's free tier.

## Features

- **Feature flags** — Boolean, string, number, JSON, array value types
- **Targeting rules** — Serve different values based on user attributes (plan, country, etc.)
- **Percentage rollouts** — Gradually roll out features to a % of users
- **Segments** — Reusable audience groups for targeting
- **Scheduling** — Schedule config changes for a future date/time
- **Prerequisites** — Flag dependencies (require flag A before flag B takes effect)
- **Environments** — Separate dev/staging/production configs
- **Audit log** — Track every change with actor, timestamp, and diff viewer
- **Webhooks** — Notify Slack, Discord, Google Chat, MS Teams, or custom endpoints
- **RBAC** — Viewer, Editor, Admin roles per project
- **SDK** — JavaScript/TypeScript SDK with local evaluation, caching, and plugins
- **Self-hosted** — Runs on Firebase free tier ($0/month for startups)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Your App (Browser / Node.js)                        │
│                                                     │
│  import { createConfig } from "@jewel998/config"    │
│  const config = createConfig({ clientId: "..." })   │
│  config.getFlag("feature.dark_mode") → true         │
└──────────────────────┬──────────────────────────────┘
                       │ GET /api/getConfig?clientId=x
                       ▼
┌──────────────────────────────────────────────────────┐
│ Firebase Hosting CDN (60s cache → $0 per request)    │
└──────────────────────┬───────────────────────────────┘
                       │ cache miss
                       ▼
┌──────────────────────────────────────────────────────┐
│ Cloud Function: getConfig                            │
│ - Validates clientId                                 │
│ - Reads configs from Firestore                      │
│ - Returns { data: { key: value }, version, ts }     │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│ Firestore (configs, environments, projects)          │
└──────────────────────────────────────────────────────┘
                       ▲
                       │ manage via
┌──────────────────────┴───────────────────────────────┐
│ Config Portal (React SPA)                            │
│ - Create/edit feature flags                          │
│ - Set targeting rules, rollouts, schedules           │
│ - Manage team, environments, API keys                │
│ - View audit log with diff viewer                    │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install the SDK

```bash
npm install @jewel998/config
```

### 2. Initialize in your app

```typescript
import { createConfig } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_your_key_here", // Get this from Portal → API Keys
});

// Read a feature flag
const darkMode = config.getFlag("feature.dark_mode");

// Read a typed value
const maxUpload = config.getValue<number>("app.max_upload_mb", 10);

// Listen for real-time updates
config.on("updated", ({ keys }) => {
  console.log("Configs changed:", keys);
});
```

### 3. Advanced: Targeting & Rollout (client-side evaluation)

```typescript
import { createConfig } from "@jewel998/config";
import { targetingPlugin } from "@jewel998/config/targeting";
import { rolloutPlugin } from "@jewel998/config/rollout";

const config = createConfig({
  clientId: "cid_xxx",
  plugins: [targetingPlugin(), rolloutPlugin()],
  context: {
    userId: "user_123",
    attributes: { plan: "pro", country: "US" },
  },
});

// Targeting rules and rollout are evaluated locally — no extra network calls
const showNewCheckout = config.getFlag("feature.checkout_v2");
```

## Monorepo Structure

```
apps/
  portal/      — Admin portal (React + Vite + TanStack Router)
  docs/        — Documentation site (VitePress)
packages/
  config/      — SDK (@jewel998/config)
  tour/        — Declarative tour framework (@jewel998/tour)
functions/     — Firebase Cloud Functions (API + webhooks)
```

## Development

```bash
# Install dependencies
pnpm install

# Start the portal dev server
pnpm --filter @jewel998/config-portal run dev

# Build the SDK
pnpm --filter @jewel998/config run build

# Run SDK tests
pnpm --filter @jewel998/config run test

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy everything
firebase deploy
```

## API Reference

### GET /api/getConfig

Fetch config values for an SDK client.

**Query params:**

- `clientId` (required) — API key from the portal
- `keys` (optional) — Comma-separated list of specific keys to fetch

**Response:**

```json
{
  "data": {
    "feature.dark_mode": true,
    "app.max_upload_mb": 10,
    "app.name": "My App"
  },
  "version": "3",
  "timestamp": "2024-01-15T09:30:00.000Z"
}
```

**Errors:**

- `401` — Invalid or revoked clientId
- `403` — Origin domain not in allowedDomains
- `429` — Rate limited (if enabled)

### Security Model

- **Client-side SDK keys** are public (visible in browser). This is industry standard.
- Security is provided by: read-only API, domain validation, CDN caching.
- **Never put sensitive data in config values** — flags are meant to control features, not store secrets.

### Rate Limiting (Optional)

Rate limiting is not enabled by default. To add it, see the commented section in `functions/src/api/get-config.ts`. It uses a Firestore counter per clientId with a configurable window (default: 100 req/min).

## Cost

Running entirely on Firebase free tier:

| Component       | Free Tier      | Typical Startup Usage   | Monthly Cost |
| --------------- | -------------- | ----------------------- | ------------ |
| Cloud Functions | 2M invocations | ~1,500 (with CDN cache) | $0           |
| Firestore reads | 50K/day        | ~3,000/day              | $0           |
| Hosting/CDN     | 10GB bandwidth | ~100MB                  | $0           |
| **Total**       |                |                         | **$0**       |

## License

MIT
