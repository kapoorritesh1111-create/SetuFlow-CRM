# Changelog
- Added first-admin invite email flow: Setu admins can now send the client-facing owner/admin account creation link from onboarding without manually creating Supabase Auth users.

## Current clean baseline

- Added SaaS Workspace Provisioning Wizard for client onboarding.
- Provisioning now creates/uses a unique organization ID, seeds all country reference rows, markets, pipelines, stages, next steps, roles, pricing starter settings, and first owner invitation metadata.
- Client Onboarding is now Setu-internal only at route/sidebar/RLS-policy levels.
- Wildcard workspace domain model supports `companyname.setuflowcrm.com` via `*.setuflowcrm.com`.
- Added admin-side onboarding notification retry: each submitted request now has a **Notify Setu admin** action backed by Mailtrap.
- Consolidated onboarding email delivery into `src/features/client-onboarding/server/notifications.ts` so public submission and admin resend use the same Mailtrap-first provider configuration.
- Added regression coverage for onboarding Mailtrap notification resend wiring.
- Removed historical archive folders and duplicate/retired HTML files from the active repo.
- Promoted the current product state to the baseline instead of maintaining pass-by-pass handoff files.
- Renamed pass-numbered regression test files to feature-based names where safe.
- Updated README, current docs, internal DCC HTML, mobile blueprint HTML, and reference HTML handoff notes.
- Preserved required deployment history in database migration folders.
- Preserved current test-result format in the internal DCC.

## Current product state

- Public `/onboarding` client request form is accessible without login.
- Onboarding submission uses `POST /api/public/client-onboarding`.
- Admin receives onboarding notification when email variables are configured.
- Admin setup link targets `/admin/client-onboarding?request=<request_id>`.
- Workspace URL rule is `companyname.setuflowcrm.com`.
- Setu Flow logo is the fallback when no client logo is provided.
- Admin provisioning seeds all countries plus editable markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings.
- Product categories and detailed pricing rules remain client-specific setup after first login.
- Admin-shell hydration guard is included for desktop-only redirect behavior.
- Internal DCC and reference HTMLs reflect the current baseline.

## Verification

```text
npm test
68/68 tests passed
```

## Homepage marketing redesign
- Rebuilt the public homepage around the new Setu Flow positioning: “Bridge the gaps in your business — shore to shore.”
- Added a SaaS-style product narrative for trade command center, follow-up control, guided quoting, execution desk, trade events, catalog/pricing, and commercial intelligence.
- Added polished marketing screenshot assets under `public/marketing/` using the supplied product screenshots.
- Added `public/reference-html/setuflow-homepage-marketing-redesign.html` as a static reference matching the homepage structure.

## Homepage redesign v3 - full SaaS level

- Rebuilt the public homepage into a premium SaaS marketing experience while preserving Setu Flow brand colors.
- Added futuristic dark hero, product positioning, CRM comparison, icon-driven capabilities, real screenshot showcases, and mobile-first proof section.
- Added mobile screenshot assets under `public/marketing/`.
- Updated `src/components/marketing/site-shell.tsx` with a more polished navigation and CTA structure.

## Login UX + Profile Menu Upgrade
- Upgraded the client login form with a premium branded input treatment, show/hide password toggle, and collapsed password reset helper.
- Added a profile dropdown to the authenticated desktop/mobile header avatar with user details, role/org context, Profile, Settings, vCard, and Sign out actions.
- Added sign-out access to the canonical mobile quick actions drawer so mobile users can safely end their session.

## Homepage refinement v5 - product-leader feedback pass

- Rebuilt the public homepage around the latest product-leader feedback for a more premium SaaS structure.
- Simplified the hero into a sharper value proposition with one dominant product screenshot, glow/depth treatment, and clear Book Demo / Explore Platform CTAs.
- Added an emotional category-creation section: where CRMs stop, trade teams still have execution work to do.
- Reworked the workflow into a modular Capture -> Qualify -> Quote -> Approve -> Execute section with a mid-page CTA.
- Added "Built for" audience clarity for exporters, importers, trading companies, and sourcing teams.
- Added social-proof-style operating metrics using current demo data without inventing customer logos.
- Reduced mobile proof to three focused phone frames instead of an overwhelming long mobile gallery.
- Simplified the comparison table and added pricing clarity cards to improve conversion readiness.
- Preserved Setu Flow brand colors and existing marketing screenshot assets.

## Verification

- `npm ci --ignore-scripts` completed enough to stage dependencies in the container, but the tool returned a client-side error without detailed output.
- `npm run typecheck` started successfully but timed out in the container before completion.

## V6 production conversion homepage
- Rebuilt the marketing homepage around the provided conversion wireframe strategy.
- Removed all free-trial and credit-card messaging.
- Updated pricing to Starter $199/month up to 5 users, Growth $499/month up to 10 users, Enterprise custom.
- Promoted the comparison table as the main conversion section.
- Added motion classes, premium screenshot frames, concise mobile showcase, connection-layer section, and demo-led CTAs.
