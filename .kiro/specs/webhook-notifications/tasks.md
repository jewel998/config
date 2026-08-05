# Implementation Plan: Webhook Notifications

## Overview

Implement a webhook notifications system that dispatches real-time HTTP callbacks when configuration changes occur. The system uses design patterns (Strategy, Chain of Responsibility, Factory, Observer, Adapter) to ensure extensibility, testability, and maintainability. Built on Firebase Cloud Functions (v2) triggered by Firestore audit log writes, with a portal UI for admins to manage webhook configurations, filters, and delivery history.

## Tasks

- [ ] 1. Foundation & Pattern Infrastructure
  - [ ] 1.1 Initialize `functions/` directory with Firebase v2, Node.js 20, TypeScript
    - Run `firebase init functions` at monorepo root; configure `functions/package.json` with `engines.node: "20"`, TypeScript compiler, `firebase-functions` v2, and `firebase-admin`
    - Add `functions/` to pnpm workspace in `pnpm-workspace.yaml`
    - Add `functions/tsconfig.json` with strict mode, ES2022 target
    - _Requirements: 11.1_
  - [ ] 1.2 Create shared TypeScript types and pattern interfaces
    - Create `functions/src/types.ts` with interfaces: `WebhookConfig`, `WebhookDelivery`, `WebhookPayload`, `SlackBlockKitMessage`, `EventType`, `WebhookResourceCategory`
    - Define `PayloadFormatter` interface (Strategy pattern): `format(entry, webhook, projectId): unknown` and `contentType: string`
    - Define `WebhookDispatcher` interface (Adapter pattern): `dispatch(url, payload, options): Promise<DispatchResult>`
    - Define `FilterFn` type (Chain of Responsibility): `(webhook, entry) => boolean`
    - Define `DispatchOptions` and `DispatchResult` interfaces
    - Create `apps/portal/src/types/webhook.ts` mirroring the domain types for portal use
    - _Requirements: 8.1, 9.1, 9.2_
  - [ ] 1.3 Create shared utility: `getResourceCategory` and `getEnvironmentFromPath`
    - Create `functions/src/utils/audit-utils.ts` with `getResourceCategory(resourcePath)` that maps paths to resource categories (config, segment, api_key, project, team, environment)
    - Create `getEnvironmentFromPath(resourcePath)` using regex `/environments\/([^/]+)/` to extract environment name
    - Port logic from `apps/portal/src/lib/audit-utils.ts` to ensure consistency
    - _Requirements: 6.3, 7.3, 7.4_
  - [ ] 1.4 Create constants file with limits and defaults
    - Create `functions/src/constants.ts` defining: `MAX_WEBHOOKS = 10`, `MAX_DELIVERIES = 20`, `DISPATCH_TIMEOUT_MS = 10000`, `EVENT_TYPES`, `RESOURCE_CATEGORIES`
    - _Requirements: 1.4, 11.3, 12.2_
  - [ ] 1.5 Create formatter registry infrastructure (Strategy pattern)
    - Create `functions/src/formatters/formatter.interface.ts` exporting the `PayloadFormatter` interface
    - Create `functions/src/formatters/registry.ts` with `formatterRegistry: Record<string, PayloadFormatter>` and `getFormatter(format: string)` lookup function
    - Throw descriptive error for unregistered format names
    - _Requirements: 8.1, 9.1_
  - [ ] 1.6 Create filter pipeline infrastructure (Chain of Responsibility)
    - Create `functions/src/filters/filter.interface.ts` exporting the `FilterFn` type
    - Create `functions/src/filters/pipeline.ts` with `filterPipeline: FilterFn[]` array and `evaluateFilters(webhook, entry)` that runs `pipeline.every()`
    - Pipeline is composable — filters can be added/removed by modifying the array
    - _Requirements: 5.2, 5.3, 6.2, 6.3, 7.2, 7.3_
  - [ ] 1.7 Create dispatcher adapter infrastructure (Adapter pattern)
    - Create `functions/src/dispatcher/dispatcher.interface.ts` exporting `WebhookDispatcher`, `DispatchOptions`, and `DispatchResult`
    - Design for dependency injection so tests can substitute a mock dispatcher
    - _Requirements: 11.3, 8.2_

