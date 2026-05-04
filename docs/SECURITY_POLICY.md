# SETU Flow CRM Security Policy — Secrets Management

Updated: 2026-04-30  
Scope: repository and operator guidance for SETU Flow CRM secrets. This policy documents what exists today and what is still manual.

## 1. What secrets exist

| Secret / variable | Purpose | Sensitivity | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public; not sensitive | Required by client and server code to find the Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Public-facing | Row-level security must be the real gate. This key is not treated as a database-admin secret. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is supported as a fallback in `src/lib/env.ts`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | Critical; server-side only | Full database access. Never expose in client-side bundles. Only server/admin clients should read this value. |
| `ANTHROPIC_API_KEY` | Optional AI provider key | Sensitive | `src/lib/ai/config.ts` enables AI when this key is present and infers the provider as `anthropic`. |
| `OPENAI_API_KEY` | Optional AI provider key | Sensitive | `src/lib/ai/config.ts` supports this for backward compatibility and infers the provider as `openai` if Anthropic is absent. |
| `AI_PROVIDER` | Optional server-side AI provider selector | Low sensitivity | Server-side provider selection. Not itself a secret. |
| `AI_ENABLED` | Optional server-side AI enablement flag | Low sensitivity | Server-side flag. Not itself a secret. |
| `NEXT_PUBLIC_AI_PROVIDER` | Optional public AI provider label | Public; not sensitive | Public-facing configuration only. Do not place API keys here. |
| `NEXT_PUBLIC_AI_ENABLED` | Optional public AI enabled flag | Public; not sensitive | Public-facing flag only. Do not place API keys here. |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used by WhatsApp quote sharing | Public; not sensitive | Used by `src/features/quotes/server/whatsapp-delivery.ts` to build quote share URLs. |
| `NEXT_PUBLIC_APP_URL` | Public app URL fallback | Public; not sensitive | Used by app URL helpers and WhatsApp share-link generation. |
| `VERCEL_URL` | Vercel deployment host fallback | Public deployment metadata | Used as a fallback to build app URLs in server-side WhatsApp quote sharing. |

### Communication provider posture today

`src/features/quotes/server/whatsapp-delivery.ts` currently uses a `wa.me` prefilled message link. It does **not** read a Twilio, Meta WhatsApp Business, or other communication-provider API key today. If a live WhatsApp/communication provider is added later, its provider key must be treated as a server-side secret and added to this policy.

## 2. Where secrets live

| Environment | Location | Rule |
|---|---|---|
| Development | `.env.local` | Local-only and gitignored. Never commit developer secrets. |
| Production | Vercel project settings → Environment Variables | Configure per environment. Redeploy after any secret change so runtime values refresh. |
| Never | Hardcoded source, committed `.env`, client-side bundles | Secrets must not be written into source files, markdown examples with real values, public assets, or browser-exposed variables. |

`src/lib/env.ts` centralizes Supabase environment reads. It exposes public Supabase URL/anon-key values and keeps `SUPABASE_SERVICE_ROLE_KEY` as a server-side environment value. The service-role key must only be used by server-side clients such as `src/lib/supabase/admin.ts`; normal server user-session clients in `src/lib/supabase/server.ts` must use the anon key and the authenticated user's cookies.

## 3. Rotation cadence

| Secret | Cadence |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Rotate every 90 days or immediately on suspected compromise. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Rotate if RLS is bypassed, a Supabase security advisory requires it, or project exposure warrants it. |
| AI provider key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) | Rotate every 90 days or immediately on suspected compromise. |
| Communication provider key | Rotate every 90 days once a live provider is configured. Not configured in repo code today. |

## 4. Compromise response

1. Immediately rotate the compromised key in Supabase, Vercel, or the provider dashboard.
2. Redeploy to Vercel so the new key is active in the running application.
3. Review audit logs for the 24-hour window before the compromise was detected.
4. Determine whether any data was exfiltrated by checking the `audit_logs` table and relevant provider logs.
5. Notify affected users if data was accessed.
6. Document the incident, root cause, response timeline, and policy updates.
7. Update this policy if the incident revealed a missing secret, owner, rotation step, or alerting gap.

## 5. What the repo does not claim

- Key management is manual today.
- No automated secret rotation is implemented in this repository.
- No dedicated secrets manager is configured here, such as HashiCorp Vault, AWS Secrets Manager, or Google Secret Manager.
- No SIEM or key-usage alerting is configured in the repository.
- No production key-usage anomaly detection is claimed.
- These are environment and operations controls, not repo-level proof.

## 6. current security baseline live Supabase connector verification

Verified through the GPT Supabase connector against project `sjzfzloggabsmcuxktnl` (`SETU Flow CRM`) on 2026-04-30. This was a read-only inspection; no golden quote, contract, lead, order, or document rows were mutated.

| Check | Result | Evidence / Notes |
|---|---|---|
| Project status | Verified active/healthy | Supabase listed `SETU Flow CRM` in `us-west-2` with status `ACTIVE_HEALTHY`. |
| Public table RLS posture | Partially verified | SQL inspection found 80 public base tables and 80 with RLS enabled. |
| Tables without policies | Open advisory item | SQL inspection found 39 RLS-enabled public tables without policies. This means RLS is enabled, but policy coverage is not complete enough to claim live RLS E2E closure. |
| Security advisors | Open advisory items remain | Supabase security advisors reported `rls_enabled_no_policy`, `security_definer_view`, `function_search_path_mutable`, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`, and leaked password protection warnings. |
| Quote/order RPC execute exposure sample | Partially verified | Sampled quote/order/contract RPCs are `SECURITY DEFINER`; most sampled quote/order RPCs are not executable by `anon`, but several workflow/document/compliance RPCs remain executable by `anon` and/or `authenticated` per advisors and SQL. |
| Service role handling | Repo-level verified | Repo review confirms service role is read via `SUPABASE_SERVICE_ROLE_KEY` in server/admin client paths, not through the default browser/server anon client. |

**Conclusion:** current security baseline now includes direct live Supabase inspection evidence, but still does **not** claim complete live RLS closure. The remaining Supabase advisor findings are production/security hardening follow-up items for the next authorized hardening cycle.
