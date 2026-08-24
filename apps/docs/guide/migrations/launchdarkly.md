# From LaunchDarkly

> See also: [Import](/features/import) · [Segments](/features/segments) · [Targeting Rules](/features/targeting)

## Step 1: Export Your Flags

LaunchDarkly provides a REST API and UI-based export. Use the API for structured data:

```bash
# List all feature flags in a project
curl -s -X GET \
  'https://app.launchdarkly.com/api/v2/flags/YOUR_PROJECT_KEY' \
  -H "Authorization: YOUR_LD_API_KEY" \
  | jq '.items' > ld-flags.json
```

Or from the LaunchDarkly dashboard: **Feature flags → Export** (available on Enterprise plans).

## Step 2: Map LaunchDarkly Concepts

| LaunchDarkly                | @jewel998/config                  | Notes                                         |
| --------------------------- | --------------------------------- | --------------------------------------------- |
| Project                     | Project                           | 1:1 mapping                                   |
| Environment                 | Environment                       | 1:1 mapping                                   |
| Feature Flag (boolean)      | Config (`boolean` type)           | Direct equivalent                             |
| Feature Flag (multivariate) | Config (`string`/`number`/`json`) | Map variations to a single value + targeting  |
| Segments                    | Segments                          | Direct equivalent — recreate conditions       |
| Targeting rules             | Targeting rules                   | Re-create in portal; operators are similar    |
| Percentage rollout          | Rollout percentage                | Set `rolloutPercentage` and `rolloutValue`    |
| Prerequisites               | Prerequisites                     | Direct equivalent                             |
| Custom attributes           | Context attributes                | Pass via `autoContext()` or `context`         |
| Variation index             | N/A                               | Use targeting rules to return specific values |

## Step 3: Convert Flag Data

LaunchDarkly flags have `variations` (array of possible values) and `rules` (targeting). In @jewel998/config, each flag has a single `value` (default) with [targeting rules](/features/targeting) that override it.

**LaunchDarkly boolean flag:**

```json
{
  "key": "new-checkout",
  "kind": "boolean",
  "variations": [true, false],
  "on": true,
  "fallthrough": { "variation": 1 }
}
```

**Equivalent @jewel998/config import entry:**

```json
{ "key": "feature.new_checkout", "value": false, "valueType": "boolean" }
```

Then add targeting rules via the portal to serve `true` to specific segments.

**LaunchDarkly multivariate flag:**

```json
{
  "key": "pricing-tier",
  "kind": "multivariate",
  "variations": ["basic", "standard", "premium"],
  "fallthrough": { "variation": 0 }
}
```

**Equivalent:**

```json
{ "key": "pricing.tier", "value": "basic", "valueType": "string" }
```

Add targeting rules for [segments](/features/segments) to return `"standard"` or `"premium"`.

## Step 4: Convert to Import Format

Create a JSON file matching the @jewel998/config [import](/features/import) schema:

```javascript
// convert-ld.js — Run with Node.js
import { readFileSync, writeFileSync } from "fs";

const ldFlags = JSON.parse(readFileSync("ld-flags.json", "utf-8"));

const entries = ldFlags.map((flag) => {
  const defaultVariation = flag.fallthrough?.variation ?? 0;
  const value = flag.variations[defaultVariation];
  const valueType =
    typeof value === "boolean"
      ? "boolean"
      : typeof value === "number"
        ? "number"
        : typeof value === "object"
          ? "json"
          : "string";

  return {
    key: flag.key.replace(/-/g, "_"), // LaunchDarkly uses hyphens, we use dots/underscores
    value: valueType === "json" ? JSON.stringify(value) : value,
    valueType,
  };
});

writeFileSync("config-import.json", JSON.stringify(entries, null, 2));
console.log(`Converted ${entries.length} flags`);
```

## Step 5: Import

1. Open your portal → select the target environment
2. Go to **Import & Export** → **Import**
3. Upload `config-import.json`
4. Choose conflict strategy: **Skip existing** (safe for first import)
5. Review validation results and confirm

## Step 6: Recreate Targeting

Targeting rules and segments must be recreated manually in the portal since LaunchDarkly's rule format is proprietary:

1. **Segments first** — Create matching segments with equivalent conditions
2. **Targeting rules** — Add rules per flag, mapping LD's rule ordering to priority numbers
3. **Rollouts** — Set [rollout percentages](/features/rollouts) on flags that had percentage rollouts in LD

## Step 7: Update SDK Integration

```typescript
// Before (LaunchDarkly)
import * as LD from "launchdarkly-js-client-sdk";
const client = LD.initialize("client-id", {
  key: "user-123",
  custom: { plan: "pro" },
});
await client.waitForInitialization();
client.variation("new-checkout", false);

// After (@jewel998/config)
import { initConfig, autoContext } from "@jewel998/config";
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: { "feature.new_checkout": false },
  context: autoContext({ userId: "user-123", plan: "pro" }),
});
flags.get("feature.new_checkout");
```

## Step 8: Parallel Run (Recommended)

Run both systems in parallel for 1-2 weeks:

1. Keep LaunchDarkly active as the source of truth
2. Initialize @jewel998/config alongside it
3. Compare values in your logging/monitoring
4. Once confident, switch the primary and decommission LaunchDarkly