- [ ] 2. Cloud Function — Core Logic (Pattern Implementations)
  - [ ] 2.1 Implement filter functions for the pipeline (Chain of Responsibility)
    - Create `functions/src/filters/event-type.filter.ts` — returns true if `webhook.eventTypes` is empty or includes `entry.action`
    - Create `functions/src/filters/resource-category.filter.ts` — returns true if `webhook.resourceCategories` is empty or includes derived category
    - Create `functions/src/filters/environment.filter.ts` — returns true if `webhook.environments` is empty, entry has no env segment, or env matches
    - Register all filters in `pipeline.ts` array
    - Each filter is a pure function, independently testable
    - _Requirements: 5.2, 5.3, 6.2, 6.3, 7.2, 7.3, 7.4_
  - [ ] 2.2 Implement standard JSON payload formatter (Strategy)
    - Create `functions/src/formatters/standard.formatter.ts` implementing `PayloadFormatter` interface
    - Returns `WebhookPayload` with all required fields: action, resourceCategory, resourcePath, resourceName, environment, actorId, timestamp, oldValue, newValue, projectId, webhookId
    - Sets `contentType: "application/json"`
    - Register in `formatterRegistry` under key `"standard"`
    - _Requirements: 8.1, 9.3_
  - [ ] 2.3 Implement Slack Block Kit payload formatter (Strategy)
    - Create `functions/src/formatters/slack.formatter.ts` implementing `PayloadFormatter` interface
    - Builds blocks array with header (emoji + action), resource/environment section, action/actor section, changes summary section, and context element
    - Sets `contentType: "application/json"`
    - Register in `formatterRegistry` under key `"slack"`
    - _Requirements: 9.1, 9.2_
  - [ ] 2.4 Implement HTTP dispatcher (Adapter)
    - Create `functions/src/dispatcher/http.dispatcher.ts` implementing `WebhookDispatcher` interface
    - Use `fetch` with `AbortController` for 10-second timeout
    - Set `Content-Type`, `X-Webhook-Id`, and `X-Webhook-Timestamp` headers from `DispatchOptions`
    - Return `DispatchResult { success, httpStatus, duration, error }`
    - Handle network errors, timeouts, and non-2xx responses gracefully
    - _Requirements: 8.2, 8.3, 8.4, 11.3_
  - [ ] 2.5 Implement delivery log writer with 20-entry cap
    - Create `functions/src/delivery/write-delivery-log.ts` with `writeDeliveryLog(projectId, webhookId, result, auditEntryId, isTest)` that writes to `deliveries` subcollection
    - After write, call `enforceDeliveryCap` — query by timestamp ascending, batch-delete oldest entries if count > 20
    - _Requirements: 12.1, 12.2_

- [ ] 3. Cloud Function — Trigger + Callable
  - [ ] 3.1 Implement `onAuditCreated` Firestore trigger
    - Create `functions/src/triggers/on-audit-created.ts` using `onDocumentCreated("projects/{projectId}/audit_log/{entryId}")`
    - Compose pattern pipeline: read webhooks → filter via `evaluateFilters` (Chain of Responsibility) → format via `getFormatter` (Strategy) → dispatch via `dispatcher` (Adapter) → write delivery logs
    - Use `Promise.allSettled` for concurrent dispatch to all matching webhooks
    - Accept dispatcher as parameter for dependency injection (defaults to `httpDispatcher`)
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 3.2_
  - [ ] 3.2 Implement `testWebhook` callable function
    - Create `functions/src/callables/test-webhook.ts` using `onCall` with input `{ projectId, webhookId }`
    - Verify admin role, read webhook config, use formatter registry for sample payload with `test: true`
    - Dispatch via adapter interface with 10s timeout
    - Write delivery log with `isTest: true`
    - Return `{ success, httpStatus, error }` to caller
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ] 3.3 Create `functions/src/index.ts` entry point exporting all functions
    - Export `onAuditCreated` and `testWebhook` from the main entry point
    - Export the default `httpDispatcher` instance for production use
    - _Requirements: 11.1_

