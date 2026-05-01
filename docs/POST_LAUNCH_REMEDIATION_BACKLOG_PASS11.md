# Post-Launch Remediation Backlog — Pass 11

Date: 2026-04-30  
Baseline: `SetuFlow-CRM-Pass10.zip`

This backlog collects the known blockers that must be closed after a controlled pilot and before broad production claims. Items seeded here are known pre-launch/post-launch tasks, not newly discovered audit findings.

| Item | Area | Severity | Owner | Required fix | Evidence to close | Status |
|---|---|---|---|---|---|---|
| Supabase advisor remediation | Security / database | High | Technical owner + Supabase admin | Apply reviewed migrations or configuration changes for advisor findings | Before/after Supabase advisor export showing closure or justified residual findings | Open |
| RPC grant hardening | Security / RPC | High | Technical owner | Revoke unsafe `anon` grants; retain only reviewed authenticated RPC access | Before/after RPC grant matrix and negative tests | Open |
| DB-level capability checks | Security / authorization | High | Technical owner | Implement DB helper mirroring workspace role/capability model | Migration, tests, and negative direct-RPC evidence | Open |
| External audit | Security / assurance | High | Founder + auditor | Complete third-party audit and remediation response | Auditor report and remediation tracker | Open |
| WAF/rate-limit deployment | Edge / abuse prevention | High | Vercel admin + technical owner | Configure WAF/rate-limit rules for public and sensitive routes | Provider screenshots/exports and test requests | Open |
| Monitoring/alerting | Operations | High | Technical owner + support owner | Configure deployment, DB, auth, error, uptime, WAF, and backup alerts | Alert configuration screenshots/exports and test alert evidence | Open |
| Backup/restore drill | Operations / data recovery | High | Supabase admin | Run documented backup/restore drill in safe environment | Drill log, recovery time, validation notes | Open |
| Live connector proof | Integrations | Medium | Product/technical owner | Prove at least one live ERP/freight/provider connector or keep mock-only wording | Connector run logs and failure handling evidence | Open |
| Signed contract proof | Revenue path | High | Operator + workspace owner | Create new pilot proof record and sign through app flow | Contract ID, signed timestamp, audit log, commercial lock evidence | Open |
| Dispatch/completion proof | Revenue path | High | Operator | Progress new pilot order through dispatch/completion only if real | Dispatch evidence, audit log, completion state if applicable | Open |
| First pilot evidence | Customer readiness | High | Founder + customer owner | Capture setup, usage, support, and feedback evidence | Completed pilot evidence review | Open |
| Mobile-native parity decision | Product claims | Medium | Founder/product owner | Decide whether to build native parity or permanently scope mobile to trade-event capture | Updated claim lock and docs | Open |

## Backlog rule

Do not remove items from this backlog unless the closure evidence is captured and linked from release readiness and the DCC.
