# Implementation Plan: SDK Client Auth Redesign

## Overview

This plan implements the redesigned `@jewel998/config` SDK with clientId-based authentication, replacing the current `createConfigClient` pattern. The implementation covers the SDK internals (types, errors, events, cache, retry, fetchers, loading strategies, entry point), the Cloud Function backend (`getConfig`), Firestore security rules, and Portal management functions. Tasks are ordered so each step builds on previous work, with no orphaned code.

## Tasks

- [x] 1. Define core types, interfaces, and error classes
  - [x] 1.1 Create SDK type definitions and interfaces
  - [x] 1.2 Create error classes module
  - [ ]* 1.3 Write unit tests for error classes

- [x] 2. Implement event system
  - [x] 2.1 Create TypedEventEmitter
  - [ ]* 2.2 Write unit tests for EventEmitter
  - [ ]* 2.3 Write property test for event ordering

- [x] 3. Implement cache layer with TTL support
  - [x] 3.1 Create CacheStorage interface and memoryStorage adapter
  - [x] 3.2 Create browserStorage adapter
  - [ ]* 3.3 Write unit tests for cache adapters
  - [ ]* 3.4 Write property test for cache consistency

- [x] 4. Implement retry engine
  - [x] 4.1 Create RetryEngine with exponential backoff
  - [ ]* 4.2 Write unit tests for retry engine

- [x] 5. Implement HTTP transport and fetch modules
  - [x] 5.1 Create HttpTransport
  - [x] 5.2 Create batch fetcher
  - [x] 5.3 Create projected fetcher with microtask batching
  - [ ]* 5.4 Write unit tests for fetchers

- [x] 6. Checkpoint - Core modules complete

- [x] 7. Implement loading strategies
  - [x] 7.1 Implement optimistic loading strategy
  - [x] 7.2 Implement pessimistic loading strategy
  - [x] 7.3 Implement deferred loading strategy
  - [ ]* 7.4 Write unit tests for loading strategies
  - [ ]* 7.5 Write property test for idempotent reads

- [x] 8. Implement ConfigClient and createConfig entry point
  - [x] 8.1 Create ConfigClient implementation
  - [x] 8.2 Create createConfig entry point
  - [x] 8.3 Update package exports (index.ts)
  - [ ]* 8.4 Write unit tests for createConfig
  - [ ]* 8.5 Write property test for scope isolation

- [x] 9. Checkpoint - SDK implementation complete

- [x] 10. Implement Cloud Function: getConfig endpoint
  - [x] 10.1 Create getConfig HTTP Cloud Function
  - [x] 10.2 Implement rate limiting utility
  - [x] 10.3 Implement origin validation utility
  - [ ]* 10.4 Write unit tests for getConfig Cloud Function
  - [ ]* 10.5 Write property test for revocation propagation

- [x] 11. Implement Portal management Cloud Functions
  - [x] 11.1 Create clientId management functions
  - [x] 11.2 Update project functions (remove tenant dependency)
  - [x] 11.3 Update environment functions (add allowedDomains)
  - [ ]* 11.4 Write unit tests for Portal management functions

- [x] 12. Update Firestore security rules and indexes
  - [x] 12.1 Write new Firestore security rules
  - [x] 12.2 Update Firestore indexes

- [x] 13. Implement Portal UI updates (clientId management)
  - [x] 13.1 Remove tenant routes and add clientId management UI
  - [x] 13.2 Update Portal auth and project access

- [x] 14. Final checkpoint - Full integration

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript throughout (matching the design document)
- The existing `createConfigClient` is kept as deprecated during Phase 1 migration (v0.2.0)
- SDK is browser-only — server-side checks are enforced at initialization

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.1"] },
    { "id": 3, "tasks": ["3.3", "3.4", "4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["7.4", "7.5", "8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["8.3", "8.4", "8.5"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 10, "tasks": ["10.4", "10.5", "11.1", "11.2", "11.3"] },
    { "id": 11, "tasks": ["11.4", "12.1", "12.2"] },
    { "id": 12, "tasks": ["13.1", "13.2"] }
  ]
}
```
