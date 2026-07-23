# Sprint 46 — Setu Guru Final Release Validation

## Scope

This release closes the Setu Guru Growth Agent delivery across Sprints 42–46: recommendations, Growth Center, dashboard strip, ICP setup, CRM-grounded research, opportunity scoring, outreach drafts, reply analysis, quote readiness, supplier RFQ assistance, supplier comparison, trade-event assistance, and consolidated activity/approval audit history.

## Production guardrails

- Every authenticated query is scoped to the active organization.
- Recommendation, communication, audit-log, and ICP-profile access is protected by organization membership policies.
- Setu Guru never sends email or WhatsApp autonomously.
- AI-assisted outreach is saved only as `status: draft` with `draft_source: ai`.
- Quote and RFQ assistants remain read-only and do not write commercial records.
- Approved Setu Guru actions require explicit approval and store actor, linked entity, timestamp, payload, and idempotency evidence.
- Missing human-approval evidence is shown as attention required in the audit panel.
- Unsupported quote and RFQ detail routes are prohibited by automated tests.

## Automated release gate

The production `build` command runs `npm run test:growth-agent` before `next build`.

The Growth Agent release suite includes:

- `tests/s42-setu-guru-growth-agent.test.mjs`
- `tests/s43-setu-guru-icp-research.test.mjs`
- `tests/s44-setu-guru-outreach-reply.test.mjs`
- `tests/s45-setu-guru-quote-supplier.test.mjs`
- `tests/s46-setu-guru-trade-events.test.mjs`
- `tests/s46-setu-guru-audit-hardening.test.mjs`

A deployment cannot become READY if this suite, TypeScript validation, or Next.js production compilation fails.

## Database verification

Verified live policies for:

- `org_icp_profiles`
- `ai_recommendations`
- `communications`
- `audit_logs`

All user-facing reads are restricted to active organization membership. No new database table was required for the final audit because existing recommendation lifecycle, communications, and audit logs already provide the durable source records.

## Production smoke checklist

Owner UAT should verify:

1. `/dashboard` keeps the compact Setu Guru strip.
2. Top-three overlay shows identified, diverse actions.
3. `/growth-agent` loads recommendations, opportunities, events, and audit history.
4. `/growth-agent/icp` saves and reloads the seven-step ICP profile.
5. Buyer and supplier research drawers use only CRM-grounded facts.
6. Outreach drafts save to CRM as drafts and never send automatically.
7. Reply Analyzer returns suggestions without applying stage changes.
8. Quote readiness links into the supported quote builder.
9. Supplier RFQ Assistant produces a copyable brief without submitting an RFQ.
10. Supplier comparison does not invent price or lead-time data.
11. Trade-event assistant displays pre-show, post-show, and summary views.
12. Audit history displays actor, linked entity, reason/source context, outcome, and timestamp.
13. Desktop and mobile layouts remain usable.
14. Browser console and Vercel runtime logs contain no new errors.

## Known product limitations

These are intentional current-scope limits, not hidden defects:

- Supplier RFQ Assistant creates a copyable brief rather than prefilling gated RFQ forms.
- Supplier comparison excludes price and lead time because those fields are not structured in the current data model.
- Post-show queues cannot filter completed meetings because no meeting-completion data source exists.
- Public enrichment remains outside the current CRM-grounded phase.

## Rollback

1. Revert the final Sprint 46 commits on `main`.
2. Redeploy the last known-good READY deployment.
3. No database rollback is required for the audit panel or release-gate changes.
4. Retain `org_icp_profiles` and existing recommendation/activity history unless data-retention approval explicitly authorizes deletion.
