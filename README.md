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
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_your_key_here", // Get this from your Portal → API Keys
  baseUrl: "https://your-project.web.app/api", // Your self-hosted Firebase URL
  defaults: {
    "feature.dark_mode": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});

// Instantly returns default (false) — no loading state
const darkMode = flags.get("feature.dark_mode");

// After the API responds, returns the resolved value
flags.on("updated", () => {
  flags.get("feature.dark_mode"); // → true (from your targeting rules)
});

// Read a typed value
const maxUpload = config.getValue<number>("app.max_upload_mb", 10);

// Listen for real-time updates
config.on("updated", ({ keys }) => {
  console.log("Configs changed:", keys);
});
```

### 3. Backend: Full Flag Data (server key)

```typescript
import { createConfig } from "@jewel998/config";
import { targetingPlugin } from "@jewel998/config/targeting";
import { rolloutPlugin } from "@jewel998/config/rollout";

const config = createConfig({
  clientId: "svr_xxx", // Server key → full flag data for local evaluation
  plugins: [targetingPlugin(), rolloutPlugin()],
  context: {
    userId: "user_123",
    attributes: { plan: "pro", country: "US" },
  },
});

// Targeting rules and rollout are evaluated locally — no extra network calls
const showNewCheckout = config.getFlag("feature.checkout_v2");
```

### 4. Frontend: Server-Side Evaluation (client key)

With a client key (`cid_`), the SDK sends user context to the API. The API evaluates targeting rules, segments, and rollouts server-side, and returns only the resolved values. No business logic is exposed to the browser.

```typescript
import { createConfig, autoContext, mergeContext } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xxx", // Client key → API evaluates, returns resolved values only
  context: mergeContext(
    autoContext(), // Detects: browser, OS, device, screen, locale, timezone
    { userId: "user_123", attributes: { plan: "enterprise", country: "US" } },
  ),
});

// Values are pre-resolved by the API — no plugins needed
const darkMode = config.getFlag("feature.dark_mode"); // → true
const limit = config.getValue<number>("app.upload_limit", 10); // → 200

// When user context changes, SDK re-fetches resolved values
config.setContext({
  userId: "user_123",
  attributes: { plan: "free" },
});
// Triggers re-fetch → values update → "updated" event fires
```

### API Key Types

| Key Prefix | Type   | Behavior                                                    |
| ---------- | ------ | ----------------------------------------------------------- |
| `cid_`     | Client | For frontend. API evaluates targeting, returns only values. |
| `svr_`     | Server | For backend. API returns full flag data for local eval.     |

The API **enforces** the mode based on key prefix. A frontend consumer physically cannot get targeting rules or segment definitions — even if they try to override it in the request.

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

### POST /api/getConfig

Fetch config values for an SDK client. Supports two evaluation modes.

**Request body:**

```json
{
  "data": {
    "clientId": "cid_xxx",
    "evaluationMode": "server",
    "context": {
      "userId": "user_123",
      "attributes": { "plan": "pro", "country": "US", "browser": "Chrome" }
    },
    "keys": ["feature.dark_mode", "app.limit"]
  }
}
```

| Field                | Type     | Required | Description                                         |
| -------------------- | -------- | -------- | --------------------------------------------------- |
| `clientId`           | string   | Yes      | API key from the portal                             |
| `evaluationMode`     | string   | No       | `"server"` (default) or `"client"`                  |
| `context`            | object   | No       | User context for server-side targeting evaluation   |
| `context.userId`     | string   | No       | User identifier (for rollouts and overrides)        |
| `context.attributes` | object   | No       | Key-value pairs for targeting (plan, country, etc.) |
| `keys`               | string[] | No       | Specific keys to fetch (omit for all)               |

**Response (server mode) — only resolved values:**

```json
{
  "data": {
    "feature.dark_mode": true,
    "app.limit": 200
  },
  "version": "3",
  "timestamp": "2024-01-15T09:30:00.000Z",
  "warnings": []
}
```

**Response (client mode) — full flag data + segments for local evaluation:**

```json
{
  "data": {
    "feature.dark_mode": {
      "key": "feature.dark_mode",
      "value": false,
      "valueType": "boolean",
      "targetingRules": [{ "id": "...", "priority": 1, "value": true, "conditions": [...] }]
    }
  },
  "segments": {
    "seg_beta": { "id": "seg_beta", "name": "Beta Users", "conditions": [...] }
  },
  "version": "3",
  "timestamp": "2024-01-15T09:30:00.000Z"
}
```

**Errors:**

- `401` — Invalid or revoked clientId
- `403` — Origin domain not in allowedDomains
- `413` — Context payload exceeds 10KB limit
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
