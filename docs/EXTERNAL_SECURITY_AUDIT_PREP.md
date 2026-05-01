# External Security Audit Preparation — Pass 6

SETU Flow CRM is ready to prepare for a third-party security review, but the audit is not complete. This checklist defines scope, artifacts, questions, and evidence gaps.

## Audit scope

- Web app and Next.js middleware.
- Supabase database, schemas, grants, RPCs, and RLS policies.
- Authentication and session handling.
- Public API routes and public share/intake surfaces.
- File and document upload paths.
- Quote, order, contract, document, and compliance workflow RPCs.
- Admin, membership, invitation, and role-management flows.
- AI/provider integrations if configured.
- Communication / WhatsApp delivery if provider keys are configured.
- Audit logging and incident investigation path.

## Artifacts to provide auditors

- `README.md`
- `public/internal-dcc/index.html`
- `docs/SECURITY_POLICY.md`
- `docs/SECURITY_HARDENING.md`
- `docs/SECURITY_HARDENING_REVIEW_PASS5.md`
- `docs/SUPABASE_ADVISOR_REVIEW_PASS6.md`
- Supabase schema export and RLS policy export.
- Supabase function/RPC grant export.
- Middleware CSP/header configuration.
- Test commands and latest test output.
- Known non-claims and deferred production controls.
- Incident-response and compromise-response procedure.

## Questions auditors should answer

- Can a lower-privilege user perform restricted write actions through UI, server actions, API routes, or direct RPC calls?
- Can viewer, sales, operations, sourcing, procurement, contributor, manager, admin, or owner roles cross workspace boundaries?
- Can service-role usage leak into client code or browser bundles?
- Can quote/order/contract RPCs be executed by unintended users?
- Can uploaded documents be accessed outside intended workspace boundaries?
- Are public routes rate-limited and abuse-resistant?
- Are CSP and security headers sufficient for enterprise demo and early customer pilot posture?
- Do SECURITY DEFINER functions set fixed `search_path` and enforce authorization internally?
- Are invitation and membership RPCs isolated from unauthenticated callers?

## Pre-audit self-checklist

| Item | Status | Evidence / Gap |
|---|---|---|
| `unsafe-eval` absent from middleware CSP | Ready | Confirmed in Pass 5 hardening review. |
| Service-role key server-only | Ready | `SUPABASE_SERVICE_ROLE_KEY` is documented as server-only; admin client review completed. |
| No real secrets in repo | Ready for audit review | Repo policy says secrets live in `.env.local` / Vercel, not source. Auditor should scan. |
| `npm run test:all` passes with dependencies installed | Needs evidence | Extracted handoff container lacks `tsx`; expected count is 259. |
| RLS/security tests included | Ready | Pass 5 security tests included. |
| Golden record not mutated | Ready | Pass 6 was read-only; Q-00025 and contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remain proof artifacts. |
| Known limitations documented | Ready | README, DCC, RELEASE_READINESS, and Pass 6 docs state non-claims. |
| Supabase advisor findings closed | Needs evidence | Findings remain open as of read-only GPT Supabase connector inspection. |
| WAF/rate limiting enforced | Deferred | Production infra evidence not in repo. |
| External audit completed | Deferred | This document prepares the audit; it does not claim completion. |

## Audit readiness status

| Area | Status | Notes |
|---|---|---|
| App-layer permission tests | Ready | Role/capability boundary tests exist. |
| Supabase RLS enablement | Ready baseline | All 80 public base tables have RLS enabled. |
| Supabase policy completeness | Needs evidence | 39 RLS-enabled tables have no policies and require classification. |
| RPC grants | Needs evidence | Privileged anon/authenticated SECURITY DEFINER RPC warnings remain. |
| Middleware headers | Ready for audit | CSP/header review completed; auditor should retest deployed response headers. |
| Secrets policy | Ready | Manual process documented; automated rotation not claimed. |
| WAF/rate limiting | Deferred | Plan documented separately; production enforcement not proven. |
| Production monitoring/SIEM | Deferred | Not configured in repo. |

## Non-claims

This repository does not claim that an external audit has occurred. It provides the checklist and evidence pack needed to start one.
