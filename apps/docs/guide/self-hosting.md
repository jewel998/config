# Self-Hosting Guide

Deploy @jewel998/config to your own Firebase project. Full control over your data, zero monthly cost.

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A [Firebase project](https://console.firebase.google.com/) on the **Blaze (pay-as-you-go) plan**
- A Google account

::: warning Firebase Blaze Plan Required
Cloud Functions (required for the API) are not available on the free Spark plan. You must upgrade to the **Blaze plan**. Despite the name, Blaze is still free for typical usage — you only pay if you exceed the generous free tier limits (2M function invocations/month, 50K Firestore reads/day). See [Cost at Scale](#cost-at-scale) below.
:::

## Step 1: Clone the Repository

```bash
git clone https://github.com/jewel998/config.git
cd config
```

## Step 2: Create and Configure a Firebase Project

### Create the Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → name it (e.g., `mycompany-config`)
3. Disable Google Analytics (optional, not needed)
4. Wait for project creation

### Upgrade to Blaze Plan

1. In Firebase Console, click the **Spark** plan badge (bottom-left)
2. Select **Upgrade to Blaze**
3. Link or create a billing account
4. Set a budget alert (recommended: $10/month) — you'll likely never hit it

### Enable Required Services

In the Firebase Console for your project, enable these services:

#### Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** (recommended — easiest setup)
3. Under **Settings** → **Blocking functions**, these will be configured automatically during deploy

::: info Blocking Functions
The platform uses Firebase Authentication Blocking Functions (`beforeUserCreated` and `beforeUserSignedIn`) to enforce access control. These are registered automatically when you deploy — no manual setup needed. They check an `accessControl/default` document in Firestore to validate whether an email is allowed to sign in.
:::

#### Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Select **Start in production mode** (security rules are deployed from the repo)
3. Choose a **region close to your users** (e.g., `us-central1`, `europe-west1`)
4. Click **Create**

::: tip Region selection
Choose the same region for Firestore and Cloud Functions to minimize latency. Once set, the Firestore region cannot be changed without creating a new database.
:::

#### Hosting

1. Go to **Hosting** → **Get started**
2. Click through the wizard (no action needed — we deploy via CLI)

#### Cloud Storage (for exports)

1. Go to **Storage** → **Get started**
2. Accept defaults — this is used for GDPR data exports and backup files

### Register a Web App

1. Go to **Project Settings** (gear icon) → **General** → scroll to **Your apps**
2. Click **Add app** → **Web** (</> icon)
3. Name it (e.g., "Config Portal")
4. **Do NOT** enable Firebase Hosting here (we handle it via CLI)
5. Copy the config object — you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};
```

## Step 3: Connect Your Project

```bash
firebase login
firebase use --add your-project-id
```

When prompted for an alias, use `default`.

## Step 4: Configure Environment Variables

Create the portal environment file:

```bash
cp apps/portal/.env.example apps/portal/.env.production
```

Edit `apps/portal/.env.production` with the values from Step 2:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 5: Configure Access Control (Who Can Sign In)

By default, the platform is in **open mode** — anyone with a Google account can sign in. To restrict access:

### Option A: Restrict to specific emails

After your first deploy, create the `accessControl/default` document in Firestore (via Firebase Console → Firestore → Start collection → `accessControl` → document ID: `default`):

```json
{
  "emails": ["you@company.com", "teammate@company.com"],
  "patterns": []
}
```

### Option B: Restrict to a domain

```json
{
  "emails": [],
  "patterns": [".*@yourcompany\\.com$"]
}
```

### Option C: Combine both

```json
{
  "emails": ["contractor@gmail.com"],
  "patterns": [".*@yourcompany\\.com$", ".*@partner\\.org$"]
}
```

::: warning Blocking functions enforce this on EVERY sign-in
Once configured, the `validateSignIn` blocking function checks this document before every sign-in attempt — including returning users. If you remove someone from the list, they're immediately locked out on their next session.
:::

::: tip First user setup
For your very first sign-in, either:

1. Deploy without the `accessControl/default` document (open mode), sign in, then create it
2. Or create the document first with your email in the `emails` array
   :::

## Step 6: Deploy Everything

Deploy Firestore rules, indexes, Cloud Functions, Authentication blocking functions, and hosting in one command:

::: warning First-time deploy
The `--force` flag is needed for first-time function deployments to set up artifact cleanup policies. Subsequent deploys don't need it.
:::

```bash
pnpm install
pnpm --filter @jewel998/config-portal run build
firebase deploy --project your-project-id --force
```

This single command deploys:

| Component                   | What It Does                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Firestore Rules**         | RBAC enforcement, project isolation, append-only audit log                                                                        |
| **Firestore Indexes**       | Composite index for clientId lookups (required for API)                                                                           |
| **Cloud Functions (8)**     | getConfig, getVersion, validateSignIn, validateCreate, onAuditCreated, importConfigs, exportConfigs, testWebhook, retryFailedRows |
| **Auth Blocking Functions** | validateSignIn + validateCreate registered as identity hooks                                                                      |
| **Hosting**                 | Portal SPA + API rewrites (`/api/*` → Cloud Functions)                                                                            |

Or deploy individual pieces:

```bash
# Security rules only
firebase deploy --only firestore:rules

# Firestore indexes (required for clientId lookup)
firebase deploy --only firestore:indexes

# Cloud Functions (API + webhooks + auth)
firebase deploy --only functions

# Portal hosting only
firebase deploy --only hosting
```

### Verify the Deploy

After deployment, verify everything works:

```bash
# Check the API is reachable
curl -s https://your-project.web.app/api/getVersion
# Expected: {"error":{"code":"BAD_REQUEST","message":"clientId is required"}}
# This is correct — it means the function is running!

# Check the portal loads
open https://your-project.web.app
```

### Deployed Endpoints

| Endpoint                                                        | Purpose                                   |
| --------------------------------------------------------------- | ----------------------------------------- |
| `https://your-project.web.app`                                  | Admin portal                              |
| `https://your-project.web.app/api/getConfig`                    | Config delivery API (via hosting rewrite) |
| `https://your-project.web.app/api/getVersion`                   | Lightweight version check                 |
| `https://asia-south1-your-project.cloudfunctions.net/getConfig` | Direct function URL (fallback)            |

::: tip Region configuration
By default, API functions deploy to `asia-south1` (Mumbai). You can change this by editing the `API_REGION` constant in `functions/src/utils/constants.ts`. Choose the region closest to your users and **ensure your Firestore database is in the same region** for optimal performance. Also update the region in `firebase.json` hosting rewrites to match.

Available regions: `us-central1` (Iowa), `europe-west1` (Belgium), `asia-south1` (Mumbai), `asia-east1` (Taiwan), `asia-southeast1` (Singapore).
:::

### Required Indexes

The `getConfig` endpoint uses a Firestore collection group query that requires a composite index. If you see a `gRPC 5 NOT_FOUND` error in your function logs, deploy the indexes:

```bash
firebase deploy --only firestore:indexes --project your-project-id
```

If your database has a non-standard name (not `(default)`), create the index manually:

```bash
gcloud firestore indexes composite create \
  --project=your-project-id \
  --database=your-database-name \
  --collection-group=clientIds \
  --field-config=field-path=token,order=ascending \
  --field-config=field-path=status,order=ascending \
  --query-scope=COLLECTION_GROUP
```

## Step 7: First-Time Portal Setup

1. Open your portal at `https://your-project.web.app`
2. Sign in with the Google account you configured in access control
3. Create a project (e.g., "My App")
4. Create an environment (e.g., "production")
5. Generate an API key (Client type for frontend, Server type for backend)
6. Create your first config: `feature.dark_mode` = `boolean` = `false`

## Step 8: Configure the SDK

In your application, point the SDK at your deployment:

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx", // Generated in Step 7
  baseUrl: "https://your-project.web.app/api",
  defaults: {
    "feature.dark_mode": false,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});
```

## Step 9: Security Hardening (Recommended)

After your initial deploy, apply these hardening steps:

### Set Allowed Domains

In the portal, go to your environment settings and add **Allowed Domains**:

- Production: `yourdomain.com`, `www.yourdomain.com`
- Staging: `staging.yourdomain.com`
- Development: `localhost`

This restricts which origins can call your API — requests from other domains get a 403.

### Configure Access Control

If you haven't already, set up the `accessControl/default` document (see Step 5).

### Rate Limiting

Rate limiting is enabled by default on all API endpoints:

| Key Type             | Limit                       |
| -------------------- | --------------------------- |
| Client keys (`cid_`) | 300 requests/minute per key |
| Server keys (`svr_`) | 120 requests/minute per key |

Clients exceeding the limit receive a `429 Too Many Requests` response with a `Retry-After` header. The SDK's circuit breaker handles this gracefully.

### Set Budget Alerts

In Google Cloud Console → Billing → Budgets & alerts:

1. Create a budget for your Firebase project
2. Set threshold at $5 or $10/month
3. Enable email notifications

## Deploy Everything at Once

For subsequent deployments:

```bash
pnpm install
pnpm --filter @jewel998/config-portal run build
firebase deploy
```

## Performance Tuning

### Region Selection

The single biggest factor in API response time is **geographic distance** between your users, Cloud Functions, and Firestore. All three should be in the same region.

Edit `functions/src/utils/constants.ts`:

```typescript
// Choose the region closest to your users
export const API_REGION = "asia-south1"; // Mumbai (default)
```

Then update `firebase.json` rewrites to match:

```json
{
  "source": "/api/getConfig",
  "function": "getConfig",
  "region": "asia-south1"
}
```

| Your Users         | Recommended Region            | Firestore Location |
| ------------------ | ----------------------------- | ------------------ |
| India / South Asia | `asia-south1` (Mumbai)        | `asia-south1`      |
| US                 | `us-central1` (Iowa)          | `us-central1`      |
| Europe             | `europe-west1` (Belgium)      | `europe-west1`     |
| Southeast Asia     | `asia-southeast1` (Singapore) | `asia-southeast1`  |
| East Asia          | `asia-east1` (Taiwan)         | `asia-east1`       |

::: warning Firestore region must match
If your Cloud Functions are in `asia-south1` but your Firestore database is in `us-central1`, every query adds 200-400ms of cross-region latency. Always create your Firestore database in the same region as your functions.
:::

### Eliminating Cold Starts

Cloud Functions experience **cold starts** (2-4 seconds) when no instance is warm. This happens after periods of inactivity. To eliminate cold starts:

Edit `functions/src/utils/constants.ts`:

```typescript
// Set to 1 or higher to keep instances warm (costs ~$3-5/month per instance)
export const MIN_INSTANCES = 1;
```

| Setting                       | Behavior                                             | Cost         |
| ----------------------------- | ---------------------------------------------------- | ------------ |
| `MIN_INSTANCES = 0` (default) | Cold starts after idle periods (~2-4s first request) | $0           |
| `MIN_INSTANCES = 1`           | One instance always warm, no cold starts             | ~$3-5/month  |
| `MIN_INSTANCES = 2`           | Two warm instances, handles concurrent cold bursts   | ~$6-10/month |

**Recommendation:**

- Development / low traffic: `0` (free, accept occasional cold starts)
- Production with consistent traffic: `1` (eliminates cold starts)
- Production with traffic spikes: `2+` (prevents queuing during bursts)

### Expected Latency

With properly matched regions (functions + Firestore in same region):

| Scenario                                                       | Latency     |
| -------------------------------------------------------------- | ----------- |
| CDN cache hit (version poll)                                   | 10-50ms     |
| CDN cache hit (config fetch, client mode)                      | 10-50ms     |
| Warm function, same-region Firestore                           | 100-200ms   |
| Cold start (no minInstances)                                   | 2000-4000ms |
| Cross-region Firestore (e.g., functions in Mumbai, DB in Iowa) | 500-1000ms  |

### Additional Optimizations

- **Use `browserStorage()`** in the SDK — cached values persist across page loads, eliminating API calls on return visits
- **Set longer `pollInterval`** — 10-15 minutes instead of 5 if you don't need instant flag propagation
- **Use key filtering** — Pass `keys` parameter to fetch only the flags you need (projected read)
- **CDN is your friend** — Firebase Hosting CDN caches `/api/getVersion` for 15s and `/api/getConfig` (client mode) for 60s at edge nodes worldwide. Most requests never reach your function.

## Updating to New Versions

```bash
git pull origin main
pnpm install
firebase deploy
```

We provide migration guides for breaking changes. Your Firestore data is never touched during updates — only code is redeployed.

## Custom Domain (Optional)

1. Firebase Console → Hosting → Add custom domain
2. Follow the DNS verification steps
3. Update your SDK's `baseUrl` to `https://config.yourcompany.com/api`

## Troubleshooting

### "gRPC 5 NOT_FOUND" in function logs

The composite index for `clientIds` isn't deployed. Run:

```bash
firebase deploy --only firestore:indexes --project your-project-id
```

### CORS errors calling the API

If you see CORS errors when calling `https://your-project.web.app/api/getConfig`:

1. Ensure hosting is deployed: `firebase deploy --only hosting`
2. The hosting config includes CORS headers for `/api/**`
3. As a fallback, call the function URL directly: `https://REGION-your-project.cloudfunctions.net/getConfig` (replace `REGION` with your configured region, e.g., `asia-south1`)

### "Permission denied" on Firestore

Make sure you've deployed the security rules: `firebase deploy --only firestore:rules`

### Cloud Functions returning 500

Check the function logs: Firebase Console → Functions → Logs. Common causes:

- Missing Firestore index (see above)
- Database name mismatch (if you have a non-standard database name, see `functions/src/utils/firestore.ts`)

### Portal shows blank page

Ensure the environment variables in `.env.production` match your Firebase project. Rebuild and redeploy.

### SDK returns undefined values

1. Check that your API key is active (not revoked) in the portal
2. Verify `baseUrl` points to your deployment
3. Check browser console — if you see 401/403, the SDK's circuit breaker will stop retrying for 5 minutes
4. If using `createConfig`, call `client.destroy()` and reinitialize to reset the circuit breaker. With `initConfig`, reload the page.

### SDK stops making requests (circuit breaker)

If the SDK receives a 400, 401, or 403 error, it activates a circuit breaker that blocks all requests for 5 minutes. This prevents hammering a misconfigured endpoint. After the cooldown, it automatically retries once.

## Cost at Scale

| Users    | Version polls/month | Config fetches/month | Function calls | Firestore reads/day | Cost      |
| -------- | ------------------- | -------------------- | -------------- | ------------------: | --------- |
| 100      | 864K                | ~100                 | ~1,000         |                ~200 | $0        |
| 1,000    | 8.6M                | ~1,000               | ~6,000         |              ~1,500 | $0        |
| 10,000   | 86M                 | ~10,000              | ~40,000        |             ~10,000 | $0        |
| 50,000   | 432M                | ~50,000              | ~150,000       |             ~40,000 | $0*       |
| 100,000+ | —                   | —                    | —              |                   — | ~$5-15/mo |

*CDN absorbs 99%+ of version polls (15s cache). Actual function invocations are a fraction of raw request count.

Firebase free tier limits: 2M function invocations/month, 50K Firestore reads/day, 10GB hosting bandwidth.

## Cost Optimization Guide

The SDK is designed to minimize API costs by default. Here's how each feature saves you money, and what you can tune for maximum efficiency.

### Built-in Cost Savings

| Feature                   | How It Saves Money                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Version-gated refresh** | `refresh()` calls `/getVersion` first (1 Firestore read, ~100 bytes). Only fetches full config if version changed. 95%+ of refresh cycles cost almost nothing.     |
| **CDN caching**           | `/getVersion` cached 15s, `/getConfig` (client mode) cached 60s. At 10K users polling every 5 min, CDN serves 99% — only ~60 function calls/hour actually execute. |
| **Circuit breaker**       | On 401/403, SDK stops all requests for 5 minutes. Prevents runaway costs from misconfigured clients.                                                               |
| **Request deduplication** | Multiple `refresh()` calls within the same tick share a single network request.                                                                                    |
| **30s stale check**       | `setContext()` skips re-fetch if the last fetch was <30s ago. Prevents unnecessary calls during rapid user interactions.                                           |
| **7-day cache TTL**       | Once fetched, values persist in memory/localStorage for 7 days. Page refreshes use cached data immediately.                                                        |
| **Conditional requests**  | `/getVersion` supports `If-None-Match` (ETag). When version is unchanged, server returns 304 with zero body.                                                       |

### Recommended Configuration for Cost Efficiency

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {
    // Define ALL flags here — served instantly, zero API cost
    "feature.dark_mode": false,
    "feature.new_checkout": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123" }),
  // Longer poll interval = fewer API calls
  pollInterval: 600_000, // 10 minutes instead of default 5
});
```

For maximum cache persistence across page reloads, add `browserStorage`:

```typescript
import { initConfig, browserStorage, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  storage: browserStorage({ prefix: "myapp" }),
  defaults: {
    "feature.dark_mode": false,
    "feature.new_checkout": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123" }),
  pollInterval: 600_000,
});
```

### Tips by Scale

#### Small teams (< 1,000 users) — Stay on free tier

- Use default settings — you'll never exceed free limits
- Set all your defaults in `initConfig` — the SDK serves them instantly without any API call
- The optimistic loading strategy fetches in the background while defaults are served

#### Medium scale (1K–50K users) — Optimize refresh

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {/* all your flags */},
  pollInterval: 900_000, // 15 min — most flag changes don't need instant propagation
});
```

- Longer `pollInterval` = fewer version checks
- Add `storage: browserStorage()` to persist cache across page reloads
- Consider `loadingStrategy: "deferred"` via `createConfig` only if you need advanced control

#### Large scale (50K+ users) — Minimize function invocations

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {/* all your flags */},
  pollInterval: 0, // Disable polling entirely
});

// Only refresh when YOU decide (e.g., on route change)
router.on("routeChange", () => flags.refresh());
```

