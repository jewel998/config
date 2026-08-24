# Percentage Rollouts

> See also: [Targeting Rules](/features/targeting) · [Segments](/features/segments) · [Environments](/features/environments)

Gradually release features to a percentage of users. Start with 5%, validate, then increase to 20%, 50%, and finally 100%. Rollouts are evaluated after [targeting rules](/features/targeting) in the pipeline.

## How It Works

1. Set a **rollout percentage** (0–100) on any config
2. Set the **rollout value** (what users in the rollout get)
3. Users are bucketed deterministically: same user always gets the same result

## Deterministic Bucketing

Rollouts use a MurmurHash3 algorithm: `hash(flagKey + ":" + userId) % 100`. This means:

- The same user always gets the same bucket for a given flag
- Different flags give the same user different buckets (independent rollouts)
- No session storage or cookies required — purely based on userId

## Setting Up a Rollout

1. Open a config in the portal
2. Expand the **Rollout** section
3. Set the percentage (e.g., 20)
4. Set the rollout value (e.g., `true` for a boolean flag)
5. Save

## What Happens When You Change the Percentage?

Since bucketing is deterministic (`hash % 100`), changing the percentage does **not** re-randomize users:

| Change    | Effect                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 20% → 50% | All users who were in the 20% bucket remain in the rollout. An additional ~30% of users are added (those with buckets 20–49). |
| 50% → 20% | Users with buckets 20–49 are removed from the rollout. Users with buckets 0–19 remain.                                        |
| 100% → 0% | Everyone reverts to the default value.                                                                                        |

**Key insight:** Increasing the percentage is always additive — existing users never lose the feature when you ramp up. Decreasing the percentage does remove users from the high end of the bucket range.

::: tip Ramp-up is safe
You can confidently go 5% → 10% → 25% → 50% → 100% knowing that the first 5% of users remain consistent throughout the entire ramp-up.
:::

## Rollout + Targeting

Targeting rules have higher priority than rollouts in the evaluation pipeline. If a targeting rule matches, the rollout is skipped. This means you can:

- Target "Enterprise Users" → always get the feature
- Roll out to 20% of everyone else → gradual release

See [Segments](/features/segments) for creating reusable audience groups to combine with rollouts.

## Requirements

- A `userId` must be provided in the SDK context for rollout to work
- Without a userId, rollout is skipped and the default value is returned
- The userId should be stable (don't use random session IDs)

## Consistency Across Modes

The same hashing algorithm is used in both server-side evaluation (client keys) and client-side evaluation (server keys). A user bucketed at 30% in one mode will be bucketed at 30% in the other — no flip-flopping during migration.

## Edge Cases

| Scenario                   | Behavior                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| `rolloutPercentage: 0`     | Rollout step is skipped entirely; pipeline continues to default      |
| `rolloutPercentage: 100`   | Everyone gets the rollout value (equivalent to changing the default) |
| No `userId` in context     | Rollout step is skipped; pipeline continues to default               |
| Same user, different flags | Different buckets (the flag key is part of the hash input)           |

## Related

- [Targeting Rules](/features/targeting) — Targeting rules take priority over rollouts in evaluation
- [Segments](/features/segments) — Define audience groups to combine with percentage rollouts
- [Environments](/features/environments) — Roll out independently per environment
- [Audit Log](/features/audit-log) — Track rollout percentage changes over time
- [Configuration Scopes](/guide/scopes) — Understand the full evaluation pipeline
