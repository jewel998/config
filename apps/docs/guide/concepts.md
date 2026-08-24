# Concepts & Glossary

> See also: [Quick Start](/guide/getting-started) · [Architecture](/contributing/architecture) · [SDK Reference](/api/)

A quick reference of key terminology used throughout the documentation.

---

**Config / Feature Flag** — A key-value pair that controls application behavior at runtime. Configs can be boolean flags, numbers, strings, JSON, or arrays. [Learn more →](/guide/getting-started)

**Context** — The set of user attributes sent to the API for evaluation (e.g., `userId`, `plan`, `country`). Context drives targeting rules and segment membership. [Learn more →](/guide/scopes)

**Segments** — Reusable audience groups defined by conditions on context attributes. Define once, reference across many flags. [Learn more →](/features/segments)

**Targeting Rules** — Rules that match context attributes or segment membership to return specific config values. Evaluated in priority order. [Learn more →](/features/targeting)

**Rollouts** — Percentage-based gradual feature release using deterministic hashing (`MurmurHash3(flagKey:userId) % 100`). Same user always gets the same bucket. [Learn more →](/features/rollouts)

**Prerequisites** — Flag dependencies where Flag B is only active if Flag A meets a condition. Prevents inconsistent feature states. [Learn more →](/features/prerequisites)

**Scheduling** — Time-based one-shot flag activation. Set a date/time and target value; the flag switches permanently at that moment. [Learn more →](/features/scheduling)

**Environments** — Isolated deployment stages (development, staging, production) with independent configs, API keys, and targeting rules. [Learn more →](/features/environments)

**API Keys** — Client keys (`cid_`) trigger server-side evaluation (rules never exposed to browser). Server keys (`svr_`) return full flag data for client-side evaluation. [Learn more →](/api/)

**Evaluation Pipeline** — The order in which flags are resolved: archived → prerequisites → overrides → schedule → targeting → rollout → default. [Learn more →](/contributing/architecture)

**Loading Strategies** — How the SDK fetches data on init: **optimistic** (instant defaults, background fetch), **pessimistic** (blocks until data arrives), **deferred** (no fetch until you trigger it). [Learn more →](/guide/loading-strategies)

**Circuit Breaker** — The SDK stops making requests for 5 minutes after receiving fatal errors (401/403), preventing wasted bandwidth on misconfigured clients. [Learn more →](/api/)

**RBAC** — Role-based access control with three levels: Viewer (read-only), Editor (read/write configs), Admin (full access including team and API keys). [Learn more →](/features/team)
