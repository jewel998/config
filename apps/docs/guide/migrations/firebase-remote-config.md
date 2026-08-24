# From Firebase Remote Config

> See also: [Import](/features/import) · [Segments](/features/segments) · [Targeting Rules](/features/targeting)

## Step 1: Export Your Config

Firebase Remote Config provides an export via the REST API:

```bash
# Get all parameters
curl -s -X GET \
  "https://firebaseremoteconfig.googleapis.com/v1/projects/YOUR_PROJECT_ID/remoteConfig" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  | jq '.parameters' > firebase-rc.json
```

Or from Firebase Console: **Remote Config → ⋮ menu → Download current config file**.

## Step 2: Map Firebase Remote Config Concepts

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

## Step 3: Convert Config Data

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

**Equivalent @jewel998/config [import](/features/import):**

```json
[
  { "key": "feature.dark_mode", "value": true, "valueType": "boolean" },
  { "key": "api.timeout", "value": 5000, "valueType": "number" }
]
```

## Step 4: Conversion Script

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

## Step 5: Migrate Conditions to Segments

Firebase Remote Config conditions use device attributes and user properties. Map these to [segments](/features/segments):

| Firebase RC Condition               | @jewel998/config Equivalent                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `device.os == 'iOS'`                | Segment: `os equals "iOS"` (auto-detected by `autoContext()`) |
| `device.country in ['US', 'UK']`    | Segment: `country in_list "US,UK"`                            |
| `app.userProperty['plan'] == 'pro'` | Segment: `plan equals "pro"` (pass in context)                |
| `percent <= 20`                     | [Rollout](/features/rollouts): `rolloutPercentage: 20`        |

## Step 6: Import and Verify

1. Import `config-import.json` via the portal
2. Create segments for your Firebase RC conditions
3. Add [targeting rules](/features/targeting) to flags that had conditional values
4. Verify by comparing values side-by-side

## Step 7: Update Your App

```typescript
// Before (Firebase Remote Config)
import { getRemoteConfig, getValue, fetchAndActivate } from "firebase/remote-config";
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

## Key Differences from Firebase Remote Config

| Aspect        | Firebase RC                 | @jewel998/config                                       |
| ------------- | --------------------------- | ------------------------------------------------------ |
| Evaluation    | Client-side (after fetch)   | Server-side (cid_) or client-side (svr_)               |
| Segments      | Conditions only             | Reusable segments + conditions                         |
| Audit trail   | Limited (version history)   | Full [audit log](/features/audit-log) with diff viewer |
| RBAC          | Firebase IAM (broad)        | Per-project viewer/editor/admin                        |
| Webhooks      | None                        | Slack, Discord, Teams, custom                          |
| Multi-project | One RC per Firebase project | Multiple projects per deployment                       |
| Scheduling    | None                        | Built-in [schedule activation](/features/scheduling)   |
| Prerequisites | None                        | [Flag dependencies](/features/prerequisites)           |
