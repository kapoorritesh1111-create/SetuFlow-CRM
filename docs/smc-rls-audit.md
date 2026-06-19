# SMC anon-read RLS audit (S32-SMC-005)

The static apps under `/public/internal/` (Docs Hub, Roadmap, Demo Checklist, Issue Tracker,
E2E/QA) read Supabase with the **anon** key. The embedded key is the anon key, **not**
service-role — no secret rotation is required. With anon access, RLS is the only server-side
guard, so the policies below are the real security boundary.

## Per-table posture

| Table | RLS | anon access | Verdict |
|---|---|---|---|
| `sprint_issues` | on | **SELECT + INSERT + UPDATE** | Over-permissive: anon can read all issues, create, and edit. |
| `roadmap_items` | on | read via member **or** valid share token | OK — verify the `token_read_roadmap` USING clause requires a real token. |
| `roadmap_votes` | on | org-member only | OK |
| `roadmap_share_tokens` | on | org-member only | OK |
| `docs_workspace_screenshots` | on | authenticated only | OK |

## The Share Doc constraint

The Docs Hub is shared with tech interns for review via "Share Doc". That flow depends on:
- **anon SELECT** on `sprint_issues` — the live issue counts shown in the shared docs.
- **anon INSERT** on `sprint_issues` — the QA/e2e app and demo checklist auto-file items.

Removing either breaks the intern review path. **anon UPDATE** is used only by the static
issue-tracker app (team edits), not by Share Doc.

## Remediation sequence (do in order — do not skip ahead)

1. Port the static issue-tracker **edit** path to authenticated server actions/API behind
   `requireSetuInternalAdminWorkspace`. Then apply the deferred migration that drops
   `anon_update_setu_flow_sprint_issues`.
2. Port the Docs Hub / QA bug-filing to authenticated or to a tightly-scoped RPC. Then replace
   full-table anon SELECT with a counts-only view and drop anon INSERT.
3. Verify `token_read_roadmap` enforces a valid `roadmap_share_tokens` token server-side.

Until steps 1–2 land, the anon policies are intentionally retained to keep Share Doc working.
