# SOC 2 Alignment

SOC 2 (System and Organization Controls 2) defines criteria for managing customer data based on five trust service principles. While @jewel998/config is not SOC 2 certified (as a self-hosted tool, certification is your organization's responsibility), the platform provides controls that align with SOC 2 requirements.

## Trust Service Criteria Coverage

### 1. Security (Common Criteria)

| Control               | Implementation                                            |
| --------------------- | --------------------------------------------------------- |
| **Access Control**    | RBAC with three roles (Viewer, Editor, Admin) per project |
| **Authentication**    | Firebase Auth with Google OAuth and email/password        |
| **Key Management**    | Typed API keys (client/server) with revocation support    |
| **Network Security**  | HTTPS-only via Firebase CDN, domain validation            |
| **Change Management** | All changes go through the portal UI with audit logging   |
| **Logical Access**    | Per-environment key isolation, per-project member lists   |

### 2. Availability

| Control                        | Implementation                                                   |
| ------------------------------ | ---------------------------------------------------------------- |
| **CDN Caching**                | 60-second CDN cache for server keys reduces function invocations |
| **Graceful Degradation**       | SDK falls back to cached values on network failure               |
| **Retry Logic**                | Exponential backoff with configurable retries                    |
| **No Single Point of Failure** | Firebase's global infrastructure handles availability            |

### 3. Processing Integrity

| Control                      | Implementation                                                          |
| ---------------------------- | ----------------------------------------------------------------------- |
| **Input Validation**         | Type-checked values (boolean, number, string, JSON) at the portal level |
| **Deterministic Evaluation** | Same user + same context = same result (MurmurHash3 bucketing)          |
| **Prerequisites**            | Flag dependencies prevent inconsistent states                           |
| **Lifecycle States**         | Draft → Active → Stale → Archived prevents accidental use of old flags  |

### 4. Confidentiality

| Control                    | Implementation                                                      |
| -------------------------- | ------------------------------------------------------------------- |
| **Key Separation**         | Client keys (cid_) never expose targeting rules or segment logic    |
| **Data Isolation**         | Each project has its own Firestore collections                      |
| **No Cross-Tenant Access** | Projects are fully isolated by Firestore security rules             |
| **Sensitive Data**         | API keys are partially masked in the UI, full reveal requires click |

### 5. Privacy

| Control               | Implementation                                                   |
| --------------------- | ---------------------------------------------------------------- |
| **Data Minimization** | API doesn't persist user context — evaluation is stateless       |
| **Right to Deletion** | GDPR panel supports user data deletion                           |
| **Consent Mode**      | SDK's `consentAware` option blocks personalization until consent |
| **Audit Trail**       | Every data modification is logged with actor and timestamp       |
| **No Telemetry**      | The SDK sends zero analytics or usage data to third parties      |

## Controls You Manage

Since @jewel998/config is self-hosted, some SOC 2 controls are your responsibility:

- **Physical security** — Managed by Google Cloud (Firebase's infrastructure)
- **Personnel security** — Your team's onboarding/offboarding procedures
- **Incident response** — Your org's incident response plan
- **Backup & recovery** — Configure Firestore backups in your Firebase project
- **Vendor management** — Your relationship with Google Cloud (Firebase)
- **Penetration testing** — Test your deployment independently

## Preparing for SOC 2 Audit

If your organization pursues SOC 2 certification, @jewel998/config supports the evidence collection process:

1. **Audit log exports** — Demonstrates change management and access tracking
2. **RBAC configuration** — Shows principle of least privilege enforcement
3. **API key inventory** — Documents authentication mechanisms
4. **Environment separation** — Evidence of dev/staging/prod isolation
5. **Webhook notifications** — Supports continuous monitoring requirements
