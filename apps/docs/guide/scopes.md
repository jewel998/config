# Configuration Scopes

The config package supports multi-tenant, multi-project scoping. Each config definition declares a `scope` that determines how values are resolved.

## Scope Types

| Scope         | Description                               |
| ------------- | ----------------------------------------- |
| `tenant`      | Scoped to a tenant organization           |
| `project`     | Scoped to a project within a tenant       |
| `environment` | Scoped to an environment within a project |

## Resolve Context

When reading values, pass a `ConfigResolveContext` to scope the lookup:

```ts
const value = await client.getValue("feature.beta", {
  tenantId: "acme-corp",
  projectId: "dashboard",
  environment: "staging",
});
```

The resolver checks scoped cache keys in priority order and returns the first match.

## Scoped Key Format

Cache keys are built by combining the config key with scope identifiers:

```
feature.beta:tenant:acme-corp:project:dashboard:environment:staging
```

This allows different tenants and projects to have independent configuration values stored in the same cache.
