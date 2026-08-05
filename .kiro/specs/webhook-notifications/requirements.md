# Requirements Document

## Introduction

This feature adds webhook notifications to the Config Portal, enabling users to receive real-time notifications (e.g., to Slack, Discord, or custom HTTP endpoints) when configuration changes occur within their projects. The system leverages Firebase Cloud Functions with a Firestore trigger on audit log entries, eliminating the need for a custom server. Webhook configurations are stored per-project in Firestore, and users can filter which events trigger notifications to minimize unnecessary HTTP calls.

## Glossary

- **Portal**: The client-side React SPA that serves as the Config Portal user interface
- **Cloud_Function**: A Firebase Cloud Function (v2, Node.js runtime) that executes server-side logic in response to Firestore triggers
- **Webhook**: An HTTP POST callback configured by a user to receive notifications at a specified URL when matching events occur
- **Webhook_Configuration**: A Firestore document at `projects/{projectId}/webhooks/{webhookId}` storing the endpoint URL, filters, and settings for a single webhook
- **Audit_Entry**: A Firestore document at `projects/{projectId}/audit_log/{entryId}` containing fields: actorId, timestamp, action, resourcePath, oldValue, newValue
- **Delivery_Log**: A subcollection at `projects/{projectId}/webhooks/{webhookId}/deliveries/{deliveryId}` storing the result of each webhook dispatch attempt
- **Event_Type**: One of the audit actions: create, update, delete, state_change
- **Resource_Category**: One of: config, segment, api_key, project, team, environment
- **Webhook_Payload**: A standardized JSON object sent to webhook endpoints containing action, resource, actor, timestamp, and change details
- **Slack_Block_Kit**: A Slack-specific JSON message format that renders rich, structured messages in Slack channels
- **Admin**: A project member with the "admin" role as determined by the useRBAC hook (includes project owners)
- **Filter**: A set of criteria (event types, resource categories, environments) that determines which audit events trigger a webhook

## Requirements

### Requirement 1: Webhook Creation

**User Story:** As a project admin, I want to add a new webhook endpoint to my project, so that I can receive notifications when changes happen.

#### Acceptance Criteria

1. WHEN an Admin submits a valid webhook URL and name, THE Portal SHALL create a Webhook_Configuration document in Firestore at `projects/{projectId}/webhooks/{webhookId}`
2. THE Portal SHALL validate that the webhook URL uses HTTPS protocol before allowing creation
3. THE Portal SHALL store the following fields in each Webhook_Configuration: name, url, enabled (boolean), eventTypes (array), resourceCategories (array), environments (array), format (standard or slack), createdAt, updatedAt
4. IF the project already has 10 Webhook_Configurations, THEN THE Portal SHALL display an error message indicating the maximum limit has been reached
5. THE Portal SHALL set the enabled field to true by default when creating a new Webhook_Configuration

### Requirement 2: Webhook Editing

**User Story:** As a project admin, I want to edit existing webhook configurations, so that I can update URLs, filters, or format settings as my needs change.

#### Acceptance Criteria

1. WHEN an Admin modifies a Webhook_Configuration and saves, THE Portal SHALL update the corresponding Firestore document with the new values and set updatedAt to the current timestamp
2. THE Portal SHALL allow editing of: name, url, eventTypes, resourceCategories, environments, and format fields
3. THE Portal SHALL validate that the updated URL uses HTTPS protocol before saving

### Requirement 3: Webhook Enable/Disable

**User Story:** As a project admin, I want to enable or disable a webhook without deleting it, so that I can temporarily pause notifications.

#### Acceptance Criteria

1. WHEN an Admin toggles the enabled state of a Webhook_Configuration, THE Portal SHALL update the enabled field in the corresponding Firestore document
2. WHILE a Webhook_Configuration has enabled set to false, THE Cloud_Function SHALL skip dispatching to that webhook endpoint

### Requirement 4: Webhook Deletion

**User Story:** As a project admin, I want to delete a webhook I no longer need, so that I can keep my project's webhook list clean.

#### Acceptance Criteria

1. WHEN an Admin confirms deletion of a Webhook_Configuration, THE Portal SHALL delete the corresponding Firestore document and its Delivery_Log subcollection
2. THE Portal SHALL require a confirmation step before deleting a Webhook_Configuration

### Requirement 5: Event Filtering by Event Type

**User Story:** As a project admin, I want to filter which event types trigger a webhook, so that I only receive notifications for relevant actions.

#### Acceptance Criteria

1. THE Portal SHALL allow Admins to select zero or more Event_Types (create, update, delete, state_change) for each Webhook_Configuration
2. WHEN a Webhook_Configuration has an empty eventTypes array, THE Cloud_Function SHALL treat the webhook as matching all Event_Types
3. WHEN a Webhook_Configuration has a non-empty eventTypes array, THE Cloud_Function SHALL dispatch only for Audit_Entries whose action field matches one of the configured Event_Types

### Requirement 6: Event Filtering by Resource Category

**User Story:** As a project admin, I want to filter webhooks by resource category, so that I only get notified about changes to specific resource types.

#### Acceptance Criteria

1. THE Portal SHALL allow Admins to select zero or more Resource_Categories (config, segment, api_key, project, team, environment) for each Webhook_Configuration
2. WHEN a Webhook_Configuration has an empty resourceCategories array, THE Cloud_Function SHALL treat the webhook as matching all Resource_Categories
3. WHEN a Webhook_Configuration has a non-empty resourceCategories array, THE Cloud_Function SHALL dispatch only for Audit_Entries whose resourcePath resolves to a matching Resource_Category

### Requirement 7: Event Filtering by Environment

**User Story:** As a project admin, I want to filter webhooks by environment, so that I only receive notifications for production changes (or another specific environment).

