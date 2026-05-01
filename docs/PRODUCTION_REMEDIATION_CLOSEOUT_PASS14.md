# Production Remediation Closeout — Pass 14

> Pass 14 records evidence available at the time of the handoff. No production data was mutated, no Supabase migrations were applied, and frozen proof records were not changed.

## Closeout summary

No live Supabase remediation was applied in Pass 14. The live connector was used for read-only evidence review only. Remediation is therefore **not closed**, even though the golden journey signed-contract proof is now live-verified.

| Remediation item | Required fix | Evidence supplied | Closed? | Notes |
|---|---|---|---:|---|
| RLS no-policy tables | Add scoped policies, deny-all policies, or remove from exposed API as appropriate | Advisor still reports `rls_enabled_no_policy` on multiple tables | No | RLS is enabled on all public tables, but policy gaps remain. |
| Security definer view | Replace or alter `public.active_product_pricing_rules_v` so it does not bypass caller permissions unexpectedly | Advisor still reports `security_definer_view` | No | Requires reviewed SQL migration. |
| Function search path hardening | Set fixed `search_path` on trusted functions | Advisor still reports `function_search_path_mutable` | No | Requires reviewed SQL migration. |
| Anon SECURITY DEFINER RPC grants | Revoke unsafe `EXECUTE` from `anon` or move functions out of exposed schema | Advisor still reports `anon_security_definer_function_executable` | No | Direct mutation-prone RPC tests not executed. |
| Authenticated SECURITY DEFINER RPC grants | Add database-level membership/capability checks and restrict grants | Advisor still reports `authenticated_security_definer_function_executable` | No | App-layer checks exist; DB backup remains pending. |
| Leaked password protection | Enable leaked password protection in Supabase Auth dashboard | Advisor still reports `auth_leaked_password_protection` | No | Dashboard/ops setting, not repo code. |
| DB-level capability helper | Implement and use DB helper mirroring app permission model | Design exists in Pass 8/9 docs; not applied live | No | Requires migration authorization and negative tests. |
| Live negative RPC verification | Run safe negative checks against privileged RPC paths | No safe test DB or mutation authorization supplied | No | Pending; keep Pass 9 tests as design-time protection. |
| Golden quote acceptance proof | Verify live quote accepted state | `Q-00025` is live `accepted` | Yes | Evidence proof, not remediation closure. |
| Golden signed contract proof | Verify live contract/order signed state | Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is live `signed` with 11 contract lines | Yes | Closes signed-contract proof for golden journey only. |

## Decision

Production remediation remains open. Buyer confidence should not move to 99/100 or 100/100 on remediation grounds until applied migrations, advisor improvements, and safe negative RPC verification are complete.
