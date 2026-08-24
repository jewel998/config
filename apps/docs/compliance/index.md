# Compliance & Security

> See also: [GDPR](/compliance/gdpr) · [SOC 2](/compliance/soc2) · [Team & RBAC](/features/team)

@jewel998/config is designed with security and compliance in mind. While we're not yet certified (SOC 2, ISO 27001), the architecture follows the guidelines and best practices of these frameworks.

## Security Architecture

| Layer              | Protection                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Authentication** | Firebase Authentication (Google, email/password)            |
| **Authorization**  | Per-project RBAC (Viewer, Editor, Admin)                    |
| **API Security**   | Client/Server key separation, domain validation             |
| **Data Isolation** | Per-project Firestore collections, no cross-project access  |
| **Transport**      | HTTPS-only, TLS 1.3 via Firebase Hosting CDN                |
| **Secrets**        | API keys are generated with cryptographic randomness        |
| **Audit**          | Every mutation recorded with actor, timestamp, before/after |

## Key Separation

API keys are typed at creation:

- **Client keys (`cid_`)** — For frontends. The API evaluates targeting server-side and returns only resolved values. Targeting rules, segment definitions, and rollout percentages are never exposed.
- **Server keys (`svr_`)** — For backends. Returns full flag data for local evaluation. Should be stored in environment variables, never in client-side code.

The API enforces this based on key prefix — no request parameter can override it.

## Data Residency

Your data lives in your own Firebase project. You choose the Firestore region. No data is sent to third-party servers (except webhook endpoints you configure).

## Frameworks We Align With

- [GDPR](/compliance/gdpr) — Data minimization, right to deletion, data portability (Article 20), audit trails
- [SOC 2](/compliance/soc2) — Access controls, audit logging, change management, processing integrity

## Consent-Aware Mode (GDPR)

The SDK supports a `consentAware` mode for GDPR compliance. When enabled, the SDK returns only default values until the user explicitly grants consent:

```typescript
import { createConfig } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  consentAware: true, // Blocks API calls until consent is granted
  context: { userId: "user_123", consentGranted: false },
});

// Returns defaults only — no API call is made
config.getValue("feature.personalized"); // → undefined (or your default)

// User grants consent (e.g., clicks "Accept Cookies")
config.setContext({ userId: "user_123", consentGranted: true });
// Now the SDK fetches real values from the API
```

This ensures no user-identifying data is sent to the server before consent is obtained.

## Data Portability

The platform supports GDPR Article 20 data portability through a bulk [import](/features/import)/[export](/features/export) system:

- **Import** — Migrate configurations from other systems via CSV or JSON upload with full DTO validation. See [Import](/features/import).
- **Export** — Download all project data or user-specific data as structured JSON (re-importable format). See [Export](/features/export).
- **Audit** — All import/export operations are logged with actor, timestamp, and operation details