#### Acceptance Criteria

1. THE Portal SHALL allow Admins to select zero or more environment names for each Webhook_Configuration
2. WHEN a Webhook_Configuration has an empty environments array, THE Cloud_Function SHALL treat the webhook as matching all environments
3. WHEN a Webhook_Configuration has a non-empty environments array, THE Cloud_Function SHALL dispatch only for Audit_Entries whose resourcePath contains a matching environment name
4. WHEN an Audit_Entry's resourcePath does not contain an environment segment, THE Cloud_Function SHALL treat that entry as matching all environment filters

### Requirement 8: Webhook Payload Structure

**User Story:** As a developer integrating with the webhook, I want a standardized JSON payload, so that I can reliably parse notification data.

#### Acceptance Criteria

1. THE Cloud_Function SHALL send a JSON payload containing: action (string), resourceCategory (string), resourcePath (string), resourceName (string), environment (string or null), actorId (string), timestamp (ISO 8601 string), oldValue (object or null), newValue (object or null), projectId (string), webhookId (string)
2. THE Cloud_Function SHALL set the Content-Type header to "application/json" for all webhook HTTP requests
3. THE Cloud_Function SHALL include an X-Webhook-Id header containing the webhookId in each request
4. THE Cloud_Function SHALL include an X-Webhook-Timestamp header containing the dispatch timestamp as a Unix epoch in each request

### Requirement 9: Slack Block Kit Formatting

**User Story:** As a user who sends notifications to Slack, I want a pre-formatted Slack message, so that notifications render as rich messages without custom middleware.

#### Acceptance Criteria

1. WHEN a Webhook_Configuration has format set to "slack", THE Cloud_Function SHALL format the payload as a Slack Block Kit message with sections for action, resource, actor, and a summary of changes
2. WHEN a Webhook_Configuration has format set to "slack", THE Cloud_Function SHALL set the Content-Type header to "application/json" and structure the body with a "blocks" array conforming to Slack Block Kit specification
3. WHEN a Webhook_Configuration has format set to "standard", THE Cloud_Function SHALL send the raw JSON payload as defined in Requirement 8

### Requirement 10: Test Webhook Delivery

**User Story:** As a project admin, I want to send a test payload to my webhook URL, so that I can verify the endpoint is reachable and working before relying on it.

#### Acceptance Criteria

1. WHEN an Admin clicks the "Send Test" button for a Webhook_Configuration, THE Portal SHALL invoke a callable Cloud_Function that dispatches a sample payload to the configured URL
2. THE Cloud_Function SHALL use a clearly marked test payload containing sample data with a "test" flag set to true
3. WHEN the test dispatch receives an HTTP 2xx response, THE Portal SHALL display a success indicator to the Admin
4. WHEN the test dispatch receives a non-2xx response or times out, THE Portal SHALL display the HTTP status code or timeout error to the Admin

### Requirement 11: Cloud Function Dispatch Logic

**User Story:** As a system operator, I want a single Cloud Function that processes audit log entries and dispatches matching webhooks, so that the system is cost-efficient and maintainable.

#### Acceptance Criteria

1. WHEN a new Audit_Entry document is created at `projects/{projectId}/audit_log/{entryId}`, THE Cloud_Function SHALL read all Webhook_Configurations for that project
2. THE Cloud_Function SHALL evaluate each Webhook_Configuration's filters (eventTypes, resourceCategories, environments) against the Audit_Entry and dispatch only to matching webhooks
3. THE Cloud_Function SHALL set an HTTP request timeout of 10 seconds for each webhook dispatch
4. THE Cloud_Function SHALL dispatch to multiple matching webhooks concurrently using Promise.allSettled
5. IF a webhook dispatch fails due to network error or timeout, THEN THE Cloud_Function SHALL record the failure in the Delivery_Log without retrying

### Requirement 12: Delivery Logging

**User Story:** As a project admin, I want to see the delivery history for each webhook, so that I can diagnose integration issues.

#### Acceptance Criteria

1. WHEN the Cloud_Function dispatches to a webhook endpoint, THE Cloud_Function SHALL create a Delivery_Log entry containing: timestamp, httpStatus (number or null), success (boolean), duration (milliseconds), error (string or null)
2. THE Cloud_Function SHALL retain a maximum of 20 Delivery_Log entries per Webhook_Configuration, deleting the oldest entry when the limit is exceeded
3. THE Portal SHALL display the Delivery_Log entries for each Webhook_Configuration, ordered by timestamp descending
4. THE Portal SHALL display a status indicator (success/failure) for the most recent delivery next to each webhook in the list view

### Requirement 13: Access Control

**User Story:** As a project owner, I want only admins to manage webhooks, so that non-admin members cannot modify notification settings.

#### Acceptance Criteria

1. THE Portal SHALL display the webhook management section only to users whose useRBAC hook returns isAdmin as true
2. WHILE a user's role is not "admin", THE Portal SHALL hide all webhook creation, editing, and deletion controls
3. THE Portal SHALL allow non-admin users to view the webhook list and delivery status in a read-only mode

### Requirement 14: Webhook Management UI

**User Story:** As a project admin, I want a dedicated settings section for managing webhooks, so that I can configure notifications in one place.

#### Acceptance Criteria

1. THE Portal SHALL display a "Webhooks" section within the project settings page
2. THE Portal SHALL display each Webhook_Configuration as a card or row showing: name, URL (partially masked), enabled status, format type, and last delivery status
3. THE Portal SHALL display active event filters as chips on each webhook card showing configured Event_Types, Resource_Categories, and environments
4. WHEN no Webhook_Configurations exist, THE Portal SHALL display an empty state with guidance on creating the first webhook
5. THE Portal SHALL provide inline controls for enabling/disabling, testing, editing, and deleting each webhook
