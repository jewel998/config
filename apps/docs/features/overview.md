# Features Overview

> See also: [Getting Started](/guide/getting-started) · [SDK Reference](/api/) · [Concepts & Glossary](/guide/concepts)

A single map of everything `@jewel998/config` does — the SDK, the delivery API, and the portal. Each row links to the page with the full detail.

## Feature Flags & Remote Config

Store typed values (boolean, number, string, JSON, array) under dot-notation keys like `feature.dark_mode` or `app.upload_limit`, and change them without shipping code. The SDK reads them with typed `get<T>()` calls and sensible defaults.

- [Getting Started](/guide/getting-started) — install, initialize, read flags
- [Configuration Scopes](/guide/scopes) — how values resolve

## Targeting & Delivery

| Feature             | What it does                                                           | Page                                      |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Segments            | Reusable audience cohorts defined by attribute conditions (DNF logic). | [Segments](/features/segments)            |
| Targeting Rules     | Serve different values per user/segment, in priority order.            | [Targeting Rules](/features/targeting)    |
| Percentage Rollouts | Deterministic, sticky percentage bucketing for canary releases.        | [Percentage Rollouts](/features/rollouts) |
| Scheduling          | Time-based activation of a value.                                      | [Scheduling](/features/scheduling)        |
| Prerequisites       | Gate a flag on other flags' values.                                    | [Prerequisites](/features/prerequisites)  |

The evaluation pipeline runs in a fixed order: archived → prerequisites → overrides → schedule → targeting → rollout → default.

## SDK

Browser-first, zero-dependency SDK. `initConfig()` is the recommended entry point with a three-tier fetch model (prefetch / page / idle), async `get()`, version polling, and a global error handler. `createConfig()` is the advanced entry point with loading strategies, plugins, and consent-aware mode.

- [SDK Reference](/api/) — full API
- [Loading Strategies](/guide/loading-strategies) · [Storage & Caching](/guide/storage) · [Fetch Flow](/guide/fetch-flow)

**Evaluation modes** are chosen by API key prefix: `cid_` keys evaluate **server-side** (only resolved values reach the browser, ~200 bytes); `svr_` keys return full flag data for **local** evaluation via plugins.

## Platform & Administration

| Feature         | What it does                                                                     | Page                                                    |
| --------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Environments    | Per-project targets (production/staging) with allowed-domain origin locks.       | [Environments](/features/environments)                  |
| Team & RBAC     | Members with viewer/editor/admin roles; production is admin-protected.           | [Team & RBAC](/features/team)                           |
| Audit Log       | Append-only history of every change.                                             | [Audit Log](/features/audit-log)                        |
| Webhooks        | Change notifications to Slack, Discord, Teams, Google Chat, or custom endpoints. | [Webhooks](/features/webhooks)                          |
| Import / Export | Bulk CSV/JSON import and export of configs.                                      | [Import](/features/import) · [Export](/features/export) |

## Security

- **API keys:** `cid_` (frontend, server-evaluated) and `svr_` (backend, full data). Revocable instantly.
- **Allowed domains:** restrict which origins may call the API per environment. Requests from other origins get a 403.
- **Rate limiting:** per-key request caps.
- **Server-side evaluation:** with `cid_` keys, targeting rules, segments, and rollout percentages never reach the browser.
- **RBAC:** role-based access enforced by Firestore security rules.

See [GDPR](/compliance/gdpr) and [SOC 2](/compliance/soc2) for compliance detail.

## Cost

Designed to run at `$0/month` on Firebase's free tier for small-to-medium scale, with CDN-absorbed version polling and version-gated refresh keeping function invocations low. See [Cost & Scaling](/guide/cost).

## Related

- [Getting Started](/guide/getting-started) — up and running in 5 minutes
- [Self-Hosting](/guide/self-hosting) — deploy to your own Firebase
- [SDK Reference](/api/) — complete API documentation
- [Architecture](/contributing/architecture) — how it all fits together
