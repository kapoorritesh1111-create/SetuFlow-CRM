# Sprint 51 Trade Events — Final Test Gate

This checklist is the release gate for PR #78. Do not merge to `main` until all Critical and High tests pass, the production migration boundary is approved, and the user gives explicit merge approval.

## Gate 0 — Branch and CI baseline

- [ ] PR #78 is open, draft until acceptance, and targets `main`.
- [ ] PR head is based on the latest `main` with zero commits behind.
- [ ] PR is mergeable with no unresolved conflicts.
- [ ] Vercel preview build is READY / SUCCESS.
- [ ] GitHub DB type drift check is green.
- [ ] Trade Events regression suite is registered and green.
- [ ] No production Supabase migration is applied as an accidental side effect of preview testing.

## Gate 1 — Core navigation and responsive behavior — Critical

- [ ] Desktop `/trade-events` opens Trade Command Center with My Events / Discover Events / Past Events.
- [ ] Mobile `/trade-events` opens Event Mode without desktop layout overflow.
- [ ] Capture Lead opens exactly one canonical Quick Lead drawer/window.
- [ ] Closing Quick Lead closes it once; no second hidden responsive drawer reappears.
- [ ] Mobile bottom nav shows Home / Leads / Quotes / Orders / More.
- [ ] More exposes both Tasks and Events.
- [ ] After closing Quick Lead, user can return to Events through More without browser-back dependency.
- [ ] Trial users still follow the Trade Show Trial capture experience and do not receive full-CRM-only behavior.

## Gate 2 — Event identity and administration — Critical

- [ ] Current event selection prefers a live event, then nearest upcoming, then most recent completed.
- [ ] Exact duplicate event creation reuses / redirects to the existing event.
- [ ] Possible duplicate event creation warns the admin and allows an explicit override.
- [ ] Same-name events with incompatible dates/locations are not silently collapsed.
- [ ] PackPlus duplicate records are reconciled through canonical/duplicate linkage rather than destructive deletion.
- [ ] Add Event continues to work from the normal desktop shell.

## Gate 3 — Canonical Quick Lead event capture — Critical

- [ ] Event Capture Lead launches the normal Quick Lead UI, not a separate booth-only lead form.
- [ ] Initiating event ID is preserved.
- [ ] Initiating event name is preserved as source label.
- [ ] Source type is Trade Show / event context for a genuinely new event-acquired lead.
- [ ] Buyer and Supplier shortcuts preselect the correct lead type without changing the canonical UI.
- [ ] Manual entry and card/badge scan both keep event context.
- [ ] Existing CRM contact/company is linked rather than duplicated on an exact identity match.
- [ ] Existing CRM lead's original acquisition source is not overwritten.
- [ ] Repeat scan/capture creates another event interaction tied to the existing CRM lead.
- [ ] Possible identity matches remain reviewable instead of being silently merged.

## Gate 4 — Qualification and follow-up — High

- [ ] Packaging organization receives packaging progressive fields.
- [ ] Generic/non-packaging organization does not receive packaging-only fields.
- [ ] Dimensions can be Known or Don't know; unknown dimensions do not block capture.
- [ ] Artwork readiness accepts unknown/not ready/in progress/ready.
- [ ] Sample-needed state is retained.
- [ ] Voice capture produces suggestions but does not mutate fields until the user applies them.
- [ ] Follow-up promises include catalog, price, sample, artwork, call, and meeting choices.
- [ ] Today / Tomorrow / After event timing is persisted.
- [ ] Linked CRM leads receive a scheduled task / next action.
- [ ] Hot / Interested / Review Later SLA values are retained and visible to Command Center.

## Gate 5 — Offline and low-signal capture — Critical

- [ ] Explicit Low signal / Save offline entry point works on mobile.
- [ ] Device can save an offline event lead with no network.
- [ ] UI clearly says the lead is saved on this device, not synced.
- [ ] Queue count is visible and accurate.
- [ ] Queue automatically attempts sync after browser `online` event.
- [ ] Manual Sync now works.
- [ ] Successful sync removes the queued item.
- [ ] Failed sync remains recoverable and exposes retry state.
- [ ] Queue never exceeds 150 retained captures.
- [ ] Captures older than seven days are pruned according to queue policy.
- [ ] Browser storage failure is surfaced; UI must not falsely confirm persistence.
- [ ] Replaying the same `client_capture_id` does not create a duplicate CRM lead/event interaction.
- [ ] Reconnect race / double-tap retry does not create duplicates after DB idempotency migration is live.

