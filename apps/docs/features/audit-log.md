# Audit Log

Every change in the portal is recorded in a tamper-evident audit log. Know exactly who changed what, when, and see the before/after diff.

## What's Tracked

| Action       | Resources                                                                      |
| ------------ | ------------------------------------------------------------------------------ |
| Create       | Configs, segments, API keys, environments, team members, webhooks              |
| Update       | Config values, targeting rules, rollout %, overrides, schedules, prerequisites |
| Delete       | Configs, segments, API keys, environments, webhooks                            |
| State Change | Lifecycle state transitions (draft → active → stale → archived)                |

## Audit Entry Fields

Each entry contains:

- **Actor** — Who made the change (display name + avatar)
- **Action** — create, update, delete, state_change
- **Resource** — What was changed (with category chip)
- **Timestamp** — When it happened (relative + absolute)
- **Old Value** — Previous state (for updates)
- **New Value** — Current state (for creates/updates)

## Diff Viewer

For updates, click an entry to see a git-style diff:

- **Unified view** — Single column, additions in green, deletions in red
- **Side-by-side view** — Two columns comparing old and new

## Filtering

Filter audit entries by:

- **Resource category** — configs, segments, api_keys, environments, team, webhooks
- **Time range** — Last hour, day, week, month

## Infinite Scroll

The audit log uses infinite scroll pagination — older entries load automatically as you scroll down.

## Retention

Audit entries are retained based on your project's configured retention period (default: unlimited on the free tier).

## Integration with Webhooks

Audit entries trigger webhook notifications. You can filter webhooks by event type and resource category to get notified only about changes you care about.
