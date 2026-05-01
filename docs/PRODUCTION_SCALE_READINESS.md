# Production Scale Readiness — Pass 6

This checklist defines what SETU Flow must prove before production-scale claims. It is intentionally conservative and does not claim scale proof where evidence is missing.

## Database readiness

- **Index posture:** schema and generated types exist, but a final production index review against query plans is still needed.
- **Query hot paths:** leads, quote compilation, quote versions, order/contract detail, audit logs, imports, and communications are expected hot paths.
- **Supabase connection limits:** production limits must be checked against selected Supabase plan and expected concurrent usage.
- **Backup/restore drills:** not proven in repo; a restore drill must be performed and documented.
- **RLS performance:** all public tables have RLS enabled, but policy completeness and performance require review after advisor closure.

## Application readiness

- **Build/test commands:** `npm run test:all` is expected to run 259 unit tests when dependencies are installed. `npm run verify` remains the wider quality gate.
- **Environment variables:** documented in `docs/SECURITY_POLICY.md`; production values live in Vercel/Supabase/provider dashboards.
- **Deployment health checks:** deployment status can be checked in Vercel, but repo-level proof of health checks is limited.
- **Error handling:** app flows include visible gates and audit logs; production error aggregation is not proven.
- **Logging/audit posture:** `audit_logs` exists and is used for governed actions, but SIEM/export/alerting is not proven.

## Operational readiness

| Operational item | Current state | Requirement before stronger claim |
|---|---|---|
| Incident response owner | Not assigned in repo | Named owner and escalation path |
| Key rotation owner | Manual policy documented | Named operator and rotation calendar |
| Support escalation path | Admin SOP points to workspace owner | Support runbook with response targets |
| Data export/backups | Supabase platform capability assumed, drill not proven | Backup/restore drill evidence |
| Monitoring and alerting | Not proven | Error, auth, WAF, and DB alert routing |
| Audit-log review | Audit table exists | Regular review cadence and exception process |

## Scale risks

- Quote compilation volume and quote-version line item growth.
- Spreadsheet/catalog import volume and staging-table cleanup.
- Order document upload volume and storage lifecycle.
- Audit log growth and retention/query performance.
- Integration retry queue growth once live connectors are enabled.
- AI suggestion volume and provider-cost controls if AI keys are configured.

## Readiness table

| Area | Current state | Production requirement | Status |
|---|---|---|---|
| Database schema | Live schema exists; all 80 public base tables have RLS enabled | Advisor closure, policy classification, index/query review | Needs evidence |
| RLS/RPC safety | App-layer tests exist; advisor warnings remain | Revoke anon for privileged RPCs, DB-level capability checks, search_path fixes | Needs hardening |
| Build/test | 259 tests expected; extracted container lacks `tsx` | Fresh dependency install in CI and passing test log | Needs CI evidence |
| Golden journey | Q-00025 and draft order proven | Signed contract + dispatch proof on live data | Partially proven |
| Integrations | Proof-mode/mocks only | One live ERP/freight connector proof with replay/governance | Deferred |
| WAF/rate limiting | Plan documented | Deployed WAF/rate limits and test output | Deferred |
| Monitoring | Audit logs exist | Alerting, dashboards, owner, response runbook | Deferred |
| Backups | Platform presumed | Backup/restore drill evidence | Deferred |
| Secrets | Manual policy documented | Rotation calendar or secrets manager | Manual / deferred |

## Non-claims

SETU Flow is closer to pilot readiness after Pass 6 documentation and live connector inspection, but the repo does not yet prove production-scale operation, load-tested abuse resistance, live connector resilience, or completed external audit.
