# Current Release Status

_Last updated: 2026-06-20_

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

## SF-19-016 Checkpoint

- Added `/admin/client-management` as the SETU Flow HQ-only client management console.
- Unified client onboarding, provisioning, plan controls, seats, module access, and Guru usage into one internal screen.
- Added source migration for `client_entitlements` and `client_usage_rollups`.
- Kept `/admin/modules` and `/admin/client-onboarding` as guarded redirects to the unified internal route.
- Added module direct-route access guard for client workspaces.

## 2026-06-20 Sprint 34 — Catalog Sharing, Price Lists & Buyer Experience

Catalog sharing shipped end to end and deployed green to production across ten atomic commits. The feature lets a sales user build buyer-specific price lists, share a curated catalog as a secure link, track buyer engagement, and convert buyer selections into a draft quote — with an anonymous, branded buyer surface that never exposes the CRM.

### Delivered (all 25 sprint issues)
- **Price Lists** (`/price-lists`) — reusable lists with MOQ-based tiers, currency, incoterm, validity.
- **Catalog Hub** (`/catalog`) — KPI strip + Products (readiness badges), Price Lists, Shared Links manager, Analytics dashboard (recharts).
- **Share wizard** — 5 steps (products → price list → controls → message → review); Copy/WhatsApp/Email/QR; save-as-draft; launchable from a lead ("Send Catalog").
- **Buyer share room** (`/catalog/share/[token]`) — token validation, PIN gate, branded expired/revoked/not-found pages, tier-priced cards, MOQ-validated cart, Ask-a-Question, Request Quote, watermarked catalog PDF (gated), mobile-responsive.
- **Engagement tracking** — full event taxonomy in `catalog_share_events`; lead-timeline activity feed; Shared Links manager (filters, extend/revoke, statuses).
- **Quote conversion** — buyer selections → draft `quotes` + `quote_line_items` (tier-priced), linked back to the share; rejoins the standard quote pipeline.
- **Setu Guru catalog AI** — product recommendations, missing-data warnings, message drafting, engagement summaries; all assistive and degrade gracefully to deterministic templates when AI keys are absent.

### New tables (additive, RLS-on)
`price_lists`, `price_list_items`, `price_list_tiers`, `catalog_shares`, `catalog_share_products`, `catalog_share_events`, `buyer_selections`. Each has one `is_org_member` policy (parents direct, children via parent `EXISTS`); no inline `organization_members` subqueries; no anon policies. The buyer surface reaches data only through token-validated service-role endpoints under `/api/public/catalog-share/<token>/`. `products` and `product_variants` gained export-ready fields; `quotes`/`quote_line_items` reused for conversion.

### Verification posture (honest)
- All ten chunk builds are green in production, so the full sprint type-checks under `next build`.
- A programmatic QA pass verified RLS on all seven tables, the public/internal boundary, capability gating on writes, schema integrity of every written column, and the absence of build-killers.
- The 25 tracker issues are `in_review`, not resolved — they await the owner's manual interactive confirmation (incognito buyer room, PIN gate, expired/revoked pages, channel rendering, mobile at 375/768/1280, and regression of categories/product-import/pricing/leads/quotes).

### Known follow-ups for this feature
- Set `OPENAI_API_KEY` and `SETU_GURU_MODEL` in Vercel to switch the catalog AI from deterministic fallback to live GPT (`gpt-4.1-mini` via the server-side `/v1/responses` pattern — not the spec's outdated `NEXT_PUBLIC_SETU_GURU_URL`).
- Product category matching uses product name + country_of_origin: `products` has `category_id` (FK), not `category_type`.
- Backlog: DB-enforced expiry (cron), clone price list/share, CSV import/export of price-list items, per-variant spec-sheet downloads in the buyer room, Analytics filter UI, tier-overlap validation.

### Documentation refreshed alongside the sprint
- Setu Guru knowledge files (`docs/setu-guru/`) — catalog-sharing workflow, troubleshooting, and setup guidance.
- SMC internal docs workspace (`public/internal/setuflow-docs-workspace.js`) — Products & Catalog catalog-sharing section, a Catalog Sharing workflow in Commercial Workflows, a Catalog Sharing flowchart in Flow Diagrams, and a Setu Guru catalog assistant card.
