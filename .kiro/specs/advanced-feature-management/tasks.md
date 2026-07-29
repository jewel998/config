# Implementation Plan: Advanced Feature Management

## Overview

This plan implements the advanced feature management system in three major phases: (1) SDK evaluation pipeline with plugin architecture, (2) Firestore data model extensions and security rules, and (3) Portal management UI components. Each task builds incrementally — SDK core logic first, then data layer, then UI on top.

## Tasks

- [x] 1. SDK plugin system and evaluation pipeline core
  - [x] 1.1 Define plugin system types and pipeline interfaces
    - Create `packages/config/src/plugins/types.ts` with `PipelineStepId`, `PIPELINE_ORDER`, `EvaluationContext`, `PipelineStepResult`, `EvaluationPlugin`, `PipelineHelpers` interfaces
    - Create `packages/config/src/plugins/index.ts` barrel export
    - Add `ConfigFlagData`, `TargetingRule`, `PredicateGroup`, `Predicate`, `PredicateOperator` types to a new `packages/config/src/plugins/models.ts`
    - _Requirements: 11.1, 11.4, 12.4_

  - [x] 1.2 Implement the evaluation pipeline executor
    - Create `packages/config/src/plugins/evaluatePipeline.ts`
    - Accept registered plugins + flag data + context, sort plugins by `PIPELINE_ORDER`, iterate in order, short-circuit on first resolved result
    - Skip steps with no registered plugin (Property 21)
    - Sort by fixed order regardless of registration order (Property 20)
    - Return default value if no step resolves
    - _Requirements: 11.1, 11.2, 11.3, 12.5, 12.6_

  - [ ]* 1.3 Write property tests for pipeline evaluation order (Properties 1, 20, 21, 22)
    - **Property 1: Pipeline evaluation order and short-circuit** — verify highest-priority step wins
    - **Property 20: Plugin registration order independence** — verify fixed order regardless of registration
    - **Property 21: Unregistered plugin step is skipped** — verify transparent skipping
    - **Property 22: No targeting rule match returns default** — verify default fallback
    - **Validates: Requirements 11.1, 11.2, 11.3, 12.5, 12.6**

  - [x] 1.4 Integrate plugin system into `createConfig`
    - Extend `CreateConfigOptions` in `packages/config/src/types.ts` with `plugins`, `context`, `consentAware` fields
    - Update `createConfig` to accept plugins and wire them into `getValue` evaluation
    - Expose `setContext()` method for updating evaluation context post-init
    - _Requirements: 12.4, 12.6_

- [x] 2. MurmurHash3 and rollout plugin
  - [x] 2.1 Implement MurmurHash3 (32-bit) and `computeBucket`
    - Create `packages/config/src/plugins/rollout/murmurhash3.ts` with the hash implementation from design
    - Create `packages/config/src/plugins/rollout/computeBucket.ts` that concatenates `configKey:userId` and maps hash to 0–99
    - _Requirements: 2.2, 2.5_

  - [ ]* 2.2 Write property tests for rollout hashing (Properties 5, 6)
    - **Property 5: Rollout bucket determinism and stickiness** — same inputs always produce same bucket
    - **Property 6: Rollout inclusion threshold** — bucket < percentage → included
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

  - [x] 2.3 Implement the rollout evaluation plugin
    - Create `packages/config/src/plugins/rollout/rolloutPlugin.ts`
    - Handle: 0% → default, 100% → rollout value, 1–99% → compute bucket, no userId → skip
    - Export as `rolloutPlugin()` factory function
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 2.7, 2.8_

  - [ ]* 2.4 Write property test for missing userId skips rollout (Property 7)
    - **Property 7: Missing userId skips user-dependent steps** — verify rollout step is skipped
    - **Validates: Requirements 2.6, 4.5, 11.6**

