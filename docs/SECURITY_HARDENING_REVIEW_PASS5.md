# Security Hardening Review — Pass 5

Updated: 2026-04-30  
Scope: review of `docs/SECURITY_HARDENING.md`, middleware security headers, and Supabase client separation.

## Review of SECURITY_HARDENING.md findings

| Finding | Status | Evidence / Notes |
|---|---|---|
| Central browser-facing header posture | Resolved | `middleware.ts` centrally sets CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, and Permissions-Policy. |
| One clearer control point for redirects and response hardening | Resolved | Workspace redirects and security headers are both applied through `middleware.ts`, giving reviewers one visible control point. |
| Setup and verification clarity | Resolved | `README.md` documents setup, `npm run test:all`, and verification paths. Package metadata pins Node 22.x and npm 10.x. |
| Repo hygiene guidance | Resolved | `README.md`, `CHANGES.md`, and the DCC distinguish active truth surfaces from archived or transient material. |
| Secrets rotation | Partially resolved | Pass 5 adds `docs/SECURITY_POLICY.md` with manual rotation cadence and compromise response. Automated rotation remains deferred. |
| Cloud IAM policy discipline | Deferred — production/environment concern | Requires deployment-account and provider-level IAM controls outside the repository. |
| Network controls or WAF rules | Deferred — production/environment concern | No WAF or edge rate-limit configuration is proven in the repo. Pass 6 should document and prepare production controls. |
| Live rate limiting posture | Partially resolved | A repo-level rate-limit helper exists, but production enforcement and infrastructure-level controls are not proven by this pass. |
| Centralized production logging / alerting | Deferred — production/environment concern | Repo has audit-log patterns, but no SIEM or production alert routing is configured here. |
| Backup / restore drills | Deferred — production/environment concern | Requires Supabase/project operations evidence outside the repo. |
| Third-party penetration testing | Deferred — production/environment concern | External audit is planned for Pass 6 and is not claimed today. |
| SOC 2, ISO, or external certification | Deferred — production/environment concern | No certification is claimed. This remains a company/process program, not repo proof. |
| PR-NS-20 quote/order RPC hardening | Resolved | `SECURITY_HARDENING.md` records scoped revocation of broad `PUBLIC` execution, authenticated grants, `search_path=public`, and Q-00025 re-verification. |
| Broader non-quote/order advisor findings | Deferred — production/environment concern | The prior doc explicitly queues broader advisor findings for a later security pass. Pass 5 documents the posture but does not claim all advisor findings are closed. |
| Hardening rule: commercial truth must not be weakened | Resolved | Pass 5 changes only tests and documentation. No pricing, approval, quote, order, communication, integration, or AI runtime feature behavior was changed. |

## Current middleware CSP posture

| Header / CSP control | Status | Evidence / Notes |
|---|---|---|
| `unsafe-eval` absent from CSP | Resolved | `middleware.ts` defines `script-src 'self' 'unsafe-inline'`; `unsafe-eval` is not present. |
| `X-Frame-Options: DENY` | Resolved | Set in `applySecurityHeaders`. |
| `X-Content-Type-Options: nosniff` | Resolved | Set in `applySecurityHeaders`. |
| `Referrer-Policy` | Resolved | Set to `strict-origin-when-cross-origin`. |
| `Cross-Origin-Opener-Policy` | Resolved | Set to `same-origin`. |
| `Content-Security-Policy` | Resolved | Set centrally with default-src, base-uri, frame-ancestors, form-action, img-src, font-src, style-src, script-src, connect-src, and object-src. |
| `Permissions-Policy` | Resolved | Camera, microphone, and geolocation are disabled by default. |

## Supabase client separation review

| Client / file | Status | Evidence / Notes |
|---|---|---|
| `src/lib/supabase/admin.ts` | Resolved | `createAdminSupabaseClient` uses `env.supabaseServiceRoleKey`, which reads `SUPABASE_SERVICE_ROLE_KEY`, and disables session persistence/refresh. |
| `src/lib/supabase/server.ts` | Resolved | `createClient` uses `env.supabaseAnonKey` with authenticated cookies and does not use `SUPABASE_SERVICE_ROLE_KEY` by default. |
| Admin client usage locations | Partially resolved | `createAdminSupabaseClient` is imported only from server-side routes, server actions, server helpers, and route/page files under `src/app` or `src/features/**/server`. The repo still relies on reviewer discipline to ensure future imports do not move into client components. |

## Live Supabase connector verification - 2026-04-30

The GPT Supabase connector was used against project `sjzfzloggabsmcuxktnl` (`SETU Flow CRM`) for read-only verification. No golden record data was mutated.

| Live check | Result | Evidence / Notes |
|---|---|---|
| Project availability | Verified | Project listed as `ACTIVE_HEALTHY` in `us-west-2`. |
| Public table RLS enabled | Verified | SQL inspection found 80 public base tables and 80 with RLS enabled. |
| Public tables without RLS | Resolved | SQL inspection found 0 public base tables with RLS disabled. |
| RLS-enabled tables without policies | Partially resolved | SQL inspection found 39 RLS-enabled public tables without policies. RLS is enabled, but policy coverage remains incomplete. |
| Supabase security advisors | Partially resolved | Advisors still report `rls_enabled_no_policy`, `security_definer_view`, `function_search_path_mutable`, security-definer RPC execute grants, and leaked-password-protection warnings. |
| Sampled quote/order RPC `anon` exposure | Partially resolved | Sampled quote/order RPCs such as `app_create_quote_with_line_items_and_fanout_tx`, `app_send_quote_version_with_fanout_tx`, and `app_progress_contract_with_fanout_tx` are not executable by `anon`; `app_update_document_workflow_tx` and `app_update_compliance_workflow_tx` still report `anon` execute exposure. |
| Sampled quote/order RPC `authenticated` exposure | Deferred - requires DB hardening decision | Sampled quote/order/contract RPCs are executable by `authenticated` and are `SECURITY DEFINER`; app-layer capability tests now cover UI/server action gates, but direct RPC execute grants remain a database hardening topic. |

### Live verification conclusion

Pass 5 improves evidence quality because the Supabase project was inspected directly, not only through repository review. The honest status remains **partially resolved** for live Supabase RLS/RPC trust: table-level RLS is broadly enabled, but policy gaps and security-definer execute advisories remain open.

## Pass 5 conclusion

Pass 5 improves security confidence through additional permission-boundary tests, secrets-management documentation, direct live Supabase connector inspection, and explicit review of existing header and Supabase client posture. It does **not** claim complete live RLS/RPC closure, external audit completion, automated key rotation, WAF enforcement, SIEM alerting, or full production security certification.
