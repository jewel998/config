# Implementation Plan: Server-Evaluated Config

## Overview

Implement server-side evaluation of targeting rules, segments, and rollouts in the Cloud Function API. The SDK sends user context, the API resolves everything, and returns only flat resolved values. Add auto-context helpers, dual-mode support, and a simplified segment-targeting UI in the portal.

## Tasks

- [x] 1. Server-Side Evaluation Engine (Cloud Function)
  - [x] 1.1 Create rollout hash utility
    - Create `functions/src/api/rollout-hash.ts` with `computeRolloutBucket(userId: string, flagKey: string): number` using the same deterministic hash as the SDK rollout plugin
    - Export `isInRollout(userId: string, flagKey: string, percentage: number): boolean`
    - Ensure identical bucketing behavior between server and client for consistency
    - _Requirements: 8.1, 8.2_
  - [x] 1.2 Create server evaluator module
    - Create `functions/src/api/server-evaluator.ts` with the full evaluation pipeline
    - Implement `evaluateConfigsForContext(configs, segments, context)` as the main entry point returning `Record<string, unknown>` + `warnings[]`
    - Implement pipeline steps in order: archived → prerequisites → overrides → schedule → targeting → rollout → default value
    - Each step is a pure function: `(config, segments, context, helpers) → { resolved, value?, warning? }`
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.3_
  - [x] 1.3 Implement targeting evaluation with segment resolution
    - Within the server evaluator, implement `evaluateTargetingRules(config, segments, context)` that sorts rules by priority and evaluates conditions
    - Support standard predicates (equals, contains, in_list, etc.) against context attributes
    - Support `in_segment` / `not_in_segment` predicates by resolving segment conditions against context
    - Support `_segment` attribute with array value — check if user is in ANY listed segment (OR logic)
    - If referenced segment does not exist, treat predicate as non-matching
    - _Requirements: 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 1.4 Update `getConfig` API to support dual evaluation modes
    - Modify `functions/src/api/get-config.ts` to extract `evaluationMode` from request body (default: `"server"`)
    - Extract `context` from request body when mode is "server"
    - Validate context object structure and reject payloads > 10KB with 413 status
    - **Server mode path:** call `evaluateConfigsForContext()`, return flat values + warnings
    - **Client mode path:** existing behavior (full flag data + segments)
    - Set `Cache-Control: private, max-age=30` for server mode (not CDN-cacheable)
    - Keep `Cache-Control: public, max-age=30, s-maxage=60` for client mode
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 10.1, 10.2_

- [x] 2. SDK Dual-Mode Support
  - [x] 2.1 Add `evaluationMode` to SDK types
    - Add `EvaluationMode = "server" | "client"` type to `packages/config/src/types.ts`
    - Add `evaluationMode?: EvaluationMode` to `CreateConfigOptions` (default: `"server"`)
    - Add `evaluationMode` and `context` fields to `GetConfigRequest` interface
    - Add `warnings?: EvaluationWarning[]` to `GetConfigResponse`
    - _Requirements: 3.1, 4.1_
  - [x] 2.2 Update HTTP transport to send context
    - Modify `packages/config/src/transport/HttpTransport.ts` to accept evaluation mode and context getter
    - When `evaluationMode` is "server": include `evaluationMode` and `context` in the request body
    - When `evaluationMode` is "client": include `evaluationMode: "client"` only (no context sent)
    - _Requirements: 3.2, 4.1, 4.4_
  - [x] 2.3 Update `createConfig` to handle server mode
    - In `packages/config/src/createConfig.ts`: detect evaluation mode
    - **Server mode:** do NOT register targeting/rollout/schedule plugins (values are pre-resolved from API)
    - **Server mode:** pass context getter to transport
    - **Client mode:** preserve existing behavior (register plugins, evaluate locally)
    - Pass evaluationMode through to ConfigClient builder
    - _Requirements: 3.1, 3.3, 3.4_
  - [x] 2.4 Update ConfigClient for server-mode `setContext` behavior
    - In `packages/config/src/client/ConfigClient.ts`: when `evaluationMode` is "server" and `setContext()` is called, trigger a `refresh()` to re-fetch resolved values for the new context
    - In server mode, `getValue` returns the cached resolved value directly (no local plugin pipeline)
    - In client mode, preserve existing behavior (context updates trigger local re-evaluation)
    - _Requirements: 3.5, 4.1_
  - [x] 2.5 Update batch/projected fetchers to pass context
    - Modify `packages/config/src/fetch/batchFetcher.ts` to include context and evaluationMode in the transport request body
    - Modify `packages/config/src/fetch/projectedFetcher.ts` similarly
    - _Requirements: 3.2, 4.1_