- [x] 3. Targeting rules and segment resolution plugins
  - [x] 3.1 Implement predicate evaluator
    - Create `packages/config/src/plugins/targeting/predicates.ts`
    - Implement all operators: equals, not_equals, contains, starts_with, ends_with, in_list, not_in_list, greater_than, less_than, regex_match, in_segment, not_in_segment
    - Return false for missing attributes or type mismatches (Property 4)
    - Catch invalid regex and emit error event (Requirement 1.7)
    - _Requirements: 1.3, 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write property tests for predicate evaluation (Properties 3, 4)
    - **Property 3: DNF predicate evaluation** — OR-of-ANDs logic correctness
    - **Property 4: Missing attribute or type mismatch yields non-matching** — graceful degradation
    - **Validates: Requirements 1.5, 1.6**

  - [x] 3.3 Implement segment resolver
    - Create `packages/config/src/plugins/targeting/segmentResolver.ts`
    - Resolve segment by ID from flag data, evaluate predicates against context
    - Disallow nested segment references; return false for non-existent segments
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 3.4 Write property test for segment resolution consistency (Property 8)
    - **Property 8: Segment resolution consistency** — DNF evaluation matches expected boolean outcome
    - **Validates: Requirements 3.4**

  - [x] 3.5 Implement targeting rules evaluation plugin
    - Create `packages/config/src/plugins/targeting/targetingPlugin.ts`
    - Sort rules by priority (lowest number first), evaluate DNF predicate groups, return first match
    - Wire segment resolution for in_segment/not_in_segment predicates
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ]* 3.6 Write property test for targeting rule priority (Property 2)
    - **Property 2: Targeting rules priority ordering** — lowest priority number wins
    - **Validates: Requirements 1.1**

- [x] 4. Overrides, schedule, prerequisites, and lifecycle plugins
  - [x] 4.1 Implement overrides evaluation plugin
    - Create `packages/config/src/plugins/overrides/overridesPlugin.ts`
    - Lookup userId in overrides map, return value if present and non-null, skip if no userId
    - _Requirements: 4.3, 4.4, 4.5, 4.7_

  - [ ]* 4.2 Write property test for override bypass (Property 9)
    - **Property 9: Override bypass** — override value returned immediately, skipping subsequent steps
    - **Validates: Requirements 4.3**

  - [x] 4.3 Implement schedule evaluation plugin
    - Create `packages/config/src/plugins/schedule/schedulePlugin.ts`
    - Compare `activateAt` against `helpers.now()`, return targetValue if in past, skip if in future
    - _Requirements: 6.4, 6.5_

  - [ ]* 4.4 Write property test for schedule activation (Property 12)
    - **Property 12: Schedule activation based on time comparison** — past activateAt returns scheduled value
    - **Validates: Requirements 6.4, 6.5**

  - [x] 4.5 Implement prerequisites evaluation plugin
    - Create `packages/config/src/plugins/prerequisites/prerequisitePlugin.ts`
    - Evaluate each prerequisite via `helpers.evaluateFlag()`, enforce max depth 5, detect cycles with visited set
    - Return default if any prerequisite unmet, emit error on cycle/depth-exceeded
    - _Requirements: 7.3, 7.4, 7.5, 7.7, 7.8_

  - [ ]* 4.6 Write property tests for prerequisites (Properties 13, 14)
    - **Property 13: Prerequisite failure returns default** — unmet prerequisite → default value
    - **Property 14: Circular dependency detection** — cycles detected, default returned, error emitted
    - **Validates: Requirements 7.4, 7.5**

  - [x] 4.7 Implement archived state plugin
    - Create `packages/config/src/plugins/lifecycle/archivedPlugin.ts`
    - Check `lifecycleState === "archived"`, return undefined if true
    - _Requirements: 5.6_

  - [ ]* 4.8 Write property test for archived flag (Property 11)
    - **Property 11: Archived flag returns undefined** — regardless of other config
    - **Validates: Requirements 5.6**

