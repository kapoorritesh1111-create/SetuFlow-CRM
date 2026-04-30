# Demo Data Audit

Updated: 2026-04-30  
Baseline: PR-NS-19 Controlled Golden Acceptance Run and Orders Proof

## Live verification summary

Project `sjzfzloggabsmcuxktnl` (`SETU Flow CRM`) was checked before mutation and was `ACTIVE_HEALTHY`. Vercel project `setu-flow-crm` was also checked before repo changes; latest production deployment remained `READY` at `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr`.

## Golden candidate before mutation

| Field | Before PR-NS-19 |
|---|---|
| Golden buyer / lead | `Setu Groups` / `Ritesh Kapoor` |
| Lead ID | `262ddf46-ecfe-4385-aaf5-18387d2a79f9` |
| Quote | `Q-00025` |
| Quote ID | `b6f8111a-3b32-456d-92f0-412c898bf13b` |
| Current quote version ID | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Parent quote status | `sent` |
| Current quote version status | `sent` |
| Quote line items | `11` |
| Quote version line items | `11` |
| Existing contract/order | none |

## Live blocker found during controlled acceptance

The first guarded acceptance transaction failed and rolled back safely. The failure was real and schema-related:

```text
contract_line_items.organization_id is NOT NULL, but app_ensure_contract_for_accepted_quote_tx did not insert organization_id into contract_line_items.
```

Rollback was verified immediately after the failed run:

```text
quotes.status = sent
quote_versions.status = sent
quotes.accepted_version_id = null
no contract committed
```

## Corrective live patch and repo migration

PR-NS-19 patched `app_ensure_contract_for_accepted_quote_tx` live and added the same correction as a repo migration:

```text
supabase/migrations/20260430_pr_ns_19_accepted_quote_contract_handoff_fix.sql
```

The patched RPC now:

- inserts `contract_line_items.organization_id`,
- preserves `source_quote_line_item_id`,
- records `contracts.accepted_quote_version_id`,
- sets `commercial_lock_state='accepted_locked'`, and
- stamps `accepted_at` / `commercial_handoff_at`.

## Golden acceptance after mutation

The controlled second acceptance run completed successfully.

| Field | After PR-NS-19 |
|---|---|
| Quote status | `accepted` |
| Quote accepted version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Quote version status | `accepted` |
| Quote version approved_at | `2026-04-30 19:10:38.786256+00` |
| Contract ID | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Contract status | `draft` |
| Contract execution state | `draft` |
| Contract accepted quote version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract lock state | `accepted_locked` |
| Contract line items | `11` |
| Acceptance communication | `5d2395f6-3a88-4399-b578-2142ac767f8a` |
| Acceptance negotiation event | `5bbc4b7b-a6f7-4db6-99f2-d987da5f7260` |
| Acceptance audit log | `a4ac95ed-bf28-4853-aff8-f40678d4e9a8` |

## Orders source visibility proof

The live Orders source query returned:

```text
quote_id = b6f8111a-3b32-456d-92f0-412c898bf13b
quote_number = Q-00025
quote_status = accepted
contract_id = d129ffe2-c913-4cf7-9a7b-86ea6c9da54e
execution_state = draft
accepted_quote_version_id = 7f8efd6b-6e19-4941-b974-a5fc61738b0f
```

This proves the accepted quote is available to the Orders execution workspace source path. A protected browser/runtime fetch was not performed in PR-NS-19.

## RPC/RLS advisor audit note

PR-NS-19 patched the functional accepted-handoff RPC. It did not complete broad RPC permission hardening. Supabase advisors still require a dedicated role-safe hardening PR for anon/authenticated SECURITY DEFINER execution exposure and mutable trigger-function search paths.

## Current conclusion

PR-NS-19 proves the golden path through accepted quote and draft order execution handoff. The next trust layer is not another acceptance pass; it is order execution hardening and/or RPC permission hardening with role regression tests.


## PR-NS-20 live hardening audit

Date: 2026-04-30

Live checks performed before and after hardening:

| Check | Result |
|---|---|
| Supabase project | `sjzfzloggabsmcuxktnl` ACTIVE_HEALTHY |
| Vercel latest deployment | `dpl_6WDgCcGH8xSgdwVN89BdBwdoxQic` READY |
| Q-00025 quote status | `accepted` |
| Accepted version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract/order execution | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Contract line items | `11` |

Safe hardening applied:
- Revoked `PUBLIC` execution and granted `authenticated` execution for scoped quote/order RPCs.
- Pinned quote/order helper and trigger functions to `search_path=public`.
- Left authenticated execution available so server-side app flows are not intentionally broken.

Not changed:
- Non-quote/order advisor findings remain queued.
- Broad authenticated SECURITY DEFINER policy strategy remains a later deeper security pass.

## PR-NS-21 mobile claim audit

Live data proof was rechecked before wording updates:
- Q-00025 remains `accepted`.
- Accepted version remains `7f8efd6b-6e19-4941-b974-a5fc61738b0f`.
- Contract/order remains `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.
- Contract line item count remains `11`.

Claim correction:
- Do not use the golden Q-00025 proof to imply mobile quote/order execution.
- Mobile proof is limited to selected responsive/mobile shell work and trade-event lead capture/offline queue language.
- Full quote/order/order-execution demo remains desktop-first.

## PR-NS-22 order execution data proof

Live checked on PR-NS-22:

- Q-00025 / `b6f8111a-3b32-456d-92f0-412c898bf13b` remains `accepted`.
- Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remains `draft` execution.
- Contract line items remain `11`.
- Linked documents for the quote/lead/contract were checked and returned `0`.

Result: the accepted-order handoff is real, but the order is not release-ready. The honest proof is blocker visibility and next action, not dispatch readiness.

PR-NS-22 updated the live contract snapshot with:

- `execution_blockers`: signed contract, commercial invoice, packing list, dispatch transport proof, and proof of delivery missing.
- `execution_snapshot`: line count, contract ID, quote ID, document posture, dispatch controls, next action, and mobile scope.

The Orders code path was patched so contract-level documents are included in the document posture calculation. This prevents uploaded order evidence from being invisible to the Orders workspace.
