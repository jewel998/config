# Team Collaboration

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
