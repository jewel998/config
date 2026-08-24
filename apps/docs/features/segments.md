# Segments

> See also: [Targeting Rules](/features/targeting) · [Configuration Scopes](/guide/scopes) · [Percentage Rollouts](/features/rollouts)

Segments are reusable audience groups that you can target across multiple feature flags and configs. Instead of duplicating conditions like "plan equals enterprise AND country in US, UK" on every flag, define it once as a segment and reference it everywhere. See [Configuration Scopes](/guide/scopes) for how segments fit into the broader evaluation model.

## Creating a Segment

1. Go to **Segments** in the portal navigation
2. Click **Create Segment**
3. Give it a name (e.g., "Enterprise Users", "Beta Testers")
4. Define conditions using attributes:
   - `plan` equals `enterprise`
   - `country` in_list `US, UK, DE`
   - `email` ends_with `@company.com`

## Condition Logic

Segments use **DNF (Disjunctive Normal Form)**:

- Conditions within a group are **AND** (all must match)
- Groups are connected by **OR** (any group matching is sufficient)

**Example:** "Enterprise users in US/UK OR anyone with a @company.com email"

```
Group 1: plan equals "enterprise" AND country in_list "US,UK"
   OR
Group 2: email ends_with "@company.com"
```

## Using Segments in Targeting

When creating a [targeting rule](/features/targeting) on a config or feature flag:

1. Click **Target Segment** (primary action)
2. Click the segment badges to select them
3. Set the value to serve for users in those segments
4. Multiple segments use OR logic — user in ANY selected segment gets the value

## Supported Operators

| Operator       | Description                 | Example                                |
| -------------- | --------------------------- | -------------------------------------- |
| `equals`       | Exact match                 | `plan` equals `"pro"`                  |
| `not_equals`   | Does not match              | `status` not_equals `"banned"`         |
| `contains`     | Substring match             | `email` contains `"@gmail"`            |
| `starts_with`  | Prefix match                | `user_id` starts_with `"usr_"`         |
| `ends_with`    | Suffix match                | `email` ends_with `".edu"`             |
| `in_list`      | Any in comma-separated list | `country` in_list `"US,UK,DE"`         |
| `not_in_list`  | None in list                | `plan` not_in_list `"free,trial"`      |
| `greater_than` | Numeric greater             | `age` greater_than `18`                |
| `less_than`    | Numeric less                | `login_count` less_than `5`            |
| `regex_match`  | Regular expression          | `email` regex_match `".*@corp\\.com$"` |

## Segment Usage Tracking

The portal shows which configs reference each segment. This helps you understand the impact before modifying or deleting a segment.

## How Segments Work with API Keys

- **Client keys (cid\_):** The API evaluates segment membership server-side. Your segment conditions are never exposed to the browser.
- **Server keys (svr\_):** Segment definitions are included in the API response for local evaluation by the SDK.

## Segments and autoContext

When you pass attributes via `autoContext()`, they are automatically available for segment evaluation:

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  context: autoContext({
    userId: "user_123",
    plan: "enterprise",
    country: "US",
  }),
});
```

If you have a segment defined as `plan equals "enterprise"`, users whose context includes `plan: "enterprise"` will automatically match that segment. The SDK sends context attributes to the API, which evaluates segment membership server-side.

**Auto-detected attributes** (browser, OS, device, locale, timezone) are also available for segment conditions — you can create segments like "Mobile Users" with `device equals "mobile"` without any extra configuration.

## Related

- [Targeting Rules](/features/targeting) — Use segments in targeting rules to serve different values per audience
- [Configuration Scopes](/guide/scopes) — How context, segments, and scopes interact during evaluation
- [Percentage Rollouts](/features/rollouts) — Combine segments with gradual rollouts for targeted releases
- [Export](/features/export) — Bulk export includes segment definitions
- [SDK Reference](/api/) — Passing context attributes for segment evaluation