- [x] 5. Consent-aware mode and lifecycle state machine
  - [x] 5.1 Implement consent-aware evaluation guard
    - Add consent check at pipeline entry in `evaluatePipeline.ts`: if `consentAware` is true and `context.consentGranted` is not true, return default immediately
    - _Requirements: 10.5, 10.6_

  - [ ]* 5.2 Write property test for consent-aware mode (Property 16)
    - **Property 16: Consent-aware mode enforcement** — no consent → default only
    - **Validates: Requirements 10.5, 10.6**

  - [x] 5.3 Implement lifecycle state machine validator
    - Create `packages/config/src/plugins/lifecycle/stateTransitions.ts`
    - Define valid transitions map: `{draft→active, active→stale, stale→archived, stale→active, archived→active}`
    - Export `validateStateTransition(current, target): boolean`
    - _Requirements: 5.3, 5.4_

  - [ ]* 5.4 Write property test for state machine validity (Property 10)
    - **Property 10: Lifecycle state machine validity** — only valid pairs succeed
    - **Validates: Requirements 5.3, 5.4**

- [x] 6. SDK sub-path exports and tree-shaking setup
  - [x] 6.1 Configure package.json exports for plugin sub-paths
    - Add exports entries: `@jewel998/config/targeting`, `@jewel998/config/rollout`, `@jewel998/config/schedule`, `@jewel998/config/prerequisites`
    - Add `"sideEffects": false` to package.json
    - Create barrel export files for each sub-path
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 6.2 Write bundle-size smoke test
    - Verify base SDK export is < 5KB gzipped using esbuild + gzip measurement
    - Verify importing only base does not include plugin code
    - _Requirements: 12.2, 12.3_

- [x] 7. Checkpoint — SDK core complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Firestore data model extensions and security rules
  - [~] 8.1 Extend Firestore types for portal data layer
    - Update `apps/portal/src/lib/types.ts` with extended `ConfigEntry` (add `lifecycleState`, `stateChangedAt`, `targetingRules`, `rolloutPercentage`, `rolloutValue`, `overrides`, `schedule`, `prerequisites`)
    - Add `Segment`, `AuditEntry`, `ProjectWithRBAC` interfaces
    - Add Zod validation schemas for new fields
    - _Requirements: 1.4, 2.1, 3.1, 4.1, 5.1, 6.2, 7.2, 8.1, 9.1_

  - [~] 8.2 Implement Firestore Security Rules with RBAC
    - Update `firebase/firestore.rules` with the RBAC-enforcing rules from design
    - Add `isProjectMember()`, `hasRole()`, `getEnvironment()` helper functions
    - Add segments subcollection rules (editor/admin write)
    - Add audit_log subcollection rules (append-only, no update/delete)
    - _Requirements: 8.5, 9.4_

  - [ ]* 8.3 Write property test for RBAC access rules (Property 15)
    - **Property 15: RBAC write access rule** — admin OR (editor AND !production) logic
    - **Validates: Requirements 8.3, 8.4, 8.5**

  - [~] 8.4 Implement audit log write helper
    - Create `apps/portal/src/lib/audit.ts` with `writeAuditEntry()` function
    - Accept actor, action, resource path, old/new values; write to `audit_log` subcollection
    - Serialize values to JSON, enforce 10,000 char max per value field
    - _Requirements: 9.1, 9.2, 9.6_

  - [ ]* 8.5 Write property test for audit entry completeness (Property 18)
    - **Property 18: Audit entry completeness on modification** — all required fields present
    - **Validates: Requirements 9.1, 9.6**

- [ ] 9. Portal — Targeting Rules UI
  - [~] 9.1 Implement RuleBuilder component
    - Create `apps/portal/src/components/rule-builder.tsx`
    - Visual editor for predicate groups (AND groups combined with OR)
    - Support all operators: equals, not_equals, contains, starts_with, ends_with, in_list, not_in_list, greater_than, less_than, regex_match, in_segment, not_in_segment
    - Priority input (1–1000), max 100 rules, max 10 groups with 10 predicates each
    - _Requirements: 1.3, 1.4, 1.5_

  - [~] 9.2 Create targeting rules TanStack Query hooks
    - Create `apps/portal/src/hooks/use-targeting-rules.ts`
    - Hooks for reading/writing `targetingRules` array on config documents
    - Integrate audit log write on rule save/update/delete
    - _Requirements: 1.4, 9.1_

  - [~] 9.3 Add targeting rules route and page
    - Create route at `/projects/$id/envs/$envId/configs/$key/rules`
    - Wire RuleBuilder component with query hooks
    - Add RBAC guard (editors: non-prod only, admins: all)
    - _Requirements: 1.3, 8.3, 8.4_

