# Export

> See also: [Import](/features/import) · [GDPR Compliance](/compliance/gdpr) · [Backup & Restore](/guide/backup-restore)

Export your entire project data for backup, [GDPR](/compliance/gdpr) compliance, or migration purposes.

## Full Project Export

Exports all configurations across all [environments](/features/environments), including:

- Environment metadata (name, color, production status)
- All config entries per environment (key, value, valueType)
- [Segments](/features/segments)

The export format is JSON with entries grouped by environment, making it directly re-importable.

## User-Specific Export (GDPR Article 20)

For GDPR data portability requests, you can export data specific to a user ID:

- Config overrides targeting the user
- [Audit log](/features/audit-log) entries where the user is the actor

## Export Format

```json
{
  "projectId": "my-project",
  "exportedAt": "2025-01-15T10:00:00.000Z",
  "exportedBy": "uid123",
  "exportType": "full",
  "environments": {
    "development": {
      "metadata": {
        "name": "development",
        "color": "#4CAF50",
        "isProduction": false
      },
      "configs": [{ "key": "feature.dark_mode", "value": true, "valueType": "boolean" }]
    }
  },
  "segments": []
}
```

## Download Links

- Available for **24 hours** after generation
- Projects with < 10,000 entries: download ready within 30 seconds
- Projects with ≥ 10,000 entries: processed asynchronously (up to 5 minutes)

## API Reference

### `importConfigs` (HTTPS Callable — deprecated)

The portal now writes directly to Firestore for imports (no Cloud Function needed). This callable is retained for programmatic API access only.

**Authentication:** Firebase Auth ID token (automatic with SDK)

**Request:**

```typescript
{
  projectId: string;
  environmentId: string;
  entries: Array<{ key: string; value: unknown; valueType: string }>;
  conflictStrategy: "skip" | "overwrite" | "review";
  reviewDecisions?: Record<string, "accept" | "reject">;
}
```

**Response:**

```typescript
{
  jobId: string;
  status: "processing" | "completed" | "failed";
}
```

### `exportConfigs` (HTTPS Callable)

**Request:**

```typescript
{
  projectId: string;
  exportType: "full" | "user";
  userId?: string; // required when exportType is "user"
}
```

**Response:**

```typescript
{
  downloadUrl: string;
  expiresAt: string;
  exportId: string;
}
```

### `retryFailedRows` (HTTPS Callable)

**Request:**

```typescript
{
  projectId: string;
  jobId: string;
  entries: Array<{ rowId: string; key: string; value: unknown; valueType: string }>;
  dismiss?: string[]; // rowIds to dismiss
}
```

**Response:**

```typescript
{
  results: Array<{ rowId: string; success: boolean; error?: string }>;
}
```

### Error Codes

| Code                | Meaning                                      |
| ------------------- | -------------------------------------------- |
| `unauthenticated`   | Not signed in                                |
| `invalid-argument`  | Missing or malformed request fields          |
| `permission-denied` | Insufficient role for the operation          |
| `not-found`         | Project or environment does not exist        |
| `already-exists`    | Another import is already in progress        |
| `internal`          | Server-side failure (export file generation) |

## End-to-End Example

### Using curl

```bash
# Get a Firebase ID token first
TOKEN=$(firebase auth:export-token --project my-project)

# Trigger an import
curl -X POST \
  'https://us-central1-my-project.cloudfunctions.net/importConfigs' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "projectId": "my-project-id",
      "environmentId": "development",
      "entries": [
        { "key": "feature.new", "value": true, "valueType": "boolean" }
      ],
      "conflictStrategy": "skip"
    }
  }'
```

### Using Firebase Admin SDK (Node.js)

```typescript
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFunctions } from "firebase-admin/functions";

const app = initializeApp();

// Create a custom token for a service account
const token = await getAuth().createCustomToken("service-account-uid");

// Call the function
const response = await fetch("https://us-central1-my-project.cloudfunctions.net/importConfigs", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    data: {
      projectId: "my-project-id",
      environmentId: "production",
      entries: [
        { key: "api.rate_limit", value: 1000, valueType: "number" },
        { key: "feature.v2", value: false, valueType: "boolean" },
      ],
      conflictStrategy: "overwrite",
    },
  }),
});

const result = await response.json();
console.log("Import job:", result.result.jobId);
```

## Compliance

### GDPR

- **Article 20 (Data Portability)**: The export system provides user-specific data downloads in a structured, machine-readable JSON format that can be re-imported into another project or system.
- **Article 17 (Right to Erasure)**: Export files are automatically cleaned up after 7 days. Signed download URLs expire after 24 hours.
- **Article 30 (Records of Processing)**: Every import, export, retry, and dismiss operation is recorded in the [audit log](/features/audit-log) with actor, timestamp, and operation details.

### SOC 2

- **Access Control**: [RBAC](/features/team) enforcement — only admins/editors can import, only admins can import to production environments.
- **Change Management**: All bulk data changes are audit-logged with before/after values for overwrites.
- **Processing Integrity**: Server-side validation with 12 distinct error types prevents malformed data from entering the system. Batched writes with per-row failure isolation ensure partial failures don't corrupt other entries.
- **Concurrency Control**: Transactional locking prevents parallel imports to the same environment.

## Related

- [Import](/features/import) — Import format, validation, and conflict resolution
- [GDPR](/compliance/gdpr) — Data portability and right to deletion
- [Backup & Restore](/guide/backup-restore) — Database-level backup strategies
- [Environments](/features/environments) — Exports are scoped per environment
