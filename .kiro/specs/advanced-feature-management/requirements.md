# Requirements Document

## Introduction

This document specifies the requirements for an Advanced Feature Management system for the `@jewel998/config` platform. The system adds targeting rules, percentage rollouts, user segments, per-user overrides, flag lifecycle states, scheduled changes, prerequisite flags, role-based access control (RBAC), and SOC2/GDPR compliance capabilities to the existing multi-tenant configuration platform.

All evaluation logic executes client-side in the SDK (`@jewel998/config`) or in the React admin portal. No Cloud Functions are used. Firestore Security Rules enforce server-side RBAC. The SDK remains lightweight and tree-shakeable.

## Glossary

- **SDK**: The `@jewel998/config` npm package that evaluates config values client-side
- **Portal**: The React admin UI (Vite + TanStack Router + Firebase) for managing configs
- **Config_Flag**: A single configuration entry stored in Firestore under a project/environment path
- **Evaluation_Context**: A set of user attributes (userId, plan, country, email, custom properties) passed to the SDK at evaluation time
- **Targeting_Rule**: A condition-action pair that maps attribute predicates to config values
- **Segment**: A reusable, named audience group defined by attribute predicates, stored in the `segments` subcollection
- **Rollout_Percentage**: A 0-100 integer controlling gradual feature exposure via deterministic hashing
- **Override**: A per-user fixed config value that bypasses all targeting rules
- **Flag_Lifecycle_State**: One of: draft, active, stale, archived — representing the maturity stage of a Config_Flag
- **Schedule**: A future timestamp and target value pair that triggers a config change at evaluation time
- **Prerequisite_Flag**: A Config_Flag that must evaluate to a specified value before a dependent flag is evaluated
- **RBAC_Role**: One of: viewer, editor, admin — defining access permissions
- **Audit_Entry**: An immutable record capturing who changed what, when, the old value, and the new value
- **PII**: Personally Identifiable Information — data that can identify a specific individual
- **Sticky_Hash**: A deterministic hash of userId + configKey used for consistent rollout bucketing
- **Rule_Evaluator**: The SDK module responsible for evaluating targeting rules, segments, rollouts, overrides, schedules, and prerequisites

## Requirements

### Requirement 1: User/Context Targeting Rules

**User Story:** As a product manager, I want to serve different config values based on user attributes, so that I can personalize experiences without deploying code changes.

#### Acceptance Criteria

1. WHEN an Evaluation_Context is provided to the SDK, THE Rule_Evaluator SHALL evaluate Targeting_Rules in priority order (lowest priority number first) and return the value of the first matching rule; IF two or more Targeting_Rules share the same priority number, THEN THE Rule_Evaluator SHALL evaluate them in document storage order (insertion order)
2. WHEN no Targeting_Rule matches the provided Evaluation_Context, THE Rule_Evaluator SHALL return the Config_Flag default value
3. THE Portal SHALL provide a rule builder UI that allows creating Targeting_Rules with attribute predicates (equals, not_equals, contains, starts_with, ends_with, in_list, not_in_list, greater_than, less_than, regex_match) where attribute names are limited to 128 characters and attribute values are limited to 1024 characters
4. WHEN a Targeting_Rule is saved via the Portal, THE Portal SHALL store the rule in the Config_Flag document with a priority field (positive integer, 1 to 1000) and condition predicates, allowing a maximum of 100 Targeting_Rules per Config_Flag
5. THE Rule_Evaluator SHALL support AND/OR logical grouping of predicates within a single Targeting_Rule, structured as a list of predicate groups combined with OR logic where predicates within each group are combined with AND logic (disjunctive normal form, maximum 10 groups with up to 10 predicates each)
6. IF the Evaluation_Context is missing a required attribute referenced in a Targeting_Rule, or IF a predicate comparison encounters a type mismatch (e.g., greater_than applied to a non-numeric value), THEN THE Rule_Evaluator SHALL treat that predicate as non-matching
7. IF a regex_match predicate contains an invalid regular expression pattern, THEN THE Rule_Evaluator SHALL treat that predicate as non-matching and emit a "fetchError" event indicating the invalid pattern

### Requirement 2: Percentage Rollouts

**User Story:** As a release engineer, I want to gradually roll out features to a percentage of users, so that I can detect issues before full exposure.

#### Acceptance Criteria

