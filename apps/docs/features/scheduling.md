# Scheduling

> See also: [Targeting Rules](/features/targeting) · [Prerequisites](/features/prerequisites) · [Environments](/features/environments)

Schedule config changes to activate at a specific date and time. Perfect for planned launches, marketing campaigns, or timed feature releases. Schedules sit between overrides and [targeting rules](/features/targeting) in the evaluation pipeline.

## How It Works

1. Open a config in the portal
2. Expand the **Schedule** section
3. Pick a date and time using the calendar picker
4. Set the target value (what the config should become at that time)
5. Save

Once the scheduled time arrives, the API automatically returns the scheduled value instead of the default.

## Schedule Behavior

Schedules are **one-shot activations** — once the `activateAt` time is reached, the scheduled value becomes the resolved value permanently (until you change it or remove the schedule).

::: info Schedules are permanent once activated
A schedule does NOT auto-revert. If the current time is past `activateAt`, the scheduled value is always returned. Think of it as "switch to this value at this time, forever."
:::

### What happens after the scheduled time?

The evaluation logic is:

```
if (now >= activateAt) → return targetValue
if (now < activateAt) → skip, continue to targeting/rollout/default
```

Once activated, the schedule takes precedence over targeting rules and rollouts indefinitely.

## Time-Limited Features (Campaigns)

To enable a feature for a limited window (e.g., a 24-hour sale), use two config values:

1. **Option A: Two schedules on separate flags**
   - `feature.sale_banner` — Schedule to `true` at sale start
   - After the sale ends, manually update the value back to `false` in the portal

2. **Option B: Use targeting + schedule together**
   - Schedule the flag to `true` at sale start
   - After the event, remove the schedule and the flag reverts to its default (`false`)

::: tip
Since schedules are permanent once activated, the recommended pattern for temporary features is to set a reminder to manually revert the flag or remove the schedule after your event ends. A future version may add schedule expiry.
:::

## Evaluation Priority

Schedules sit between overrides and targeting in the pipeline:

```
Prerequisites → Overrides → Schedule → Targeting → Rollout → Default
```

This means:

- User overrides still take priority over schedules
- Schedules override [targeting rules](/features/targeting) and [rollout](/features/rollouts)

## Use Cases

- **Product launch** — Enable a feature flag at midnight on launch day
- **Sale pricing** — Change a config value at the start of a sale event
- **Gradual deprecation** — Switch a value after a migration deadline
- **Time-limited features** — Combine with manual revert after the event

## Timezone

Scheduled times are stored in UTC. The portal's calendar picker shows your local timezone. The API evaluates against the current UTC time.

## Related

- [Targeting Rules](/features/targeting) — Schedules override targeting in the evaluation pipeline
- [Percentage Rollouts](/features/rollouts) — Combine with schedules for time-gated gradual rollouts
- [Prerequisites](/features/prerequisites) — Prerequisites must pass before a schedule takes effect
- [Audit Log](/features/audit-log) — Track when schedules were created and activated
- [Environments](/features/environments) — Schedules are per-environment, enabling staged launches
