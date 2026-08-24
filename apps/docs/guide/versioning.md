# Documentation Versioning

> See also: [Migration Guides](/guide/migrations/) · [Backup & Restore](/guide/backup-restore) · [Self-Hosting Guide](/guide/self-hosting)

This page explains how @jewel998/config handles versioning for the platform, SDK, and documentation.

## Version Scheme

The project follows [Semantic Versioning](https://semver.org/) (semver):

```
MAJOR.MINOR.PATCH
  │      │     │
  │      │     └── Bug fixes, documentation updates (no breaking changes)
  │      └──────── New features, backward-compatible additions
  └─────────────── Breaking changes (require migration)
```

| Component                          | Current Version | Published To        |
| ---------------------------------- | --------------- | ------------------- |
| SDK (`@jewel998/config`)           | 0.2.x           | npm                 |
| Monorepo (portal, functions, docs) | 0.1.x           | Self-hosted via git |

::: info Pre-1.0 Versioning
While the project is pre-1.0, minor versions (0.x.0) may include breaking changes. After 1.0.0, only major versions will break backward compatibility. We document all breaking changes in the [Migration Guides](/guide/migrations/).
:::

## How Versioning Works

### SDK Versioning

The SDK (`@jewel998/config`) is published to npm with independent version numbers:

```bash
# Install latest
npm install @jewel998/config

# Pin to specific version
npm install @jewel998/config@0.2.1
```

The SDK version is independent of the backend version. We maintain backward compatibility between SDK and API — older SDKs work with newer backends, and newer SDKs work with older backends (within the same major version).

### Platform Versioning (Self-Hosted)

Since you self-host the portal and Cloud Functions, your deployment version is tied to the git commit you're running:

```bash
# Check your current version
git describe --tags

# List available versions
git tag -l "v*"
```

### Config Data Versioning

Each environment maintains a `configVersion` counter that increments on every change:

- The SDK polls `/api/v1/version` to check the current version number
- If the version hasn't changed, no full config fetch is needed (saves bandwidth and cost)
- The version is per-environment — changes in staging don't affect production's version

## Updating Your Deployment

### Standard Update (No Breaking Changes)

```bash
git pull origin main
pnpm install
firebase deploy
```

This is safe for patch and minor version bumps.

### Breaking Change Update

When a new version includes breaking changes:

1. Check the [Migration Guide](/guide/migrations/) for the target version
2. Back up your Firestore data (see [Backup & Restore](/guide/backup-restore))
3. Review the migration steps
4. Apply the update:

```bash
git pull origin main
pnpm install
# Run any migration scripts mentioned in the guide
firebase deploy
```

### Rolling Back

If something goes wrong after an update:

```bash
# Roll back to previous version
git checkout v0.1.0  # or whatever version you were on
pnpm install
firebase deploy
```

Your Firestore data is not modified by code deployments — only Cloud Functions and Hosting artifacts change. Rolling back code is always safe.

## Version Compatibility Matrix

| SDK Version  | API Version | Compatible? | Notes                          |
| ------------ | ----------- | ----------- | ------------------------------ |
| 0.2.x        | 0.1.x       | ✅          | Full compatibility             |
| 0.1.x        | 0.2.x       | ✅          | Older SDK works with newer API |
| 1.x (future) | 0.x         | ❌          | Major version boundary         |

## Breaking Change Policy

We commit to:

1. **No silent breaking changes** — Every breaking change gets a migration guide
2. **Deprecation notices** — Features marked deprecated in one minor version before removal
3. **Data preservation** — Firestore data is never wiped or restructured without an explicit migration script
4. **SDK grace period** — Old SDK versions continue working for at least 2 minor API versions after deprecation

## Documentation Versions

This documentation site always reflects the latest version. For older versions:

- Check the `docs/` folder at a specific git tag: `git checkout v0.1.0 -- apps/docs/`
- Or browse the repository at a tag on GitHub: `github.com/jewel998/config/tree/v0.1.0/apps/docs`

## Changelog

All changes are tracked via [Conventional Commits](https://www.conventionalcommits.org/) in the git history:

```bash
# View recent changes
git log --oneline --since="2 weeks ago"

# View changes for a specific component
git log --oneline -- packages/config/
git log --oneline -- functions/
git log --oneline -- apps/portal/
```

Release notes are published with each GitHub release tag.

## Related

- [Migration Guides](/guide/migrations/) — Step-by-step instructions for breaking change updates
- [Backup & Restore](/guide/backup-restore) — Protect your data before upgrading versions
- [Self-Hosting Guide](/guide/self-hosting) — Deployment process including updates
- [SDK Reference](/api/) — SDK versioning and compatibility details
- [Environments](/features/environments) — How config versions work per environment
