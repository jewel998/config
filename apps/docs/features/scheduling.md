# Scheduling

> See also: [Targeting Rules](/features/targeting) · [Prerequisites](/features/prerequisites) · [Environments](/features/environments)

Scheduling is **timed release** — a flag switches to a new value at a precise date and time without any code deploy or manual intervention. Perfect for planned launches, marketing campaigns, and coordinated multi-environment releases.

Schedules sit between overrides and [targeting rules](/features/targeting) in the evaluation pipeline.

## Dark Launch

A common pattern is to deploy code with the feature behind a `false` flag (so it's in production but unreachable by users), then schedule the activation. This is a **dark launch** — code ships decoupled from feature availability. The schedule is the activation moment.

## Setting Up a Schedule

1. Open a config in the portal
2. Expand the **Schedule** section
3. Pick a date and time
4. Set the target value (what the flag becomes at that time)
5. Save

## Schedule Behavior

Schedules are **one-shot activations** — once `activateAt` is reached, the scheduled value is permanently active until you explicitly change it.

```
now >= activateAt → return targetValue
now <  activateAt → skip, continue to targeting/rollout/default
```

::: info One-shot, not time-windowed
A schedule does NOT auto-revert. Think of it as "switch to this value at this time, forever." For time-limited features, set a reminder to manually revert after the event, or use a kill switch flag.
:::

## Use Cases

| Pattern                  | How                                                                               |
| ------------------------ | --------------------------------------------------------------------------------- |
| **Timed launch**         | Schedule flag to `true` at launch time — ship code now, release on schedule       |
| **Dark launch**          | Deploy behind `false`, schedule activation — decouple deploy from release         |
| **Marketing campaign**   | Schedule config value change at campaign start                                    |
| **Coordinated release**  | Schedule the same flag across environments in sequence (staging first, then prod) |
| **Deprecation deadline** | Schedule a breaking value change after a migration window closes                  |

## Evaluation Priority

```
Prerequisites → Overrides → Schedule → Targeting → Rollout → Default
```

- User overrides still take priority over schedules
- Once active, a schedule overrides targeting rules and rollout percentage

## Timezone

Scheduled times are stored in UTC. The portal picker shows your local timezone.

## Related

- [Targeting Rules](/features/targeting) — Active schedules override targeting in the pipeline
- [Percentage Rollouts](/features/rollouts) — Schedule a canary activation at a specific time
- [Prerequisites](/features/prerequisites) — Guard flags must pass before a schedule takes effect
- [Audit Log](/features/audit-log) — Track when schedules were created and activated
- [Environments](/features/environments) — Schedule independently per environment for staged rollouts
