# Self-Hosting Guide

Deploy @jewel998/config to your own Firebase project. Full control over your data, zero monthly cost.

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A [Firebase project](https://console.firebase.google.com/) (free Spark plan is sufficient)

## Step 1: Clone the Repository

```bash
git clone https://github.com/jewel998/config.git
cd config
```

## Step 2: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → name it (e.g., `mycompany-config`)
3. Disable Google Analytics (optional, not needed)
4. Wait for project creation

### Enable Required Services

In the Firebase Console for your project:

1. **Authentication** → Sign-in method → Enable **Google** and/or **Email/Password**
2. **Firestore Database** → Create database → Start in **production mode** → Choose a region close to your users
3. **Hosting** → Get started (just click through the wizard)

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

Edit `apps/portal/.env.production` with your Firebase project values (find these in Firebase Console → Project Settings → General → Your apps → Web app):

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

If you haven't registered a web app yet: Firebase Console → Project Settings → Add app → Web → Register.

## Step 5: Deploy Everything

Deploy Firestore rules, indexes, Cloud Functions, and hosting in one command:

```bash
firebase deploy --project your-project-id --force
```

Or deploy individual pieces:

```bash
# Security rules
firebase deploy --only firestore:rules

# Firestore indexes (required for clientId lookup)
firebase deploy --only firestore:indexes

# Cloud Functions (API endpoints)
firebase deploy --only functions

# Portal hosting
firebase deploy --only hosting
```

::: warning
The `--force` flag is needed for first-time function deployments to set up artifact cleanup policies. Subsequent deploys don't need it.
:::

### Deployed Endpoints

After deployment, your API is available at:

- `https://your-project.web.app/api/getConfig` — Config delivery (via hosting rewrite)
- `https://your-project.web.app/api/getVersion` — Lightweight version check
- `https://us-central1-your-project.cloudfunctions.net/getConfig` — Direct function URL (fallback)

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

## Step 6: Build and Deploy the Portal

```bash
pnpm install
pnpm --filter @jewel998/config-portal run build
firebase deploy --only hosting
```

Your portal is now live at `https://your-project.web.app`

## Step 7: Configure the SDK

In your application, point the SDK at your deployment:

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx", // Generate in your portal → API Keys
  baseUrl: "https://your-project.web.app/api",
  defaults: {
    "feature.dark_mode": false,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});
```

## Step 8: Create Your First Flag

1. Open your portal at `https://your-project.web.app`
2. Sign in with the Google account you used for Firebase
3. Create a project
4. Create an environment (e.g., "production")
5. Generate an API key (Client type for frontend)
6. Create a config: `feature.dark_mode` = `boolean` = `false`
7. Add a targeting rule: segment "Pro Users" → `true`

## Deploy Everything at Once

For subsequent deployments:

```bash
pnpm install
pnpm --filter @jewel998/config-portal run build
firebase deploy
```

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
3. As a fallback, call the function URL directly: `https://us-central1-your-project.cloudfunctions.net/getConfig`

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
4. Call `config.destroy()` and reinitialize if you need to reset the circuit breaker

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

| Anti-Pattern                             | Why It's Expensive                                   | Fix                               |
| ---------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| Calling `refresh()` on every render      | Bypasses deduplication if renders are >30s apart     | Let the poll interval handle it   |
| Using `pollInterval: 1000` (1s)          | Each poll = function invocation                      | Use 300,000+ (5 min or more)      |
| Not setting `defaults`                   | Forces a blocking fetch before app can render        | Always provide defaults           |
| Creating multiple `initConfig` instances | Each instance polls independently, multiplying costs | Use one singleton                 |
| Not calling `destroy()` on unmount (SPA) | Timer keeps polling after navigation                 | Call `flags.destroy()` in cleanup |
