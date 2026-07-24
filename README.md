# Config Platform Monorepo

This repository is the starting point for a lightweight, standards-first configuration platform.

## Goals

- publish a public npm package: `@jewel998/config`
- support multi-tenant and multi-project configuration
- keep the base package lightweight and tree-shake friendly
- use Firebase for live configuration and admin workflows
- use GitHub Pages for documentation/demo hosting

## Monorepo structure

- `apps/portal` — React-based admin portal
- `apps/docs` — GitHub Pages-friendly documentation/demo app
- `packages/config` — public npm package
- `functions` — Firebase function layer
- `firebase` — Firebase config and rules

## Engineering standards

- TypeScript-first implementation
- ESLint + Prettier for consistent formatting
- modular package boundaries
- adapter-based runtime design
- testable behavior with explicit verification