1. THE Portal SHALL provide a slider control accepting integer values from 0 to 100 (inclusive, step of 1) for setting the Rollout_Percentage on a Config_Flag, and SHALL store a corresponding rollout-enabled value that the Rule_Evaluator returns for users included in the rollout
2. WHEN a Rollout_Percentage is configured and is between 1 and 99 inclusive, THE Rule_Evaluator SHALL compute a Sticky_Hash from the userId and configKey using a deterministic hash function that produces a uniformly distributed bucket value in the range 0-99
3. WHEN the Sticky_Hash bucket value (0-99) is less than the Rollout_Percentage, THE Rule_Evaluator SHALL return the rollout-enabled value configured for that Config_Flag
4. WHEN the Sticky_Hash bucket value is greater than or equal to the Rollout_Percentage, THE Rule_Evaluator SHALL return the Config_Flag default value
5. WHEN the same userId and configKey are evaluated multiple times across any number of sessions or SDK initializations, THE Rule_Evaluator SHALL produce the same bucket assignment provided the Rollout_Percentage has not changed (stickiness guarantee)
6. IF no userId is present in the Evaluation_Context, THEN THE Rule_Evaluator SHALL skip percentage rollout evaluation and return the Config_Flag default value
7. IF the Rollout_Percentage is set to 0, THEN THE Rule_Evaluator SHALL return the Config_Flag default value for all users without computing a Sticky_Hash
8. IF the Rollout_Percentage is set to 100, THEN THE Rule_Evaluator SHALL return the rollout-enabled value for all users without computing a Sticky_Hash

### Requirement 3: User Segments

**User Story:** As a product manager, I want to define reusable audience groups, so that I can reference them across multiple flags without duplicating conditions.

#### Acceptance Criteria

1. THE Portal SHALL allow creating, editing, and deleting Segments with a name (maximum 100 characters), description (maximum 500 characters), and a set of up to 20 attribute predicates using AND/OR logic
2. WHEN a Segment is stored, THE Portal SHALL write the Segment to the Firestore `segments` subcollection under the project
3. THE Portal SHALL allow referencing a Segment by ID within a Targeting_Rule condition (predicate: "in_segment" / "not_in_segment")
4. WHEN the Rule_Evaluator encounters a segment-based predicate, THE Rule_Evaluator SHALL resolve the Segment definition and evaluate the Evaluation_Context against the Segment predicates using the same attribute operators defined for Targeting_Rules (equals, not_equals, contains, starts_with, ends_with, in_list, not_in_list, greater_than, less_than, regex_match); nested segment references within a Segment definition SHALL NOT be permitted; THE Rule_Evaluator SHALL enforce consistency between intermediate predicate matching results and the final segment evaluation outcome
5. WHEN a Segment is updated, all Config_Flags referencing that Segment SHALL reflect the updated Segment definition at next evaluation without requiring individual flag updates
6. IF a referenced Segment does not exist, THEN THE Rule_Evaluator SHALL treat the segment predicate as non-matching and continue evaluation
7. IF a user attempts to delete a Segment that is currently referenced by one or more Targeting_Rules, THEN THE Portal SHALL block the deletion and display an error message indicating which Config_Flags reference the Segment

### Requirement 4: Per-User Overrides

**User Story:** As a QA engineer, I want to force specific config values for individual users, so that I can test features in production without affecting other users.

#### Acceptance Criteria

1. THE Portal SHALL provide a UI to add, edit, and remove per-user Overrides on a Config_Flag, keyed by userId, supporting a maximum of 100 overrides per Config_Flag
2. WHEN Overrides are stored, THE Portal SHALL write them as an `overrides` map field on the Config_Flag document with userId as the key
3. WHEN the Rule_Evaluator evaluates a Config_Flag for a userId that exists in the overrides map, THE Rule_Evaluator SHALL return the Override value immediately, bypassing all Targeting_Rules, Rollout_Percentage, and Segment evaluations
4. WHEN the Evaluation_Context does not contain a userId present in the overrides map, THE Rule_Evaluator SHALL proceed with normal evaluation (targeting rules, rollout, segments)
5. IF the Evaluation_Context does not include a userId, THEN THE Rule_Evaluator SHALL skip override evaluation entirely and proceed to the next evaluation pipeline step
6. WHEN a user adds or edits an Override value via the Portal, THE Portal SHALL validate that the Override value matches the Config_Flag value type (boolean, string, number, or JSON) and reject the save with an error message indicating the type mismatch if validation fails
7. IF a userId key exists in the overrides map but the stored Override value is null or undefined, THEN THE Rule_Evaluator SHALL skip that override entry and proceed with normal evaluation

### Requirement 5: Flag Lifecycle States

