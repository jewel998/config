# Configuration Scopes

Understanding how @jewel998/config resolves values requires understanding three core concepts: **Context**, **Segments**, and **Scopes**. These work together to deliver the right configuration to the right user at the right time.

## Context

Context is the set of attributes that describe the current user and their environment. It's the information the platform uses to evaluate targeting rules and segment membership.

### What is Context?

When your app initializes the SDK, you provide a context object that describes "who is this user and what's their situation":

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: { "feature.dark_mode": false },
  context: autoContext({
    userId: "user_123", // Who they are
    plan: "enterprise", // Their subscription
    country: "US", // Where they are
    companySize: 500, // Custom attribute
    role: "admin", // Their role in your app
  }),
});
```

### Auto-Detected Context

`autoContext()` automatically detects device and browser information without you specifying it:

| Attribute        | Example Value        | Description                         |
| ---------------- | -------------------- | ----------------------------------- |
| `browser`        | `"Chrome"`           | Browser name                        |
| `browserVersion` | `"120"`              | Major browser version               |
| `os`             | `"macOS"`            | Operating system                    |
| `device`         | `"desktop"`          | Device type (desktop/mobile/tablet) |
| `locale`         | `"en-US"`            | Browser locale                      |
| `timezone`       | `"America/New_York"` | User timezone                       |
| `screenWidth`    | `1920`               | Screen width in pixels              |
| `screenHeight`   | `1080`               | Screen height in pixels             |

Your custom attributes (userId, plan, etc.) are merged with auto-detected ones. Custom values take precedence if there's a conflict.

### How Context is Used

Context flows through the evaluation pipeline differently based on your API key type:

- **Client keys (`cid_`)** — Context is sent to the server. The API evaluates targeting rules and segment membership server-side, then returns only the resolved values. Your targeting logic is never exposed.
- **Server keys (`svr_`)** — Context stays client-side. The SDK evaluates targeting locally using plugins.

### Updating Context

Context can change during a session (e.g., user signs in, upgrades their plan):

```typescript
// User just upgraded
flags.setContext(autoContext({ userId: "user_123", plan: "pro" }));
// SDK re-fetches with the new context (debounced, 30s stale check)
```

## Segments

Segments are **reusable audience definitions** built from context attributes. They answer the question "which group does this user belong to?" — without repeating conditions on every flag.

### Relationship to Context

Segments define conditions against context attributes:

```
Segment: "Enterprise Users"
  Conditions: plan equals "enterprise" AND companySize greater_than 100
```

When a user's context includes `{ plan: "enterprise", companySize: 500 }`, they **match** this segment. Any flag targeting "Enterprise Users" will serve its configured value for them.

### Why Segments Matter

Without segments, you'd duplicate conditions across every flag:

```
Flag A: If plan == "enterprise" AND companySize > 100 → true
Flag B: If plan == "enterprise" AND companySize > 100 → "premium"
Flag C: If plan == "enterprise" AND companySize > 100 → 200
```

With segments:

```
Segment "Enterprise Users": plan == "enterprise" AND companySize > 100

Flag A: If user in "Enterprise Users" → true
Flag B: If user in "Enterprise Users" → "premium"
Flag C: If user in "Enterprise Users" → 200
```

Change the segment definition once → all flags update automatically.

### Segments and Targeting Rules

Targeting rules can use segments (recommended) or raw conditions:

1. **Segment-based rules** — "If user is in segment X, return value Y" — clean, reusable, auditable
2. **Condition-based rules** — "If attribute A equals B, return value Y" — for one-off rules that don't warrant a named segment

See [Segments](/features/segments) for full details on creating and managing segments, and [Targeting Rules](/features/targeting) for how rules are evaluated.

---

## Scope Types

Scopes define the data isolation boundaries in your deployment. They control which configs are returned when the SDK makes a request.

| Scope         | Description                           | Boundary                             |
| ------------- | ------------------------------------- | ------------------------------------ |
| `tenant`      | Top-level organizational boundary     | Multi-tenant SaaS deployments        |
| `project`     | A product or application              | Groups environments together         |
| `environment` | A deployment stage (dev/staging/prod) | Fully isolated data, keys, and rules |

### How Scopes Map to Your Deployment

```
Your Firebase Project (single deployment)
├── Tenant: Acme Corp (optional — for multi-tenant)
│   ├── Project: Dashboard App
│   │   ├── Environment: development
│   │   │   ├── Configs (feature flags)
│   │   │   ├── API Keys (cid_dev_xxx)
│   │   │   └── Targeting Rules
│   │   ├── Environment: staging
│   │   │   ├── Configs
│   │   │   ├── API Keys (cid_stg_xxx)
│   │   │   └── Targeting Rules
│   │   └── Environment: production
│   │       ├── Configs
│   │       ├── API Keys (cid_prod_xxx)
│   │       └── Targeting Rules
│   └── Project: Mobile App
│       └── ...
└── Tenant: Beta Corp (optional)
    └── ...
