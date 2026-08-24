# Import

> See also: [Export](/features/export) · [Migration Guides](/guide/migrations/) · [Environments](/features/environments)

Bulk import configurations into your project from CSV or JSON files.

## Supported Formats

### CSV Format

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

### JSON Format

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

## Limits

| Constraint  | Limit              |
| ----------- | ------------------ |
| File size   | 5 MB               |
| Entry count | 10,000 per upload  |
| Key length  | 1-100 characters   |
| Key format  | `^[a-zA-Z0-9._]+$` |
| Value size  | 1 MB per entry     |

## Validation Errors

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

## Conflict Resolution

When importing keys that already exist in the target [environment](/features/environments):

- **Skip existing** — Keep the current values, mark imported rows as skipped
- **Overwrite existing** — Replace current values with imported values
- **Review individually** — Side-by-side comparison for each conflict

## Permissions

| Environment    | Required Role   |
| -------------- | --------------- |
| Non-production | Editor or Admin |
| Production     | Admin only      |

See [Team & RBAC](/features/team) for role definitions.

## Concurrency

Only one import can run at a time per environment. If another import is already processing, the system rejects the new request with an `already-exists` error. This is enforced with a transactional lock to prevent race conditions.

## Retrying Failed Entries

After an import completes, you can review and fix failed entries directly in the portal:

1. Navigate to the import results and click "View Failed Entries"
2. Failed rows are loaded in pages of 50 (cursor-based pagination)
3. Edit the key, value, or valueType inline
4. Submit individual corrections or select up to 50 entries for batch retry
5. Dismissed entries are removed without persisting
6. When all failures are resolved or dismissed, the job status becomes "resolved"

All retry and dismiss operations are logged in the [audit log](/features/audit-log).

## Related

- [Export](/features/export) — Export project data for backup or GDPR compliance
- [GDPR](/compliance/gdpr) — Data portability and right to deletion
- [Environments](/features/environments) — Import targets a specific environment
