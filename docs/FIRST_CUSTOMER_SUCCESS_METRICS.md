# SETU Flow CRM — First Customer Success Metrics

**Status:** Pass 7 pilot success metrics  
**Purpose:** Define what success means for the first paying pilot without overstating production readiness.

## 1. Pilot success definition

A first pilot is successful when the customer can move from admin setup to first governed quote and accepted quote/order handoff with minimal developer help, while known caveats are understood and do not surprise the customer.

## 2. Activation metrics

| Metric | Target | Evidence source | Status |
|---|---:|---|---|
| First admin login | Same day as onboarding | Login/audit evidence | Pending pilot |
| First catalog item | Day 1 | Catalog record | Pending pilot |
| First quote-ready product | Day 1 | Product quote-ready state | Pending pilot |
| First lead | Day 1 | Lead record | Pending pilot |
| First quote sent | Within pilot week | Quote status + audit log | Pending pilot |
| First quote accepted | Pilot dependent | Quote status + audit log | Pending pilot |
| First signed contract | Pilot dependent | Contract `signed_at` + audit log | Pending live proof |
| First dispatch evidence | Pilot dependent | Dispatch proof metadata | Pending live proof |

## 3. Operational metrics

| Metric | Target | Evidence source | Status |
|---|---:|---|---|
| Time to first quote | Same day after setup for simple catalog | Quote timestamp | Pending pilot |
| Time from accepted quote to contract | Same day after acceptance if blockers are clear | Quote/contract timestamps | Pending pilot |
| Manual overrides | Minimize; every override must have reason | Quote audit trail | Pending pilot |
| Approval escalations | Expected when threshold exceeded | Approval state/audit | Pending pilot |
| Blocked orders | Zero unexpected blockers | Order blocker list | Pending pilot |
| Support tickets | Track all | Support log | Pending pilot |
| Failed imports | Track count and cause | Import run/issues | Pending pilot |
| Failed integrations | Track count and provider | Integration events | Pending; live connectors not proven |

## 4. Buyer confidence metrics

- Admin can onboard without developer help.
- Operator can build quote without developer help.
- Owner can audit quote/order history.
- Document/compliance blockers are visible.
- Known non-claims do not surprise the customer.

## 5. Metrics table

| Metric | Target | Evidence source | Status |
|---|---:|---|---|
| Admin self-setup | Complete with SOP | Admin onboarding checklist | Pending pilot |
| Operator quote build | Complete without developer help | Quote ID and user notes | Pending pilot |
| Owner audit review | Audit entries visible | Admin → Audit | Pending pilot |
| Compliance visibility | Blockers visible before dispatch | Order detail panel | Pending pilot |
| Caveat acceptance | Customer understands non-claims | Pilot kickoff notes | Pending pilot |
| Live signed contract proof | Real signed contract on new pilot record | Contract timestamp + audit | Pending |
| Live dispatch proof | Real dispatch evidence on new pilot record | Dispatch metadata + audit | Pending |

## 6. Non-claims

These metrics do not prove external audit completion, deployed WAF, production-scale load, live connector reliability, or mobile-native parity.
