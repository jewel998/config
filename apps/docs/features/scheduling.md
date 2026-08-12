# Scheduling

Schedule config changes to activate at a specific date and time. Perfect for planned launches, marketing campaigns, or timed feature releases.

## How It Works

1. Open a config in the portal
2. Expand the **Schedule** section
3. Pick a date and time using the calendar picker
4. Set the target value (what the config should become at that time)
5. Save

Once the scheduled time arrives, the API automatically returns the scheduled value instead of the default.

## Evaluation Priority

Schedules sit between overrides and targeting in the pipeline:

```
Prerequisites → Overrides → Schedule → Targeting → Rollout → Default
```

This means:

- User overrides still take priority over schedules
- Schedules override targeting rules and rollout

## Use Cases

- **Product launch** — Enable a feature flag at midnight on launch day
- **Sale pricing** — Change a config value at the start of a sale event
- **Gradual deprecation** — Switch a value after a migration deadline
- **Time-limited features** — Combine with a second schedule to disable after the event

## Timezone

Scheduled times are stored in UTC. The portal's calendar picker shows your local timezone. The API evaluates against the current UTC time.
