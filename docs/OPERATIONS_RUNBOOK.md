# SETU Flow Operations Runbook

## New client onboarding

1. Client opens `/onboarding` and submits workspace details.
2. System saves the onboarding request.
3. System notifies `admin@setugroups.com` when email is configured.
4. Admin opens `/admin/client-onboarding?request=<request_id>`.
5. Admin reviews the request and drafts the workspace.
6. Admin confirms markets, countries, pipelines, stages, next steps, pricing notes, and logo fallback.
7. Admin sends the first admin invitation through Admin -> Invitations.
8. Client admin logs in and creates product categories/products as needed.

## Production deployment

1. Confirm Vercel environment variables.
2. Confirm Supabase URL, anon key, and service role key.
3. Confirm onboarding email environment variables if notification delivery is required.
4. Run `npm test`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Deploy with a clean build cache after environment changes.
8. Smoke test `/onboarding`, `/admin/client-onboarding`, `/dashboard`, `/leads`, `/quotes`, `/orders`, and `/trade-events`.

## Support checks

- Hydration errors on admin routes: inspect shell components for browser-only values during first render.
- Public form access issues: confirm `/onboarding` remains outside authenticated route groups.
- Missing onboarding emails: confirm `SETU_EMAIL_PROVIDER`, `MAILTRAP_API_KEY`, `SETU_NOTIFICATION_FROM_EMAIL`, and `SETU_ONBOARDING_ADMIN_EMAIL`. If `MAILTRAP_USE_SANDBOX=true`, emails are captured in the Mailtrap sandbox rather than delivered to the admin inbox.
- Scan issues: check `/api/mobile/scan-readiness` and OpenAI API credentials.


## 2026-05-05 cleanup operating notes

- Reference HTML handoff pages are paused and removed from the active repo package.
- Use Markdown docs, React source, route manifest checks, and Node smoke tests as the operational truth.
- Supabase advisor findings from the cleanup pass must be handled as a dedicated database-hardening workstream: missing RLS policies, security-definer view exposure, mutable function search paths, exposed security-definer RPCs, and leaked-password protection.
- Do not ship `supabase/.temp/` or one-off root patch scripts in repo packages.
