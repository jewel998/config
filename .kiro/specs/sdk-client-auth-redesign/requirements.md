# Requirements Document

## Introduction

This document specifies the requirements for redesigning the `@jewel998/config` SDK authentication and initialization model. The current SDK uses a manual `createConfigClient` pattern with explicit definitions, storage adapters, and remote providers. The redesign introduces a `clientId`-based access model where each SDK instance authenticates via a project+environment-scoped API key (clientId), removing the need for end-user authentication in consuming applications. The SDK is browser-only and leverages Firebase's built-in domain origin enforcement for security.

The data model is simplified: the previous tenant+project hierarchy is collapsed into a single `Project → Environments → Published Configs` structure.

## Glossary

- **SDK**: The `@jewel998/config` npm package consumed by frontend applications to read configuration values (browser-only, not for server-side use)
- **Portal**: The React admin web application (`apps/portal`) used by developers to manage projects, environments, and config values
- **Client_Application**: A frontend browser application that integrates the SDK to read configuration values at runtime
- **ClientId**: A unique string token generated in the Portal, scoped to a specific project+environment combination, used by the SDK to authenticate and restrict access. Public by design (same model as Firebase API keys — visible in client bundles but domain-restricted)
- **Project**: A logical grouping of configuration (e.g., "dashboard", "billing-service"). Previously called "tenant" — tenants and projects are unified into a single concept
- **Environment**: A deployment stage within a project (e.g., "development", "staging", "production"), with its own allowed domains list
- **Loading_Strategy**: The initialization behavior that determines when and how config values are fetched from the remote source
- **Fetch_Granularity**: The level at which config values are retrieved — batch (all keys at once) or projected (only requested keys)
- **Config_Store**: The Firestore-backed remote data store that holds published configuration values
- **Portal_User**: A developer or team member who accesses the Portal to manage configurations
- **Allowed_Domains**: A list of domains configured per environment that are permitted to access config via the clientId. Firebase's origin enforcement + CORS prevent unauthorized browser access

## Requirements

### Requirement 1: ClientId-Based SDK Initialization (Browser-Only)

**User Story:** As a frontend developer, I want to initialize the SDK with only a clientId in my browser application, so that my app can access its project's configs without managing user authentication credentials.

#### Acceptance Criteria

1. WHEN a Client_Application calls the SDK initialization function with a valid clientId from an allowed domain, THE SDK SHALL establish a connection to the Config_Store scoped to the project and environment associated with that clientId.
2. WHEN a Client_Application calls the SDK initialization function without a clientId, THE SDK SHALL throw a descriptive error indicating that a clientId is required.
3. WHEN a Client_Application calls the SDK initialization function with an invalid or revoked clientId, THE SDK SHALL throw an authentication error with a message indicating the clientId is not recognized.
4. THE SDK SHALL NOT require end-user authentication credentials (such as email, password, or OAuth tokens) for initialization.
5. THE SDK SHALL only support browser environments. Server-side (Node.js) usage is not supported.
6. THE SDK SHALL log an "[Alpha]" prefix in the console during initialization to indicate the product's development stage.

### Requirement 2: Environment-Scoped ClientId Generation

**User Story:** As a Portal_User, I want to generate a clientId for a specific project and environment combination, so that each deployment stage has isolated access to its own configuration.

#### Acceptance Criteria

1. WHEN a Portal_User requests a new clientId for a project and environment, THE Portal SHALL generate a unique clientId that is bound to that specific project+environment combination.
2. WHEN a Portal_User generates a clientId for project "dashboard" in environment "staging", THE SDK initialized with that clientId SHALL only access configuration values belonging to project "dashboard" in environment "staging".
3. WHEN a Portal_User revokes a clientId, THE system SHALL reject all subsequent requests using that clientId within 60 seconds of revocation.
4. WHEN a Portal_User needs to rotate a clientId, THEY SHALL manually revoke the old one and generate a new one via the Portal.

### Requirement 3: Domain Allowlisting Per Environment

**User Story:** As a Portal_User, I want to configure allowed domains per environment, so that only my authorized frontend applications can access the config from those domains.

#### Acceptance Criteria

