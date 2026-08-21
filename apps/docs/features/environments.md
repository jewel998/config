# Environments

Environments separate your configurations by deployment stage. A single project can have multiple environments like development, staging, and production — each with its own configs, API keys, and domain restrictions.

## Default Setup

When you create a project, you typically create environments for:

- **Development** — for local testing
- **Staging** — for QA and pre-release testing
- **Production** — for live users

## Environment-Specific Configs

Each environment has its own set of config values. A flag can be:

- `true` in development (always enabled for devs)
- `true` in staging (testing before launch)
- `false` in production (not yet released)

::: info Environments are fully independent
Configs are **not** automatically synced between environments. Changing a flag in staging does not affect production. Each environment is its own isolated data set.
:::

## API Keys Per Environment

Each environment has its own API keys:

- Generate a `cid_` key for your production frontend
- Generate a separate `cid_` key for your staging frontend
- Keys from one environment cannot access another environment's configs

## Domain Validation

For additional security, you can set **allowed domains** per environment:

- Production: `myapp.com`, `www.myapp.com`
- Staging: `staging.myapp.com`
- Development: `localhost`

Requests from non-allowed domains are rejected with a 403 error.

## Environment Colors

Assign colors to environments for quick visual identification in the portal. Production environments can be marked with an `isProduction` flag to trigger confirmation prompts before changes.

## Switching Environments

Use the environment switcher in the portal's top bar to switch context. All configs, API keys, and targeting rules shown are scoped to the selected environment.

## Promoting Configs Between Environments

Environments are intentionally independent — there's no automatic "promote to production" button. This is by design to prevent accidental production changes.

**Recommended patterns for promoting configs:**

### Manual Promotion (Recommended for most teams)

1. Configure and test the flag in development
2. Manually replicate the config in staging (verify with QA)
3. Manually set the same value in production when ready

### Import/Export Promotion (For larger teams)

1. Export configs from staging using [Import & Export](/features/import-export)
2. Review the exported JSON
3. Import into production with the `review` conflict strategy

### CI/CD Promotion (For automated pipelines)

```bash
# Export from staging, import to production
curl -X POST "$FUNCTION_URL/exportConfigs" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data": {"projectId": "my-project", "exportType": "full"}}'

# Review, then import to production environment
curl -X POST "$FUNCTION_URL/importConfigs" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data": {"projectId": "my-project", "environmentId": "production", "entries": [...], "conflictStrategy": "overwrite"}}'
```

::: tip
The audit log tracks all changes per environment, making it easy to verify what was promoted and by whom.
:::
