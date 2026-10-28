# Functionality & Feature Reference

> Canonical, code-grounded reference for everything `@jewel998/config` provides — platform (portal + Cloud Functions + Firestore) and SDK. Use this to confirm expected behavior across sessions.
>
> See also: [AGENTS.md](./AGENTS.md) · [SDK API Reference](./apps/docs/api/index.md) · [Architecture](./apps/docs/contributing/architecture.md)

**Maintenance rule:** when a feature changes, update the matching row here in the same change. Each entry cites the authoritative source file so claims can be re-verified. "Status" reflects what is implemented in the code today, not what is planned.

---

## 1. Product Overview

`@jewel998/config` is a self-hosted feature-flag and remote-configuration platform running on Firebase. Two deployment modes:

- **Shared trial instance** — you host it; prospective users try the portal + SDK on demand. Many organizations share one Firebase project, isolated per `projectId`.
- **Self-hosted** — a user deploys their own copy (`firebase deploy`) into their own Firebase project for their team.

Key invariant: the **SDK talks only to the public config-delivery API** (`/api/v1/config`, `/api/v1/version`). It never touches Firestore directly. The **portal** talks to Firestore directly from the browser, governed by `firestore.rules`. Cloud Functions use the Admin SDK and bypass rules.

---

## 2. SDK (`packages/config/`)

Browser-only. Zero runtime dependencies. Throws if `window` is undefined (except `svr_` keys in Node contexts). Published as `@jewel998/config`.

### 2.1 Entry points

| API                                                                                                               | Source                                              | Status | Notes                                                |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------ | ---------------------------------------------------- |
| `initConfig(options)` → `Flags`                                                                                   | `src/initConfig.ts`                                 | ✅     | Recommended. Three-tier fetch model.                 |
| `createConfig(options)` → `ConfigClient`                                                                          | `src/createConfig.ts`, `src/client/ConfigClient.ts` | ✅     | Advanced: loading strategies, plugins, consent mode. |
| `autoContext(user?)`, `mergeContext(a, b)`                                                                        | `src/context/autoContext.ts`                        | ✅     | Browser/device attribute detection + deep merge.     |
| Cache: `memoryStorage()`, `browserStorage()`                                                                      | `src/cache/`                                        | ✅     | Default memory; browser = localStorage, 7-day TTL.   |
| Errors: `SdkError`, `ConfigError`, `RateLimitError`, `AuthenticationError`, `TimeoutError`, `InitializationError` | `src/errors/index.ts`                               | ✅     | —                                                    |
| Plugin exports + `PIPELINE_ORDER`                                                                                 | `src/plugins/`                                      | ✅     | For `svr_` client-side evaluation.                   |

### 2.2 `initConfig` — three-tier fetch model

Source: `src/initConfig.ts`, `src/fetch/TierFetcher.ts`.

| Tier              | Trigger                           | Blocking?              | Behavior                                                                |
| ----------------- | --------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Tier 1 — Prefetch | `prefetch: [...]` at init         | `ready()` blocks on it | Fetched immediately with retry. App still runs on defaults if it fails. |
| Tier 2 — Page     | `flags.prefetch(keys)` at runtime | Fire-and-forget        | Per-route hint. Deduped against already-fetched keys.                   |
| Tier 3 — Idle     | automatic after Tier 1            | Background             | `fetchAll()` via `requestIdleCallback` (200ms setTimeout fallback).     |

`Flags` interface (expected behavior):

