# SETU Flow CRM — Production Support Runbook

**Status:** Pass 7 support-readiness document  
**Scope:** Pilot and early production support preparation. Formal SLA and 24/7 coverage are not claimed unless separately contracted.

## 1. Support roles

| Role | Responsibility |
|---|---|
| Workspace owner | Owns customer workspace, business decisions, escalation approval. |
| Technical owner | Owns application triage, repo/deployment investigation, release coordination. |
| Supabase admin | Owns database health, auth, RLS/advisor review, backups, and Supabase logs. |
| Vercel admin | Owns deployment status, environment variables, domain, build/runtime logs. |
| Customer support owner | Owns customer communication, incident intake, and follow-up notes. |

## 2. Common incidents

- User cannot log in.
- No workspace membership found.
- Invite link not working.
- Product/pricing import failed.
- Quote cannot be sent.
- Quote requires approval.
- Contract/order did not appear.
- Contract cannot be signed.
- Document upload failed.
- Dispatch cannot progress.
- Supabase advisor/security alert.
- Vercel deployment failure.

## 3. Triage table

| Incident | First check | Escalate to | Evidence to collect |
|---|---|---|---|
| User cannot log in | Auth status, email, browser/session | Supabase admin | Auth log, user email, timestamp |
| No workspace membership found | `organization_members` membership and role | Workspace owner | User ID/email, org ID, membership state |
| Invite link not working | Invitation status/expiry/role | Admin user | Invite ID, recipient, error screenshot |
| Product/pricing import failed | Import run/issues | Technical owner | Import run ID, uploaded file, error rows |
| Quote cannot be sent | Role capability, approval threshold, quote state | Technical owner | Quote ID, actor role, audit log |
| Quote requires approval | Approval threshold and margin/override state | Manager/owner | Quote version, approval state |
| Contract/order did not appear | Accepted quote and contract sync/audit | Technical owner | Quote ID, contract ID if present |
| Contract cannot be signed | Role gate, blockers, contract status | Operations owner | Contract ID, actor role, error |
| Document upload failed | File size/type, storage/env status | Technical owner | Document name, error, storage log |
| Dispatch cannot progress | Contract signed state, document/compliance blockers | Operations owner | Order ID, blocker list, audit log |
| Supabase advisor/security alert | Advisor detail and recent changes | Supabase admin | Advisor JSON/detail, affected object |
| Vercel deployment failure | Build logs and env vars | Vercel admin | Deployment URL, build log, commit |

## 4. Severity levels

| Severity | Definition | Placeholder response target |
|---|---|---|
| Sev 1 | Customer blocked from revenue workflow: cannot quote, accept, sign, or progress critical execution. | Same business day during pilot hours |
| Sev 2 | Degraded workflow but workaround exists. | 1 business day |
| Sev 3 | Cosmetic issue, documentation help, or non-blocking support. | 2-3 business days |

These are placeholder support targets for pilot planning. They are not formal contracted SLAs unless a customer agreement says so.

## 5. Response process

1. Acknowledge the issue and capture customer impact.
2. Record workspace, user, record IDs, time, browser/device, and screenshot/log evidence.
3. Check whether the incident is role/capability, data state, environment, or deployment related.
4. Escalate based on severity and owner matrix.
5. Add resolution notes and follow-up action.
6. If security-related, update the security/advisor tracker and incident notes.

## 6. Non-claims

- No 24/7 support unless contracted.
- No formal SLA unless contracted.
- No SIEM unless configured.
- No automated incident paging unless configured.
- No production load support guarantee until production-scale proof is collected.