- [ ] 4. Portal — Hooks (Factory Pattern)
  - [ ] 4.1 Create `useWebhooks` hook for real-time webhook list (Observer)
    - Create `apps/portal/src/hooks/use-webhooks.ts` with Firestore `onSnapshot` subscription to `projects/{projectId}/webhooks` collection
    - Implements Observer pattern via Firestore real-time listener
    - Return `{ data: WebhookConfig[], isLoading, error }`
    - _Requirements: 14.2, 14.4_
  - [ ] 4.2 Create `createWebhookMutation` factory function
    - Create `apps/portal/src/hooks/use-webhook-mutations.ts` with a `createWebhookMutation<TParams>` factory modeled after existing `createConfigFieldMutation`
    - Factory accepts: `mutationFn`, `invalidateKeys`, `toastSuccess`, `toastError`
    - Generated hooks include: auth check, Firestore operation, query invalidation, and sonner toast feedback
    - Eliminates boilerplate duplication across create/update/delete/toggle hooks
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - [ ] 4.3 Generate CRUD mutation hooks via factory
    - Use `createWebhookMutation` to generate: `useCreateWebhook` (validates HTTPS, checks 10-limit, sets enabled=true, sets timestamps), `useUpdateWebhook` (validates HTTPS, updates `updatedAt`), `useDeleteWebhook` (deletes document + deliveries subcollection), `useToggleWebhook` (optimistic toggle of `enabled` field)
    - All hooks invalidate `["webhooks", projectId]` query key
    - Export all from `use-webhook-mutations.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 4.1_
  - [ ] 4.4 Create `useTestWebhook` hook
    - Create `apps/portal/src/hooks/use-test-webhook.ts` that invokes the `testWebhook` callable Cloud Function via `httpsCallable`
    - Display success/failure indicator via sonner toast based on response
    - _Requirements: 10.1, 10.3, 10.4_
  - [ ] 4.5 Create `useWebhookDeliveries` hook (Observer)
    - Create `apps/portal/src/hooks/use-webhook-deliveries.ts` with Firestore `onSnapshot` on `deliveries` subcollection ordered by `timestamp` descending
    - Implements Observer pattern for real-time delivery status updates
    - _Requirements: 12.3_

- [ ] 5. Portal — Components
  - [ ] 5.1 Create `WebhookSettings` component
    - Create `apps/portal/src/components/webhook-settings.tsx` as the main section rendered in project settings
    - Show webhook list via `useWebhooks`, display empty state when no webhooks exist, include "Add Webhook" button (admin-only)
    - Gate admin-only controls behind `useRBAC().isAdmin`; show read-only list for non-admins
    - _Requirements: 14.1, 14.4, 13.1, 13.2, 13.3_
  - [ ] 5.2 Create `WebhookCard` component
    - Create `apps/portal/src/components/webhook-card.tsx` displaying: name, masked URL, enabled toggle, format badge, filter chips (event types, resource categories, environments), last delivery status indicator
    - Include inline action buttons: Test, Edit, Delete (admin-only)
    - _Requirements: 14.2, 14.3, 14.5, 12.4_
  - [ ] 5.3 Create `WebhookFormModal` component
    - Create `apps/portal/src/components/webhook-form-modal.tsx` as a Radix/shadcn Dialog
    - Fields: name (text input), URL (text input with HTTPS validation via Zod), format (select: standard/slack), event types (checkbox group), resource categories (checkbox group), environments (multi-select from project environments)
    - Support both create and edit modes (pre-fill fields in edit mode)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 5.1, 6.1, 7.1_
  - [ ] 5.4 Create `WebhookDeliveryLog` component
    - Create `apps/portal/src/components/webhook-delivery-log.tsx` as an expandable panel/accordion
    - Display list of deliveries: timestamp, success/failure badge, HTTP status, duration, error message (if any), test indicator
    - Use `useWebhookDeliveries` hook (Observer pattern), ordered by timestamp descending
    - _Requirements: 12.3, 12.4_

- [ ] 6. Portal — Integration
  - [ ] 6.1 Wire `WebhookSettings` into the project settings page
    - Import and render `WebhookSettings` component in the existing project settings page/layout
    - Add "Webhooks" tab/section to settings navigation if applicable
    - _Requirements: 14.1_
  - [ ] 6.2 Add confirmation dialog for webhook deletion
    - Use existing shadcn AlertDialog pattern for delete confirmation before invoking factory-generated `useDeleteWebhook`
    - _Requirements: 4.2_
  - [ ] 6.3 Add lingui i18n translations for webhook UI strings
    - Add translation keys for all user-facing strings: labels, button text, empty state messages, error messages, toast messages
    - _Requirements: 14.1, 14.4_

- [ ] 7. Testing
  - [ ] 7.1 Unit tests for filter pipeline (Chain of Responsibility)
    - Test each filter function independently: `eventTypeFilter`, `resourceCategoryFilter`, `environmentFilter`
    - Test with empty filter arrays (match all), matching values, non-matching values
    - Test entries without environment segment in resourcePath
    - Test pipeline composition via `evaluateFilters` — verify short-circuit behavior
    - _Requirements: 5.2, 5.3, 6.2, 6.3, 7.2, 7.3, 7.4_
  - [ ] 7.2 Unit tests for payload formatters (Strategy)
    - Test `standardFormatter.format()` produces correct JSON structure with all required fields
    - Test `slackFormatter.format()` produces valid Slack Block Kit with header, sections, and context
    - Test `getFormatter()` throws for unregistered format names
    - Test formatter registry extensibility (add mock formatter, verify it's callable)
    - _Requirements: 8.1, 9.1, 9.2_
  - [ ] 7.3 Unit tests for HTTP dispatcher (Adapter)
    - Test `httpDispatcher.dispatch()` with successful response — verify DispatchResult fields
    - Test timeout handling — verify AbortController fires and error is captured
    - Test network error — verify graceful failure with null httpStatus
    - Test that a mock dispatcher implementing `WebhookDispatcher` interface is injectable
    - _Requirements: 8.2, 8.3, 8.4, 11.3_
  - [ ] 7.4 Unit tests for delivery log cap enforcement
    - Test `enforceDeliveryCap` deletes oldest entries when subcollection exceeds 20 documents
    - Test cap is not enforced when count ≤ 20
    - _Requirements: 12.2_
  - [ ] 7.5 Unit tests for portal components and factory
    - Test `createWebhookMutation` factory generates hooks with correct invalidation keys and toast messages
    - Test `WebhookFormModal` URL validation rejects HTTP, accepts HTTPS
    - Test `WebhookFormModal` shows error when 10 webhooks exist
    - Test `WebhookCard` renders enabled/disabled state, filter chips, and delivery status
    - Test `WebhookDeliveryLog` displays entries in descending order
    - _Requirements: 1.2, 1.4, 14.2, 14.3, 12.3_
  - [ ] 7.6 Integration tests for Cloud Functions
    - Test full trigger → filter pipeline → formatter → dispatcher → delivery log flow using Firebase Emulator Suite
    - Test filter combinations with various audit entry shapes
    - Test formatter selection (configure webhooks with different formats, verify payload shapes)
    - Test delivery log cap with 25+ dispatches verifying only 20 remain
    - Test `testWebhook` callable delivers sample payload with `test: true`
    - Inject mock dispatcher to verify adapter pattern works in integration
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 10.1, 10.2, 12.2_

- [ ] 8. Final checkpoint
  - [ ] 8.1 Verify all tests pass and functions deploy successfully
    - Run `pnpm test` in functions and portal packages
    - Run `firebase deploy --only functions` to verify deployment
    - Verify no TypeScript errors across the monorepo
    - Verify formatter registry contains all expected formatters
    - Verify filter pipeline contains all expected filters
    - _Requirements: All_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3", "1.4"],
      "description": "Project setup and shared types"
    },
    {
      "id": 1,
      "tasks": ["1.5", "1.6", "1.7"],
      "description": "Pattern infrastructure (Strategy registry, Filter pipeline, Adapter interface)"
    },
    {
      "id": 2,
      "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"],
      "description": "Core implementations (filters, formatters, dispatcher, delivery)"
    },
    {
      "id": 3,
      "tasks": ["3.1", "3.2", "3.3", "4.1", "4.2"],
      "description": "Cloud Function triggers + Portal mutation factory"
    },
    {
      "id": 4,
      "tasks": ["4.3", "4.4", "4.5"],
      "description": "Factory-generated hooks + observer hooks"
    },
    {
      "id": 5,
      "tasks": ["5.1", "5.2", "5.3", "5.4"],
      "description": "UI components"
    },
    {
      "id": 6,
      "tasks": ["6.1", "6.2", "6.3"],
      "description": "Portal integration"
    },
    {
      "id": 7,
      "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"],
      "description": "Testing (pattern-aware)"
    },
    { "id": 8, "tasks": ["8.1"], "description": "Final verification" }
  ]
}
```

## Notes

- **Extensibility via patterns:** Adding a new webhook format (e.g., Discord, Microsoft Teams) requires only: (1) a new file implementing `PayloadFormatter`, (2) one line adding it to `formatterRegistry`. Zero changes to dispatch logic.
- **Adding new filters:** A new filter criterion (e.g., actor-based filtering) requires only: (1) a new `FilterFn` implementation, (2) one line adding it to `filterPipeline`. Zero changes to evaluation logic.
- **Dispatcher swaps:** Replacing HTTP dispatch with queue-based dispatch (e.g., Cloud Tasks for retry support) requires only a new `WebhookDispatcher` implementation — no changes to the trigger or formatting code.
- **Factory consistency:** All webhook CRUD hooks use the same factory, ensuring uniform error handling, toast messages, and cache invalidation patterns across the entire webhook management UI.
- **Testing isolation:** Each pattern boundary is a natural seam for mocking — formatters, filters, and dispatchers can all be tested in complete isolation.
