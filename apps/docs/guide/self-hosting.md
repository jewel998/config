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

## Step 5: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This sets up the security rules that protect your data.

## Step 6: Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This deploys two API endpoints:

- `/api/getConfig` — Main config delivery endpoint
- `/api/getVersion` — Lightweight version check for SDK polling

## Step 7: Build and Deploy the Portal

```bash
pnpm install
pnpm --filter @jewel998/config-portal run build
firebase deploy --only hosting
```

Your portal is now live at `https://your-project.web.app`

## Step 8: Configure the SDK

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

## Step 9: Create Your First Flag

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

### "Permission denied" on Firestore

Make sure you've deployed the security rules: `firebase deploy --only firestore:rules`

### Cloud Functions not responding

Check the Functions logs: Firebase Console → Functions → Logs

### Portal shows blank page

Ensure the environment variables in `.env.production` match your Firebase project. Rebuild and redeploy.

### SDK returns undefined values

1. Check that your API key is active (not revoked) in the portal
2. Verify `baseUrl` points to your deployment (not the demo)
3. Check browser console for network errors

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