| Method                                 | Expected behavior                                                                                                                                                                                              | Source                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ready()`                              | Resolves when Tier 1 keys fetched; instant if none declared.                                                                                                                                                   | `initConfig.ts`                               |
| `get<T>(key)` / `get<T>(key, default)` | Resolves instantly from memory → cache → defaults map → inline default; otherwise **suspends** until idle fetch/refresh delivers it, or rejects with `SdkError{type:"TIMEOUT"}` after `timeout` (default 30s). | `initConfig.ts`                               |
| `prefetch(keys)`                       | Tier 2 fire-and-forget; emits `updated` + `updated:key`.                                                                                                                                                       | `initConfig.ts`                               |
| `all()`                                | Snapshot of `{...defaults, ...fetched}`; no waiting.                                                                                                                                                           | `initConfig.ts`                               |
| `setContext(ctx)`                      | Fire-and-forget, debounced 100ms, then re-fetches already-fetched keys in tier order.                                                                                                                          | `initConfig.ts`                               |
| `refresh()`                            | Re-fetch already-fetched keys in tier order. Rate-gated: skips if last refetch < 30s ago.                                                                                                                      | `initConfig.ts`                               |
| `on`/`off`                             | Events, incl. key-specific `updated:key.name`.                                                                                                                                                                 | `initConfig.ts`, `src/events/EventEmitter.ts` |

Options + defaults: `clientId` (required), `prefetch` `[]`, `defaults` `{}`, `context` `{}`, `baseUrl` (demo URL), `storage` `memoryStorage()`, `pollInterval` `300000` (0 disables), `timeout` `30000`, `onError`.

### 2.3 `createConfig` / `ConfigClient`

Source: `src/client/ConfigClient.ts`.

| Method                       | Expected behavior                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `getValue<T>(key, default?)` | Returns `T \| undefined` (default or undefined when missing). Plugin-based resolution when plugins present. |
| `getFlag(key)`               | `true` only if resolved value `=== true`.                                                                   |
| `getAll()`                   | All key-value pairs (from `__all__` cache + data).                                                          |
| `refresh()`                  | Version-gated re-fetch (skips if version unchanged).                                                        |
| `setContext(ctx)`            | Server mode: debounced 100ms re-fetch. Skips if a fetch happened < 30s ago.                                 |
| `destroy()`                  | Clears timers, listeners, circuit state.                                                                    |

Options: `loadingStrategy` (`optimistic`\|`pessimistic`\|`deferred`, default optimistic), `fetchGranularity` (`batch`\|`projected`, default batch), `plugins` `[]`, `retry` (3), `timeout` `10000`, `consentAware` `false`.

### 2.4 Evaluation modes (auto-detected from key prefix)

| Prefix | Mode       | Wire behavior                                                                  | Source                           |
| ------ | ---------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `cid_` | **Server** | POST with context; API evaluates and returns **only resolved values** (~200B). | `src/transport/HttpTransport.ts` |
| `svr_` | **Client** | GET; API returns **full flag data**; SDK evaluates locally via plugins.        | `src/transport/HttpTransport.ts` |

> Security note: a `cid_` key is a public client token — lock it with `allowedDomains`. Never ship a `svr_` key to a browser (it exposes full targeting/rollout data and ships the whole payload).

### 2.5 Client-side evaluation pipeline (plugins, `svr_` only)

Fixed order (`src/plugins/types.ts` `PIPELINE_ORDER`): `archived → prerequisites → overrides → schedule → targeting → rollout`. Each plugin returns `{resolved:true,value}` or `{resolved:false}` (fall through to default). Rollout uses deterministic MurmurHash3 bucketing.

### 2.6 Resilience

| Feature               | Behavior                                                                                                                                              | Source                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Circuit breaker       | Opens for 5 min on fatal 400/401/403; HALF_OPEN probe on cooldown.                                                                                    | `src/transport/CircuitBreaker.ts`                                                |
| Retry engine          | Up to `maxRetries` (default 3); 429 honors `Retry-After`.                                                                                             | `src/retry/RetryEngine.ts`                                                       |
| Version-gated refresh | `/v1/version` (ETag/304) before full config fetch; config version is persisted from the `/config` response and reused to skip fetches when unchanged. | `src/initConfig.ts`, `src/fetch/projectedFetcher.ts`, `src/fetch/TierFetcher.ts` |
| Error taxonomy        | `SdkError.type`: TIMEOUT \| FETCH_FAILED \| KEY_NOT_FOUND \| AUTH \| RATE_LIMITED. `ConfigErrorCode`: HTTP-mapped (retry/circuit).                    | `src/errors/index.ts`                                                            |

### 2.7 SDK test status

210 tests passing (`packages/config/src/**/*.test.ts`, Vitest). Build: `tsc` clean.

---

## 3. Config Delivery API (Cloud Functions)

Source: `functions/src/`. Region: `asia-south1` (`functions/src/utils/constants.ts`). `maxInstances: 10`, `minInstances: 0`.

### 3.1 Endpoints

| Endpoint          | Method   | Purpose                                                  | Guards (in order)                                                                                               | Source                             |
| ----------------- | -------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `/api/v1/config`  | GET/POST | Deliver resolved values (cid_) or full flag data (svr_). | extractClientId → rateLimit → validateKeyMethod → extractContext → authenticate → validateDomain → fetchConfigs | `functions/src/api/get-config.ts`  |
| `/api/v1/version` | GET/POST | Lightweight version check (ETag/304).                    | extractClientId → rateLimit → authenticate                                                                      | `functions/src/api/get-version.ts` |

### 3.2 Server-side evaluation pipeline (cid_)

`archived → prerequisites → overrides → schedule → targeting → rollout → default`. Source: `functions/src/api/server-evaluator.ts`. Caching: cid_ responses `private, max-age=30` (per-user, not CDN-shared); svr_ `public, max-age=30, s-maxage=60`; version `s-maxage` set by `VERSION_CACHE_SECONDS` (default 300 / 5 min, see `functions/src/utils/constants.ts`).

### 3.3 Rate limits & payload caps

| Limit             | Value                             | Source                                 |
| ----------------- | --------------------------------- | -------------------------------------- |
| Client key (cid_) | 300 req/min                       | `constants.ts` `RATE_LIMIT_CLIENT_RPM` |
| Server key (svr_) | 120 req/min                       | `constants.ts` `RATE_LIMIT_SERVER_RPM` |
| Context payload   | 10KB max → `PayloadTooLargeError` | `extract-context.guard.ts`             |

> Known limitation: rate limiter is **in-memory per function instance** (`rate-limit.guard.ts`). Effective ceiling ≈ RPM × instance count; resets on cold start. Not a hard global quota.

### 3.4 Callable functions

| Function               | Purpose                                                        | Auth                                                 | Source                         |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| `exportConfigs`        | Export project configs.                                        | signed-in                                            | `callables/export-configs.ts`  |
| `testWebhook`          | Test webhook delivery (no Firestore write).                    | project admin/owner                                  | `callables/test-webhook.ts`    |
| `grantPlatformAccess`  | Grant `permissions[]` (+ optional `isSuperAdmin`) to an email. | super-admin only; blocks self-escalation/self-revoke | `callables/platform-access.ts` |
| `revokePlatformAccess` | Revoke an email's platform access.                             | super-admin only; env-root immutable, no self-revoke | `callables/platform-access.ts` |
| `listPlatformAccess`   | List all platform grants.                                      | super-admin only                                     | `callables/platform-access.ts` |

### 3.5 Triggers & identity

| Function         | Trigger                         | Purpose                                                    | Source                         |
| ---------------- | ------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| `onAuditCreated` | Firestore create on `audit_log` | Dispatch webhooks via provider/formatter pipeline.         | `triggers/on-audit-created.ts` |
| `validateCreate` | `beforeUserCreated`             | Block unauthorized account creation.                       | `identity/validate-sign-in.ts` |
| `validateSignIn` | `beforeUserSignedIn`            | Block unauthorized/revoked sign-in; bootstrap super-admin. | `identity/validate-sign-in.ts` |

### 3.6 Function test status

37 tests passing (`functions/src/api/guards/__tests__/`, Vitest). Build: esbuild clean.

---

## 4. Platform Access & RBAC

### 4.1 Platform-level capabilities (`platformAccess/{email}`)

Shape: `{ permissions: PlatformPermission[], isSuperAdmin: boolean, addedBy, addedAt }`. Source: `functions/src/identity/platform-access.ts`, mirror type in `apps/portal/src/lib/types.ts`.

| Permission       | Grants                           | Status |
| ---------------- | -------------------------------- | ------ |
| `PORTAL`         | May sign in to / use the portal. | ✅     |
| `CREATE_PROJECT` | May create new projects.         | ✅     |

**Super-admin** is conferred by either: (1) email matching the `SUPER_ADMIN_EMAIL` **Functions env secret** (bootstrap root, one per deployment, never in the browser bundle), or (2) `isSuperAdmin == true` on the grant doc (grantable by another super-admin). Super-admins implicitly have all permissions and may mint other super-admins.

Guarantees (enforced server-side):

- Clients can read **only their own** `platformAccess` doc; they can **never write** the collection (`firestore.rules`).
- The grant API blocks changing your **own** super-admin status; the env-root cannot be revoked via API.
- On a fresh deploy the `SUPER_ADMIN_EMAIL` owner passes the sign-in gate even with no `accessControl`/`allowedUsers` docs yet, and is auto-provisioned with all permissions + `isSuperAdmin`.

### 4.2 Portal access gate (sign-in)

Source: `apps/portal/src/stores/auth-store.ts`, `functions/src/identity/validate-sign-in.ts`. A sign-in passes if ANY: email is the env super-admin; grant has `isSuperAdmin` or `PORTAL`; email in `accessControl/default` emails/patterns (legacy); `allowedUsers/{email}` exists (legacy, client-side check).

> Behavior note: if `accessControl/default` does **not** exist AND no platform grant matches, the gate is **open mode** (anyone with a Google account). Always provision the gate — the env super-admin bootstrap closes this on first sign-in.

### 4.3 Project-level RBAC (`firestore.rules`)

| Role          | Capabilities                                                                                        | Source                      |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------- |
| viewer        | Read project resources.                                                                             | `firestore.rules` `hasRole` |
| editor        | + create/update configs, environments, segments — **but not production** envs/configs (admin-only). | `firestore.rules`           |
| admin / owner | Full control incl. delete, client IDs, webhooks, production.                                        | `firestore.rules`           |

Portal hook: `apps/portal/src/hooks/use-rbac.ts` (`role`, `isAdmin`, `canEditEnvironment`). Platform hook: `apps/portal/src/hooks/use-permissions.ts` (`canCreateProject`, `isSuperAdmin`, `has()`). UI gates create-project buttons in `project-switcher.tsx` and `onboarding-stepper.tsx`.

### 4.4 Firestore rules invariants

- Project create requires `CREATE_PROJECT` platform permission.
- `users/{userId}`: own doc always readable; other docs/queries require **email-verified** auth (blocks anonymous enumeration; intentionally allows verified users to read others for Team/RBAC/invite-search).
- Domain validation (`validate-domain.ts`): empty `allowedDomains` allows all; a non-empty list requires exact-or-subdomain match else 403. `localhost`/`127.0.0.1` are **not** special — add them to `allowedDomains` to develop locally. Malformed Origin is ignored, not hard-failed.
- Audit log: append-only (`update/delete: if false`), `actorId` must equal caller uid.
- Webhook deliveries, import jobs, `rateLimits`, `platformAccess`: client-read where applicable, **Cloud-Functions-write-only**.
- Soft-delete respected (`!('deletedAt' in ...)`); user email immutable after creation.

---

## 5. Portal Features (`apps/portal/`)

| Feature          | What it does                                                                                         | Source (route/component)                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Projects         | Create/select/soft-delete projects. Create gated by `CREATE_PROJECT`.                                | `components/project-switcher.tsx`, `hooks/use-projects.ts` |
| Onboarding       | Guided first project + environment.                                                                  | `components/onboarding-stepper.tsx`                        |
| Environments     | Per-project deployment targets; `allowedDomains`; production flag.                                   | `routes/environments.tsx`                                  |
| Configs          | Key-value flags with value types; lifecycle, targeting, rollout, overrides, schedule, prerequisites. | `routes/configs.tsx`                                       |
| Segments         | Reusable audience groups (predicate conditions).                                                     | `routes/segments.tsx`                                      |
| API Keys         | Create/revoke cid_/svr_ keys.                                                                        | `routes/api-keys.tsx`                                      |
| Team             | Members, roles, invites (RBAC).                                                                      | `routes/team.tsx`                                          |
| Webhooks         | Delivery to Slack/Discord/Teams/Google Chat/standard/custom.                                         | `components/webhook-settings.tsx`                          |
| Audit log        | Append-only change history.                                                                          | `routes/audit.tsx`                                         |
| Import/Export    | Bulk config import (CSV/JSON) + export.                                                              | `routes/import.tsx`, `callables/export-configs.ts`         |
| Compare          | Diff configs across environments.                                                                    | `routes/compare.tsx`                                       |
| GDPR/Preferences | Consent + settings.                                                                                  | `routes/gdpr.tsx`, `routes/preferences.tsx`                |

---

## 6. Webhooks

Formats (`packages/config/src/webhook-formats.ts`): `standard`, `slack`, `discord`, `google-chat`, `ms-teams`, `custom`. Pipeline: `on-audit-created` trigger → `WebhookProviderFactory.create()` → provider `trigger()` → format-specific formatter. Sources: `functions/src/providers/`, `functions/src/formatters/`.

---

## 7. Cost Profile (summary)

Full detail: `apps/docs/guide/cost.md`. Free tier comfortable to ~50K users. At 1M users (with `cid_` keys): payloads stay ~200B (2MB config set never ships to browser), cost driven by cold loads + version-change fan-out, realistically low tens–hundreds of $/mo on Blaze. Levers: `cid_` keys, higher `pollInterval`, `defaults`, `browserStorage()`, rate limits.

---

## 8. Open Items / Known Gaps

Keep this list honest — it is what a future session should verify or finish.

- [ ] `firestore.rules` not validated by the emulator parser in the last session (no Java available locally). Run `firebase emulators:exec --only firestore "true"` before deploy.
- [ ] No automated tests yet for `grantPlatformAccess`/`revokePlatformAccess`/`listPlatformAccess` super-admin enforcement.
- [ ] `SUPER_ADMIN_EMAIL` env secret must be set at deploy time and documented in the setup guide.
- [ ] Super-admin "Platform Access" management UI (add/revoke grants from the dashboard) not yet built — callables exist, UI does not.
- [ ] Rate limiter is per-instance in-memory; consider a shared store for a hard global quota at scale.
- [ ] `accessControl` open-mode default: ensure the gate doc is always provisioned on setup.
- [ ] `legacy allowedUsers` path still present alongside `PORTAL` permission — consolidate once migration is confirmed.

---

## 9. How to Re-verify (commands)

```bash
# SDK
pnpm --filter @jewel998/config run test     # 210 tests
pnpm --filter @jewel998/config run build     # tsc

# Functions
npm --prefix functions run build
npm --prefix functions test                  # 37 tests

# Portal
pnpm --filter @jewel998/config-portal run build

# Docs
pnpm --filter @jewel998/config-docs run build

# Firestore rules (needs Java)
firebase emulators:exec --only firestore "true"
```