- [ ] 10. Portal — Segments UI
  - [~] 10.1 Implement SegmentManager component
    - Create `apps/portal/src/components/segment-manager.tsx`
    - CRUD UI for segments with name (100 chars), description (500 chars), up to 20 predicates
    - Reuse predicate editor from RuleBuilder
    - Block deletion if segment is referenced by any targeting rule (show referencing flags)
    - _Requirements: 3.1, 3.7_

  - [~] 10.2 Create segments TanStack Query hooks
    - Create `apps/portal/src/hooks/use-segments.ts`
    - Read/write to `projects/{projectId}/segments/{segmentId}` collection
    - Integrate audit log on segment CRUD operations
    - _Requirements: 3.1, 3.2, 9.1_

  - [~] 10.3 Add segments route and page
    - Create route at `/projects/$id/segments`
    - Wire SegmentManager with query hooks
    - _Requirements: 3.1_

- [ ] 11. Portal — Overrides, Schedule, and Prerequisites UI
  - [~] 11.1 Implement OverrideManager component
    - Create `apps/portal/src/components/override-manager.tsx`
    - Table UI for per-user overrides: add/edit/remove, keyed by userId
    - Max 100 overrides, validate value type matches config flag type
    - _Requirements: 4.1, 4.6_

  - [~] 11.2 Implement ScheduleUI component
    - Create `apps/portal/src/components/schedule-ui.tsx`
    - Date/time picker for UTC activation timestamp, target value input
    - Countdown timer (updated every second, showing hours:minutes:seconds)
    - Validate: timestamp >= 1 min future, value type matches flag type
    - Allow cancel (pending) and removal (applied)
    - _Requirements: 6.1, 6.3, 6.6, 6.7, 6.8, 6.9_

  - [~] 11.3 Implement PrerequisiteUI component
    - Create `apps/portal/src/components/prerequisite-ui.tsx`
    - Flag selector (same project/environment), required value input, max 10 prerequisites
    - Client-side circular dependency detection on save attempt
    - _Requirements: 7.1, 7.6_

  - [~] 11.4 Create hooks for overrides, schedule, and prerequisites
    - Create `apps/portal/src/hooks/use-overrides.ts`, `use-schedule.ts`, `use-prerequisites.ts`
    - Each hook reads/writes to the respective fields on config documents
    - All hooks integrate audit log writes
    - _Requirements: 4.1, 4.2, 6.1, 6.2, 7.1, 7.2, 9.1_

- [~] 12. Checkpoint — Core feature UI complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Portal — Lifecycle States and RBAC UI
  - [~] 13.1 Implement LifecycleStateBadge component
    - Create `apps/portal/src/components/lifecycle-state-badge.tsx`
    - Display current state with color coding (draft=gray, active=green, stale=yellow, archived=red)
    - Transition controls: buttons for valid transitions only (use state machine validator)
    - Display `stateChangedAt` timestamp
    - _Requirements: 5.1, 5.3, 5.4, 5.8_

  - [~] 13.2 Implement stale flag detection logic
    - Create `apps/portal/src/lib/stale-detection.ts`
    - Check if flag's last modification exceeds `staleDurationDays` (project-configurable, default 30)
    - Auto-transition active flags to stale on detection
    - _Requirements: 5.7_

  - [ ]* 13.3 Write property test for stale detection (Property 19)
    - **Property 19: Stale detection based on configurable duration** — correct threshold behavior
    - **Validates: Requirements 5.7**

  - [~] 13.4 Implement RBACManager component
    - Create `apps/portal/src/components/rbac-manager.tsx`
    - Team member list with role assignment (viewer/editor/admin)
    - Prevent removal/downgrade of last admin
    - Display read-only mode for viewers, restricted mode for editors on production envs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8_

  - [~] 13.5 Add RBAC settings route
    - Create route at `/projects/$id/settings/team`
    - Wire RBACManager with project roles map read/write
    - Update `authorizedUsers` array in sync with `roles` map for backward compat
    - _Requirements: 8.1, 8.7_

