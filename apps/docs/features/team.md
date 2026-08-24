# Team Collaboration

> See also: [Audit Log](/features/audit-log) · [Environments](/features/environments) · [SOC 2](/compliance/soc2)

@jewel998/config supports multi-user access with role-based access control (RBAC). Invite team members, assign roles, and ensure no one has more access than they need.

## Roles

Each project member has one of three roles:

| Role       | Configs    | Segments   | API Keys | Settings | Team |
| ---------- | ---------- | ---------- | -------- | -------- | ---- |
| **Viewer** | Read       | Read       | Read     | Read     | Read |
| **Editor** | Read/Write | Read/Write | Read     | Read     | Read |
| **Admin**  | Full       | Full       | Full     | Full     | Full |

### Viewer

- Can see all configs, segments, and audit logs
- Cannot create, modify, or delete anything
- Useful for: stakeholders, PMs, support teams

### Editor

- Can create and modify configs, segments, and targeting rules
- Cannot manage API keys, project settings, or team members
- Useful for: developers, QA engineers

### Admin

- Full access to everything including API keys and team management
- Can invite/remove members and change roles
- The project owner is always an admin

## Inviting Members

1. Go to **Team** in the portal navigation
2. Click **Add Member**
3. Enter their email address
4. Select a role (Viewer, Editor, Admin)
5. They'll be added to the project immediately

## Removing Members

1. Go to **Team** in the portal navigation
2. Find the member in the list
3. Click the overflow menu (⋮) next to their name
4. Select **Remove** — they'll lose access immediately

::: warning
Removing a member is immediate and permanent. They can be re-invited, but will start with no role until assigned one.
:::

## Changing Roles

Only Admins can change another member's role. Go to **Team**, click the role badge next to a member, and select a new role from the dropdown.

## Ownership Transfer

The project owner (first admin) cannot be removed. To transfer ownership:

1. Add the new owner as an Admin
2. Contact support or modify the Firestore `projects/{id}` document's `ownerId` field directly

::: info
If the sole admin leaves the project, remaining members retain their roles but cannot manage team membership or API keys. Ownership must be reassigned at the Firestore level.
:::

## Audit Trail

Every action by every team member is recorded in the audit log:

- Who made the change (actor)
- What was changed (resource path)
- When it happened (timestamp)
- What the old and new values were (diff)

This gives full accountability and makes it easy to trace back any issue to the specific change and person.

## Best Practices

- **Principle of least privilege** — Start with Viewer, upgrade to Editor when needed
- **Production changes** — Only Admins should manage production API keys
- **Audit regularly** — Review the audit log for unexpected changes
- **Use labels** — Label your API keys by purpose ("Frontend Prod", "CI/CD", "Backend Worker")
- **Multiple admins** — Always have at least 2 admins to avoid single-point-of-failure for access management