## Gate 6 — Attachments and conversation evidence — High

- [ ] Conversation Evidence panel shows recent event interactions.
- [ ] Before migration rollout, attachment UI degrades safely and explains that storage is staged.
- [ ] After migration rollout, JPG upload works.
- [ ] PNG upload works.
- [ ] WebP upload works.
- [ ] PDF upload works.
- [ ] Unsupported file type is rejected.
- [ ] File larger than 10 MB is rejected.
- [ ] More than five files in one upload attempt is rejected.
- [ ] Uploaded object is private and only visible to members of the owning organization.
- [ ] Metadata insert failure rolls back the uploaded storage object.
- [ ] Attachment count appears against the correct interaction.

## Gate 7 — Guru Discover recommendations — High

- [ ] Discover shows no fabricated fallback events when catalog query is unavailable.
- [ ] Past/expired events are excluded.
- [ ] Cancelled events are excluded.
- [ ] Events already attended as an exact match are excluded.
- [ ] Not Relevant feedback excludes the dismissed event.
- [ ] Vertical/industry evidence contributes to scoring.
- [ ] Product catalog match contributes to scoring.
- [ ] Active market match contributes to scoring.
- [ ] Prior-edition qualified conversations / orders / ROI contribute evidence.
- [ ] Event with no supporting evidence is not recommended.
- [ ] Recommendation reasons shown to the user match the scoring evidence.

## Gate 8 — Attribution, funnel, history and ROI — Critical

- [ ] Direct event leads are counted.
- [ ] Existing CRM leads linked through `converted_lead_id` are counted as event influence.
- [ ] Event influence does not overwrite original CRM source.
- [ ] Event-associated scheduled follow-ups appear in operational metrics.
- [ ] Quotes for influenced event leads are included.
- [ ] Orders for influenced event leads are included.
- [ ] Past Events shows captured and qualified conversation counts.
- [ ] Past Events shows quote/order outcomes.
- [ ] Event spend categories save and reload correctly.
- [ ] Revenue/spend multiple is calculated only when spend and revenue currency match.
- [ ] Mixed-currency revenue is not combined into a misleading ROI number.
- [ ] Historical performance can influence a future recommendation for the same event series.

## Gate 9 — Database release boundary — Critical

Apply only after explicit release approval and in this order:

1. `20260817173000_s51_event_trade_event_catalog_foundation.sql`
2. `20260817180000_s51_event_interactions_feedback_attachments.sql`
3. `20260818101500_s51_event_offline_capture_idempotency.sql`

Then verify:

- [ ] Migration 1 applies cleanly and canonical event catalog/RLS are present.
- [ ] Migration 2 applies cleanly and feedback, private attachment metadata, private storage bucket, and org RLS are present.
- [ ] Migration 3 applies cleanly and offline idempotency uniqueness is present.
- [ ] Generated database types are regenerated from project `sjzfzloggabsmcuxktnl`.
- [ ] DB type drift CI remains green after generated type refresh.
- [ ] Existing Trade Show Trial data remains readable.
- [ ] Existing event records remain readable.
- [ ] PackPlus duplicate reconciliation is completed and documented.
- [ ] No cross-organization catalog attendance, attachment, feedback, or capture data leak is possible.

## Gate 10 — Regression and security — Critical

- [ ] Leads page works normally when not entered from an event.
- [ ] Quick Lead works normally when not entered from an event.
- [ ] Card scan works normally outside Event Mode.
- [ ] Mobile Leads does not open duplicate scanner/drawer surfaces.
- [ ] Desktop navigation remains intact.
- [ ] Tasks remain reachable on mobile through More.
- [ ] Quotes and Orders mobile navigation remains intact.
- [ ] Organization A cannot read/write Organization B event attendance/interactions/attachments/feedback.
- [ ] Unauthenticated users cannot access private Trade Event CRM data.
- [ ] Trial entitlement boundaries remain enforced.
- [ ] No hard-coded stale event recommendations are present.
- [ ] No production errors are introduced in Vercel preview smoke testing.

## Final approval record

All Critical tests must be PASS. High tests should be PASS unless a deviation is explicitly accepted and recorded.

- Final Vercel preview deployment: ____________________
- Final PR head SHA: ____________________
- DB migrations applied: Yes / No
- Generated types refreshed: Yes / No
- PackPlus reconciliation complete: Yes / No
- SMC evidence refreshed for S51-EVENT-018 through S51-EVENT-041: Yes / No
- User final acceptance: Yes / No
- Approved to merge PR #78 to `main`: Yes / No
