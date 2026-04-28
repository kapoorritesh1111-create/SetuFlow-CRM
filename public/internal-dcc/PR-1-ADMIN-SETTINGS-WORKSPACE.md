# PR-1 — Admin + Settings Unified Workspace

Status: completed in this build.

Implemented:
- `/admin` unified workspace with section left nav.
- `/settings/lists` redirects to `/admin?section=markets`.
- Old Admin subroutes redirect to corresponding `/admin?section=...` deep links.
- Settings removed as separate shell sidebar destination; Admin / Workspace is exposed instead.
- Governance banner appears across all Admin sections with deep-link chips.
- Export config JSON snapshot added.
- Section-aware primary CTA added.
- Invite member, send, resend, revoke actions remain available inline.
- User role edit panel is inline in Team members.
- Approval threshold is visible and editable in Security & roles.
- Reference lists support inline add/edit and sort_order reorder controls.
- Audit log supports category, actor, and time filters.

Changed routes:
- `/admin`
- `/admin/organization` → `/admin?section=organization`
- `/admin/users` → `/admin?section=team`
- `/admin/invitations` → `/admin?section=invitations`
- `/admin/markets` → `/admin?section=markets`
- `/admin/product-management` → `/admin?section=categories`
- `/admin/stages` → `/admin?section=stages`
- `/admin/pipelines` → `/admin?section=pipelines`
- `/admin/trade-events` → `/admin?section=trade-events`
- `/admin/audit` → `/admin?section=audit`
- `/admin/ai-analytics` → `/admin?section=ai`
- `/admin/security` → `/admin?section=security`
- `/settings/lists` → `/admin?section=markets`
