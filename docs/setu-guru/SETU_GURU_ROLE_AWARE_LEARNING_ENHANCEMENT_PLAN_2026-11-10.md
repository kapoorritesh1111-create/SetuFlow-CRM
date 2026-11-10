# SETU Guru — Role-Aware Intelligence & Continuous Learning
Status: PROPOSED FOR APPROVAL — PLAN ONLY
Date: 2026-11-10
Pilot tenant: Stark Packmate
Scope: Incremental enhancements to the existing SETU Flow SETU Guru. No new engine.
Change control: No runtime code, migrations, roles, data, or deployments are authorized by this document.

## Decision and goal
One existing Guru for every entitled role, with tenant-specific approved learning, role-appropriate operational context, and owner-governed changes. Akshay is the Stark Packmate knowledge owner, not the sole beneficiary or sole contributor. Employees may report missing or wrong answers; only authorized approvers publish company policies.

### Explicit non-goals
Do not introduce a replacement AI engine, second chatbot, separate task/approval system, new standalone command center, unrestricted autonomous action, automatic modification of prices/assignment policies, cross-tenant knowledge promotion, mass reassignments, or a general CRM redesign. Do not train foundation models on customer data. Do not claim AVO feature parity across all departments.

## Evidence from repo main (2026-11-10 review)
- src/features/setu-guru/setu-guru-widget.tsx: active application widget, organization search calls, and Helpful/Missing detail feedback.
- src/features/setu-guru/setu-guru-feedback-bridge.tsx: browser localStorage-to-API feedback sync. Current mechanism needs failure/retry/duplicate analysis.
- src/app/api/setu-guru/feedback/route.ts + src/lib/setu-guru/feedback-store.ts + supabase/migrations/20260529000001_sprint21_setu_guru_feedback.sql: organization-scoped feedback persistence, currently two feedback labels with limited question/answer context.
- src/app/api/setu-guru/org-search/route.ts: sizable current organization-data routing across products, leads, buyers, suppliers, quotes and workflows.
- src/lib/setu-guru/brain-layer.ts and src/app/api/setu-guru/brain/route.ts: source ranking, page help and confidence response path; no verified full organization-knowledge retrieval.
- src/lib/setu-guru/guru-response-policy.ts: response precedence and intent/approval policy.
- src/lib/setu-guru/approval-governance.ts + src/app/api/setu-guru/action/route.ts: human-approval boundaries and action previews.
- src/app/(app)/admin/guru-config/page.tsx: per-org model, search, analytics and approval settings.
- src/app/smc/guru/page.tsx: platform Guru operations summary, not an org owner's teaching console.
- docs/setu-guru/ORGANIZATION_LEARNING_LOOP_PLAN.md: prior proposed learning plan identifies guru_embeddings, guru_ingestion_review_queue, workspace_guru_settings, feedback and telemetry. These are documented foundations, NOT independently verified production-ready in this review.
- tests/setu-guru-feedback-durable.test.mjs and tests/setu-guru-eval-suite.test.mjs: existing regression starting points.

## Rule: reuse first
Extend existing Setu Guru widget, org-search/brain routing, feedback, telemetry, review facilities, organization settings, role permissions, and governed action paths. Introduce the minimum metadata or schema additions only if production inspection proves existing stores cannot represent approved organization lessons safely.

## Role experience and authorization
Use actual workspace membership, permissions, license/module grants, record-level assignments and delegation checks on every query and action. Do not infer access solely from displayed role labels.
- Owner: organization-wide authorized priorities, policy approval/supersession, teaching, audit.
- Admin: operational assistance and assigned administration; teaching/review only when existing permissions or explicit delegation allow.
- Sales manager: managed-team reports and follow-up exceptions within accessible teams; can suggest lessons; cannot publish policy by default.
- Sales coordinator: records accessible through current coordinator/delegated visibility; requirements, notes, follow-ups, drafts; can suggest lessons.
- Sales representatives/inbound sales: own or permitted leads, customer history, follow-ups and quotations; can flag wrong/missing responses.
- Other module-enabled roles: scoped capabilities only for licensed modules and permitted records.
- Everyone: may ask Guru and give feedback where Guru is enabled. Learning contributions never grant new visibility.

