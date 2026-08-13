# Webhooks

<div v-pre>

Webhooks deliver real-time HTTP notifications when configuration changes occur in your project. Configure endpoints for Slack, Discord, Google Chat, Microsoft Teams, or any custom HTTP endpoint.

## Overview

When any change happens in the portal (config created, targeting rule updated, flag deleted), the system:

1. Writes an audit log entry
2. Evaluates all active webhooks against their filters
3. Formats the payload according to the webhook's configured format
4. Dispatches HTTP POST requests to matching endpoints
5. Logs the delivery result (success/failure)

## Setup

1. Go to **Settings** → **Webhooks** in the portal
2. Click **Add Webhook**
3. Enter: name, HTTPS URL, format, and filters
4. Click **Send Test** to verify the endpoint
5. Save

## Supported Formats

| Format        | Description                          | Content-Type     |
| ------------- | ------------------------------------ | ---------------- |
| `standard`    | Plain JSON payload                   | application/json |
| `slack`       | Slack Block Kit message              | application/json |
| `discord`     | Discord embed message                | application/json |
| `google-chat` | Google Chat Cards v2                 | application/json |
| `ms-teams`    | Microsoft Teams Adaptive Card        | application/json |
| `custom`      | User-defined template with variables | application/json |

## Custom Template Variables

When using the `custom` format, you can write a message template using `{{variable}}` syntax. The system interpolates variables at delivery time.

### Available Variables

| Variable                | Description                               | Example value                                |
| ----------------------- | ----------------------------------------- | -------------------------------------------- |
| `{{action}}`            | The action that occurred                  | `create`, `update`, `delete`, `state_change` |
| `{{resource.category}}` | Resource category                         | `config`, `segment`, `api_key`               |
| `{{resource.path}}`     | Full resource path                        | `environments/prod/configs/feature-x`        |
| `{{resource.name}}`     | Human-readable resource name              | `feature-x`                                  |
| `{{environment}}`       | Environment name (empty string if none)   | `production`                                 |
| `{{actor.id}}`          | User ID of the person who made the change | `user_abc123`                                |
| `{{timestamp}}`         | ISO 8601 timestamp                        | `2024-01-15T09:30:00.000Z`                   |
| `{{project.id}}`        | Project ID                                | `proj_xyz`                                   |
| `{{webhook.id}}`        | Webhook ID                                | `whk_123`                                    |
| `{{changes.old}}`       | Previous value as string (empty if none)  | `{"enabled": true}`                          |
| `{{changes.new}}`       | New value as string (empty if none)       | `{"enabled": false}`                         |

### Nested Access

Variables support dot-notation for nested object access:

```
{{resource.name}}   → accesses resource.name
{{actor.id}}        → accesses actor.id
{{changes.old}}     → accesses changes.old
```

If a variable path doesn't resolve, the original `{{path}}` placeholder is left in the output.

### Template Behavior

- **JSON template**: If your template is valid JSON after interpolation, it is sent as-is (parsed JSON body).
- **Plain text template**: If the template is not valid JSON, it is wrapped in `{ "text": "<your interpolated text>" }`.

### Examples

#### Plain text template

```
{{actor.id}} {{action}}d {{resource.name}} in {{environment}}
```

Produces:

```json
{ "text": "user_abc123 updated feature-x in production" }
```

#### JSON template (e.g., for a custom Slack-compatible endpoint)

```json
{
  "text": "{{actor.id}} {{action}}d {{resource.name}}",
  "channel": "#deployments"
}
```

Produces:

```json
{
  "text": "user_abc123 updated feature-x",
  "channel": "#deployments"
}
```

## Provider Payload Examples

### Standard JSON

```json
{
  "action": "update",
  "resourceCategory": "config",
  "resourcePath": "environments/prod/configs/feature-x",
  "resourceName": "feature-x",
  "environment": "prod",
  "actorId": "user_abc123",
  "timestamp": "2024-01-15T09:30:00.000Z",
  "oldValue": { "enabled": true },
  "newValue": { "enabled": false },
  "projectId": "proj_xyz",
  "webhookId": "whk_123"
}
```

