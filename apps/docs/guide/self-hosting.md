# Self-Hosting Guide

> See also: [Performance Tuning](/guide/performance) · [Cost & Scaling](/guide/cost) · [Troubleshooting](/guide/troubleshooting)

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
curl -s https://your-project.web.app/api/v1/version
# Expected: {"error":{"code":"BAD_REQUEST","message":"clientId is required"}}
# This is correct — it means the function is running!

# Check the portal loads
open https://your-project.web.app
```

### Deployed Endpoints

| Endpoint                                                        | Purpose                                   |
| --------------------------------------------------------------- | ----------------------------------------- |
| `https://your-project.web.app`                                  | Admin portal                              |
| `https://your-project.web.app/api/v1/config`                    | Config delivery API (via hosting rewrite) |
| `https://your-project.web.app/api/v1/version`                   | Lightweight version check                 |
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

## Updating to New Versions

```bash
git pull origin main
pnpm install
firebase deploy
```

We provide migration guides for breaking changes. Your Firestore data is never touched during updates — only code is redeployed. See [Migration Guides](/guide/migrations/) for details when upgrading between versions.

## Custom Domain (Optional)

1. Firebase Console → Hosting → Add custom domain
2. Follow the DNS verification steps
3. Update your SDK's `baseUrl` to `https://config.yourcompany.com/api`

## Next Steps

- [Performance Tuning](/guide/performance) — Region selection, cold starts, latency optimization
- [Cost & Scaling](/guide/cost) — Cost at scale tables, optimization tips
- [Troubleshooting](/guide/troubleshooting) — Common issues and fixes
- [Concepts](/guide/concepts) — Glossary of terms used throughout the docs

## Related

- [Cloud Functions Reference](/api/cloud-functions) — Detailed documentation of all deployed functions and their configuration
- [Backup & Restore](/guide/backup-restore) — Set up automated backups for your Firestore data
- [Environments](/features/environments) — Configure multiple environments within your deployment
- [Team & RBAC](/features/team) — Invite team members and manage access roles
- [Comparison](/comparison/) — See how self-hosting compares to SaaS alternatives
