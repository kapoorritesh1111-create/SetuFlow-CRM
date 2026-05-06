# Current Release Status

_Last updated: 2026-05-06_

## Status

The repo has completed a cleanup/documentation consolidation pass. The active package now keeps product truth in application source, tests, Supabase migrations, and Markdown documentation. Static reference HTML handoff files are paused and removed for now.

## Confirmed during this pass

| Area | Result |
| --- | --- |
| Repo package | Full uploaded zip was inspected before docs were rewritten. |
| Reference HTMLs | Removed from active package. Tests now guard against accidental reintroduction. |
| Docs | README and active docs were consolidated around the current product, schema, and cleanup policy. |
| Supabase | Live project `SETU Flow CRM` (`sjzfzloggabsmcuxktnl`) reviewed before README update. |
| Mobile | Mobile route/docs tests now point to `docs/MOBILE.md` and `docs/MOBILE_SCAN_PRODUCTION.md`. |
| Smoke tests | 69/69 passed | `npm test` passed after cleanup updates. |
| Clean verification | Passed | `npm run clean:verification` reported clean artifacts. |
| Local state | `supabase/.temp/` removed from the package. |

## Live Supabase posture

- Project status is `ACTIVE_HEALTHY`.
- Public schema includes organization, lead, pipeline, quote, product, pricing, trade-event, document, compliance, AI, onboarding, import/staging, and role/access tables.
- Pricing SSOT is `pricing_rule_sets` + `product_pricing_rules`.
- Quote commercial SSOT is `quote_versions` + `quote_version_line_items`.
- Communications SSOT is `communications`.
- AI draft/review SSOT is `ai_suggestions`.

## Known follow-ups

| Follow-up | Why it matters |
| --- | --- |
| RLS policy completion | Several RLS-enabled tables currently have no policies. |
| Security-definer view review | `active_product_pricing_rules_v` is advisor-flagged. |
| RPC execution hardening | Multiple `SECURITY DEFINER` functions are callable by exposed roles and need deliberate grants/revokes. |
| Function search paths | Several functions need explicit search path hardening. |
| Auth password protection | Leaked password protection is disabled. |
| Build verification | Run full CI/build in a dependency-installed environment after pulling this cleanup package. |

## Release posture

This cleanup improves handoff quality and removes stale static artifacts, but it does not replace a dedicated database security-hardening migration or full production CI run.

## 2026-05-06 Setu Guru update

- Embedded Setu Guru is now wired into the authenticated app shell as a small bottom-right bot avatar with right-drawer help.
- Users can hide Setu Guru and restore it from a right-edge Guru tab.
- `docs/setu-guru/` now contains chatbot-ready onboarding, workflow, troubleshooting, repo-review, learning-loop, and GPT build instructions.
- Runtime assets for the bot and diagrams live in `public/setu-guru/`.
- Current widget uses route-aware static knowledge and local feedback capture; a future backend pass should persist feedback and connect live retrieval/generation.
