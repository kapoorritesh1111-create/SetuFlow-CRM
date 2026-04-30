# Security hardening

## Scope of this document

This file explains what PR-35 actually hardens in the repo and what remains outside repo scope.

## What is completed in repo truth

### 1. Central browser-facing header posture

`middleware.ts` now applies baseline response-security headers centrally:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Permissions-Policy`

This matters because the shipped baseline no longer relies on implied deployment defaults for basic browser-facing protection.

### 2. One clearer control point

Redirect logic and response hardening are now visible in one middleware layer. That makes repo review simpler during handoff and diligence because reviewers can see both behavior and posture in one place.

### 3. Setup and verification clarity

The repo now documents:

- expected Node and npm versions
- install path
- local run path
- verification path

That reduces accidental misconfiguration during onboarding or diligence walkthroughs.

### 4. Repo hygiene guidance

The repo now explicitly distinguishes:

- active truth surfaces
- historical planning/docs
- generated or transient artifacts

This is not “security” in the narrow sense, but it materially improves release confidence and reduces operational confusion.

## What remains deferred to operations / production

The repo does not itself prove:

- secrets rotation
- cloud IAM policy discipline
- network controls or WAF rules
- live rate limiting posture
- centralized production logging / alerting
- backup / restore drills
- third-party penetration testing
- SOC 2, ISO, or any external certification

Those must be handled in the deployment environment and operating process.

## Why this pass still matters

PR-35 raises trust without pretending too much.

It makes the product easier to inherit, easier to inspect, and harder to misrepresent. That is exactly the right hardening claim for a repo-centered pass.

## Hardening rule

No hardening change should weaken the product contract:

- catalog/base price stays default truth
- override reason stays mandatory
- approval remains mandatory when policy threshold is met
- communications, integrations, and AI remain downstream of governed commercial truth

## PR-NS-20 quote/order RPC hardening

Date: 2026-04-30

Scoped live hardening applied for quote/order workflow functions:

- Revoked broad `PUBLIC` execution from quote/order SECURITY DEFINER workflow RPCs.
- Granted execution back to `authenticated` so server-side authenticated app flows remain available.
- Pinned quote/order helper and trigger functions to `search_path=public`.
- Re-verified Q-00025 accepted quote and linked contract/order execution record after hardening.

Functions scoped in this pass include quote create/update/send, accepted quote contract handoff, quote contract snapshot, contract sync/progression, and contract workspace update RPCs. Broader non-quote/order advisor findings remain queued for a later security pass.
