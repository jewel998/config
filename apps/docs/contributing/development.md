# Local Development

Set up your local environment for contributing to @jewel998/config.

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

## Initial Setup

```bash
# Clone the repo
git clone https://github.com/jewel998/config.git
cd config

# Install all dependencies (workspace-aware)
pnpm install
```

## Running Each Package

### SDK (`packages/config`)

```bash
# Build the SDK
pnpm --filter @jewel998/config run build

# Watch mode (rebuilds on changes)
pnpm --filter @jewel998/config run dev

# Run tests
pnpm --filter @jewel998/config run test

# Type check
pnpm --filter @jewel998/config run typecheck
```

### Portal (`apps/portal`)

```bash
# Start dev server (hot reload)
pnpm --filter @jewel998/config-portal run dev

# Build for production
pnpm --filter @jewel998/config-portal run build

# Run tests
pnpm --filter @jewel998/config-portal run test
```

### Documentation (`apps/docs`)

```bash
# Start VitePress dev server
pnpm --filter @jewel998/config-docs run dev

# Build static site
pnpm --filter @jewel998/config-docs run build
```

### Cloud Functions (`functions`)

```bash
# Build functions
cd functions && pnpm run build

# Run tests
cd functions && pnpm run test

# Use Firebase emulators for local testing
firebase emulators:start --only functions,firestore,auth
```

## Project Commands (Root)

```bash
# Build the SDK
pnpm build

# Build docs
pnpm build:docs

# Build portal
pnpm build:portal

# Run SDK tests
pnpm test

# Lint (oxlint)
pnpm lint

# Format (prettier)
pnpm format

# Check formatting
pnpm format:check
```

## Development Workflow

### Branching

Work on feature branches off `main`:

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are validated by commitlint + husky.

```bash
# Good
git commit -m "feat: add segment-based targeting rules"
git commit -m "fix: prerequisite value validation for boolean configs"
git commit -m "docs: expand scheduling page with one-shot behavior"

# Bad
git commit -m "Added segment targeting"  # no type prefix
git commit -m "feat: Add Feature"        # uppercase subject
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Linting & Formatting

- **oxlint** — Fast linting for TypeScript (runs on pre-commit via lint-staged)
- **prettier** — Code formatting (auto-run on staged files)
- **TypeScript strict mode** — `--noEmit` checks across all packages

### Testing

```bash
# SDK tests (vitest)
pnpm --filter @jewel998/config run test

# Run a specific test file
cd packages/config && npx vitest run src/plugins/targeting/targetingPlugin.test.ts

# Functions tests
cd functions && pnpm run test
```

## Internationalization (Portal)

The portal supports multiple languages via [Lingui](https://lingui.dev/):

- Wrap user-facing strings in `<Trans>` or `t` macro
- After adding new strings: `cd apps/portal && npx lingui extract`
- Translation files: `apps/portal/src/locales/`
- Welcomed translations: `es`, `fr`, `ar`, `zh`, `hi`

## Firebase Emulators

For testing Cloud Functions locally without deploying:

```bash
# Start emulators (Firestore, Auth, Functions)
firebase emulators:start --only functions,firestore,auth

# The portal can connect to emulators — check apps/portal/.env.development
```

## Pull Request Guidelines

1. **One concern per PR** — Don't mix unrelated changes
2. **Include context** — Explain what and why in the PR description
3. **Tests** — Add tests for new SDK functionality
4. **TypeScript** — All code must compile with `--noEmit`
5. **Accessibility** — UI components should be keyboard navigable and screen-reader friendly
6. **Conventional commits** — PR title should follow conventional commit format

## Type Exports

The SDK exports all public types from the main entry point:

```typescript
// Types available from "@jewel998/config"
import type {
  InitConfigOptions,
  Flags,
  CreateConfigOptions,
  ConfigClient,
  CacheStorage,
  EvaluationContext,
  EvaluationPlugin,
  PipelineStepId,
  PipelineStepResult,
  ConfigEventType,
  ConfigEventPayloads,
  // ... and more
} from "@jewel998/config";
```

Sub-path exports for tree-shaking:

| Import Path                      | Contents                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `@jewel998/config`               | Main SDK (initConfig, createConfig, types, autoContext, browserStorage, memoryStorage) |
| `@jewel998/config/storage`       | Storage adapters                                                                       |
| `@jewel998/config/targeting`     | Targeting plugin                                                                       |
| `@jewel998/config/rollout`       | Rollout plugin                                                                         |
| `@jewel998/config/schedule`      | Schedule plugin                                                                        |
| `@jewel998/config/prerequisites` | Prerequisites plugin                                                                   |
| `@jewel998/config/lifecycle`     | Archived state plugin                                                                  |
| `@jewel998/config/overrides`     | User overrides plugin                                                                  |
| `@jewel998/config/management`    | Management/admin utilities                                                             |

## License

This project uses the [Elastic License 2.0](https://github.com/jewel998/config/blob/main/LICENSE). You can use, modify, and self-host it freely. You cannot provide it as a hosted/managed service to third parties.

By contributing, you agree that your contributions will be licensed under the same license.