1. WHEN a Portal_User creates or edits an environment, THE Portal SHALL allow configuring a list of allowed domains for that environment.
2. WHEN a Client_Application makes a request from a domain not in the environment's allowed list, THE system SHALL reject the request.
3. WHEN a Portal_User adds `localhost` or `127.0.0.1` to an environment's allowed domains, THE Portal SHALL display a visible warning indicating that localhost domains reduce security and should only be used for development environments.
4. THE system SHALL support multiple allowed domains per environment (e.g., `app.example.com`, `beta.example.com`).
5. THE system SHALL leverage Firebase's built-in authorized domains and CORS enforcement to prevent browser-based requests from unauthorized origins.

### Requirement 4: Portal User Authentication and Project Access Control

**User Story:** As a Portal_User, I want to sign in to the Portal with my Google account and only access projects I'm authorized for, so that configuration management is secure.

#### Acceptance Criteria

1. WHEN a Portal_User navigates to the Portal, THE Portal SHALL offer Google sign-in via Firebase Authentication.
2. WHEN a Portal_User successfully authenticates, THE Portal SHALL grant access only to projects that the Portal_User has been explicitly authorized to access (invitation-based).
3. WHEN an unauthenticated user attempts to access any Portal route, THE Portal SHALL redirect to the login page.
4. WHEN a Portal_User attempts to access a project they are not authorized for, THE Portal SHALL display an access denied message and prevent data retrieval.

### Requirement 5: Optimistic Loading Strategy

**User Story:** As a developer, I want the SDK to initialize instantly with cached or default values and sync remotely in the background, so that my application starts without blocking on network requests.

#### Acceptance Criteria

1. WHEN the SDK is initialized with the optimistic loading strategy, THE SDK SHALL return a ready client immediately using locally cached values (if within TTL) or config definition defaults.
2. AFTER returning the ready client, THE SDK SHALL fetch the latest values from the Config_Store in the background.
3. WHEN background fetch completes successfully, THE SDK SHALL update the local cache with the fetched values and emit an `updated` event.
4. IF the background fetch fails, THEN THE SDK SHALL continue operating with cached or default values and emit a `fetchError` event with error details.
5. THE SDK SHALL use configurable retry policy for the background fetch. Default is exponential backoff (3 retries, starting at 1s).

### Requirement 6: Pessimistic Loading Strategy

**User Story:** As a developer, I want the SDK to block initialization until remote values are fetched, so that my application always starts with the most current configuration.

#### Acceptance Criteria

1. WHEN the SDK is initialized with the pessimistic loading strategy, THE SDK SHALL return a Promise that resolves only after all config values are fetched from the Config_Store.
2. WHEN the remote fetch completes successfully, THE SDK SHALL resolve with a ready client populated with the fetched values and cache them locally.
3. IF the remote fetch fails after retries are exhausted, THEN THE SDK SHALL reject the Promise with a typed `InitializationError` containing the failure reason.
4. THE SDK SHALL timeout pessimistic initialization after a configurable duration (default: 10 seconds) and reject with a `TimeoutError`.
5. THE SDK SHALL use configurable retry policy. Default is exponential backoff (3 retries, starting at 1s).

### Requirement 7: Deferred Loading Strategy

**User Story:** As a developer, I want the SDK to start immediately with no config loaded and fetch values lazily on first access, so that my application avoids upfront network cost entirely.

#### Acceptance Criteria

1. WHEN the SDK is initialized with the deferred loading strategy, THE SDK SHALL return a ready client immediately without fetching any values from the Config_Store.
2. WHEN a Client_Application requests a config value for the first time in deferred mode, THE SDK SHALL fetch from the Config_Store at that point and return a Promise.
3. WHEN a config value has been previously fetched and is within cache TTL, THE SDK SHALL return the cached value without additional remote calls.
4. IF a deferred fetch fails for a specific key, THEN THE SDK SHALL return the default value (if defined) and emit a `fetchError` event.
5. WHEN using batch granularity in deferred mode, THE first access to ANY key SHALL trigger a batch fetch of ALL config for the project+environment.
6. WHEN using projected granularity in deferred mode, THE SDK SHALL fetch only the specific requested key(s).

### Requirement 8: Batch Fetch Granularity (Default)

**User Story:** As a developer, I want the SDK to fetch all config values for my project and environment in a single request by default, so that network overhead is minimized.

#### Acceptance Criteria

1. WHEN the SDK is configured with batch fetch granularity (or no explicit choice), THE SDK SHALL retrieve all published config values for the scoped project+environment in a single request.
2. THE SDK SHALL use batch fetch granularity as the default when no fetch granularity is explicitly specified.
3. WHEN batch fetch completes, THE SDK SHALL populate the local cache with all retrieved values in a single operation.

