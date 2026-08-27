# Concepts & Glossary

> See also: [Quick Start](/guide/getting-started) · [Architecture](/contributing/architecture) · [SDK Reference](/api/)

A quick reference of key terminology used throughout the documentation, mapped to standard software industry terms where applicable.

---

**Config / Feature Flag** — A key-value pair that controls application behavior at runtime without a code deploy. Configs can be boolean flags, numbers, strings, JSON, or arrays. [Learn more →](/guide/getting-started)

**Context** — The set of user attributes sent to the API for evaluation (e.g., `userId`, `plan`, `country`). Context drives targeting rules and segment membership. [Learn more →](/guide/scopes)

**Segments / Audience Segments** — Reusable named cohorts defined by conditions on context attributes. Define once, reference across many flags. Standard term: _audience segment_. [Learn more →](/features/segments)

**Targeting Rules / User Segmentation** — Rules that match context attributes or segment membership to return specific config values. Evaluated in priority order. Powers **A/B testing**, **multivariate testing (MVT)**, and **feature gating**. [Learn more →](/features/targeting)

**A/B Testing** — A targeting setup with two variants: a control (default value) and a treatment (targeting rule value). Each user is consistently in one group via sticky bucketing. Multiple variants = **multivariate test (MVT)**. [Learn more →](/features/targeting)

**Rollouts / Progressive Delivery** — Percentage-based gradual feature release using **sticky bucketing** (`MurmurHash3(flagKey:userId) % 100`). The industry pattern is called a **canary release** — start at 5%, validate, ramp up. [Learn more →](/features/rollouts)

**Canary Release** — Rolling out a feature to a small percentage of users first, validating impact, then gradually increasing. Implemented via percentage rollouts. [Learn more →](/features/rollouts)

**Sticky Bucketing** — Deterministic user-to-bucket assignment ensuring the same user always gets the same variant. Required for valid A/B testing and canary analysis. [Learn more →](/features/rollouts)

**Kill Switch** — Setting a flag's rollout to 0% or its default to `false` — instantly reverts all users to the safe state with no code deploy. [Learn more →](/features/rollouts)

**Ring Deployment** — Releasing through concentric rings of users by risk tolerance (internal → beta cohort → general). Implemented by combining targeting rules (ring 0/1) with rollout percentage (ring 2/3). [Learn more →](/features/rollouts)

**Feature Gating** — Restricting a feature to users who meet a condition (plan, role, entitlement). Implemented via targeting rules. **Dependency-based feature gating** — gating one flag on the state of another — is implemented via [prerequisites](/features/prerequisites). [Learn more →](/features/targeting)

**Dark Launch** — Deploying code behind a `false` flag (invisible to users) and scheduling or manually activating it later. Decouples code deploy from feature release. [Learn more →](/features/scheduling)

**Timed Release** — Scheduling a flag to activate at a specific date/time without manual intervention. [Learn more →](/features/scheduling)

**Prerequisites / Dependency Flags / Guard Flags** — A flag that gates another flag. Feature B is only active if guard flag A meets a condition. Prevents inconsistent feature states. [Learn more →](/features/prerequisites)

**Environments** — Isolated deployment stages (development, staging, production) with independent configs, API keys, and targeting rules. [Learn more →](/features/environments)

**API Keys** — Client keys (`cid_`) trigger server-side evaluation (rules never exposed to browser). Server keys (`svr_`) return full flag data for client-side evaluation. [Learn more →](/api/)

**Evaluation Pipeline** — The order in which flags are resolved: archived → prerequisites → overrides → schedule → targeting → rollout → default. [Learn more →](/contributing/architecture)

**Loading Strategies** — How the SDK fetches on init: **optimistic** (instant defaults, background fetch), **pessimistic** (blocks until data arrives), **deferred** (manual trigger). Used by `createConfig`. [Learn more →](/guide/loading-strategies)

**Tier-Based Fetching** — `initConfig` fetches keys in three priority tiers: **Tier 1** (`prefetch` option, blocks `ready()`), **Tier 2** (`flags.prefetch(keys)` per route, fire-and-forget), **Tier 3** (full idle fetch via `requestIdleCallback`). Designed for projects with 100s–1000s of flag keys. [Learn more →](/guide/fetch-flow)

**`ready()`** — A Promise on the `Flags` object that resolves when Tier 1 keys have been fetched. Use `await flags.ready()` before rendering to ensure critical values are available. Resolves instantly if no `prefetch` keys are declared. [Learn more →](/api/)

**`onError`** — Global error handler passed to `initConfig`. Called on every SDK-level error (`TIMEOUT`, `FETCH_FAILED`, `KEY_NOT_FOUND`, `AUTH`, `RATE_LIMITED`). `get()` also rejects with the same typed `SdkError` when no default is provided. [Learn more →](/api/)

**Circuit Breaker** — The SDK stops retrying for 5 minutes after 401/403 errors, preventing wasted requests on misconfigured clients. [Learn more →](/api/)

**RBAC** — Role-based access control: Viewer (read-only), Editor (read/write configs), Admin (full access including team and API keys). [Learn more →](/features/team)
