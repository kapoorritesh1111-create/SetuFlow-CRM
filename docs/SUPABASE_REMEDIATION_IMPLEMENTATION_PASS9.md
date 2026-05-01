# Supabase Remediation Implementation — Pass 9

Updated: 2026-04-30  
Baseline: Pass 8 remediation planning package  
Live project checked read-only: `SETU Flow CRM / sjzfzloggabsmcuxktnl / us-west-2 / ACTIVE_HEALTHY`

## Executive summary

Pass 9 was **not authorized to apply live Supabase migrations**. This document therefore records draft-only implementation artifacts, dry-run expectations, and the exact evidence required before any live database remediation can be claimed.

No production migrations were applied. No Supabase data was mutated. The frozen golden proof record remains untouched:

| Frozen proof | Value | Pass 9 status |
|---|---|---|
| Quote | `Q-00025` | Not mutated |
| Contract/order execution | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` | Not mutated |

## Authorization status

| Remediation area | Live apply authorized? | Pass 9 action | Status |
|---|---:|---|---|
| Revoke unsafe `anon` RPC grants | No | Draft SQL only | Planned, not applied |
| Tighten `authenticated` SECURITY DEFINER execution | No | Draft SQL and DB capability design only | Planned, not applied |
| Add fixed `search_path` to reviewed functions | No | Draft SQL only | Planned, not applied |
| Address `active_product_pricing_rules_v` SECURITY DEFINER view | No | Draft replacement approach only | Planned, not applied |
| Add deny-all/scoped policies to no-policy RLS tables | No | Draft policy strategy only | Planned, not applied |
| Enable leaked password protection | No | Dashboard instruction only | Manual production setting |

## Draft artifacts created

| Artifact | Purpose | Applied live? |
|---|---|---:|
| `supabase/migrations/pass9_001_rpc_grant_hardening_advisor_remediation.sql` | Draft `REVOKE EXECUTE` / `GRANT EXECUTE` pattern for privileged RPCs | No |
| `supabase/migrations/pass9_002_search_path_and_view_advisor_remediation.sql` | Draft fixed `search_path` and view remediation examples | No |
| `supabase/migrations/pass9_003_rls_policy_advisor_remediation.sql` | Draft deny-all/scoped RLS policy approach for no-policy tables | No |
| `supabase/migrations/pass9_004_db_capability_helper_advisor_remediation.sql` | Draft database-level capability helper and RPC gate pattern | No |
| `tests/security/rpc-grant-hardening.test.ts` | Pure assertion tests for draft RPC hardening coverage | No live DB mutation |
| `tests/security/db-capability-design.test.ts` | Pure assertion tests for DB capability design alignment | No live DB mutation |

## Current evidence level

| Claim | Evidence status | Can claim? |
|---|---|---:|
| Supabase project active/healthy | Read-only connector check | Yes |
| 80/80 public tables have RLS enabled | Read-only SQL check from Pass 8/9 | Yes |
| 39 RLS-enabled tables lack policies | Read-only SQL check from Pass 8/9 | Yes |
| Supabase advisor findings closed | Not applied / not verified | No |
| Privileged RPC grants hardened | Draft SQL only | No |
| DB-level capability checks enforced | Design/draft only | No |
| Buyer confidence 99/100 | Requires applied remediation and improved advisors | No |
| Buyer confidence 100/100 | Requires all evidence gates complete | No |

## Implementation sequence when authorized

1. Create a Supabase branch or staging database snapshot.
2. Apply draft migrations in dry-run/staging first.
3. Run advisor checks and RPC grant inspection.
4. Run negative RPC tests against a safe test database.
5. Confirm application flows still work for owner/admin/sales/operations roles.
6. Only then apply to production during a controlled maintenance window.
7. Immediately re-check advisors and capture evidence.
8. Update DCC/README/RELEASE_READINESS only after evidence exists.

## Production claim boundary

Pass 9 adds draft implementation assets and tests. It does **not** close the live Supabase advisor findings, does **not** prove direct RPC negative behavior against production, and does **not** raise buyer confidence beyond ~98/100.
