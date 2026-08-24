# From Unleash

> See also: [Import](/features/import) · [Segments](/features/segments) · [Targeting Rules](/features/targeting)

## Step 1: Export Your Flags

Unleash provides an export API:

```bash
# Export all features from a project
curl -s -X GET \
  'https://your-unleash.example.com/api/admin/features' \
  -H "Authorization: YOUR_API_TOKEN" \
  | jq '.features' > unleash-flags.json
```

Or use the Unleash Admin UI: **Configure → Export** (available in Unleash 4.x+).

## Step 2: Map Unleash Concepts

| Unleash               | @jewel998/config                      | Notes                                                            |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Project               | Project                               | 1:1 mapping                                                      |
| Environment           | Environment                           | 1:1 mapping                                                      |
| Feature toggle        | Config                                | Map type and default value                                       |
| Activation strategy   | Targeting rule                        | Recreate as segment-based or condition-based rules               |
| Gradual rollout       | Rollout percentage                    | Map rollout percentage directly                                  |
| Segments              | Segments                              | Recreate conditions in portal                                    |
| Constraints           | Condition-based targeting             | Map operators (IN, NOT_IN → in_list, not_in_list)                |
| Variants              | Targeting rules with different values | Each variant becomes a targeting rule returning a specific value |
| Custom context fields | Context attributes                    | Pass via `autoContext()`                                         |

## Step 3: Convert Flag Data

**Unleash feature toggle:**

```json
{
  "name": "new-checkout",
  "type": "release",
  "enabled": true,
  "strategies": [
    {
      "name": "flexibleRollout",
      "parameters": { "rollout": "50", "stickiness": "userId" }
    }
  ]
}
```

**Equivalent @jewel998/config:**

```json
{ "key": "feature.new_checkout", "value": false, "valueType": "boolean" }
```

Then set `rolloutPercentage: 50` and `rolloutValue: true` in the portal. See [Percentage Rollouts](/features/rollouts) for details.

## Step 4: Conversion Script

```javascript
// convert-unleash.js
import { readFileSync, writeFileSync } from "fs";

const unleashFlags = JSON.parse(readFileSync("unleash-flags.json", "utf-8"));

const entries = unleashFlags.map((flag) => {
  // Unleash toggles are boolean by default
  // Variants make them multivariate
  const hasVariants = flag.variants && flag.variants.length > 0;

  if (hasVariants) {
    // Use the first variant's payload as the default value
    const defaultVariant =
      flag.variants.find((v) => v.name === "disabled") || flag.variants[0];
    const payload = defaultVariant?.payload;

    return {
      key: flag.name.replace(/-/g, "_"),
      value: payload?.value ?? "",
      valueType: payload?.type === "json" ? "json" : "string",
    };
  }

  return {
    key: flag.name.replace(/-/g, "_"),
    value: flag.enabled,
    valueType: "boolean",
  };
});

writeFileSync("config-import.json", JSON.stringify(entries, null, 2));
console.log(`Converted ${entries.length} toggles`);
```

## Step 5: Import and Configure

1. [Import](/features/import) the JSON file via the portal's **Import & Export** feature
2. Recreate activation strategies as [targeting rules](/features/targeting):
   - `userWithId` → Create a segment with specific userId conditions
   - `flexibleRollout` → Set rollout percentage on the flag
   - `remoteAddress` → Not directly supported; use a custom attribute instead
3. Recreate constraints as condition-based targeting rules

## Step 6: Update SDK

```typescript
// Before (Unleash)
import { UnleashClient } from "unleash-proxy-client";
const unleash = new UnleashClient({
  url: "https://unleash-proxy.example.com/proxy",
  clientKey: "proxy-key",
  appName: "my-app",
});
unleash.start();
unleash.isEnabled("new-checkout");

// After (@jewel998/config)
import { initConfig, autoContext } from "@jewel998/config";
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: { "feature.new_checkout": false },
  context: autoContext({ userId: "user-123" }),
});
flags.flag("feature.new_checkout");
```

## Operator Mapping (Unleash → @jewel998/config)

| Unleash Operator | @jewel998/config Operator | Notes                                          |
| ---------------- | ------------------------- | ---------------------------------------------- |
| IN               | `in_list`                 | Comma-separated values                         |
| NOT_IN           | `not_in_list`             | Comma-separated values                         |
| STR_CONTAINS     | `contains`                | Substring match                                |
| STR_STARTS_WITH  | `starts_with`             | Prefix match                                   |
| STR_ENDS_WITH    | `ends_with`               | Suffix match                                   |
| NUM_EQ           | `equals`                  | Numeric comparison                             |
| NUM_GT           | `greater_than`            | Numeric comparison                             |
| NUM_GTE          | `greater_than`            | Use `>=` value - 1 or combine with equals      |
| NUM_LT           | `less_than`               | Numeric comparison                             |
| NUM_LTE          | `less_than`               | Use `<=` value + 1 or combine with equals      |
| SEMVER_EQ        | `equals`                  | Treat as string comparison                     |
| DATE_AFTER       | N/A                       | Use [scheduling](/features/scheduling) instead |
| DATE_BEFORE      | N/A                       | Use [scheduling](/features/scheduling) instead |
