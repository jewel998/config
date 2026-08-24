# Migration Guides

> See also: [Import](/features/import) · [Export](/features/export) · [Self-Hosting Guide](/guide/self-hosting)

Migrate to @jewel998/config from other feature flag platforms. Each guide includes data mapping, step-by-step import instructions, and verification steps.

## Supported Migration Paths

- [From LaunchDarkly](/guide/migrations/launchdarkly)
- [From Unleash](/guide/migrations/unleash)
- [From Firebase Remote Config](/guide/migrations/firebase-remote-config)

## Before You Start

1. **Deploy your instance first** — Follow the [Self-Hosting Guide](/guide/self-hosting) to get your platform running
2. **Create your project and environments** — Set up matching [environments](/features/environments) (dev, staging, production)
3. **Export from your current tool** — Use the guides below to export your flags
4. **Test in development first** — Always import to a non-production environment first

---

## Verification Checklist

After migrating from any platform, verify:

- [ ] All flags imported with correct values and types
- [ ] [Segments](/features/segments) recreated with equivalent conditions
- [ ] [Targeting rules](/features/targeting) match previous behavior
- [ ] [Rollout](/features/rollouts) percentages produce consistent bucketing
- [ ] SDK returns expected values for test users
- [ ] Default values match across old and new systems
- [ ] API keys generated and domain restrictions configured
- [ ] [Team](/features/team) members invited with correct roles

## Rollback Plan

If something goes wrong during migration:

1. Your old platform is still running — it's unaffected by this migration
2. Revert your app's SDK import to point back to the old system
3. Fix the issue in @jewel998/config at your own pace
4. Re-attempt the migration when ready

The [import](/features/import) system supports **conflict resolution** — you can re-import corrected data using the "overwrite" strategy without losing audit history.

## Related

- [Import](/features/import) — Detailed import format, validation rules, and API reference
- [Export](/features/export) — Project data export and GDPR compliance
- [Self-Hosting Guide](/guide/self-hosting) — Deploy your instance before migrating
- [Segments](/features/segments) — Recreate audience groups from your previous platform
- [Targeting Rules](/features/targeting) — Map your existing targeting logic to the new platform
