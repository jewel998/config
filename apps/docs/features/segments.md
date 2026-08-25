# Segments

> See also: [Targeting Rules](/features/targeting) · [Configuration Scopes](/guide/scopes) · [Percentage Rollouts](/features/rollouts)

Segments are reusable **audience segments** — named cohorts of users defined by conditions on context attributes. Define a cohort once ("Enterprise Users", "Beta Testers", "Mobile users in the EU") and reference it across every flag, rather than duplicating conditions everywhere.

See [Configuration Scopes](/guide/scopes) for how segments fit into the broader evaluation model.

## Creating a Segment

1. Go to **Segments** in the portal
2. Click **Create Segment**
3. Name it (name your cohort clearly — it will appear in every targeting rule)
4. Define conditions using attributes

## Condition Logic — DNF

Segments use **DNF (Disjunctive Normal Form)**:

- Conditions within a group are **AND** (all must match)
- Groups are **OR** (any matching group is sufficient)

**Example:** "Enterprise users in US/UK, OR anyone with a @company.com email"

```
Group 1: plan equals "enterprise" AND country in_list "US,UK"
   OR
Group 2: email ends_with "@company.com"
```

## Using Segments in Targeting

1. Open a config → click **Target Segment**
2. Select one or more segment badges
3. Set the value to serve for users in those segments
4. Multiple segments use OR logic — user in ANY selected segment gets the value

## Supported Operators

| Operator       | Description                 | Example                                |
| -------------- | --------------------------- | -------------------------------------- |
| `equals`       | Exact match                 | `plan` equals `"pro"`                  |
| `not_equals`   | Does not match              | `status` not_equals `"banned"`         |
| `contains`     | Substring                   | `email` contains `"@gmail"`            |
| `starts_with`  | Prefix                      | `user_id` starts_with `"usr_"`         |
| `ends_with`    | Suffix                      | `email` ends_with `".edu"`             |
| `in_list`      | Any in comma-separated list | `country` in_list `"US,UK,DE"`         |
| `not_in_list`  | None in list                | `plan` not_in_list `"free,trial"`      |
| `greater_than` | Numeric greater             | `age` greater_than `18`                |
| `less_than`    | Numeric less                | `login_count` less_than `5`            |
| `regex_match`  | Regular expression          | `email` regex_match `".*@corp\\.com$"` |

## Segment Usage Tracking

The portal shows which configs reference each segment — understand the blast radius before modifying or deleting a cohort definition.

## Security Model

- **Client keys (`cid_`):** Segment conditions are evaluated server-side. Your cohort definitions never reach the browser.
- **Server keys (`svr_`):** Segment definitions are included in the API response for local SDK evaluation.

## Auto-Context Attributes

`autoContext()` detects browser, OS, device, locale, and timezone automatically — available as segment conditions without any extra configuration. Create a "Mobile Users" segment with `device equals "mobile"` and it works out of the box.

## Related

- [Targeting Rules](/features/targeting) — Use segments in targeting for A/B testing and feature gating
- [Percentage Rollouts](/features/rollouts) — Combine segments with rollouts for ring deployments (canary to internal cohort first)
- [Configuration Scopes](/guide/scopes) — How context, segments, and evaluation interact
- [Export](/features/export) — Bulk export includes segment definitions
