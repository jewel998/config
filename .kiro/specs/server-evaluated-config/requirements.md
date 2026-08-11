# Requirements Document

## Introduction

This feature introduces **server-side evaluation** as the default mode for frontend SDKs. Instead of sending targeting rules, segments, and rollout percentages to the browser for client-side evaluation, the SDK sends user context (browser details, user attributes) to the API. The API resolves segment membership, evaluates targeting rules, and returns only the final resolved config values. This approach eliminates exposure of business logic to the client, reduces payload size, and simplifies the SDK surface.

A secondary **client-evaluated mode** remains available as an opt-in for backend/server-side consumers who need full flag data and segments for local evaluation without round-trips per context change.

Additionally, the portal's targeting rules UI is enhanced to support **segment-based targeting** — assigning values directly to segments without needing predicate conditions. This simplifies the most common targeting pattern: "users in Segment X get value Y."

## Glossary

- **Server_Evaluation**: The mode where the API receives user context, evaluates all targeting rules and segment membership server-side, and returns only resolved config values to the SDK
- **Client_Evaluation**: The mode where the API returns full flag data (targeting rules, segments, rollout percentages) and the SDK evaluates locally using its plugin pipeline
- **User_Context**: A set of attributes describing the current user/session (userId, email, plan, country, browser, device, custom attributes) sent by the SDK to the API
- **Segment_Membership**: Whether a given user context satisfies a segment's predicate conditions, evaluated server-side
- **Segment_Targeting**: A targeting rule that assigns a value to users who belong to specific segments, without requiring additional predicate conditions
- **Resolved_Value**: The final config value after all evaluation steps (targeting, rollout, overrides, schedule, prerequisites) have been applied
- **Evaluation_Mode**: Either "server" (default for frontend) or "client" (opt-in for backend) — determines whether evaluation happens on the API or in the SDK
- **Auto_Context**: Helper utilities in the SDK that automatically detect and populate common user context attributes (browser, OS, device, screen, locale, timezone)

## Requirements

### Requirement 1: Server-Side Evaluation API Endpoint

**User Story:** As a frontend developer, I want the API to evaluate targeting rules server-side so that my app only receives resolved config values without exposing business logic.

#### Acceptance Criteria

1. WHEN the SDK sends a request with `evaluationMode: "server"` (or omits evaluationMode, defaulting to server), THE API SHALL accept a `context` object containing user attributes alongside the `clientId`
2. THE API SHALL resolve segment membership for the provided context by evaluating each segment's predicate conditions against the context attributes
3. THE API SHALL evaluate targeting rules in priority order for each config flag, using the resolved segment memberships and context attributes
4. THE API SHALL apply the full evaluation pipeline (prerequisites → overrides → schedule → targeting → rollout) server-side and return only the final resolved value for each config key
5. THE API SHALL return a flat `data: Record<string, unknown>` response where each key maps directly to its resolved value (no targeting rules, segments, or rollout data exposed)
6. WHEN no context is provided and evaluationMode is "server", THE API SHALL evaluate as if all context attributes are empty (default values returned for all targeting-dependent flags)

### Requirement 2: Client-Side Evaluation Mode (Opt-in)

**User Story:** As a backend developer, I want to receive full flag data and segments so that I can evaluate targeting locally without per-request API calls.

#### Acceptance Criteria

1. WHEN the SDK sends a request with `evaluationMode: "client"`, THE API SHALL return the current response format: full flag data with targeting rules, segments, rollout percentages, and all advanced features
2. THE API SHALL include the `segments` map in the response only when `evaluationMode: "client"` is specified
3. THE API SHALL NOT include targeting rules, rollout data, or segment definitions in responses when `evaluationMode: "server"` (default)
4. THE API response format for client mode SHALL remain backward-compatible with the current response structure

### Requirement 3: SDK Evaluation Mode Configuration

**User Story:** As a developer, I want to specify whether my app uses server or client evaluation at SDK initialization.

#### Acceptance Criteria

1. THE SDK SHALL accept an `evaluationMode` option in `CreateConfigOptions` with values `"server"` (default) or `"client"`
2. WHEN `evaluationMode` is `"server"`, THE SDK SHALL send the current `context` object with every fetch request to the API
3. WHEN `evaluationMode` is `"server"`, THE SDK SHALL NOT register or execute targeting/rollout/schedule plugins client-side (values are pre-resolved)
4. WHEN `evaluationMode` is `"client"`, THE SDK SHALL behave identically to the current implementation (fetch full data, evaluate via plugins locally)
5. WHEN `evaluationMode` is `"server"` and the user calls `setContext()`, THE SDK SHALL trigger a re-fetch to get newly resolved values for the updated context

### Requirement 4: SDK Context Passing

**User Story:** As a frontend developer, I want to provide user attributes that the API uses for targeting evaluation.

#### Acceptance Criteria

