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
