You are a senior full-stack engineer on SETU Flow CRM. Repo attached as zip.

TASK: PR-0 — Shell Alignment Lock.

GOAL:
Make every app route use the same geometry as the attached public HTML references before touching page-specific polish. This PR is the mandatory first development step because current misalignment is caused by mixed shell/page wrappers.

REFERENCE HTMLS TO READ FIRST:
- public/reference-html/setuflow-admin-settings-redesign.html
- public/reference-html/setuflow-catalog-redesign.html
- public/reference-html/setuflow-pipeline-redesign.html
- public/reference-html/setuflow-quotes-redesign.html
- public/reference-html/setuflow-orders-redesign.html

FILES TO REVIEW FIRST:
- src/components/layout/app-shell.tsx
- src/app/globals.css
- every route wrapper under src/app/**/page.tsx
- shared layout/topbar/sidebar/filter/stat components if present

REQUIRED CHANGES:
1. Create one shared shell contract used by every page:
   - Sidebar width: 68px.
   - Topbar height: 56px.
   - Desktop topbar padding: 0 24px.
   - Route/page horizontal gutter: 24px.
   - Content rhythm: stats-strip first, then content.
   - Tokens: --page-bg:#f0f4f8, --border:#e2e8f0, --r-sm:6px, --r-lg:16px, --r-xl:22px.
2. Remove duplicate desktop page chrome:
   - No outer lg/xl app gutter around the full app.
   - No second rounded route panel wrapping every page.
   - No nested workspace workflow hero/panel that shifts content away from HTML references.
3. Keep existing functionality working: Share my vCard, Filters, Quick Lead, mode switch, profile/avatar.
4. Do not rewrite page workflows in this PR except where needed to remove shell collisions.
5. Do not modify Supabase schema.

ACCEPTANCE CHECKS:
- /dashboard, /leads?mode=buyers, /pipeline?mode=buyers, /products?mode=buyers, /quotes?mode=buyers, /orders?mode=buyers, and /admin/organization?mode=buyers all start on the same x-grid as the public HTMLs.
- Sidebar is 68px, topbar is 56px, route content uses one 24px desktop gutter.
- No app route sits inside a second rounded desktop panel.
- Browser console has no new runtime errors.
- Return the updated repo zip and summarize before/after alignment deltas in pixels.
