# Targeting Rules

> See also: [Segments](/features/segments) · [Percentage Rollouts](/features/rollouts) · [Configuration Scopes](/guide/scopes)

Targeting rules are the core mechanism for **user segmentation** — serving different config values to different users based on their attributes or [segment](/features/segments) membership. They power **A/B testing**, **multivariate testing**, **feature gating**, and **personalization**.

Rules are evaluated in **priority order** (lowest number first). The first match wins. If no rules match, the default value is returned.

## A/B Testing and Multivariate Testing

A boolean flag with two targeting rules — one returning `true` for a treatment segment, one returning `false` as default — is a standard **A/B test**. Each targeting rule is a variant arm.

For **multivariate tests (MVT)**, use a string or JSON flag with one rule per variant:

```
Priority 1: If user in "Variant B" segment → value: "redesign_v2"
Priority 2: If user in "Variant C" segment → value: "redesign_v3"
Default: "original"
```

Each user is consistently in one variant because [segment membership is evaluated server-side](/features/segments) against a stable userId.

## Two Types of Rules

### 1. Segment-Based Rules (Recommended)

The simplest targeting pattern. Pick segments, assign a value. Ideal for **cohort targeting** — feature gating by plan, beta group, geography, etc.

- Click **Target Segment**
- Select one or more segments (OR logic — user in ANY gets the value)
- Set the return value

### 2. Condition-Based Rules (Advanced)

Inline attribute conditions without creating a named segment. Use when the condition is flag-specific and not worth reusing.

- Click **Custom Condition**
- Define conditions: `attribute` `operator` `value`
- AND conditions within a group, OR groups for alternatives

## Feature Gating

Returning a specific value only for users who meet a condition — "this feature is only available to Enterprise plan users" — is called **feature gating**. It's a targeting rule where the gate condition is the plan, role, or entitlement attribute.

See [Prerequisites](/features/prerequisites) for **dependency-based feature gating** — gating one flag on the state of another.

## Value Type Validation

The return value is validated against the config's type — you can't type "hello" as a value for a boolean flag.

| Config Type | Input                 |
| ----------- | --------------------- |
| Boolean     | `true`/`false` toggle |
| Number      | Numeric input only    |
| String      | Free text             |
| JSON        | Monospace JSON input  |

## Evaluation Order

```
1. Archived       — return undefined
2. Prerequisites  — if unmet, return default
3. Overrides      — user-specific force targeting
4. Schedule       — time-gated value
5. Targeting Rules — evaluated here, priority order
6. Rollout        — canary percentage
7. Default        — base value
```

## Server-Side vs Client-Side Evaluation

- **Client keys (`cid_`):** Targeting is evaluated server-side. Rules and segment conditions never reach the browser — no data leakage risk.
- **Server keys (`svr_`):** Full rules returned; the SDK evaluates locally via plugins. Useful for latency-sensitive scenarios.

## Related

- [Segments](/features/segments) — Reusable audience groups for targeting rules
- [Percentage Rollouts](/features/rollouts) — Canary delivery after targeting is evaluated
- [Prerequisites](/features/prerequisites) — Dependency-based feature gating
- [Scheduling](/features/scheduling) — Time-based targeting above the rule evaluation step
- [Configuration Scopes](/guide/scopes) — Full evaluation pipeline and context model