**User Story:** As a team lead, I want config flags to progress through lifecycle states, so that I can manage flag hygiene and identify stale configurations.

#### Acceptance Criteria

1. THE Portal SHALL support the following lifecycle states for each Config_Flag: draft, active, stale, archived
2. WHEN a Config_Flag is created, THE Portal SHALL set the initial state to "draft"
3. THE Portal SHALL enforce the following valid state transitions: draft → active, active → stale, stale → archived, stale → active, archived → active
4. IF a user attempts a state transition that is not in the valid transition set, THEN THE Portal SHALL reject the transition, display an error message indicating the transition is not allowed, and retain the Config_Flag in its current state
5. WHILE a Config_Flag is in the "archived" state, THE Portal SHALL hide the flag from the main config list but retain it in an "Archived" view accessible for audit purposes
6. WHEN the SDK evaluates a Config_Flag that is in the "archived" state, THE Rule_Evaluator SHALL skip evaluation and return undefined (treat as non-existent)
7. WHEN an "active" Config_Flag has not had its value, targeting rules, overrides, rollout percentage, or schedule modified for a project-configurable duration (default: 30 days, configurable range: 7 to 365 days), THE Portal SHALL automatically transition the flag state to "stale"
8. WHEN a Config_Flag is transitioned to a new lifecycle state, THE Portal SHALL record the transition timestamp and display the current state and last-transition date on the flag detail view

### Requirement 6: Scheduled Flag Changes

**User Story:** As a product manager, I want to schedule future config value changes, so that I can coordinate launches without manual intervention at go-live time.

#### Acceptance Criteria

1. THE Portal SHALL provide a UI to schedule a future value change for a Config_Flag, specifying a target value and an activation timestamp in UTC, limited to one pending schedule per Config_Flag at a time
2. WHEN a Schedule is saved, THE Portal SHALL store the schedule data (targetValue, activateAt timestamp) on the Config_Flag document
3. IF the user attempts to save a Schedule with an activateAt timestamp that is not at least 1 minute in the future relative to the current UTC time, THEN THE Portal SHALL reject the save and display an error message indicating the timestamp must be in the future
4. WHEN the Rule_Evaluator evaluates a Config_Flag that has a Schedule with an activateAt timestamp in the past relative to the current time, THE Rule_Evaluator SHALL return the scheduled targetValue
5. WHEN the Rule_Evaluator evaluates a Config_Flag that has a Schedule with an activateAt timestamp in the future relative to the current time, THE Rule_Evaluator SHALL ignore the schedule and proceed with normal evaluation
6. THE Portal SHALL display a countdown timer (updated every 1 second, showing hours, minutes, and seconds remaining) for an upcoming scheduled change on the Config_Flag detail view
7. WHEN a scheduled change has been applied (activateAt is in the past), THE Portal SHALL display the schedule as "applied" and allow removal by the user; removing an applied schedule SHALL revert the Config_Flag to normal evaluation without the scheduled targetValue
8. THE Portal SHALL allow the user to cancel a pending Schedule (activateAt in the future) by removing it from the Config_Flag document before activation
9. IF the user attempts to save a Schedule with a targetValue whose type does not match the Config_Flag value type, THEN THE Portal SHALL reject the save and display an error message indicating the type mismatch

### Requirement 7: Prerequisite / Dependent Flags

**User Story:** As a developer, I want to define dependencies between config flags, so that dependent features cannot be enabled without their prerequisites being active.

#### Acceptance Criteria

1. THE Portal SHALL provide a UI to add up to 10 prerequisite flags to a Config_Flag, specifying the prerequisite flag key (from the same project and environment) and its required value
2. WHEN prerequisites are stored, THE Portal SHALL write them as a `prerequisites` array field on the Config_Flag document
3. WHEN the Rule_Evaluator evaluates a Config_Flag that has prerequisites, THE Rule_Evaluator SHALL first evaluate each prerequisite flag recursively (up to a maximum depth of 5 levels) and verify each returns the required value; the depth limit SHALL only be enforced during full recursive evaluation and not when a prerequisite immediately fails and returns the default value
4. IF any prerequisite flag does not return its required value, THEN THE Rule_Evaluator SHALL return the Config_Flag default value without evaluating the flag's own targeting rules
5. IF a circular dependency is detected during prerequisite evaluation (flag A requires flag B which requires flag A), THEN THE Rule_Evaluator SHALL break the cycle by returning the Config_Flag default value and emit a "fetchError" event with a circular dependency message
6. WHEN a user attempts to save a prerequisite configuration that introduces a circular dependency, THE Portal SHALL reject the save and display an error message indicating which flags form the circular chain
7. IF a prerequisite flag referenced by key does not exist or is in the "archived" state, THEN THE Rule_Evaluator SHALL treat the prerequisite as unmet and return the Config_Flag default value
8. IF the prerequisite evaluation depth exceeds 5 levels, THEN THE Rule_Evaluator SHALL stop evaluation, return the Config_Flag default value, and emit a "fetchError" event with a depth-exceeded message

