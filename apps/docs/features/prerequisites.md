# Prerequisites

> See also: [Targeting Rules](/features/targeting) · [Scheduling](/features/scheduling) · [Percentage Rollouts](/features/rollouts)

Prerequisites let you create dependencies between flags. "Feature B should only be active if Feature A is already active." This prevents inconsistent states where a dependent feature is enabled without its dependency.

## Use Cases

- **New checkout** requires **payment v2** to be enabled first
- **Dark mode** requires **theme engine** to be active
- **Admin panel** requires **user.role** config to be `"admin"`

See [Targeting Rules](/features/targeting) to understand where prerequisites fit in the evaluation pipeline.

## Setting Up Prerequisites

1. Open a config in the portal
2. Expand the **Prerequisites** section
3. Select a flag from the dropdown
4. Choose an operator (equals, not_equals, greater_than, less_than, contains)
5. Set the required value (validated against the flag's type)
6. Click **Add**

## Supported Operators

| Operator       | Use Case                             |
| -------------- | ------------------------------------ |
| `equals`       | Flag must have this exact value      |
| `not_equals`   | Flag must NOT have this value        |
| `greater_than` | Numeric flag must be above threshold |
| `less_than`    | Numeric flag must be below threshold |
| `contains`     | String flag must contain substring   |

Operators are filtered by the prerequisite flag's type:

- Boolean flags: only `equals` / `not_equals`
- Number flags: all operators
- String flags: `equals`, `not_equals`, `contains`

## How It Works

When a config's value is requested:

1. Each prerequisite is evaluated in order
2. The prerequisite flag's current resolved value is compared using the operator
3. If ANY prerequisite is unmet → the config returns its default value
4. If ALL prerequisites are met → evaluation continues to targeting/rollout

## Circular Dependency Protection

The system detects and prevents:

- **Self-reference** — A flag cannot require itself
- **Circular chains** — A → B → A is detected and breaks the loop
- **Depth limits** — Maximum 5 levels of prerequisite nesting

## Example

```
feature.checkout_v2:
  prerequisites:
    - feature.payments_v2 equals true
    - app.min_version greater_than 2.0
  value: false (default)
  targeting:
    - If user in "Beta Testers" → true
```

This means: checkout_v2 can only be `true` if payments_v2 is already `true` AND the app version is above 2.0. Even if a user is in "Beta Testers", if the prerequisites aren't met, they get `false`.

## Related

- [Targeting Rules](/features/targeting) — Prerequisites gate the targeting evaluation step
- [Segments](/features/segments) — Combine prerequisites with segment-based targeting
- [Scheduling](/features/scheduling) — Schedule a flag that has prerequisites defined
- [Percentage Rollouts](/features/rollouts) — Rollouts are only evaluated if prerequisites pass
- [Audit Log](/features/audit-log) — Track prerequisite additions and removals
