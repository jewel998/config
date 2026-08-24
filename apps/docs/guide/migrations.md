# Migration Guides

Migrate to @jewel998/config from other feature flag platforms. Each guide includes data mapping, step-by-step import instructions, and verification steps.

## Supported Migration Paths

- [From LaunchDarkly](#from-launchdarkly)
- [From Unleash](#from-unleash)
- [From Firebase Remote Config](#from-firebase-remote-config)

## Before You Start

1. **Deploy your instance first** — Follow the [Self-Hosting Guide](/guide/self-hosting) to get your platform running
2. **Create your project and environments** — Set up matching environments (dev, staging, production)
3. **Export from your current tool** — Use the guides below to export your flags
4. **Test in development first** — Always import to a non-production environment first

---

## From LaunchDarkly

### Step 1: Export Your Flags

LaunchDarkly provides a REST API and UI-based export. Use the API for structured data:

```bash
# List all feature flags in a project
curl -s -X GET \
  'https://app.launchdarkly.com/api/v2/flags/YOUR_PROJECT_KEY' \
  -H "Authorization: YOUR_LD_API_KEY" \
  | jq '.items' > ld-flags.json
```

Or from the LaunchDarkly dashboard: **Feature flags → Export** (available on Enterprise plans).

### Step 2: Map LaunchDarkly Concepts

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

### Step 3: Convert Flag Data

LaunchDarkly flags have `variations` (array of possible values) and `rules` (targeting). In @jewel998/config, each flag has a single `value` (default) with targeting rules that override it.

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

Add targeting rules for segments to return `"standard"` or `"premium"`.

### Step 4: Convert to Import Format

Create a JSON file matching the @jewel998/config import schema:

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

### Step 5: Import

1. Open your portal → select the target environment
2. Go to **Import & Export** → **Import**
3. Upload `config-import.json`
4. Choose conflict strategy: **Skip existing** (safe for first import)
5. Review validation results and confirm

### Step 6: Recreate Targeting

Targeting rules and segments must be recreated manually in the portal since LaunchDarkly's rule format is proprietary:

1. **Segments first** — Create matching segments with equivalent conditions
2. **Targeting rules** — Add rules per flag, mapping LD's rule ordering to priority numbers
3. **Rollouts** — Set rollout percentages on flags that had percentage rollouts in LD

### Step 7: Update SDK Integration

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

### Step 8: Parallel Run (Recommended)

Run both systems in parallel for 1-2 weeks:

1. Keep LaunchDarkly active as the source of truth
2. Initialize @jewel998/config alongside it
3. Compare values in your logging/monitoring
4. Once confident, switch the primary and decommission LaunchDarkly

---

## From Unleash

### Step 1: Export Your Flags

Unleash provides an export API:

```bash
# Export all features from a project
curl -s -X GET \
  'https://your-unleash.example.com/api/admin/features' \
  -H "Authorization: YOUR_API_TOKEN" \
  | jq '.features' > unleash-flags.json
```

Or use the Unleash Admin UI: **Configure → Export** (available in Unleash 4.x+).

### Step 2: Map Unleash Concepts

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

### Step 3: Convert Flag Data

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

Then set `rolloutPercentage: 50` and `rolloutValue: true` in the portal.

### Step 4: Conversion Script

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

### Step 5: Import and Configure

1. Import the JSON file via the portal's **Import & Export** feature
2. Recreate activation strategies as targeting rules:
   - `userWithId` → Create a segment with specific userId conditions
   - `flexibleRollout` → Set rollout percentage on the flag
   - `remoteAddress` → Not directly supported; use a custom attribute instead
3. Recreate constraints as condition-based targeting rules

### Step 6: Update SDK

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

### Operator Mapping (Unleash → @jewel998/config)

| Unleash Operator | @jewel998/config Operator | Notes                                     |
| ---------------- | ------------------------- | ----------------------------------------- |
| IN               | `in_list`                 | Comma-separated values                    |
| NOT_IN           | `not_in_list`             | Comma-separated values                    |
| STR_CONTAINS     | `contains`                | Substring match                           |
| STR_STARTS_WITH  | `starts_with`             | Prefix match                              |
| STR_ENDS_WITH    | `ends_with`               | Suffix match                              |
| NUM_EQ           | `equals`                  | Numeric comparison                        |
| NUM_GT           | `greater_than`            | Numeric comparison                        |
| NUM_GTE          | `greater_than`            | Use `>=` value - 1 or combine with equals |
| NUM_LT           | `less_than`               | Numeric comparison                        |
| NUM_LTE          | `less_than`               | Use `<=` value + 1 or combine with equals |
| SEMVER_EQ        | `equals`                  | Treat as string comparison                |
| DATE_AFTER       | N/A                       | Use scheduling instead                    |
| DATE_BEFORE      | N/A                       | Use scheduling instead                    |

---

## From Firebase Remote Config

### Step 1: Export Your Config

Firebase Remote Config provides an export via the REST API:

```bash
# Get all parameters
curl -s -X GET \
  "https://firebaseremoteconfig.googleapis.com/v1/projects/YOUR_PROJECT_ID/remoteConfig" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  | jq '.parameters' > firebase-rc.json
```

Or from Firebase Console: **Remote Config → ⋮ menu → Download current config file**.

### Step 2: Map Firebase Remote Config Concepts

| Firebase Remote Config   | @jewel998/config      | Notes                                     |
| ------------------------ | --------------------- | ----------------------------------------- |
| Parameter                | Config                | Direct equivalent                         |
| Parameter group          | Key prefix convention | Use dot notation: `group.key`             |
| Default value            | Config value          | Direct mapping                            |
| Conditions               | Targeting rules       | Recreate as segments or conditions        |
| Percentage conditions    | Rollout percentage    | Map directly                              |
| User property conditions | Context attributes    | Pass via `autoContext()`                  |
| Personalization          | N/A                   | Not supported — use targeting rules       |
| A/B testing              | Rollout percentage    | For bucketing only; no built-in analytics |

### Step 3: Convert Config Data

**Firebase Remote Config parameter:**

```json
{
  "feature_dark_mode": {
    "defaultValue": { "value": "true" },
    "valueType": "BOOLEAN",
    "conditionalValues": {
      "iOS Users": { "value": "false" }
    }
  },
  "api_timeout": {
    "defaultValue": { "value": "5000" },
    "valueType": "NUMBER"
  }
}
```

**Equivalent @jewel998/config import:**

```json
[
  { "key": "feature.dark_mode", "value": true, "valueType": "boolean" },
  { "key": "api.timeout", "value": 5000, "valueType": "number" }
]
```

### Step 4: Conversion Script

```javascript
// convert-firebase-rc.js
import { readFileSync, writeFileSync } from "fs";

const rcParams = JSON.parse(readFileSync("firebase-rc.json", "utf-8"));

const typeMap = {
  BOOLEAN: "boolean",
  NUMBER: "number",
  STRING: "string",
  JSON: "json",
};

const entries = Object.entries(rcParams).map(([key, param]) => {
  const valueType = typeMap[param.valueType] || "string";
  let value = param.defaultValue?.value ?? "";

  // Parse typed values
  if (valueType === "boolean") value = value === "true";
  else if (valueType === "number") value = Number(value);
  else if (valueType === "json") value = value; // Keep as string for import

  return {
    key: key.replace(/_/g, "."), // Convert snake_case to dot.notation (optional)
    value,
    valueType,
  };
});

writeFileSync("config-import.json", JSON.stringify(entries, null, 2));
console.log(`Converted ${entries.length} parameters`);
```

### Step 5: Migrate Conditions to Segments

Firebase Remote Config conditions use device attributes and user properties. Map these to segments:

| Firebase RC Condition               | @jewel998/config Equivalent                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `device.os == 'iOS'`                | Segment: `os equals "iOS"` (auto-detected by `autoContext()`) |
| `device.country in ['US', 'UK']`    | Segment: `country in_list "US,UK"`                            |
| `app.userProperty['plan'] == 'pro'` | Segment: `plan equals "pro"` (pass in context)                |
| `percent <= 20`                     | Rollout: `rolloutPercentage: 20`                              |

### Step 6: Import and Verify

1. Import `config-import.json` via the portal
2. Create segments for your Firebase RC conditions
3. Add targeting rules to flags that had conditional values
4. Verify by comparing values side-by-side

### Step 7: Update Your App

```typescript
// Before (Firebase Remote Config)
import {
  getRemoteConfig,
  getValue,
  fetchAndActivate,
} from "firebase/remote-config";
const rc = getRemoteConfig(app);
rc.defaultConfig = { feature_dark_mode: false };
await fetchAndActivate(rc);
getValue(rc, "feature_dark_mode").asBoolean();

// After (@jewel998/config)
import { initConfig, autoContext } from "@jewel998/config";
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: { "feature.dark_mode": false },
  context: autoContext({ userId: "user-123" }),
});
flags.flag("feature.dark_mode");
```

### Key Differences from Firebase Remote Config

| Aspect        | Firebase RC                 | @jewel998/config                         |
| ------------- | --------------------------- | ---------------------------------------- |
| Evaluation    | Client-side (after fetch)   | Server-side (cid_) or client-side (svr_) |
| Segments      | Conditions only             | Reusable segments + conditions           |
| Audit trail   | Limited (version history)   | Full audit log with diff viewer          |
| RBAC          | Firebase IAM (broad)        | Per-project viewer/editor/admin          |
| Webhooks      | None                        | Slack, Discord, Teams, custom            |
| Multi-project | One RC per Firebase project | Multiple projects per deployment         |
| Scheduling    | None                        | Built-in schedule activation             |
| Prerequisites | None                        | Flag dependencies                        |

---

## Verification Checklist

After migrating from any platform, verify:

- [ ] All flags imported with correct values and types
- [ ] Segments recreated with equivalent conditions
- [ ] Targeting rules match previous behavior
- [ ] Rollout percentages produce consistent bucketing
- [ ] SDK returns expected values for test users
- [ ] Default values match across old and new systems
- [ ] API keys generated and domain restrictions configured
- [ ] Team members invited with correct roles

## Rollback Plan

If something goes wrong during migration:

1. Your old platform is still running — it's unaffected by this migration
2. Revert your app's SDK import to point back to the old system
3. Fix the issue in @jewel998/config at your own pace
4. Re-attempt the migration when ready

The import system supports **conflict resolution** — you can re-import corrected data using the "overwrite" strategy without losing audit history.
