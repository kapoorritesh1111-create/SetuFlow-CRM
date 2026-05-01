# Pass 13 — Post-Decision Remediation Status

**Status:** Pending authorization. Pass 13 did not apply live Supabase remediation because no explicit authorization was provided. No production data was mutated, and frozen proof records `Q-00025` and `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remain untouched.

| Blocker | Required remediation | Authorization provided? | Applied? | Evidence | Status |
|---|---|---:|---:|---|---|
| RLS no-policy tables | Review each no-policy table; add scoped policies, move internal tables out of public exposure, or document intentional deny-all behavior. | No | No | Pass 8/9 remediation plans only. | Pending authorization |
| Security definer view | Replace or revise `public.active_product_pricing_rules_v` to avoid SECURITY DEFINER behavior unless explicitly justified. | No | No | Advisor reviews identify the finding; no migration applied. | Pending authorization |
| Function search path hardening | Add fixed `search_path` to reviewed trusted functions. | No | No | Draft migration exists from Pass 9. | Pending authorization |
| Anon SECURITY DEFINER RPC grants | Revoke `EXECUTE` from `anon` for privileged RPCs unless intentionally public. | No | No | Draft grant hardening plan and tests exist. | Pending authorization |
| Authenticated SECURITY DEFINER RPC grants | Add DB-level membership/capability checks and restrict grants where appropriate. | No | No | DB capability design exists; not applied. | Pending authorization |
| Leaked password protection setting | Enable leaked-password protection in Supabase Auth dashboard. | No | No | Dashboard-only setting remains pending. | Pending operations owner |
| DB-level capability helper | Implement `app_has_workspace_capability(...)` and wire high-risk RPCs to it after review. | No | No | Pass 8 design and Pass 9 draft migration exist. | Pending authorization |
| Live negative RPC verification | Run safe test-database verification after grants/capability checks are applied. | No | No | Pass 9 assertion tests exist; live mutation-prone checks remain pending. | Pending safe test DB / authorization |

## Claim boundary

SETU Flow can say remediation plans and draft migrations exist. It cannot claim Supabase advisor closure, applied RPC hardening, or verified DB-level capability enforcement until migrations are applied and before/after evidence is captured.
