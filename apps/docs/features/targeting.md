# Targeting Rules

> See also: [Segments](/features/segments) · [Percentage Rollouts](/features/rollouts) · [Configuration Scopes](/guide/scopes)

Targeting rules let you serve different config values to different users based on their attributes or [segment](/features/segments) membership.

## How Targeting Works

Rules are evaluated in **priority order** (lowest number first). The first rule that matches wins. If no rules match, the default value is returned.

```
Priority 1: If user in "Beta Users" → value: true
Priority 2: If plan equals "enterprise" → value: true
Default: false
```

## Two Types of Rules

### 1. Segment-Based Rules (Recommended)

The simplest and most common pattern. Pick segments, assign a value.

- Click **Target Segment**
- Select one or more segments (OR logic — user in ANY gets the value)
- Set the return value
- Done. No conditions to configure.

### 2. Condition-Based Rules (Advanced)

For custom attribute-based logic when you need fine-grained control.

- Click **Custom Condition**
- Define conditions: `attribute` `operator` `value`
- Add AND conditions within a group
- Add OR groups for alternative matches

## Value Type Validation

The return value input is validated against the config's type:

| Config Type | Input                      |
| ----------- | -------------------------- |
| Boolean     | `true`/`false` pill toggle |
| Number      | Numeric input only         |
| String      | Free text                  |
| JSON        | Monospace JSON input       |

You can't accidentally type "hello" as a targeting value for a boolean flag.

## Evaluation Order

When a user requests a config value, the full evaluation pipeline runs:

1. **Archived** — If flag is archived, return undefined
2. **[Prerequisites](/features/prerequisites)** — If required flags aren't met, return default
3. **Overrides** — If userId has a specific override, use it
4. **[Schedule](/features/scheduling)** — If a scheduled value is active, use it
5. **Targeting Rules** — Evaluate rules by priority
6. **[Rollout](/features/rollouts)** — Apply percentage rollout
7. **Default** — Return the base value

## Server-Side vs Client-Side

- **Client keys (cid\_):** Targeting is evaluated on the API server. Your rules are never exposed.
- **Server keys (svr\_):** Full rules are returned; the SDK evaluates locally using plugins.

## Related

- [Segments](/features/segments) — Create reusable audience groups for segment-based targeting rules
- [Percentage Rollouts](/features/rollouts) — Gradually release features after targeting rules are evaluated
- [Prerequisites](/features/prerequisites) — Add flag dependencies that gate targeting evaluation
- [Scheduling](/features/scheduling) — Time-based value overrides that sit above targeting in the pipeline
- [Configuration Scopes](/guide/scopes) — How context and segments feed into rule evaluation