### Requirement 8: Role-Based Access Control (RBAC)

**User Story:** As an admin, I want to control who can modify configurations in each environment, so that production changes require elevated privileges.

#### Acceptance Criteria

1. WHEN a project member is added, THE Portal SHALL assign the "viewer" RBAC_Role by default, allowing an admin to change the role to editor or admin after addition
2. WHILE a user has the "viewer" RBAC_Role, THE Portal SHALL display config data in read-only mode and hide all edit/create/delete controls
3. WHILE a user has the "editor" RBAC_Role, THE Portal SHALL allow modifications to environments not marked as "production" and display environments marked as "production" as read-only, where the production designation is the `isProduction` boolean flag set on the environment record by an admin
4. WHILE a user has the "admin" RBAC_Role, THE Portal SHALL allow modifications to all environments including those marked as production, and allow managing project members and their RBAC_Roles; THE Portal SHALL additionally restrict admin UI actions to only those that Firestore Security Rules would actually permit, preventing the UI from presenting actions that would be server-side rejected
5. THE Firestore Security Rules SHALL enforce RBAC_Role permissions server-side, rejecting write operations that violate the user's assigned role regardless of portal UI state
6. IF a write operation is rejected by Firestore Security Rules due to insufficient RBAC_Role permissions, THEN THE Portal SHALL display an error message indicating the operation was denied due to insufficient permissions and preserve the user's unsaved input
7. WHEN a user's RBAC_Role is changed, THE Portal SHALL reflect the updated permissions immediately upon the next data fetch without requiring a page reload
8. IF an admin attempts to remove or downgrade the only remaining admin on a project, THEN THE Portal SHALL reject the operation and display an error message indicating that at least one admin must remain assigned to the project

### Requirement 9: Audit Logging

**User Story:** As a compliance officer, I want every config change to be logged with full context, so that we can demonstrate SOC2 Type II auditability.

#### Acceptance Criteria

1. WHEN any Config_Flag value, targeting rule, segment, override, schedule, or lifecycle state is modified, THE Portal SHALL create an Audit_Entry recording: actor userId, ISO 8601 UTC timestamp, action type (create, update, delete, state_change), old value (serialized, max 10,000 characters), new value (serialized, max 10,000 characters), and affected resource path
2. THE Portal SHALL store Audit_Entries in a dedicated Firestore `audit_log` subcollection under the project
3. THE Portal SHALL provide a filterable audit log view supporting filters by date range, actor, action type, and config key, returning results in reverse chronological order with paginated display of no more than 50 entries per page
4. THE Audit_Entry documents SHALL be protected by Firestore Security Rules that prevent modification or deletion by any user (append-only)
5. THE Portal SHALL retain Audit_Entries for a project-configurable retention period (minimum 30 days, maximum 2555 days, default: 365 days), and WHEN an Audit_Entry exceeds the configured retention period, THE Portal SHALL automatically delete the expired entry during the next scheduled cleanup
6. IF the Portal fails to persist an Audit_Entry during a config modification operation, THEN THE Portal SHALL block the config modification, discard the pending change, and display an error message indicating that the change could not be saved due to an audit logging failure

### Requirement 10: GDPR Compliance

**User Story:** As a data protection officer, I want the platform to support GDPR requirements, so that we can handle data subject requests and maintain lawful data processing.

#### Acceptance Criteria