### Requirement 9: Projected Fetch Granularity

**User Story:** As a developer, I want to configure the SDK to fetch only specific config keys on demand, so that I can reduce payload size for applications that use a small subset of available configs.

#### Acceptance Criteria

1. WHEN the SDK is configured with projected fetch granularity, THE SDK SHALL fetch only the specific keys requested by the Client_Application.
2. WHEN multiple keys are requested within the same microtask/tick, THE SDK SHALL batch those keys into a single request to the Config_Store.
3. WHEN a key is fetched in projected mode, THE SDK SHALL cache the fetched value locally for subsequent access (subject to TTL).

### Requirement 10: Server-Side ClientId Validation and Access Enforcement

**User Story:** As a system administrator, I want the server to validate each clientId and enforce project+environment scoping, so that one application cannot read another project's configuration data.

#### Acceptance Criteria

1. WHEN a read request arrives with a clientId, THE system SHALL verify that the clientId exists, is active, and the request origin matches the environment's allowed domains.
2. WHEN a valid clientId is used from an allowed domain, THE system SHALL return only the config data for the project+environment bound to that clientId.
3. IF a request is made with a clientId for data outside its bound scope, THEN THE system SHALL return a 403 Forbidden error.
4. IF a request is made with an invalid or revoked clientId, THEN THE system SHALL return a 401 Unauthorized error.
5. THE system SHALL enforce rate limiting per clientId (configurable, default: 100 requests/minute).

### Requirement 11: SDK Cache Persistence

**User Story:** As a developer, I want config values to be cached locally with a TTL, so that my application can function during network outages and start quickly on return visits.

#### Acceptance Criteria

1. THE SDK SHALL support pluggable cache storage adapters implementing the `CacheStorage` interface: `get<T>(key)`, `set<T>(key, value, ttl?)`, `delete(key)`, `clear()`.
2. WHEN config values are fetched from the Config_Store, THE SDK SHALL persist them to the configured cache with a TTL of 7 days (default, configurable).
3. WHEN the SDK reads a cached value whose TTL has expired, THE SDK SHALL treat it as a cache miss and fetch from remote.
4. WHEN a newer remote value is fetched, THE SDK SHALL overwrite the existing cached value and reset its TTL.
5. THE SDK SHALL provide built-in adapters: `memoryStorage()` (default) and `browserStorage()` (localStorage-backed).

### Requirement 12: SDK Event System

**User Story:** As a developer, I want to subscribe to SDK lifecycle events, so that I can react to config updates, errors, and state changes in my application.

#### Acceptance Criteria

1. THE SDK SHALL expose an `on(event, callback)` method for subscribing to events.
2. THE SDK SHALL expose an `off(event, callback)` method for unsubscribing from events.
3. THE SDK SHALL emit the following events:
   - `ready` — when initialization completes (all strategies)
   - `updated` — when cached values are updated from a background fetch
   - `fetchError` — when a remote fetch fails, with error details
   - `revoked` — when the clientId is detected as revoked mid-session
4. Event callbacks SHALL receive a typed payload object specific to the event type.

### Requirement 13: Data Model (Simplified Hierarchy)

**User Story:** As a Portal_User, I want a simple project → environments → configs hierarchy, so that I can manage my configuration without unnecessary complexity.

#### Acceptance Criteria

1. THE system SHALL use a flat hierarchy: `Projects → Environments → Published Configs`.
2. THE previous "tenant" concept SHALL be removed. Projects are the top-level entity.
3. Each Project SHALL have an owner (the creating Portal_User) and a list of authorized Portal_Users.
4. Each Environment within a Project SHALL have: a name, a list of allowed domains, and one or more clientIds.
5. Published Configs SHALL be key-value pairs scoped to a specific project+environment, with a version identifier.

## Non-Functional Requirements

### Performance

- SDK initialization in optimistic/deferred mode SHALL complete in under 5ms (excluding network).
- Pessimistic mode SHALL timeout after a configurable duration (default 10s).
- SDK bundle size SHALL remain under 15KB gzipped (excluding Firebase dependency).

### Security

- ClientId is public (visible in browser source) — security relies on Firebase origin enforcement + domain allowlisting.
- Domain validation prevents cross-site config reads in browser environments.
- Rate limiting protects against abuse (default 100 req/min per clientId).

### Reliability

- Configurable retry policy (default: exponential backoff, 3 retries, base 1s).
- 7-day cache TTL ensures offline resilience.
- Graceful degradation to defaults on network failure.