### Slack

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🔵 Config Updated" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Resource:*\nfeature-x" },
        { "type": "mrkdwn", "text": "*Environment:*\nprod" }
      ]
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Action:*\nupdate" },
        { "type": "mrkdwn", "text": "*Actor:*\nuser_abc123" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "2024-01-15T09:30:00.000Z • proj_xyz" }
      ]
    }
  ]
}
```

### Discord

```json
{
  "embeds": [
    {
      "title": "🔔 Config Updated",
      "color": 5793266,
      "fields": [
        { "name": "Resource", "value": "feature-x", "inline": true },
        { "name": "Category", "value": "config", "inline": true },
        { "name": "Environment", "value": "prod", "inline": true },
        { "name": "Action", "value": "update", "inline": true },
        { "name": "Actor", "value": "user_abc123", "inline": true }
      ],
      "footer": { "text": "2024-01-15T09:30:00.000Z • proj_xyz" }
    }
  ]
}
```

### Google Chat

```json
{
  "cardsV2": [
    {
      "cardId": "whk_123",
      "card": {
        "header": { "title": "Config Updated", "subtitle": "feature-x" },
        "sections": [
          {
            "widgets": [
              { "decoratedText": { "topLabel": "Action", "text": "update" } },
              {
                "decoratedText": { "topLabel": "Resource", "text": "feature-x" }
              },
              { "decoratedText": { "topLabel": "Category", "text": "config" } },
              {
                "decoratedText": { "topLabel": "Environment", "text": "prod" }
              },
              {
                "decoratedText": { "topLabel": "Actor", "text": "user_abc123" }
              },
              {
                "decoratedText": {
                  "topLabel": "Timestamp",
                  "text": "2024-01-15T09:30:00.000Z"
                }
              },
              { "decoratedText": { "topLabel": "Project", "text": "proj_xyz" } }
            ]
          }
        ]
      }
    }
  ]
}
```

### Microsoft Teams

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
          {
            "type": "TextBlock",
            "text": "🔔 Config Updated",
            "weight": "Bolder",
            "size": "Medium"
          },
          {
            "type": "FactSet",
            "facts": [
              { "title": "Resource", "value": "feature-x" },
              { "title": "Category", "value": "config" },
              { "title": "Environment", "value": "prod" },
              { "title": "Action", "value": "update" },
              { "title": "Actor", "value": "user_abc123" },
              { "title": "Project", "value": "proj_xyz" }
            ]
          },
          {
            "type": "TextBlock",
            "text": "2024-01-15T09:30:00.000Z",
            "isSubtle": true,
            "size": "Small"
          }
        ]
      }
    }
  ]
}
```

## Filters

Each webhook can be configured with filters to limit which events trigger a delivery:

- **Event types**: `create`, `update`, `delete`, `state_change` (empty = all)
- **Resource categories**: `config`, `segment`, `api_key`, `project`, `team`, `environment` (empty = all)
- **Environments**: Filter by specific environment names (empty = all)

## Delivery

- Webhooks are delivered as HTTP POST requests with `Content-Type: application/json`.
- All webhook URLs must use HTTPS.
- Deliveries time out after 10 seconds.
- Failed deliveries are logged but not retried automatically.
- Each project supports up to 10 webhooks.
- Up to 20 delivery log entries are kept per webhook (oldest pruned).

## HTTP Headers

Every webhook delivery includes these headers:

| Header                | Value                       |
| --------------------- | --------------------------- |
| `Content-Type`        | `application/json`          |
| `X-Webhook-Id`        | The webhook's ID            |
| `X-Webhook-Timestamp` | Unix epoch of dispatch time |

## Delivery Log

Each webhook keeps the last 20 delivery attempts visible in the portal:

- **Timestamp** — When the delivery was attempted
- **Status** — HTTP status code (or `null` if network failure)
- **Duration** — Response time in milliseconds
- **Success** — Whether a 2xx response was received
- **Error** — Error message if delivery failed

## Testing

Click **Send Test** on any webhook in the portal. This dispatches a sample payload with `test: true` flag and logs the delivery result immediately.

## Shared Constants

The webhook format definitions, template variables, and sample events are exported from the SDK package for programmatic access:

```typescript
import {
  WEBHOOK_FORMATS,
  WEBHOOK_FORMAT_INFO,
  TEMPLATE_VARIABLES,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_RESOURCE_CATEGORIES,
  SAMPLE_WEBHOOK_EVENT,
} from "@jewel998/config";
```

This allows custom tooling, documentation generators, or CI scripts to reference the same source of truth used by the portal and Cloud Functions.
</div>