- Disable automatic polling and trigger `refresh()` only at meaningful moments
- The CDN handles the heavy lifting — most requests never reach your function
- Add `storage: browserStorage({ defaultTtl: 7 * 86_400_000 })` for long-lived cache

### Cost Breakdown by API Call

| Endpoint                       | Firestore Reads                     | Function Cost | CDN-Cacheable?         |
| ------------------------------ | ----------------------------------- | ------------- | ---------------------- |
| `/api/getVersion`              | 1 (environment doc)                 | ~$0.0000004   | ✅ 15s                 |
| `/api/getConfig` (server mode) | 2-3 (clientId + configs + segments) | ~$0.0000012   | ❌ (varies by context) |
| `/api/getConfig` (client mode) | 2-3 (same)                          | ~$0.0000012   | ✅ 60s                 |

At the free tier limits (2M invocations/month + 50K reads/day), you can serve **~50,000 active users** polling every 5 minutes at zero cost.

### What NOT to Do

| Anti-Pattern                             | Why It's Expensive                                   | Fix                                                                           |
| ---------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Calling `refresh()` on every render      | Bypasses deduplication if renders are >30s apart     | Let the poll interval handle it                                               |
| Using `pollInterval: 1000` (1s)          | Each poll = function invocation                      | Use 300,000+ (5 min or more)                                                  |
| Not setting `defaults`                   | Forces a blocking fetch before app can render        | Always provide defaults                                                       |
| Creating multiple `initConfig` instances | Each instance polls independently, multiplying costs | Use one singleton                                                             |
| Not calling `destroy()` on unmount (SPA) | Timer keeps polling after navigation                 | Use `createConfig` with `destroy()`, or use a single `initConfig` at app root |