## Release 1 — minimum viable role-aware learning (P0)
### A. Confirm existing foundation and production state (read-only prerequisite)
1. Compare live main SHA with deployed Vercel commit.
2. Inspect production schema/policies of guru_embeddings, guru_ingestion_review_queue, setu_guru_feedback, setu_guru_telemetry, workspace_guru_settings; confirm existence, shape, write/read/RLS, organization scoping and ownership.
3. Trace actual widget dispatch among org-search, brain, research, page help and feedback; identify exact hook where approved knowledge should enter.
4. Inspect current module entitlements, role permissions, record access and sales coordinator delegation.
5. Record baseline: Guru errors, unanswered questions, current feedback counts, query/source coverage, and deployment/build health. Avoid pulling sensitive customer content into logs.
Deliverable: evidence checklist, verified gaps, exact file-change list. No new engine.

### B. Role-aware answer context
- Reuse workspace auth and existing data routes; ensure role-appropriate source queries and authorized records only.
- Show information relevant to the current route, record, user, and licensed module.
- Unknown/unsupported question is explicitly unresolved; do not turn generic advice into company policy.
- Preserve primary live data for dynamic statuses, monetary values, stock/pricing, assignment and calculations.
- Regression: every existing permitted question remains usable.

### C. Improve feedback capture
- Keep Helpful; add Wrong answer and Missing information to the widget without redesigning its shell.
- Persist actual user question, corresponding Guru answer, source references, organization, route, actor and timestamp; link to correction/review record.
- Fix localStorage bridge reliability: prevent duplicate writes, retry failures, avoid loss on cross-device sign-in, and never display 'saved' unless persistence succeeded; use existing audit fallback as appropriate.
- Never treat user-supplied feedback as approved knowledge.

### D. Unanswered question and teaching flow
- For organization-specific policy without evidence, respond with 'I don't have an approved Stark Packmate answer' and capture an unresolved item.
- Owner/admin sees 'Teach Guru'; other permitted users see 'Request answer' or 'Suggest correction'.
- Minimal fields: original question, proposed answer, category, optional related record/source, approval status, effective/review date. Additional fields only where needed.
- Prefer extending existing review/feedback resources. Determine whether a separate canonical approved lesson row is essential only after schema inspection.
- Queue deduplicates equivalent unanswered questions but preserves requesters and frequency; owner need not reanswer every occurrence.

### E. Publish and retrieve approved lessons
- Owner or explicitly authorized delegate can review/edit/approve/reject/retire/supersede; audit all decisions.
- Approved organization lesson stored with organization_id, source/provenance, approver and version. Database row is truth, any embeddings are an index.
- Retrieval filters organization_id and effective/approved status BEFORE semantic ranking. Enforce record visibility and source classifications at access time.
- Response hierarchy: current authorized live data for changing facts -> applicable approved org policy for how this tenant operates -> canonical SETU Flow product help -> source-backed research if needed -> generic guidance only for non-policy questions.
- Make policy source and review date visible when meaningful.
- Repeated/similar question from another authorized user should retrieve approved lesson in a new session.
- Policy text must never execute database updates, price overrides, lead reassignment, quote sends or other governed actions by itself.

### F. Compact owner review UX
Within existing Guru/admin experience, not a new command center:
- Needs Answer
- Pending Review
- Approved Knowledge
- History
Prioritize source/question/answer and one-tap approve/edit/reject. Search and filter only if needed. Owner receives useful digest/notification through existing notification infrastructure if available.

## Release 2 — Daily priorities (P1; do not block Release 1)
- Reuse existing recommendation/dashboard work and current live queries.
- 'What should I focus on today?' returns role-safe top tasks with links and source timestamps; no invented counts.
- Owner: approval backlog, exceptions, relevant sales performance, unanswered Guru questions.
- Sales manager: follow-up gaps and team allocations within authority.
- Sales/coordinator: current accessible leads, required details, customer follow-ups, pending quote actions.
- Begin with on-demand briefings, no new background scheduler. Only add scheduled delivery if existing scheduling infrastructure and clear customer approval warrant it.
- Avoid claims of coverage of disabled orders/finance modules for Stark Packmate.