- [x] 3. Auto-Context Helpers
  - [x] 3.1 Create `autoContext()` utility
    - Create `packages/config/src/context/autoContext.ts` exporting `autoContext(): EvaluationContext`
    - Detect: `browser` (UA parsing), `browserVersion`, `os`, `device` (desktop/mobile/tablet via screen width + touch), `screenWidth`, `screenHeight`, `locale` (navigator.language), `timezone` (Intl)
    - Keep implementation lightweight — no heavy UA parsing library (use simple regex on navigator.userAgent)
    - Ensure tree-shakeability: exported as a standalone function, not auto-included
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 3.2 Create `mergeContext()` utility
    - Create `mergeContext(auto: EvaluationContext, user: EvaluationContext): EvaluationContext` in the same file
    - Deep-merge attributes objects with user values taking precedence
    - If user provides `userId`, use it; otherwise auto-context doesn't set userId
    - _Requirements: 5.4_
  - [x] 3.3 Export new utilities from package entry
    - Add `autoContext` and `mergeContext` to the SDK's public exports in `packages/config/src/index.ts`
    - Ensure they're listed in package.json exports map if applicable
    - _Requirements: 5.1, 5.3_

- [x] 4. Portal — Segment Targeting UI
  - [x] 4.1 Create `SegmentTargetingRule` component
    - Create `apps/portal/src/components/segment-targeting-rule.tsx`
    - Segment multi-select dropdown populated from project's segments collection
    - Value input field (type depends on config's valueType)
    - Priority input
    - Display selected segments as color badges/chips
    - Visual layout: [Segments badges] → [value] (intuitive cause-effect)
    - _Requirements: 6.1, 6.3, 6.5_
  - [x] 4.2 Update `RuleBuilder` to support segment-based rules
    - Modify `apps/portal/src/components/rule-builder.tsx` to detect segment-based rules (using `isSegmentRule()` helper)
    - Render segment-based rules with `SegmentTargetingRule` component
    - Render condition-based rules with the existing predicate UI
    - Add rule type selector when adding a new rule: "Condition-based" or "Segment-based"
    - _Requirements: 6.2, 6.4_
  - [x] 4.3 Add conversion helpers for segment rules
    - Add `toStorageRule()` and `isSegmentRule()` helper functions to `apps/portal/src/lib/types.ts` or a new `apps/portal/src/lib/segment-targeting.ts`
    - `toStorageRule()`: converts segment IDs + value into a standard TargetingRule with `_segment` predicate
    - `isSegmentRule()`: detects if a TargetingRule uses the segment pattern
    - `fromStorageRule()`: extracts segment IDs from a stored rule for UI display
    - _Requirements: 6.2_

- [ ] 5. Integration & Documentation
  - [ ] 5.1 Update SDK README with evaluation mode docs
    - Document `evaluationMode: "server"` (default) and `"client"` options
    - Add usage examples for frontend (server mode + autoContext) and backend (client mode + plugins)
    - Document `setContext()` behavior difference between modes
    - Document `autoContext()` and `mergeContext()` helpers
    - _Requirements: 3.1, 4.1, 5.1_
  - [ ] 5.2 Update API documentation
    - Update `apps/docs/api/index.md` with the new request/response formats
    - Document the `evaluationMode` parameter and `context` object structure
    - Document the `warnings` response field
    - Add examples for both server and client mode requests
    - _Requirements: 1.1, 2.1_
  - [ ] 5.3 Verify end-to-end flow
    - Deploy updated Cloud Function
    - Test server mode: SDK sends context → API returns resolved values
    - Test client mode: SDK sends mode=client → API returns full data + segments
    - Test segment targeting: create segment rule in portal → verify server evaluation resolves correctly
    - Test `setContext()` triggers re-fetch in server mode
    - Test auto-context detection in browser
    - Verify existing SDK tests still pass (backward compatibility)
    - _Requirements: All_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "2.1"],
      "description": "Foundation: rollout hash utility + SDK type changes"
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.3", "2.2", "2.5"],
      "description": "Server evaluator + SDK transport changes"
    },
    {
      "id": 2,
      "tasks": ["1.4", "2.3", "2.4"],
      "description": "API dual-mode endpoint + SDK createConfig/ConfigClient changes"
    },
    {
      "id": 3,
      "tasks": ["3.1", "3.2", "3.3", "4.3"],
      "description": "Auto-context helpers + segment targeting utilities"
    },
    {
      "id": 4,
      "tasks": ["4.1", "4.2"],
      "description": "Portal segment targeting UI"
    },
    {
      "id": 5,
      "tasks": ["5.1", "5.2", "5.3"],
      "description": "Documentation + integration testing"
    }
  ]
}
```

## Notes

- **Backward compatibility:** The API defaults to `evaluationMode: "server"`. Existing SDK consumers that don't pass context will get default values for targeting-dependent flags — this is correct behavior (no context = no targeting can apply). Consumers explicitly using client-side plugins should set `evaluationMode: "client"`.
- **No database changes:** Segment-based targeting rules use the existing `TargetingRule` structure with a special `_segment` attribute sentinel. No Firestore schema migration needed.
- **Cost impact:** Server mode adds evaluation computation per request but eliminates CDN caching. For most startup-scale usage (< 10K requests/hour), this stays within free tier since the 30s private cache still reduces actual function invocations significantly.
- **Rollout consistency:** The same hash function is used server-side and client-side, so a user bucketed at 30% in server mode will also be bucketed at 30% if the consumer switches to client mode. This prevents flip-flopping during migration.
- **Tree-shaking:** `autoContext()` is a standalone export — consumers who don't use it won't include browser detection logic in their bundles. Server-mode SDK skips plugin registration entirely, reducing bundle size.
