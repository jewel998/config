# Data Backup & Restore

> See also: [Export](/features/export) · [Versioning](/guide/versioning) · [Self-Hosting Guide](/guide/self-hosting)

Your @jewel998/config data lives entirely in your Firebase project's Firestore database. This guide covers backup strategies, automated schedules, and restore procedures.

## What Gets Backed Up

| Collection                                      | Contents                                 | Critical? |
| ----------------------------------------------- | ---------------------------------------- | --------- |
| `projects/{id}`                                 | Project metadata, members, roles         | Yes       |
| `projects/{id}/environments/{id}`               | Environment configs, API keys, segments  | Yes       |
| `projects/{id}/environments/{id}/configs/{key}` | Feature flags, targeting rules, rollouts | Yes       |
| `projects/{id}/segments/{id}`                   | Segment definitions and conditions       | Yes       |
| `projects/{id}/webhooks/{id}`                   | Webhook configurations                   | Medium    |
| `projects/{id}/audit_log/{id}`                  | Audit trail entries                      | Medium    |
| `projects/{id}/import_jobs/{id}`                | Import history                           | Low       |
| `accessControl/default`                         | Email/domain allowlist                   | Yes       |
| `users/{uid}`                                   | User profiles                            | Low       |
| `allowedUsers/{email}`                          | Portal access list                       | Yes       |

## Backup Strategies

### Option 1: Firestore Managed Backups (Recommended)

Google Cloud provides built-in Firestore backup with point-in-time recovery (PITR).

#### Enable Point-in-Time Recovery

PITR allows you to restore to any point within the last 7 days (requires Blaze plan):

```bash
gcloud firestore databases update --database="(default)" \
  --project=your-project-id \
  --enable-pitr
```

::: warning Cost
PITR increases storage cost by approximately 30-50% due to versioned document retention. For most @jewel998/config deployments (< 100MB of data), this is negligible.
:::

#### Schedule Automated Backups

Create a daily backup schedule using Google Cloud Scheduler:

```bash
# Create a Cloud Storage bucket for backups
gcloud storage buckets create gs://your-project-config-backups \
  --project=your-project-id \
  --location=us-central1

# Create a daily backup schedule
gcloud firestore backups schedules create \
  --project=your-project-id \
  --database="(default)" \
  --recurrence=daily \
  --retention=7d
```

Or create a weekly backup with longer retention:

```bash
gcloud firestore backups schedules create \
  --project=your-project-id \
  --database="(default)" \
  --recurrence=weekly \
  --day-of-week=sunday \
  --retention=30d
```

#### Manual Backup (On-Demand)

Before upgrades or major changes:

```bash
# Export entire database to Cloud Storage
gcloud firestore export gs://your-project-config-backups/manual/$(date +%Y-%m-%d) \
  --project=your-project-id
```

Export specific collections only:

```bash
# Export only critical collections
gcloud firestore export gs://your-project-config-backups/manual/$(date +%Y-%m-%d) \
  --project=your-project-id \
  --collection-ids=projects,users,allowedUsers,accessControl
```

### Option 2: Application-Level Export

Use the built-in export feature for portable, human-readable backups:

```bash
# Get a Firebase Auth token
TOKEN=$(gcloud auth print-identity-token)

# Export a project
curl -X POST \
  'https://us-central1-your-project.cloudfunctions.net/exportConfigs' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "projectId": "YOUR_PROJECT_DOC_ID",
      "exportType": "full"
    }
  }'
```

This returns a signed download URL for a JSON file containing all environments, configs, and segments. See [Export](/features/export) for the full format.
::: tip When to use which

- **Firestore backups** → Disaster recovery, full database restore, point-in-time recovery
- **Application export** → Moving data between environments, sharing configs, GDPR compliance
  :::

### Option 3: Automated Backup Script

Create a script for your CI/CD pipeline or cron job:

```bash
#!/bin/bash
# backup-config.sh — Run daily via cron or CI

PROJECT_ID="your-project-id"
BUCKET="gs://your-project-config-backups"
DATE=$(date +%Y-%m-%d_%H-%M)

echo "Starting Firestore backup: $DATE"

gcloud firestore export "$BUCKET/automated/$DATE" \
  --project="$PROJECT_ID" \
  --collection-ids=projects,users,allowedUsers,accessControl \
  2>&1

if [ $? -eq 0 ]; then
  echo "Backup successful: $BUCKET/automated/$DATE"
else
  echo "ERROR: Backup failed!"
  exit 1
fi

# Clean up backups older than 30 days
gcloud storage rm "$BUCKET/automated/$(date -v-30d +%Y-%m-%d)*" \
  --project="$PROJECT_ID" \
  2>/dev/null || true

echo "Backup complete"
```

