# GDPR Compliance

> See also: [Compliance Overview](/compliance/) · [Export](/features/export) · [Loading Strategies](/guide/loading-strategies)

The General Data Protection Regulation (GDPR) requires organizations to protect personal data and respect individuals' rights. Here's how @jewel998/config aligns with GDPR principles.

## Principles We Follow

### 1. Data Minimization

- The SDK collects only what you explicitly provide via `context`
- `autoContext()` detects device/browser info only — no personal data
- The API never persists user context — it's used for evaluation only and discarded
- No cookies, no tracking, no analytics built into the SDK

### 2. Right to Deletion (Article 17)

The portal includes a **GDPR Panel** (Settings → Privacy) that allows admins to:

- **Delete user overrides** — Remove any flag overrides tied to a specific userId
- **Purge audit entries** — Remove audit log entries that reference a specific userId
- **Export user data** — See all data associated with a userId across the project

These actions are themselves audit-logged as `data_deletion` events.

### 3. Data Portability (Article 20)

The platform provides a **bulk export** system that supports GDPR data portability:

- **Full project export** — Export all configurations across all environments as a structured JSON file, including environment metadata, config entries, and segments.
- **User-specific export** — Export only data associated with a specific userId (overrides and audit entries referencing the user as actor).
- **Re-importable format** — The export JSON format is compatible with the bulk import system, enabling seamless data transfer between projects or platforms.
- **Time-limited download** — Export files are generated as signed URLs valid for 24 hours, and files are automatically cleaned up after 7 days (data minimization).
- **Audit-logged** — Every export action is recorded in the audit trail with the requesting user and export scope.

See the [Import](/features/import) and [Export](/features/export) documentation for full format specifications, examples, and API reference.

### 4. Consent-Aware Mode

The SDK supports a `consentAware` option:

```typescript
const config = createConfig({
  clientId: "cid_xxx",
  consentAware: true,
  context: { consentGranted: false },
});

// Returns default values until consent is granted
config.getValue("personalized.feature"); // → default

// After user grants consent:
config.setContext({ consentGranted: true, userId: "user_123" });
// Now targeting and personalization work
```

When `consentAware: true` and `consentGranted !== true`, the SDK returns default values without sending any user context to the API.

### 5. Audit Trail (Article 30)

Every change is recorded with:

- Who (actor ID / email)
- What (resource path + old/new values)
- When (ISO 8601 timestamp)

This supports the GDPR requirement for records of processing activities.

### 6. Access Controls (Article 32)

- Role-based access (Viewer/Editor/Admin) limits who can modify data
- API keys are scoped per environment — no cross-environment access
- Domain validation prevents unauthorized origins from fetching configs

## What We Don't Store

- ❌ IP addresses
- ❌ Browser fingerprints
- ❌ Cookies or session identifiers
- ❌ User context after evaluation (processed in-memory only)
- ❌ Analytics or usage telemetry

## Your Responsibilities

Since you self-host on your own Firebase project:

- You are the **data controller** for your users' data
- Ensure your Firebase project's Firestore location complies with data residency requirements
- Configure appropriate Firebase Security Rules
- Set audit retention periods appropriate to your compliance needs
