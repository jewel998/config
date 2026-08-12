# Contributing to @jewel998/config

Thanks for your interest in contributing! This project is a free, self-hostable feature flag platform built for startups. We welcome bug reports, feature requests, and pull requests.

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

```bash
# Clone the repo
git clone https://github.com/jewel998/config.git
cd config

# Install dependencies
pnpm install

# Start the portal dev server
pnpm --filter @jewel998/config-portal run dev

# Run SDK tests
pnpm --filter @jewel998/config run test
```

### Project Structure

```
apps/
  portal/      — Admin portal (React + Vite + TanStack Router + Lingui)
  docs/        — Documentation site (VitePress)
packages/
  config/      — SDK (@jewel998/config)
  tour/        — Declarative tour framework (@jewel998/tour)
functions/     — Firebase Cloud Functions (API + webhooks)
```

## Development Workflow

### Branching

- Work on feature branches off `main`
- Branch naming: `feat/description`, `fix/description`, `docs/description`

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are validated by commitlint.

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules:**

- Subject must be lowercase (not sentence-case or pascal-case)
- Body lines must be under 100 characters

```bash
# Good
git commit -m "feat: add segment-based targeting rules"
git commit -m "fix: prerequisite value validation for boolean configs"

# Bad
git commit -m "Added segment targeting"  # no type prefix
git commit -m "feat: Add Feature"        # uppercase subject
```

### Linting

```bash
# Portal (oxlint)
pnpm --filter @jewel998/config-portal run lint

# SDK (TypeScript strict mode)
cd packages/config && npx tsc --noEmit
```

### Testing

```bash
# SDK tests (vitest)
pnpm --filter @jewel998/config run test

# Run a specific test file
cd packages/config && npx vitest run src/plugins/targeting/targetingPlugin.test.ts
```

### Internationalization (i18n)

The portal supports multiple languages via [Lingui](https://lingui.dev/).

- Wrap user-facing strings in `<Trans>` or `t` macro
- After adding new strings: `cd apps/portal && npx lingui extract`
- Translation files are in `apps/portal/src/locales/`
- We welcome translation contributions for: `es`, `fr`, `ar`, `zh`, `hi`

## Pull Request Guidelines

1. **One concern per PR** — Don't mix unrelated changes
2. **Include context** — Explain what and why in the PR description
3. **Tests** — Add tests for new functionality in the SDK
4. **TypeScript** — All code must compile with `--noEmit` (no `any` unless unavoidable)
5. **Accessibility** — UI components should be keyboard navigable and screen-reader friendly

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include browser/OS/Node version if relevant
- Screenshots for UI bugs

## Feature Requests

Open a GitHub Issue with the `enhancement` label. Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

## Architecture Decisions

Key patterns used in this codebase:

- **Factory Pattern** — Mutation hooks (`createConfigFieldMutation`) eliminate boilerplate
- **Strategy Pattern** — Webhook formatters, evaluation modes
- **Pipeline Pattern** — SDK evaluation pipeline (archived → prerequisites → overrides → schedule → targeting → rollout)
- **Chain of Responsibility** — Webhook filter pipeline

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to build something useful.

## License

This project is licensed under the [Elastic License 2.0](./LICENSE). You can use, modify, and self-host it freely. You cannot provide it as a hosted/managed service to third parties.

By contributing, you agree that your contributions will be licensed under the same license.
