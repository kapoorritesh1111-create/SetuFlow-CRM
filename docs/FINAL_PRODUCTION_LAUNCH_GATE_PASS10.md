# Final Production Launch Gate - Pass 10

**Status:** Evidence-pack document only. No live Supabase remediation was authorized or applied in Pass 10.

**Frozen proof records:** Do not mutate quote `Q-00025` or contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.

## Launch gate summary

SETU Flow has strong commercial workflow proof and a clear hardening path, but it is **not yet unconditional production-launch ready**. Several production and security gates still require real operational evidence.

| Gate | Required proof | Current evidence | Status | Can launch? |
|---|---|---|---|---|
| Supabase advisor closure | Before/after advisor output showing relevant security findings closed or formally accepted | Pass 6-9 live read-only reviews and draft remediation plans exist; findings remain open | Blocker for 100/100 | No for full production claim |
| RPC grant hardening | Applied grants, before/after RPC grant matrix, negative direct-RPC tests | Draft grant hardening SQL and test assertions exist; not applied | Blocker | No for full production claim |
| DB-level capability checks | Implemented DB helper and privileged RPCs calling it | Design exists in Pass 8 and draft helper in Pass 9 migrations; not applied | Blocker | No for full production claim |
| External audit status | Third-party audit report and remediation closure evidence | Audit prep and response pack docs exist; no completed audit report | Blocker | No for security-certified claim |
| WAF/rate limiting | Provider evidence, rules, protected routes, test evidence | WAF plan and evidence checklist exist; no deployed proof | Blocker for production edge claim | Conditional only |
| Monitoring/alerting | Production monitoring, alert routes, owner, incident evidence | Support runbook and readiness docs exist; no monitoring proof | Blocker | Conditional only |
| Backup/restore drill | Completed restore drill and documented recovery result | Scale checklist exists; no drill evidence | Blocker | Conditional only |
| Live connector proof | ERP/freight/provider connector running against live provider | Integration governance tests exist; connectors remain mock/planned unless configured | Blocker for live integration claim | No for live connector claim |
| Signed contract proof | New live proof record showing signed timestamp, lock state, audit log | App flow and golden draft order exist; new signed live proof pending | Blocker for 100/100 | No for signed-live claim |
| Dispatch/completion proof | New live proof record showing dispatch evidence and completion if fulfilled | Order execution tests and proof plan exist; no live dispatch proof | Blocker for 100/100 | No for dispatch-live claim |
| First pilot evidence | Customer workspace, user roles, quote/order evidence, feedback | Pilot launch checklist and evidence capture docs exist; no first pilot evidence | Blocker for 100/100 | No for pilot-complete claim |
| Support readiness | Triage runbook, severity levels, owner matrix | Production support runbook exists | Ready for pilot with caveats | Conditional |
| Claim reconciliation | README, DCC, RELEASE_READINESS and investor wording agree | Claim reconciliation and Pass 10 bundle exist; DCC remains source of truth | Ready | Yes for documentation consistency |

## Launch decision

- **Pilot launch:** Conditional go if customer accepts documented non-claims and manual controls.
- **Broad production launch:** No-go until security, monitoring, backup, WAF, live proof, and pilot evidence are captured.
- **Investor demo:** Go with scripted demo and honest caveats.
- **100/100 buyer confidence:** Not claimable today.

## Required next evidence before unconditional launch

1. Authorized Supabase remediation applied and verified.
2. Direct negative RPC tests run against a safe staging/test database.
3. External audit completed or explicitly scoped as pending.
4. WAF/rate-limit rules deployed with evidence.
5. Monitoring/alerting configured with owner and test alert.
6. Backup/restore drill completed.
7. New live proof record created without mutating Q-00025.
8. First pilot evidence captured.
