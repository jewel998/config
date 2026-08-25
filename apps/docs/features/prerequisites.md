# Prerequisites

> See also: [Targeting Rules](/features/targeting) · [Scheduling](/features/scheduling) · [Percentage Rollouts](/features/rollouts)

Prerequisites are **dependency flags** — a flag that guards another flag. "Feature B only activates if Feature A is already in the required state." This is **dependency-based feature gating**: preventing a dependent feature from being enabled without its guard flag passing first.

The flag that is depended upon is often called a **guard flag** — it acts as a gate in the evaluation pipeline.

## Use Cases

- **New checkout** requires **payment v2** guard flag to be `true`
- **Dark mode** requires **theme engine** guard flag to be `active`
- **Admin panel** requires `user.role` config to equal `"admin"`
- **Canary feature** requires **kill-switch flag** to be `true` (instant disable by flipping the guard)

## Setting Up Prerequisites

1. Open a config in the portal
2. Expand the **Prerequisites** section
3. Select a guard flag from the dropdown
4. Choose an operator and required value
5. Click **Add**

## Supported Operators

| Operator       | Use Case                                   |
| -------------- | ------------------------------------------ |
| `equals`       | Guard flag must have this exact value      |
| `not_equals`   | Guard flag must NOT have this value        |
| `greater_than` | Numeric guard flag must be above threshold |
| `less_than`    | Numeric guard flag must be below threshold |
| `contains`     | String guard flag must contain substring   |

Operators are filtered by the guard flag's type — boolean flags show only `equals` / `not_equals`.

## How It Works

1. Each prerequisite (guard flag) is evaluated in order
2. If ANY guard flag condition is unmet → the config returns its default value immediately
3. If ALL guard flags pass → evaluation continues to targeting/rollout

## Circular Dependency Protection

| Protection      | Behavior                                  |
| --------------- | ----------------------------------------- |
| Self-reference  | A flag cannot require itself              |
| Circular chains | A → B → A is detected and breaks the loop |
| Depth limit     | Maximum 5 levels of prerequisite nesting  |

## Example

```
feature.checkout_v2:
  prerequisites:
    - feature.payments_v2 equals true    ← guard flag
    - app.min_version greater_than 2.0   ← guard flag
  targeting:
    - If user in "Beta Testers" → true
  default: false
```

Even if a user is in "Beta Testers", they get `false` unless both guard flags pass. The prerequisite check is a hard gate above targeting in the pipeline.

## Related

- [Targeting Rules](/features/targeting) — Prerequisites gate the targeting step; see feature gating via targeting
- [Segments](/features/segments) — Combine guard flags with segment-based targeting
- [Scheduling](/features/scheduling) — Schedule a flag that has guard flags defined
- [Percentage Rollouts](/features/rollouts) — Rollouts only evaluate if all guard flags pass
- [Audit Log](/features/audit-log) — Track guard flag additions and removals