```

### API Keys Lock You to a Scope

Every API key is bound to a specific **project + environment** combination. When the SDK makes a request with `cid_xxx`:

1. The API resolves `cid_xxx` → `projectId: "dashboard"` + `environmentId: "production"`
2. Only configs from that exact project + environment are returned
3. There is no way to access another project's or environment's data with the wrong key

This means scope isolation is enforced at the API level — not just the UI level.

## How Scoping Works

### Single-Tenant (Most Common)

For most teams, scoping is transparent. You create one project with a few environments, and each SDK instance uses a key for one environment:

```typescript
// Production app
const flags = initConfig({
  clientId: "cid_prod_xxx", // Scoped to: MyProject → Production
  baseUrl: "https://my-config.web.app/api",
  defaults: { "feature.dark_mode": false },
});

// Staging app (same code, different key)
const flags = initConfig({
  clientId: "cid_stg_xxx", // Scoped to: MyProject → Staging
  baseUrl: "https://my-config.web.app/api",
  defaults: { "feature.dark_mode": false },
});
```

### Multi-Tenant (SaaS Platforms)

For platforms serving multiple customer organizations from a single @jewel998/config deployment:

```typescript
// Resolve context includes tenant information
const value = await client.getValue("feature.beta", {
  tenantId: "acme-corp",
  projectId: "dashboard",
  environment: "staging",
});
```

The resolver checks scoped cache keys in priority order and returns the first match.

## Fallback Chain

When resolving a config value, the system checks from most-specific to least-specific:

1. **Environment scope** — `feature.beta` in `acme-corp / dashboard / staging`
2. **Project scope** — `feature.beta` in `acme-corp / dashboard` (any environment)
3. **Tenant scope** — `feature.beta` in `acme-corp` (any project)
4. **Default value** — The SDK's configured default

If a value is defined at the environment level, it takes precedence over project-level or tenant-level values.

## Scoped Key Format

Cache keys are built by combining the config key with scope identifiers:

```
feature.beta:tenant:acme-corp:project:dashboard:environment:staging
```

This allows different tenants and projects to have independent configuration values stored in the same cache.

## Configuring Scopes

Scopes are managed through the portal:

1. **Tenant scope** — Created when you set up multi-tenant mode in project settings (optional)
2. **Project scope** — Each project is a scope boundary (create projects in the portal)
3. **Environment scope** — Created within a project (dev, staging, prod)

API keys always bind to a specific environment scope, ensuring complete data isolation between environments.

## Putting It All Together

Here's how Context, Segments, and Scopes work in concert:

```
Request: SDK sends clientId + context to /api/getConfig
         ↓
Step 1 (Scope): clientId resolves → Project "Dashboard" + Environment "Production"
         ↓
Step 2 (Fetch): Load all configs for this project + environment
         ↓
Step 3 (Evaluate per flag):
    a. Check lifecycle state (archived flags return nothing)
    b. Check prerequisites (dependent flags must pass)
    c. Check overrides (userId-specific values)
    d. Check schedule (time-based activation)
    e. Check targeting rules (priority order):
       - Rule 1: "If user in Segment 'Enterprise Users'" → does context match segment conditions?
       - Rule 2: "If country in_list 'US,UK'" → check context.country attribute
    f. Check rollout (percentage bucketing on userId)
    g. Return default value
         ↓
Step 4 (Response): Return resolved values to SDK
```

This pipeline ensures:

- **Scopes** isolate data between projects and environments
- **Context** provides the user attributes needed for personalization
- **Segments** group users for clean, reusable targeting
- **Targeting rules** use segments and context to determine the final value