1. THE SDK SHALL send the `context` object (from `CreateConfigOptions.context` or set via `setContext()`) as part of the API request body when `evaluationMode` is `"server"`
2. THE SDK context object SHALL support: `userId` (string), `attributes` (Record of key-value pairs including browser, OS, device, plan, country, email, custom fields)
3. THE SDK SHALL merge auto-detected context (via `autoContext()` helper) with user-provided context, with user-provided values taking precedence
4. THE SDK SHALL NOT send context to the API when `evaluationMode` is `"client"` (context stays local for plugin evaluation)

### Requirement 5: Auto-Context Detection Helpers

**User Story:** As a frontend developer, I want the SDK to automatically detect browser/device attributes so I don't have to manually populate common targeting attributes.

#### Acceptance Criteria

1. THE SDK SHALL export an `autoContext()` helper function that returns an `EvaluationContext` populated with automatically detected attributes
2. THE `autoContext()` helper SHALL detect and include: `browser` (name), `browserVersion`, `os` (operating system), `device` (desktop/mobile/tablet), `screenWidth`, `screenHeight`, `locale` (navigator.language), `timezone` (Intl timezone)
3. THE `autoContext()` helper SHALL be tree-shakeable (not automatically included — consumer must explicitly pass it)
4. THE SDK SHALL export a `mergeContext(auto, user)` utility that deep-merges auto-detected and user-provided contexts, with user values winning on conflict

### Requirement 6: Segment-Based Targeting Rules in Portal

**User Story:** As a product manager, I want to assign config values directly to segments without configuring predicate conditions, so that targeting is simpler and more intuitive.

#### Acceptance Criteria

1. THE Portal SHALL support a targeting rule type where the user selects one or more segments and assigns a return value, without needing to add predicate conditions manually
2. WHEN a segment-based targeting rule is created, THE Portal SHALL store it as a targeting rule with a single predicate: `{ attribute: "_segment", operator: "in_segment", value: [segmentId1, segmentId2] }`
3. THE Portal SHALL display segment-based rules with a simplified UI showing segment names as chips/badges and the assigned value, rather than the raw predicate form
4. THE Portal SHALL allow mixing segment-based rules and condition-based rules within the same config's targeting rules
5. THE Portal SHALL show a segment picker (multi-select from available segments) when creating a segment-based targeting rule

### Requirement 7: Server-Side Segment Membership Resolution

**User Story:** As a system, I need to resolve which segments a user belongs to based on their context attributes so that segment-based targeting works correctly.

#### Acceptance Criteria

1. WHEN evaluating in server mode, THE API SHALL load all segments for the project and evaluate each segment's conditions against the provided user context
2. THE API SHALL resolve `in_segment` predicates within targeting rules by checking if the user context satisfies the referenced segment's conditions
3. THE API SHALL support multi-segment targeting rules where a user must belong to ANY of the listed segments (OR logic) for the rule to match
4. THE API SHALL handle segment-based targeting rules (stored with `attribute: "_segment"`) by resolving segment membership rather than treating `_segment` as a context attribute
5. IF a referenced segment does not exist, THE API SHALL treat the predicate as non-matching (same as current client-side behavior)

### Requirement 8: Server-Side Rollout Evaluation

**User Story:** As a system, I need to evaluate percentage rollouts server-side so that frontend apps don't need the rollout plugin.

#### Acceptance Criteria

1. WHEN evaluating in server mode and a config has `rolloutPercentage` set, THE API SHALL use the provided `context.userId` (or a hash of available context attributes) to deterministically compute whether the user is in the rollout bucket
2. THE API SHALL use the same hashing algorithm as the existing client-side rollout plugin to ensure consistent bucketing between modes
3. IF no `userId` or identifiable attribute is provided for rollout computation, THE API SHALL fall back to the config's default value (skip rollout)

### Requirement 9: API Response Caching for Server Evaluation

**User Story:** As a system architect, I want server-evaluated responses to remain cacheable where possible so that costs stay low.

#### Acceptance Criteria

1. WHEN `evaluationMode` is "server" and a context is provided, THE API SHALL set `Cache-Control: private, max-age=30` (not CDN-cacheable since response varies by context)
2. WHEN `evaluationMode` is "client" (no context), THE API SHALL retain the current caching behavior: `public, max-age=30, s-maxage=60` (CDN-cacheable)
3. THE API SHALL include an `ETag` header based on the config version and context hash to support conditional requests (304 Not Modified)
4. THE SDK SHALL support `If-None-Match` header for conditional fetches to reduce bandwidth in server-evaluation mode

### Requirement 10: Error Handling for Server Evaluation

**User Story:** As a frontend developer, I want graceful degradation when the API cannot evaluate targeting so that my app still works.

#### Acceptance Criteria

1. IF the API encounters an error evaluating a targeting rule for a specific flag, THE API SHALL return the flag's default value for that key and continue processing other flags
2. THE API SHALL include a `warnings` array in the response listing any flags where evaluation fell back to defaults, with reason codes
3. WHEN the SDK is in server-evaluation mode and a fetch fails, THE SDK SHALL fall back to cached values (same behavior as current pessimistic mode fallback)
4. THE SDK SHALL emit a `fetchError` event with details when server evaluation fails, allowing consumers to handle gracefully
