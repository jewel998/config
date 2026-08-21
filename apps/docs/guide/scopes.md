# Configuration Scopes

The config package supports multi-tenant, multi-project scoping. Each config definition declares a `scope` that determines how values are resolved.

## Scope Types

| Scope         | Description                               |
| ------------- | ----------------------------------------- |
| `tenant`      | Scoped to a tenant organization           |
| `project`     | Scoped to a project within a tenant       |
| `environment` | Scoped to an environment within a project |

## How Scoping Works

Scoping allows you to manage configurations for multiple tenants (organizations) or projects from a single @jewel998/config deployment. Each API key is tied to a specific project and environment, which means:

1. When the SDK makes a request, the `clientId` resolves to a specific `projectId` + `environmentId`
2. Config values returned are already scoped to that combination
3. Different environments within the same project are fully independent

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

## Fallback Chain

When resolving a config value, the system checks from most-specific to least-specific:

1. **Environment scope** — `feature.beta` in `acme-corp / dashboard / staging`
2. **Project scope** — `feature.beta` in `acme-corp / dashboard` (any environment)
3. **Tenant scope** — `feature.beta` in `acme-corp` (any project)
4. **Default value** — The flag's base value

If a value is defined at the environment level, it takes precedence over project-level or tenant-level values.

## Scoped Key Format

Cache keys are built by combining the config key with scope identifiers:

```
feature.beta:tenant:acme-corp:project:dashboard:environment:staging
```

This allows different tenants and projects to have independent configuration values stored in the same cache.

## Relationship with Environments

Scopes and environments work together:

- **Environments** are the lowest-level scope — each has independent config values, API keys, and targeting rules
- **Projects** group environments (dev, staging, production) under one umbrella
- **Tenants** group projects for multi-tenant SaaS deployments

In most single-tenant setups, you'll only interact with project and environment scopes through the portal's environment switcher. Tenant-level scoping becomes relevant when deploying a single @jewel998/config instance for multiple customer organizations.

## Configuring Scopes

Scopes are managed through the portal:

1. **Tenant scope** — Created when you set up multi-tenant mode in project settings
2. **Project scope** — Each project is a scope boundary (create projects in the portal)
3. **Environment scope** — Created within a project (dev, staging, prod)

API keys always bind to a specific environment scope, ensuring complete data isolation between environments.
