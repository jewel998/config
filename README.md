# Config Platform Monorepo

A lightweight, standards-first configuration platform supporting multi-tenant and multi-project configuration with offline-first and remote-first patterns.

## Goals

- Publish a public npm package: `@jewel998/config`
- Support multi-tenant and multi-project configuration
- Keep the base package lightweight and tree-shake friendly
- Use Firebase for live configuration and admin workflows
- Use GitHub Pages for documentation hosting (VitePress)

## Monorepo Structure

```
apps/
  portal/    — React-based admin portal (Vite + React Router)
  docs/      — VitePress documentation site
packages/
  config/    — Public npm package (@jewel998/config)
functions/   — Firebase Cloud Functions (admin CRUD)
firebase/    — Firebase config and Firestore rules
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build the config package
pnpm run build

# Run tests
pnpm run test

# Start the portal dev server
pnpm --filter @jewel998/config-portal run dev

# Start the docs dev server
pnpm --filter @jewel998/config-docs run dev
```

## Engineering Standards

- TypeScript-first (strict mode, `verbatimModuleSyntax`)
- pnpm workspaces with `packageManager` field
- OxLint + Prettier for formatting and linting
- Husky + lint-staged + commitlint for commit quality
- Adapter-based runtime design
- Modular sub-path exports (`/storage`, `/remote`, `/management`)
- Vitest for testing