## Restore Procedures

### Restore from Firestore Backup

#### Full Database Restore

::: danger Destructive operation
Importing a backup replaces ALL data in the target database. This cannot be undone.
:::

```bash
# List available backups
gcloud firestore backups list --project=your-project-id

# Restore from a specific backup (creates a new database)
gcloud firestore databases restore \
  --project=your-project-id \
  --source-backup=projects/your-project-id/locations/us-central1/backups/BACKUP_ID \
  --destination-database=restored-db
```

After restoring to a new database, you can:

1. Verify the data in the restored database
2. Swap your Cloud Functions to point to the restored database
3. Or selectively copy documents back to your primary database

#### Point-in-Time Recovery

If you have PITR enabled, restore to a specific timestamp:

```bash
gcloud firestore databases restore \
  --project=your-project-id \
  --source-database="(default)" \
  --destination-database=pitr-restored \
  --snapshot-time="2025-01-15T10:30:00Z"
```

### Restore from Application Export

For restoring specific project data (e.g., accidentally deleted configs):

1. Download the export JSON from your backup storage
2. Open the portal → target environment
3. Go to **Import & Export** → **Import**
4. Upload the JSON file
5. Select **Overwrite existing** as the conflict strategy
6. Review and confirm

### Restore Individual Documents

For surgical fixes (e.g., one flag was accidentally deleted):

```bash
# Use the Firebase Admin SDK to restore a specific document
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Restore a specific config entry
db.collection('projects')
  .doc('PROJECT_ID')
  .collection('environments')
  .doc('ENV_ID')
  .collection('configs')
  .doc('feature.dark_mode')
  .set({
    key: 'feature.dark_mode',
    value: true,
    valueType: 'boolean',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
"
```

## Disaster Recovery Plan

### Scenario 1: Accidental Flag Deletion

1. Check the [Audit Log](/features/audit-log) — it records the old value in the diff
2. Recreate the flag manually using the audit log's recorded value
3. Or restore from the most recent application export

### Scenario 2: Accidental Project Deletion

1. Restore from Firestore backup (daily or PITR)
2. Redeploy Cloud Functions if needed: `firebase deploy --only functions`

### Scenario 3: Firebase Project Compromised

1. Revoke all API keys immediately (Firebase Console → IAM)
2. Restore from an off-site backup (Cloud Storage in a different project)
3. Rotate all secrets and redeploy

### Scenario 4: Corrupted Data After Upgrade

1. Roll back the code: `git checkout v0.X.X && firebase deploy`
2. Restore Firestore from the pre-upgrade backup
3. Report the issue on GitHub

## Backup Verification

Periodically verify your backups are restorable:

```bash
# 1. Restore to a temporary database
gcloud firestore databases restore \
  --project=your-project-id \
  --source-backup=LATEST_BACKUP_ID \
  --destination-database=backup-verify-temp

# 2. Run a sanity check
gcloud firestore documents list \
  --project=your-project-id \
  --database=backup-verify-temp \
  --collection=projects \
  --limit=5

# 3. Clean up
gcloud firestore databases delete backup-verify-temp \
  --project=your-project-id
```

## Retention Recommendations

| Environment | Backup Frequency | Retention                         | Method          |
| ----------- | ---------------- | --------------------------------- | --------------- |
| Production  | Daily + PITR     | 30 days (backups) + 7 days (PITR) | Managed backups |
| Staging     | Weekly           | 7 days                            | Managed backups |
| Development | On-demand        | Before major changes              | Manual export   |

## Cost

| Backup Type               | Cost                                      |
| ------------------------- | ----------------------------------------- |
| Firestore managed backups | $0.03/GB/month stored                     |
| PITR                      | ~30-50% increase in storage cost          |
| Cloud Storage export      | $0.026/GB/month (standard)                |
| Application-level export  | Free (uses existing function invocations) |

For a typical @jewel998/config deployment (< 50MB of data), backup costs are effectively $0.

## Related

- [Import & Export](/features/export) — Application-level export for portable, human-readable backups
- [Self-Hosting Guide](/guide/self-hosting) — Full deployment setup including Firestore configuration
- [Versioning](/guide/versioning) — Understand version management for safe upgrades
- [Audit Log](/features/audit-log) — Track changes and use diffs to recover accidental modifications
- [Environments](/features/environments) — Environment-specific backup and restore strategies
