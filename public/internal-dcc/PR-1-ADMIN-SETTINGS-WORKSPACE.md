You are a senior full-stack engineer on SETU Flow CRM. Repo attached as zip.

TASK: PR-1 — Admin + Settings Unified Workspace.

DEPENDENCY:
Start from the PR-0 Shell Alignment Lock repo. Do not start this PR before PR-0 is merged.

REFERENCE HTML TO READ FIRST:
- public/reference-html/setuflow-admin-settings-redesign.html

GOAL:
Replace scattered Admin and Settings routes with one /admin workspace matching the attached Admin + Settings HTML. Admin and Settings become one operational workspace with left-nav sections and section-aware CTAs.

REQUIRED ROUTING CHANGES:
1. Build one /admin workspace with left nav sections: Organization, Team members, Invitations, Markets, Categories, Stages & next steps, Pipelines, Trade events, Audit log, AI analytics, Security & roles.
2. Redirect /settings/lists to /admin?section=markets.
3. Remove Settings as a separate sidebar destination. Sidebar should expose Admin/Workspace only.
4. Support deep links such as /admin?section=markets, /admin?section=audit&category=access, /admin?section=security.

REQUIRED WORKFLOW/CTA CHANGES:
1. Add Share my vCard modal from the shared shell.
2. Add Export config JSON snapshot.
3. Make primary CTA change by section.
4. Implement invite member inline form and send invite action.
5. Implement resend/revoke invitation actions.
6. Implement user role edit panel.
7. Governance banner must appear across every section.
8. Governance chips must navigate to the exact fixing section.
9. Approval threshold must be visible and editable as a required field.
10. Reference lists must support inline add/edit, no separate drawer.
11. Reference lists must support drag reorder and persist sort_order.
12. Audit log must support category, actor, and time filters.

VISUAL REQUIREMENTS:
- Match the Admin HTML shell: 68px sidebar, 56px topbar, 220px left nav, content padding 20px 24px.
- Keep cards, banners, pills, and list rows aligned to the HTML spacing/token system.
- Do not reintroduce the old duplicated admin overview panels.

ACCEPTANCE CHECKS:
- /admin opens the unified workspace.
- /settings/lists redirects to /admin?section=markets.
- Every left-nav item changes content without a full broken route.
- Each section-aware CTA opens or performs the right action.
- Governance chips deep-link correctly.
- Reference list add/edit/reorder persists.
- No console errors.
- Return updated repo zip and list all Admin/Settings routes changed.