1. THE Portal SHALL provide a data export capability that generates a JSON export of all config data (overrides, targeting rule references), audit log entries, and user metadata associated with a specified userId or project, and present a downloadable file within 60 seconds of request initiation
2. THE Portal SHALL provide a data deletion capability that removes all personal data associated with a specified userId — including override entries, audit log actor references, segment membership references, and access records — across all projects, completing within 72 hours of request submission
3. WHEN a data deletion request is processed, THE Portal SHALL log the deletion action in the audit log recording: the requesting actor userId, timestamp, action type "data_deletion", target userId (anonymized identifier), and affected resource paths, without retaining the deleted personal data
4. IF a data export or data deletion request fails to complete (due to partial failure or resource unavailability), THEN THE Portal SHALL display an error message indicating which resources could not be processed and retain the request in a pending state for retry
5. THE SDK SHALL support a consent-aware mode where a boolean `consentGranted` property in the Evaluation_Context indicates whether the user has provided consent for personalized evaluation
6. IF the SDK is initialized with consent-aware mode enabled and the Evaluation_Context does not contain a `consentGranted` property set to true (including when the property is missing entirely or explicitly set to false), THEN THE Rule_Evaluator SHALL return default values without evaluating targeting rules, overrides, percentage rollouts, schedules, or prerequisite flags
7. WHEN a config value field being saved via the Portal contains a pattern matching common PII formats (email addresses, phone numbers, or government ID patterns), THE Portal SHALL display a warning identifying the detected PII pattern and block the save operation unless the user explicitly acknowledges the warning
8. WHEN a data export or data deletion request is submitted, THE Portal SHALL display a confirmation status indicating whether the operation completed successfully or is still in progress

### Requirement 11: SDK Evaluation Pipeline Order

**User Story:** As a developer integrating the SDK, I want a deterministic and documented evaluation order, so that I can predict which value will be returned for any given context.

#### Acceptance Criteria

1. THE Rule_Evaluator SHALL evaluate a Config_Flag in the following fixed order: (1) check archived state — if archived, return undefined, (2) check prerequisites — if any prerequisite does not return its required value, return the Config_Flag default value, (3) check per-user overrides — if the userId exists in the overrides map, return the Override value, (4) check scheduled changes — if a Schedule has an activateAt timestamp in the past, return the scheduled targetValue, (5) evaluate targeting rules with segment resolution — if a rule matches, return the matched rule value, (6) evaluate percentage rollout — if a Rollout_Percentage is configured and the Sticky_Hash bucket is less than the Rollout_Percentage, return the rollout-enabled value, (7) return the Config_Flag default value
2. WHEN a step in the evaluation pipeline produces a value (as defined per step in criterion 1), THE Rule_Evaluator SHALL return that value immediately without evaluating subsequent steps
3. WHEN a pipeline step has no applicable configuration for the current Config_Flag (e.g., no prerequisites defined, no overrides map, no active schedule, no targeting rules, no rollout percentage), THE Rule_Evaluator SHALL skip that step and proceed to the next step in the fixed order; this skipping rule applies uniformly to all pipeline steps
4. THE SDK SHALL expose the evaluation pipeline as a tree-shakeable module so that applications importing only base SDK without targeting, rollout, or schedule modules SHALL not include that evaluation code in the bundled output
5. THE Rule_Evaluator SHALL produce the same return value when evaluating the same Config_Flag with the same Evaluation_Context and the same config state, regardless of the number of times evaluation is invoked (determinism property)
6. IF the Evaluation_Context is missing the userId attribute, THEN THE Rule_Evaluator SHALL skip the per-user overrides step (step 3) and the percentage rollout step (step 6), proceeding to the next applicable step in each case

### Requirement 12: SDK Tree-Shakeability and Modularity

**User Story:** As a developer, I want to import only the SDK features I use, so that my application bundle remains lightweight.

#### Acceptance Criteria

1. THE SDK SHALL export the Rule_Evaluator, Segment resolver, Rollout evaluator, Schedule evaluator, and Prerequisite evaluator as separate sub-path imports (e.g., `@jewel998/config/targeting`, `@jewel998/config/rollout`) with each sub-path declared as a distinct entry in the package.json `exports` field
2. WHEN a consumer imports only the base SDK entry point (`.`) without any targeting sub-path imports, THE bundled output produced by a tree-shaking bundler (Rollup, Webpack, or esbuild) SHALL contain zero bytes from the targeting, rollout, schedule, or prerequisite evaluation modules
3. THE SDK base package entry point (the `.` export containing core config fetching, caching, and event emission only) SHALL remain under 5 KB minified and gzipped
4. THE SDK SHALL use an adapter/plugin pattern where evaluation pipeline steps are registered explicitly by the consumer at initialization time, and THE SDK package.json SHALL declare `"sideEffects": false` to enable bundler tree-shaking
5. IF the Rule_Evaluator reaches an evaluation pipeline step whose corresponding plugin module has not been registered, THEN THE Rule_Evaluator SHALL skip that step and continue to the next step in the pipeline order
6. WHEN a consumer registers a plugin module at initialization time, THE SDK SHALL add the corresponding evaluation step to the pipeline in the order defined by Requirement 11 criterion 1, regardless of registration call order
