# Import & Export

Bulk import configurations into your project from CSV or JSON files, and export your entire project data for GDPR compliance or backup purposes.

## Import

### Supported Formats

#### CSV Format

CSV files must have a header row with exactly three columns: `key`, `value`, `valueType`.

| Column      | Type   | Description                                                             |
| ----------- | ------ | ----------------------------------------------------------------------- |
| `key`       | string | Config key. Alphanumeric, dots, and underscores only. 1-100 characters. |
| `value`     | any    | The config value. JSON/array values must be double-quoted JSON strings. |
| `valueType` | string | One of: `string`, `number`, `boolean`, `json`, `array`                  |

**Example CSV:**

```csv
key,value,valueType
feature.dark_mode,true,boolean
api.timeout,5000,number
app.title,"My App",string
theme.colors,"{""primary"":""#333"",""secondary"":""#666""}",json
allowed.domains,"[""example.com"",""app.example.com""]",array
```

#### JSON Format

JSON files must be an array of objects, each with `key`, `value`, and `valueType` fields.

**Example JSON:**

```json
[
  { "key": "feature.dark_mode", "value": true, "valueType": "boolean" },
  { "key": "api.timeout", "value": 5000, "valueType": "number" },
  { "key": "app.title", "value": "My App", "valueType": "string" },
  {
    "key": "theme.colors",
    "value": "{\"primary\":\"#333\"}",
    "valueType": "json"
  },
  {
    "key": "allowed.domains",
    "value": "[\"example.com\"]",
    "valueType": "array"
  }
]
```

### Limits

| Constraint  | Limit              |
| ----------- | ------------------ |
| File size   | 5 MB               |
| Entry count | 10,000 per upload  |
| Key length  | 1-100 characters   |
| Key format  | `^[a-zA-Z0-9._]+$` |
| Value size  | 1 MB per entry     |

### Validation Errors

| Error                               | Cause                                                | Resolution                                       |
| ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `missing required field: key`       | Row is missing the key column                        | Add a non-empty key value                        |
| `missing required field: value`     | Row is missing the value column                      | Add a value                                      |
| `missing required field: valueType` | Row is missing the valueType column                  | Add a valid valueType                            |
| `invalid key format`                | Key contains invalid characters                      | Use only alphanumeric, dots, underscores         |
| `key too long`                      | Key exceeds 100 characters                           | Shorten the key                                  |
| `unsupported value type`            | valueType is not recognized                          | Use: string, number, boolean, json, array        |
| `invalid JSON value`                | Value is not valid JSON when type is "json"          | Fix JSON syntax                                  |
| `invalid array value`               | Value is not a valid JSON array when type is "array" | Ensure value parses as a JSON array              |
| `invalid number value`              | Value cannot be parsed as a number                   | Provide a valid numeric value                    |
| `invalid boolean value`             | Value is not `true` or `false`                       | Use `true` or `false` (string or native boolean) |
| `duplicate key in file`             | Same key appears multiple times                      | Remove duplicates                                |
| `value too large`                   | Serialized value exceeds 1 MB                        | Reduce value size                                |
| `config is locked`                  | Target config is locked (admin can override)         | Unlock the config or use admin account           |

### Conflict Resolution

When importing keys that already exist in the target environment:

- **Skip existing** — Keep the current values, mark imported rows as skipped
- **Overwrite existing** — Replace current values with imported values
- **Review individually** — Side-by-side comparison for each conflict

### Permissions

| Environment    | Required Role   |
| -------------- | --------------- |
| Non-production | Editor or Admin |
| Production     | Admin only      |

### Concurrency

Only one import can run at a time per environment. If another import is already processing, the system rejects the new request with an `already-exists` error. This is enforced with a transactional lock to prevent race conditions.

### Retrying Failed Entries

After an import completes, you can review and fix failed entries directly in the portal:

1. Navigate to the import results and click "View Failed Entries"
2. Failed rows are loaded in pages of 50 (cursor-based pagination)
3. Edit the key, value, or valueType inline
4. Submit individual corrections or select up to 50 entries for batch retry
5. Dismissed entries are removed without persisting
6. When all failures are resolved or dismissed, the job status becomes "resolved"

All retry and dismiss operations are audit-logged.

## Export

### Full Project Export

Exports all configurations across all environments, including:

- Environment metadata (name, color, production status)
- All config entries per environment (key, value, valueType)
- Segments

The export format is JSON with entries grouped by environment, making it directly re-importable.

### User-Specific Export (GDPR Article 20)

For GDPR data portability requests, you can export data specific to a user ID:

- Config overrides targeting the user
- Audit log entries where the user is the actor

### Export Format

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
      "configs": [
        { "key": "feature.dark_mode", "value": true, "valueType": "boolean" }
      ]
    }
  },
  "segments": []
}
```

### Download Links

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
const response = await fetch(
  "https://us-central1-my-project.cloudfunctions.net/importConfigs",
  {
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
  },
);

const result = await response.json();
console.log("Import job:", result.result.jobId);
```

## Compliance

### GDPR

- **Article 20 (Data Portability)**: The export system provides user-specific data downloads in a structured, machine-readable JSON format that can be re-imported into another project or system.
- **Article 17 (Right to Erasure)**: Export files are automatically cleaned up after 7 days. Signed download URLs expire after 24 hours.
- **Article 30 (Records of Processing)**: Every import, export, retry, and dismiss operation is recorded in the audit log with actor, timestamp, and operation details.

### SOC 2

- **Access Control**: RBAC enforcement — only admins/editors can import, only admins can import to production environments.
- **Change Management**: All bulk data changes are audit-logged with before/after values for overwrites.
- **Processing Integrity**: Server-side validation with 12 distinct error types prevents malformed data from entering the system. Batched writes with per-row failure isolation ensure partial failures don't corrupt other entries.
- **Concurrency Control**: Transactional locking prevents parallel imports to the same environment.
