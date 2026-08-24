# AGENTS.md — AI Coding Assistant Context

This file provides context for AI coding assistants (Copilot, Cursor, Kiro, Claude, etc.) working on this repository.

## Project Overview

**@jewel998/config** is a free, self-hosted feature flag and remote configuration platform that runs on Firebase. It replaces LaunchDarkly at $0/month.

## Repository Structure

```
apps/
  portal/      — Admin portal (React + Vite + TanStack Router + Firebase)
  landing/     — Marketing site (Astro + React)
  docs/        — Documentation (VitePress)
packages/
  api/         — Internal micro-framework for Cloud Functions (@jewel998/api)
  config/      — SDK published to npm (@jewel998/config)
  tour/        — Tour framework (@jewel998/tour)
functions/     — Firebase Cloud Functions (API + webhooks + auth)
```

## Tech Stack

- **Language**: TypeScript (strict mode, ESM-only)
- **Runtime**: Node.js 22+
- **Package Manager**: pnpm (workspaces)
- **SDK**: Browser-only, zero dependencies
- **Portal**: React 19, Vite, TanStack Router, Firebase SDK, Tailwind CSS
- **Functions**: Firebase Cloud Functions (2nd gen), Firestore
- **Testing**: Vitest
- **Linting**: oxlint
- **Formatting**: oxfmt (configured via .oxfmtrc.json)
- **Git Hooks**: Husky + commitlint (conventional commits)

## Key Conventions

- All code is ESM (`"type": "module"`)
- No default exports — use named exports everywhere
- Strict TypeScript — no `any`, no implicit returns
- SDK is browser-only (throws if `window` is undefined)
- API key prefix determines evaluation mode: `cid_` = server-side, `svr_` = client-side
- Config keys use dot notation: `feature.dark_mode`, `app.upload_limit`
- Firestore security rules enforce RBAC (not application code)

## SDK Architecture

The SDK (`packages/config/`) has two entry points:

1. `initConfig()` — Simple, recommended. Returns `Flags` object with instant defaults + background fetch + polling.
2. `createConfig()` — Advanced. Supports loading strategies, plugins, consent-aware mode.

### Evaluation Pipeline (server-side, in getConfig function)

```
archived → prerequisites → overrides → schedule → targeting → rollout → default
```

### Plugin System (client-side evaluation with svr_ keys)

Plugins implement `EvaluationPlugin` interface and run in array order:

- targetingPlugin() — Evaluates targeting rules against segments and conditions
- rolloutPlugin() — Deterministic percentage bucketing (MurmurHash3)
- schedulePlugin() — Time-based activation
- prerequisitesPlugin() — Flag dependency checks

## Cloud Functions

- `getConfig` — HTTP, delivers resolved values. Region configured in `functions/src/utils/constants.ts`
- `getVersion` — HTTP, lightweight version check (100 bytes)
- `validateSignIn` — Blocking auth function, enforces email/domain allowlist
- `onAuditCreated` — Firestore trigger, dispatches webhooks
- `exportConfigs` / `testWebhook` — Callable functions

## Common Tasks

### Run tests

```bash
pnpm --filter @jewel998/config run test
```

### Build SDK

```bash
pnpm --filter @jewel998/config run build
```

### Lint

```bash
pnpm --filter @jewel998/config run lint
```

### Run portal dev server

```bash
pnpm --filter @jewel998/config-portal run dev
```

### Deploy

```bash
firebase deploy
```

## Important Files

- `packages/config/src/index.ts` — SDK entry point (initConfig, autoContext, mergeContext)
- `packages/config/src/client.ts` — ConfigClient (createConfig)
- `packages/config/src/plugins/` — Evaluation plugins
- `packages/config/src/cache/` — Storage adapters
- `functions/src/api/get-config.ts` — Main API endpoint
- `functions/src/utils/constants.ts` — Function configuration (region, rate limits, etc.)
- `apps/portal/src/` — Portal React app

## Testing Guidelines

- SDK has 210+ tests (Vitest)
- Tests are in `packages/config/src/**/*.test.ts` (co-located)
- Use `vitest run` (not watch mode)
- Mock fetch for API tests
- No external dependencies in SDK (zero-dep package)

## Commit Convention

Conventional Commits enforced by commitlint:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code change that neither fixes bug nor adds feature
- `test:` adding or updating tests
- `chore:` maintenance
