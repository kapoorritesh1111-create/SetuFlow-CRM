# Pass 15 Organization Setup Redesign Brief

Last updated: 2026-05-01

## Problem

The current `/admin/organization` experience is titled **Organization setup**, but behaves like an Admin dashboard. It lists modules and counts, but it does not provide a clear setup path for a new SaaS customer buying SETU Flow.

## Product intent

Organization Setup should help a customer configure their workspace before creating commercial records. The admin overview can remain, but it should be clearly named **Admin Command Center** or moved below the setup flow.

## Required setup sections

| Section | Required fields/actions | Notes |
|---|---|---|
| Organization profile | Organization name, legal name, country, website, logo/brand, primary contact email | First visible setup block. |
| Commercial defaults | Default currency, approval threshold, default pricing basis, incoterm preference, quote footer/company details | Explain `approval_threshold_pct` plainly. |
| Team setup | Owner, admins, invitations, role assignment | Link directly to team/invitation flows. |
| Reference data | Markets, countries, categories, stages, pipelines | Required before reliable lead routing/quotes. |
| Catalog readiness | At least one product, one price/rule, quote-ready toggle | Link to Product Management. |
| Security & governance | Roles, permissions, audit log, advisor/security notes | Do not say governance clear if warnings remain. |
| Setup progress | Checklist with completion state and next action | Drives onboarding. |

## Acceptance criteria

- New SaaS customer can understand what to do first.
- Organization Setup contains actual setup/edit affordances, not only dashboard cards.
- Governance banner matches the real security/governance state.
- `Open product management` is no longer the only obvious action.
- Admin Command Center remains accessible for operators, but is not confused with first-time setup.
