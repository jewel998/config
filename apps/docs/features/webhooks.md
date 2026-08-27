# Webhooks

> See also: [Audit Log](/features/audit-log) · [Webhook API](/api/webhooks) · [Environments](/features/environments)

<div v-pre>

Get real-time notifications when configuration changes occur. Send alerts to Slack, Discord, Google Chat, Microsoft Teams, or any custom HTTP endpoint.

## Supported Providers

| Provider        | Format           | Features                     |
| --------------- | ---------------- | ---------------------------- |
| Standard (JSON) | Raw JSON payload | Any HTTP endpoint            |
| Slack           | Block Kit        | Rich formatted messages      |
| Discord         | Embed format     | Colored embeds with fields   |
| Google Chat     | Card format      | Structured cards             |
| Microsoft Teams | Adaptive Card    | Teams-native cards           |
| Custom          | Template engine  | `{{dot.notation}}` variables |

## Setting Up a Webhook

1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter a name, HTTPS URL, and select a format
4. Optionally configure filters (event types, resource categories, environments)
5. Send a test payload to verify

## Filtering

Reduce noise by filtering which events trigger your webhook:

- **Event Types** — create, update, delete, state_change (empty = all)
- **Resource Categories** — config, segment, api_key, project, team, environment (empty = all)
- **Environments** — Only notify for production changes (empty = all)

## Custom Templates

For the "custom" format, use `{{variable}}` syntax to build your own payload:

```json
{
  "text": "{{action}} on {{resource.name}} by {{actor.id}}",
  "environment": "{{environment}}",
  "changes": "{{changes.old}} → {{changes.new}}"
}
```

Available variables: `action`, `resource.category`, `resource.path`, `resource.name`, `environment`, `actor.id`, `timestamp`, `project.id`, `changes.old`, `changes.new`, `webhook.id`. See the [Webhook API reference](/api/webhooks) for the full variable list with examples.

## Delivery Outcomes

Webhook delivery outcomes are logged to Cloud Function logs (Google Cloud Logging), not stored in Firestore. Check your Firebase project's function logs to see delivery successes, rejections (non-2xx), and unexpected errors.

## Limits

- Maximum 10 webhooks per project
- 10-second timeout per dispatch
- HTTPS URLs only
- No automatic retries (failures are logged to Cloud Function logs)

## Handling Failures

Since webhooks are not retried automatically, consider these patterns on the consumer side:

- **Idempotent endpoints** — Design your webhook receiver to handle duplicate deliveries safely
- **Dead-letter queue** — Use a service like AWS SQS or Google Cloud Tasks as your webhook URL, then process from there with built-in retry
- **Monitoring** — Check your Firebase project's Cloud Function logs for delivery failures and rejections
- **Fallback polling** — For critical integrations, also poll the audit log API as a backup

::: tip Future improvement
Automatic retry with exponential backoff is planned for a future release.
:::

</div>