- [ ] 14. Portal — Audit Log and PII Detection
  - [~] 14.1 Implement AuditLogViewer component
    - Create `apps/portal/src/components/audit-log-viewer.tsx`
    - Filterable by date range, actor, action type, config key
    - Reverse chronological order, paginated (50 per page)
    - Display old/new value diffs
    - _Requirements: 9.3_

  - [~] 14.2 Create audit log TanStack Query hooks
    - Create `apps/portal/src/hooks/use-audit-log.ts`
    - Query `audit_log` subcollection with filter/pagination support
    - Add configurable retention period logic (30–2555 days)
    - _Requirements: 9.3, 9.5_

  - [~] 14.3 Add audit log route
    - Create route at `/projects/$id/audit`
    - Wire AuditLogViewer with hooks
    - _Requirements: 9.3_

  - [~] 14.4 Implement PII detection utility
    - Create `apps/portal/src/lib/pii-detection.ts`
    - Detect email patterns (`*@*.*`), phone numbers (international formats), government ID patterns
    - Return warning with detected PII type
    - Integrate into config save flow: warn and block unless user acknowledges
    - _Requirements: 10.7_

  - [ ]* 14.5 Write property test for PII detection (Property 17)
    - **Property 17: PII pattern detection** — correct identification of PII vs non-PII strings
    - **Validates: Requirements 10.7**

- [ ] 15. Portal — GDPR Compliance Panel
  - [~] 15.1 Implement GDPRPanel component
    - Create `apps/portal/src/components/gdpr-panel.tsx`
    - Data export: collect overrides, audit entries, segment references for a userId → JSON download
    - Data deletion: remove override entries, anonymize audit actor references, remove from roles/authorizedUsers
    - Status indicators: success/pending/failed states
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.8_

  - [~] 15.2 Create GDPR data export/deletion hooks
    - Create `apps/portal/src/hooks/use-gdpr.ts`
    - Export flow: query all accessible projects, aggregate user data, serialize to JSON (60s timeout)
    - Deletion flow: iterate projects/envs, remove userId from overrides, anonymize audit entries, remove access (72h allowance)
    - Log deletion action in audit log with anonymized target
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 15.3 Write property test for data deletion completeness (Property 23)
    - **Property 23: Data deletion completeness** — no traces remain after deletion
    - **Validates: Requirements 10.2**

  - [~] 15.4 Add GDPR settings route
    - Create route at `/projects/$id/settings/gdpr`
    - Wire GDPRPanel with hooks
    - _Requirements: 10.1, 10.8_

- [~] 16. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (fast-check library)
- Unit tests validate specific examples and edge cases
- The SDK plugins are built first so portal hooks can depend on shared types
- Firestore Security Rules should be tested against the Firestore emulator
- All portal components use shadcn/ui primitives, TanStack Query for data fetching, and Zustand for local state where needed
- Audit log writes are integrated into every mutation hook to satisfy Requirement 9.6 (block modification on audit failure)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.2", "2.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.4", "3.4", "3.5", "4.1", "4.3", "4.5", "4.7"] },
    { "id": 4, "tasks": ["3.6", "4.2", "4.4", "4.6", "4.8", "5.1", "5.3"] },
    { "id": 5, "tasks": ["5.2", "5.4", "6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3", "8.4"] },
    { "id": 9, "tasks": ["8.5", "9.1", "10.1"] },
    { "id": 10, "tasks": ["9.2", "9.3", "10.2", "10.3"] },
    { "id": 11, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 12, "tasks": ["11.4"] },
    { "id": 13, "tasks": ["13.1", "13.2", "13.4", "14.1", "14.4"] },
    { "id": 14, "tasks": ["13.3", "13.5", "14.2", "14.3", "14.5"] },
    { "id": 15, "tasks": ["15.1", "15.2"] },
    { "id": 16, "tasks": ["15.3", "15.4"] }
  ]
}
```