## Release 3 — Existing approved-action assistance (P1/P2)
- Reuse action previews, deterministic pricing and quotation calculations, communication drafts, existing governed workflows and idempotency.
- Guru drafts and routes; humans approve actions per existing permissions.
- Never auto-reassign Interakt-owned leads; preserve IndiaMART-to-Anita rule, manual ownership, availability/fair distribution behavior. Knowledge does not alter routing logic.
- No autonomous external sends or policy/config mutations.

## Learning quality (P2)
- Track unresolved question rate, correction rate, approved knowledge retrieval rate, source-backed answer accuracy from reviewed test sets, escalation age and adoption by role.
- Provide a short owner view based on existing telemetry, not a separate analytics platform.
- Periodic review of stale policy is owner-driven and reversible.

## Tests and acceptance gates
1. All roles retain present Guru access under current module entitlements.
2. No tenant crossover, including embedding retrieval; test with two seeded organizations.
3. Non-owner cannot approve or overwrite policies unless explicitly delegated.
4. Sales cannot view another rep's restricted leads or owner-only pricing through Guru.
5. Geeta's coordinator visibility matches underlying approved record access; no expansion by AI.
6. Wrong/missing feedback persists after refresh and on another authorized device; duplicate submissions controlled.
7. A new authorized session can retrieve an approved lesson and cite its source.
8. Unapproved, expired, revoked, superseded and out-of-scope lessons never surface as current tenant policy.
9. Current pricing/open-width/250m minimum rules, quote versioning, Interakt/IndiaMART assignments and communications are unchanged.
10. Approvals remain enforced by server authority, not prompt text.
11. Current Guru org-search/brain/research, mobile drawer, dashboard and existing support modes pass regression.
12. Build/typecheck/tests pass, plus role-based UAT on staging or controlled preview before a single consolidated production promotion.
13. Record baseline and post-release results; inspect real trace evidence rather than claiming success from static code.

## Implementation order and release gates
Gate 0: Finish schema/runtime/permission review and exact file-level technical spec; obtain implementation approval.
Gate 1: Role-safe feedback and unanswered capture, with error handling and tests.
Gate 2: Owner teaching/review and durable approved lessons.
Gate 3: Approved lesson retrieval in existing question flow, provenance and evaluation.
Gate 4: Limited on-demand per-role priorities using current recommendations.
Gate 5: Extend assisted actions only after stakeholder UAT and permission validation.
One change set per coherent release, consolidated PR and deployment, rollback-ready. Do not push to production before authorization.

## Definition of done for v1
Akshay can teach Guru from unanswered context; approved answer appears in later authorized sessions; any staff member can flag incorrect/missing answers; each role receives answers based only on allowed data; changes are auditable; no changes to pricing engines, assignment logic or outbound-message approvals; green CI and role UAT.

## Specific Stark Packmate UAT scenarios
- Akshay: teach below-MOQ exception escalation as a POLICY EXAMPLE, not a live pricing rule; review and supersede.
- Simran/Anita/Bryan: request guidance on a customer quotation, cite approved lesson; cannot publish.
- Jivij: request lead assignment explanation using only authorized data; Guru does not reassign.
- Geeta: summarize delegated lead, missing requirements and follow-up while preserving coordinator boundaries.
- Manager: request team exceptions scoped to permitted team.
- Different organization tenant: asks same policy question and cannot receive Stark Packmate lesson.
- Quote/Pricing: dynamic numeric values come from live deterministic engine and not taught free-text.

## Change-control note
This document is a recommendation and implementation contract only. It authorizes no development work. Before coding, reconfirm existing-schema reuse, production SHA, Supabase RLS, and precise impacted files. Keep a single cohesive roll-out and avoid scattered production hotfixes.
