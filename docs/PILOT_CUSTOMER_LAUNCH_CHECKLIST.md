# SETU Flow CRM — Pilot Customer Launch Checklist

**Status:** Pass 7 pilot-readiness document  
**Scope:** First paying pilot preparation and launch-day operating checklist  
**Important:** This checklist prepares the pilot. It does not prove production scale, external audit completion, deployed WAF, live ERP/freight connectors, or mobile-native parity.

## 1. Pre-launch setup

| Setup item | What to confirm | Evidence needed | Status |
|---|---|---|---|
| Workspace owner confirmed | One accountable owner can access Admin and audit views. | Owner name/email recorded internally. | Required before pilot |
| Admin user confirmed | Admin can log in, invite users, and manage reference data. | Successful admin login screenshot or audit log. | Required before pilot |
| Organization settings complete | Admin → Organization has legal/company fields completed. | Organization profile reviewed. | Required before quote send |
| Approval threshold set | Start with `approval_threshold_pct = 10%` unless leadership approves another value. | Organization settings saved. | Required before quote send |
| Roles assigned | Use owner/admin/manager/sales/operations/sourcing/procurement/contributor/viewer deliberately. | Membership list reviewed. | Required before pilot |
| Products and pricing rules loaded | At least one product and one pricing rule set exist. | Catalog and pricing rule evidence. | Required before first quote |
| Quote-ready products confirmed | At least one product is toggled quote-ready. | Catalog row/detail screenshot. | Required before first quote |
| Reference lists configured | Markets, countries, categories, stages minimally configured. | Admin reference list review. | Required before lead creation |
| Supabase project health checked | Project remains active/healthy. | Supabase status/advisor note. | Required before launch |
| Known non-claims acknowledged | Pilot team understands current caveats. | Signed/internal go-live note. | Required before customer demo |

## 2. Pilot launch day checklist

1. First login: owner/admin logs in and confirms no membership error.
2. Organization review: Admin → Organization fields and approval threshold are verified.
3. Invite users: send invite links and assign roles deliberately.
4. Create/import first products: load the pilot product catalog subset.
5. Create first lead: add company, contact, country, and product interests.
6. Build first quote: select pricing basis, review line items, freight/FX, and approval state.
7. Send quote: send only after approval rules are satisfied.
8. Accept quote: capture quote acceptance through the app flow.
9. Create contract/order: verify accepted quote creates/links the order execution record.
10. Sign contract: use a new pilot record, not the frozen golden record.
11. Upload document evidence: attach required compliance/order documents.
12. Dispatch proof: add dispatch evidence only if actual dispatch occurred.
13. Audit log review: owner/admin reviews audit entries for each critical step.

## 3. Go/no-go checklist

### Must-have before launch

- Admin login works.
- Workspace membership exists.
- Organization settings and approval threshold are set.
- At least one quote-ready product exists.
- Reference lists are configured enough for lead and quote creation.
- The team understands current security and production caveats.
- Golden record Q-00025 remains untouched.

### Nice-to-have before launch

- Pilot-specific quote/contract proof record created.
- Support owner and escalation path assigned.
- Customer-specific pricing rules preloaded.
- Audit log review screenshots captured for the demo pack.

### Deferred items

- External security audit completion.
- Supabase advisor remediation closure.
- Deployed WAF/rate-limit proof.
- Production monitoring/alerting proof.
- Backup/restore drill evidence.
- Live ERP/freight connector evidence.
- Mobile-native full workflow.

### Explicit blockers

A pilot should not start if the admin cannot log in, there is no workspace membership, no quote-ready product exists, quote send fails, or owner/admin cannot inspect the audit trail.

## 4. Owner matrix

| Area | Owner | Backup | Evidence needed |
|---|---|---|---|
| Workspace and organization setup | Workspace owner | Admin user | Org settings screenshot / audit log |
| User invites and roles | Admin user | Workspace owner | Membership list and invitation status |
| Product/catalog readiness | Catalog operator | Admin user | Quote-ready product evidence |
| Pricing rule readiness | Pricing owner | Manager | Active rule set and line-item quote output |
| Lead and quote workflow | Sales owner | Manager | Lead ID, quote ID, quote send event |
| Contract/order proof | Operations owner | Workspace owner | Contract/order ID, status, audit log |
| Documents/compliance | Operations or compliance owner | Admin user | Upload metadata and review status |
| Security posture review | Technical owner | Supabase admin | Advisor review and known caveats |
| Customer support | Support owner | Workspace owner | Incident log and triage notes |

## 5. Pilot non-claims

- SETU Flow is not yet claimed as production-scale proven.
- External security audit is not complete unless a real third-party audit report exists.
- WAF/rate-limit enforcement is not deployed/proven unless platform evidence is captured.
- Live ERP/freight connectors are not proven; current connector posture remains proof-mode/mock unless actual provider evidence exists.
- Mobile-native parity is not claimed; current mobile truth is trade-event capture only.
