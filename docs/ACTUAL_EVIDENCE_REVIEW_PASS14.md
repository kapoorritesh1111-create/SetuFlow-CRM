# Actual Evidence Review — Pass 14

> Pass 14 records evidence available at the time of the handoff. No production data was mutated, no Supabase migrations were applied, and frozen proof records were not changed.

## Live evidence imported/reviewed

Pass 14 includes live read-only Supabase evidence from the connected `SETU Flow CRM` project.

| Evidence area | Expected proof | Provided proof | Status | Notes |
|---|---|---|---|---|
| Supabase project identity | Project can be reached and identified | Project `SETU Flow CRM`, project ID `sjzfzloggabsmcuxktnl`, region `us-west-2`, status `ACTIVE_HEALTHY`, Postgres `17.6.1.063` | Proven | Read-only connector check only. |
| Supabase table/RLS inventory | Public tables inspected for RLS state | `list_tables` returned 80 public tables, all with `rls_enabled: true` | Proven | This proves RLS is enabled, not that every policy/advisor finding is closed. |
| Supabase remediation evidence | Before/after evidence that advisor findings were fixed | No migration was applied; live advisor output still includes open security findings | Missing | Remediation cannot be marked closed. |
| Supabase advisor before/after evidence | Advisor output before and after remediation | Pass 14 advisor output still reports `rls_enabled_no_policy`, `security_definer_view`, `function_search_path_mutable`, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`, and `auth_leaked_password_protection` | Partial | Live advisor evidence exists, but closure does not. |
| RPC grant matrix before/after evidence | Privileged RPC grants inspected before and after hardening | Advisor output shows privileged SECURITY DEFINER function exposure remains for anon/authenticated categories | Partial | No grant hardening was applied in Pass 14. |
| Live negative RPC verification | Safe live negative checks against privileged RPCs | Not executed because mutation-prone RPC calls require a safe test database or explicit migration/test authorization | Pending | Pass 9 design tests remain the safe reference. |
| Quote acceptance proof | Live quote exists and is accepted | `Q-00025` resolved to quote ID `b6f8111a-3b32-456d-92f0-412c898bf13b`, status `accepted`, sent at `2026-04-30 13:46:13.848+00`, accepted/current version `7f8efd6b-6e19-4941-b974-a5fc61738b0f` | Proven | This is live read-only proof. |
| Signed contract proof | Live contract/order exists and is signed | Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` resolved to quote ID `b6f8111a-3b32-456d-92f0-412c898bf13b`, status `signed`, created at `2026-04-30 19:10:38.786256+00` | Proven | This closes signed-contract proof for the frozen golden journey. |
| Contract line preservation | Live contract keeps all commercial lines | Contract line count for `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is 11 | Proven | Confirms the 11-line commercial payload survived quote-to-contract. |
| External audit evidence | External auditor report or remediation confirmation | Not provided | Missing | Still cannot claim external audit complete. |
| WAF/rate-limit evidence | Deployed WAF/rate-limit configuration evidence | Not provided | Missing | Checklist exists; deployed evidence does not. |
| Monitoring evidence | Alerts, uptime checks, owner routing, test alert proof | Not provided | Missing | Do not claim production monitoring live. |
| Backup/restore evidence | Backup policy and restore drill proof | Not provided | Missing | Restore drill remains open. |
| Live connector evidence | Live ERP/freight/provider connector proof | Not provided | Missing | Mock/proof-mode integrations only. |
| First pilot evidence | New pilot customer record evidence | Not provided | Pending | Q-00025 remains frozen demo/golden proof, not first pilot evidence. |
| Dispatch/completion proof | Dispatch evidence and completion state | Not provided | Missing | Contract is signed; dispatch/completion remains open. |
| Support activation evidence | Support owner, escalation path, alert routing, ticket log proof | Not provided | Missing | Support activation checklist remains pending. |
| Customer feedback evidence | Pilot customer feedback or acceptance notes | Not provided | Missing | Required before 100/100. |

## Bottom line

Pass 14 upgrades the evidence state for the golden journey: live accepted quote + live signed contract/order + 11 preserved contract lines are now documented as proven. It does not close Supabase advisor findings, WAF, monitoring, backup, external audit, dispatch, live connector, support activation, or first pilot evidence.
