# Claim Reconciliation — Pass 6

This reconciliation compares the major claims across `public/internal-dcc/index.html`, `README.md`, `docs/RELEASE_READINESS.md`, and `docs/INVESTOR_READINESS.md`. The DCC remains the single source of truth.

| Claim | Source | Status | Evidence | Required wording |
|---|---|---|---|---|
| Buyer confidence is ~92/100 after Pass 6 | DCC, README, RELEASE_READINESS | Partially proven | Pass 6 docs completed and live Supabase advisor posture inspected; external audit/WAF/advisor closure still pending. | “Buyer confidence is estimated at ~92/100 after Pass 6 documentation, reconciliation, and live Supabase inspection; 100/100 requires remaining proof.” |
| Core CRM workflow is 90–93% | DCC, README, RELEASE_READINESS | Partially proven | Lead/catalog/quote/order chain and golden journey are documented; dispatch/live ops proof remains pending. | “Core CRM workflow is 90–93% for the proven demo/pilot path.” |
| First paying customer readiness is 86–90% | DCC, README, RELEASE_READINESS | Partially proven | Admin onboarding, pricing guide, golden journey, and hardening docs exist; live ops and support evidence still pending. | “First paying customer readiness is 86–90%, assuming a managed pilot and known limitations.” |
| Security/RPC trust is 88–92% | DCC, README, RELEASE_READINESS | Partially proven | App-layer security tests and live RLS enablement checks exist; Supabase advisor findings remain. | “Security/RPC trust is 88–92% for app-layer gates and inspected posture, not full advisor closure.” |
| Live Supabase RLS/RPC posture is fully closed | Any doc | Not proven — remove or reword | 80/80 public tables have RLS enabled, but 39 RLS-enabled tables lack policies and RPC warnings remain. | “Live Supabase posture inspected; full RLS/RPC closure is not claimed.” |
| Mobile-native parity | README, DCC, investor materials | Not proven — remove or reword | Only trade-event capture wedge is classified as supporting. | “Mobile-native parity is not claimed.” |
| Trade-event capture | DCC, README, investor materials | Proven for wedge | `/contact-exchange/scan` is supporting and routed through `/workspace/capture`. | “Trade-event capture wedge is supported; full mobile workflow is not claimed.” |
| Live integrations | README, DCC, RELEASE_READINESS | Not proven — remove or reword | Integration tests and proof-mode mocks exist; no live ERP/freight connector proof. | “Live integration connectors remain deferred; proof-mode/mocks only today.” |
| WhatsApp delivery | Security policy, SOP, investor materials | Deferred / production concern | Provider key and delivery setup are required. | “WhatsApp delivery requires provider key/configuration and is not proven by repo alone.” |
| External audit | DCC, README, RELEASE_READINESS | Not proven — remove or reword | Audit prep checklist exists; no audit report. | “External audit preparation is complete; audit completion is not claimed.” |
| WAF/rate limiting | DCC, README, RELEASE_READINESS | Deferred / production concern | WAF plan exists; deployment enforcement not proven. | “WAF/rate-limit plan documented; production enforcement not proven.” |
| Secrets rotation | SECURITY_POLICY, README | Deferred / production concern | Manual rotation policy exists; no automated rotation. | “Manual key rotation policy documented; automated rotation is not claimed.” |
| Signed contract | DCC, README, investor materials | Partially proven | `signContractAction` and tests exist; live signed customer proof remains pending. | “Signed-contract gate exists; live signed customer contract proof remains pending.” |
| Dispatch/completion | DCC, README, RELEASE_READINESS | Partially proven | Order execution tests exist; live dispatch/completion proof missing. | “Dispatch/completion logic is tested; live dispatch proof remains pending.” |
| Golden journey Q-00025 | DCC, README, RELEASE_READINESS | Proven | Q-00025 and contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` are documented golden proof artifacts. | “Golden quote-to-draft-order journey is proven; do not mutate the record.” |
| Admin onboarding | DCC, README, SOP | Proven as SOP | Non-technical SOP exists. | “Admin onboarding SOP is documented; actual customer onboarding run remains future proof.” |
| NorthStar sprint 100% after Pass 6 | DCC, README, RELEASE_READINESS | Partially proven | Pass 6 documentation/reconciliation completed; remaining proof is production/customer rather than sprint scope. | “NorthStar sprint documentation scope is 100%; buyer confidence remains below 100.” |

## Required global wording

All public-facing documents should use these boundaries:

- “Prepared for external audit” instead of “externally audited.”
- “WAF/rate-limit plan documented” instead of “WAF protected.”
- “Live Supabase posture inspected” instead of “RLS fully proven.”
- “Managed pilot-ready” instead of “production-scale ready.”
- “Trade-event mobile wedge” instead of “mobile-native parity.”

## Decision

DCC, README, and RELEASE_READINESS have been reconciled to the same Pass 6 readiness scores. Investor-facing claims should follow the wording above.
