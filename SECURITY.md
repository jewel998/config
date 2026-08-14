# Security Policy

## Supported Versions

| Version  | Supported                   |
| -------- | --------------------------- |
| latest   | ✅ Yes                      |
| < latest | ❌ No (upgrade recommended) |

We only provide security fixes for the latest published version of `@jewel998/config`. If you're running an older version, please upgrade before reporting.

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.**

Instead, report them privately:

1. **Email:** Send details to **jewelbarman998@gmail.com** (or the email listed in the repository owner's profile if this bounces).
2. **GitHub Private Reporting:** Use [GitHub's private vulnerability reporting](https://github.com/jewel998/config/security/advisories/new) if available.

### What to Include

- Description of the vulnerability
- Steps to reproduce or proof-of-concept
- Affected versions
- Potential impact (e.g., data exposure, privilege escalation)
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix & disclosure:** We aim to release a patch within 14 days of confirming a vulnerability. We'll coordinate disclosure timing with you.

## Scope

The following are in scope:

- SDK (`packages/config`) — evaluation logic, data handling
- Cloud Functions (`functions/`) — API endpoints, webhook delivery
- Admin Portal (`apps/portal`) — authentication, authorization, XSS, CSRF
- Self-hosting configurations — insecure defaults, misconfigurations

The following are **out of scope**:

- Denial-of-service attacks against Firebase infrastructure
- Social engineering
- Issues in third-party dependencies (report upstream; let us know so we can update)

## Disclosure Policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We ask that you:

- Give us reasonable time to address the issue before public disclosure
- Do not access or modify other users' data
- Act in good faith to avoid disruption to the service

## Recognition

We appreciate responsible disclosure. Contributors who report valid vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).
