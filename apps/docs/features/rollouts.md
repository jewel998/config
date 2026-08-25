# Percentage Rollouts

> See also: [Targeting Rules](/features/targeting) · [Segments](/features/segments) · [Environments](/features/environments)

Percentage rollouts are the standard mechanism for **canary releases** and **progressive delivery** — gradually exposing a new feature to an increasing percentage of users rather than shipping to everyone at once.

Start at 5%, validate metrics, increase to 20%, 50%, then 100%. Each step is a canary stage. Rollouts are evaluated after [targeting rules](/features/targeting) in the pipeline.

## Sticky Bucketing

Rollouts use **sticky bucketing** via MurmurHash3: `hash(flagKey + ":" + userId) % 100`.

Sticky bucketing means the same user always lands in the same bucket for a given flag — their experience is consistent across sessions, devices, and deploys. This is a requirement for valid canary analysis: you can't measure impact if users flip in and out of the treatment group.

- Different flags give the same user different buckets (independent rollouts)
- No session storage or cookies required — purely derived from userId

## Setting Up a Rollout

1. Open a config in the portal
2. Expand the **Rollout** section
3. Set the percentage (e.g., 20)
4. Set the rollout value (the canary variant)
5. Save

## Progressive Delivery: Ramping Up

Since bucketing is deterministic, ramping up percentage is purely additive:

| Change    | Effect                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------- |
| 20% → 50% | All users who were in the 20% bucket remain. An additional ~30% of users are added (buckets 20–49). |
| 50% → 20% | Users with buckets 20–49 are removed. Users with buckets 0–19 remain.                               |
| 100% → 0% | Everyone reverts to the default value — effectively a **kill switch**.                              |

::: tip Safe ramp-up
Going 5% → 10% → 25% → 50% → 100% is safe. The first 5% of users remain consistent throughout the entire ramp-up — a key property of progressive delivery.
:::

## Kill Switch

Setting rollout to `0%` (or setting the flag's default value and removing the rollout) is the standard **kill switch** pattern — instant revert to the safe state for all users with zero code deploy.

## Ring-Based Deployment

Combine rollouts with [targeting rules](/features/targeting) and [segments](/features/segments) to implement **ring deployments** — rolling out through concentric rings of users by risk tolerance:

```
Ring 0 (internal): Target segment "Employees" → always enabled
Ring 1 (canary):   Rollout 5% of all users
Ring 2 (early):    Rollout 25%
Ring 3 (general):  Rollout 100%
```

Targeting rules have higher priority than rollouts in the evaluation pipeline, so ring 0 users always get the feature regardless of percentage.

## A/B Testing

A rollout to exactly 50% with a control (default) and a treatment (rollout value) is a standard **A/B test**. The sticky bucketing guarantees each user is consistently in one group for the duration of the experiment.

For **multivariate tests** (A/B/C/n), use multiple flags with independent rollout percentages — each flag represents one variant.

## Requirements

- A `userId` must be in the SDK context for rollout to work
- Without a userId, rollout is skipped and the default value is returned
- The userId must be stable — don't use random session IDs or sticky bucketing breaks

## Consistency Across Modes

The same hashing algorithm runs in both server-side evaluation (client keys) and client-side evaluation (server keys). A user bucketed at 30% in one mode will be at 30% in the other — no flip-flopping during migration.

## Edge Cases

| Scenario                   | Behavior                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| `rolloutPercentage: 0`     | Rollout skipped; pipeline continues to default                       |
| `rolloutPercentage: 100`   | Everyone gets the rollout value (equivalent to changing the default) |
| No `userId` in context     | Rollout skipped; pipeline continues to default                       |
| Same user, different flags | Different buckets (flag key is part of the hash input)               |

## Related

- [Targeting Rules](/features/targeting) — Targeting takes priority over rollouts; combine for ring deployments
- [Segments](/features/segments) — Define audience groups (internal users, beta cohort) for ring 0/1 targeting
- [Environments](/features/environments) — Run independent canary rollouts per environment
- [Audit Log](/features/audit-log) — Track rollout percentage changes over time
- [Configuration Scopes](/guide/scopes) — Full evaluation pipeline
