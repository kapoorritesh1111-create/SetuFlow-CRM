# WAF and Rate-Limiting Plan — Pass 6

This document defines the production WAF and rate-limiting posture SETU Flow should have before stronger production/customer claims. It is a plan, not proof of deployed WAF enforcement.

## Current repo posture

- Middleware sets security headers including CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Cross-Origin-Opener-Policy`.
- A `rate_limit_hits` table exists in the live Supabase schema, but production-grade edge/WAF enforcement is not proven by the repo.
- The repo has role/capability tests for application-layer protected actions.
- Public and semi-public flows still require deployment-level abuse controls.

## What is not proven today

- No production WAF configuration evidence is included in the repo.
- No load-tested abuse posture is included.
- No SIEM or alert routing is configured in repo-level evidence.
- No provider-level DDoS or bot-management proof is included.
- No final per-route production rate limits have been validated under traffic.

## Recommended production controls

- Vercel Firewall / edge WAF or equivalent.
- Per-IP rate limits for unauthenticated routes.
- Per-user and per-workspace rate limits for authenticated write actions.
- Bot protection for public card/intake and auth surfaces.
- Upload size/type enforcement at both app and storage layers.
- Abuse monitoring for repeated auth failures, invitation attempts, quote-share access, and upload failures.
- Alert routing to the workspace owner / technical operator.
- Audit log correlation for security events.

## Route risk table

| Route / Area | Risk | Recommended control | Status |
|---|---|---|---|
| Login/auth | Credential stuffing, brute force, leaked passwords | Supabase leaked-password protection, per-IP auth throttle, bot protection, alerting | Planned / environment |
| Public card intake / contact exchange scan | Spam lead capture, automated submissions | Per-IP and per-device throttles, captcha/bot challenge if abused, audit lead source | Planned / environment |
| Quote share / public quote routes | Enumeration, scraping, unauthorized access | Tokenized links, short-lived share tokens where possible, per-IP throttles, access logging | Needs route review |
| Product upload / spreadsheet ingestion | Large-file abuse, malformed files, import DoS | File size/type limits, import queue limits, per-workspace throttles, validation failure alerting | Planned / app+infra |
| Order document upload | Malicious upload, storage cost abuse, unauthorized access | MIME/extension checks, size limits, virus scanning if enterprise, signed URLs, workspace RLS/storage policies | Planned / app+infra |
| Admin invitation routes | Invite spam, role escalation attempts | Admin capability gate, per-admin throttles, invitation audit logs, revoke/expiry controls | Partially app-gated |
| AI routes / draft generation | Provider cost abuse, prompt injection, data exposure | Per-user quotas, review queue, provider key isolation, audit prompts/decisions, no auto-send | Planned / app+ops |
| Webhook / integration routes | Forged events, replay, queue flooding | Provider signature verification, replay protection, per-provider rate limits, dead-letter queue | Deferred until live connectors |
| Supabase RPC direct calls | Direct function invocation bypassing UI | Revoke anon where not public; add database-level capability checks; monitor REST RPC errors | Needs hardening plan |

## Recommended ownership

| Control | Owner | Evidence needed |
|---|---|---|
| WAF policy | Technical owner / Vercel admin | Screenshot/export of deployed firewall rules |
| Auth throttling | Technical owner / Supabase admin | Supabase Auth settings and test output |
| Upload limits | App owner + storage admin | Route/storage config and negative tests |
| Alert routing | Operations owner | Alert destination, test alert, runbook |
| Abuse review | Workspace owner | Weekly audit-log review procedure |

## Non-claims

- No production WAF proof in repo today.
- No SIEM alert routing today.
- No load-tested abuse posture today.
- No provider-level DDoS evidence in repo.
