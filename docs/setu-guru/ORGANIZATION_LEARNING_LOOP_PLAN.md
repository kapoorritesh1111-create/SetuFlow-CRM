# Setu Guru Organization Learning Loop

## Purpose

Build Setu Guru into a controlled organization-specific learning engine without allowing it to invent policy or automatically treat unreviewed answers as truth.

The objective is simple:

> When Setu Guru does not know how an organization works, it should say so, let an authorized Owner/Admin teach it, require review where configured, store the approved answer for that organization, and recall that answer later.

This must remain organization-scoped. A Star Packmate answer must never become a global SETU Flow answer unless SETU Flow explicitly promotes it through a separate governed process.

---

## Current foundation already available

The live database already contains useful Setu Guru infrastructure:

- `guru_embeddings`
- `guru_ingestion_review_queue`
- `setu_guru_feedback`
- `setu_guru_telemetry`
- `workspace_guru_settings`
- `packaging_intelligence_feedback`

`workspace_guru_settings` already includes:

- `writeback_enabled`
- `require_admin_approval`
- `live_search_enabled`
- `ai_analytics_enabled`

The upgrade should reuse this foundation instead of creating a second disconnected knowledge system.

---

# Target user experience

## 1. Normal question

A user asks Setu Guru a question.

Setu Guru checks sources in this order:

1. Current page/workspace context
2. Current live organization data
3. Approved organization knowledge
4. Canonical SETU Flow help / workflow knowledge
5. Live research when the question genuinely requires current external information
6. Generic guidance only when the above do not answer the question

If Setu Guru has enough evidence, it answers normally and explains the source/basis where useful.

---

## 2. Unknown organization-specific question

If Setu Guru does not have enough approved evidence, it must not guess.

Example response:

> I do not have an approved Star Packmate rule for when cylinder charges are waived on repeat jobs yet.

For an Owner/Admin, show:

**Teach Setu Guru**

For other roles, show:

**Ask an Owner/Admin to provide this organization rule**

The unanswered question is saved for review.

---

## 3. Owner/Admin teaches Setu Guru

The teaching panel should capture:

- Original question
- Proposed organization answer
- Category / workflow
- Page / route where the question occurred
- Optional related entity
  - pricing template
  - service family
  - customer
  - product
  - quote
  - order
- Effective date
- Optional expiry/review date
- Notes / source evidence

Example:

**Question**

When do we charge cylinder cost again for a repeat order?

**Star Packmate answer**

If the same artwork and usable cylinders already exist, we normally reuse the cylinder and do not charge a new cylinder cost. Production must confirm the cylinder is still available and usable before the charge is waived.

---

## 4. Approval flow

An answer must not immediately become trusted organization knowledge unless policy explicitly allows it.

Default flow:

`Unknown question -> Draft answer -> Owner/Admin review -> Approved knowledge -> Embedded/retrievable knowledge`

Use `workspace_guru_settings.require_admin_approval` to determine whether a second approval step is required.

Recommended statuses:

- `unanswered`
- `draft_answer`
- `pending_review`
- `approved`
- `rejected`
- `superseded`
- `expired`

---

# Organization Knowledge record

A governed knowledge item should carry at least:

- `id`
- `organization_id`
- `question`
- `canonical_question`
- `answer`
- `category`
- `route_key`
- `source_type`
- `source_entity_type`
- `source_entity_id`
- `status`
- `confidence`
- `effective_from`
- `effective_to`
- `created_by`
- `created_at`
- `approved_by`
- `approved_at`
- `supersedes_id`
- `metadata`

Do not rely on embeddings alone as the source of truth. The approved source record must remain inspectable and auditable.

---

# Retrieval hierarchy

Setu Guru should distinguish four different knowledge layers.

## Layer 1 — SETU Flow product knowledge

How the CRM itself works.

Examples:

- How Quote Builder calculates Packaging pricing
- How MOQ tiers are evaluated
- Which workflow follows quote acceptance
- Which role must approve an action

## Layer 2 — Industry / workflow knowledge

General packaging or trade concepts that are not organization policy.

Examples:

- What a gusset is
- What flexographic printing means
- What repeat length means

## Layer 3 — Organization Knowledge

How this customer actually operates.

Examples for Star Packmate:

- Cylinder reuse rules
- Standard pre-press charge policy
- Default lead-time policy
- Which finish is normally charged per pouch vs per square metre
- How repeat jobs are handled
- Internal approval rules

## Layer 4 — Live organization data

The actual values currently stored in SETU Flow.

Examples:

- Current PET/MET PET/PE rate on a template
- Current zipper rate
- Current MOQ
- Current quote quantity
- Current job artwork status

A response may combine these layers but must make clear when a statement is organization policy versus live configured data.

---

# Unknown-answer detection

Setu Guru needs an explicit confidence / evidence decision before answering.

Treat a question as unresolved when:

- no matching approved organization knowledge exists for an organization-specific policy question;
- current live CRM data does not establish the answer;
- canonical SETU Flow help does not establish the answer;
- sources conflict materially;
- the best result is below a configured confidence threshold;
- the question asks what this organization "normally", "always", "usually", or "allows" and no approved policy evidence exists.

In these cases Setu Guru should say it does not know the organization rule yet rather than filling the gap from generic knowledge.

---

# Feedback loop

Replace browser-only feedback with persisted feedback in `setu_guru_feedback`.

Use three primary feedback actions:

- **Helpful**
- **Wrong**
- **Missing information**

For Owner/Admin:

### Wrong

Open a correction form with the question and previous answer prefilled.

### Missing information

Offer:

- Teach Setu Guru
- Add supporting note/source
- Assign to another Owner/Admin

Corrections should enter the same governed review pipeline rather than silently rewriting prior knowledge.

---

# Versioning and supersession

Organization knowledge must support change over time.

Example:

Old rule:

`Zipper charge: INR 10 / pouch`

New rule:

`Zipper charge: INR 12 / pouch effective 2027-01-01`

The old record becomes `superseded` and remains in history.

Setu Guru should retrieve only the effective approved version unless the user explicitly asks for historical policy.

---

# Embeddings / RAG

Approved organization knowledge can be embedded into `guru_embeddings` using:

- `organization_id`
- source type such as `organization_knowledge`
- source record ID
- canonical question + approved answer
- metadata containing route/category/effective dates

Retrieval must always filter by the active `organization_id` before semantic ranking.

Never allow an embedding from one organization to answer another organization's policy question.

---

# Review queue reuse

`guru_ingestion_review_queue` can be extended/reused for organization knowledge review where appropriate.

Potential sources entering review:

- unanswered Setu Guru questions
- Owner/Admin proposed answers
- corrections to wrong answers
- imported SOPs / pricing notes / training documents
- approved Packaging Pricing Setup documentation

Each queue item should clearly show:

- organization
- source
- question/topic
- proposed knowledge
- confidence
- who submitted it
- affected workflow
- approve / edit / reject actions

---

# Owner/Admin Knowledge workspace

Add a Setu Guru Admin area called:

## Organization Knowledge

Suggested tabs:

### Needs an Answer

Questions Setu Guru could not answer confidently.

### Pending Review

Answers waiting for approval.

### Learned Knowledge

Approved active organization knowledge.

### History

Superseded, rejected, and expired items.

Useful filters:

- workflow
- category
- submitted by
- status
- effective date
- source type

---

# Packaging first implementation

Use Packaging as the first vertical because it already has clear organization-specific rules and live structured configuration.

Initial knowledge categories:

- Packaging Pricing
- Materials
- Printing / Flexo
- Finishes & Add-ons
- MOQ / Quantity Tiers
- Setup / Pre-press
- Rush / Lead Time
- Artwork / Proof
- Production / Dispatch
- Repeat Orders

Examples of useful learned questions:

- When should Star Packmate reuse an existing cylinder?
- Which setup charges apply to repeat orders?
- Is zipper charged per pouch or per square metre?
- What is the normal lead time for this family?
- When is a rush charge allowed?
- When should artwork adjustment be charged?

---

# Packaging Pricing specific behavior

On `/admin/packaging-templates`, Setu Guru should first explain from the actual Packaging pricing engine and current page context.

Canonical calculation logic currently includes:

### Dimensional area

Flat sheet / label / sleeve:

`area = width × height / 1,000,000`

Pouch with gusset:

`area = width × (height + gusset) × 2 / 1,000,000`

### Waste

`billable area = area × (1 + waste %)`

### Material

`material per unit = billable area × material rate per m²`

### Printing

The configured print-color multiplier adds the amount above the 1.00× material basis.

### Finishes / Add-ons

- `per_unit`: configured rate per pouch/piece
- `per_sqm`: billable area × configured finish rate

### Quantity tier

The matching quantity-tier multiplier adjusts the variable per-unit subtotal.

### Flexo cylinder

Configured repeat-length tier rate per color × color count.

Cylinder reuse may waive that charge only when explicitly confirmed.

### Setup / Pre-press

Job-level charges, including per-job, per-design and per-extra-design bases.

### Rush

Rush uplift applies to the variable subtotal after quantity tier and does not multiply fixed setup/cylinder charges.

### Final price

`job total = variable total + job/service charges + rush + setup`

`price per quoted unit = job total / quantity`

Setu Guru should never invent an organization-specific rate when the template does not provide it.

---

# Security / permissions

Only authorized organization roles should be allowed to teach or approve organization knowledge.

Recommended default:

- Members: ask questions / submit Missing information feedback
- Managers: propose answers where enabled
- Admin: propose and review
- Owner: approve, supersede, or retire organization policy

All writes must be organization-scoped and protected by RLS.

---

# Telemetry

Use `setu_guru_telemetry` to track:

- question
- route
- resolved / unresolved state
- answer source type
- confidence
- organization knowledge hit/miss
- whether Teach Setu Guru was offered
- whether an answer was submitted
- whether it was approved
- latency

Useful product metrics:

- unanswered rate by organization
- top repeated unknown questions
- percentage resolved by approved organization knowledge
- corrections per knowledge item
- stale knowledge requiring review

---

# Delivery plan

## Phase 1 — Unknown Question Capture

- Add low-confidence / no-answer response state
- Persist unresolved organization-specific questions
- Show **Teach Setu Guru** to authorized Owner/Admin
- Stop generic hallucinated fallback for organization policy questions

## Phase 2 — Teaching + Approval

- Owner/Admin answer form
- Review queue
- approve/edit/reject
- audit metadata
- organization-scoped RLS

## Phase 3 — Retrieval

- Embed approved knowledge into `guru_embeddings`
- retrieve by `organization_id`
- place approved organization knowledge ahead of generic help
- add provenance to answers

## Phase 4 — Feedback Learning

- Persist Helpful / Wrong / Missing information
- Wrong answer creates a correction candidate
- Missing information links to unresolved question
- correction goes through approval

## Phase 5 — Organization Knowledge Admin UX

- Needs an Answer
- Pending Review
- Learned Knowledge
- History
- filters, search, supersede, expiry review

## Phase 6 — Expand beyond Packaging

After Packaging is stable, extend the same model to:

- commercial defaults
- sales process
- quote approval policy
- trade documentation policy
- order execution
- supplier workflows
- customer-specific operating rules

---

# Acceptance criteria for the future upgrade

1. Setu Guru never treats an unapproved user answer as organization truth.
2. Approved knowledge is isolated by `organization_id`.
3. Owner/Admin can teach Setu Guru from an unanswered question without leaving the drawer.
4. Approved knowledge can be recalled in a later session by another authorized user in the same organization.
5. The answer identifies organization knowledge as organization-specific when relevant.
6. A changed policy can supersede an old one without deleting history.
7. Wrong/Missing feedback persists server-side and can become a reviewed knowledge correction.
8. Existing canonical SETU Flow help remains global and is not overwritten by customer knowledge.
9. Live CRM configuration remains the source of truth for current numeric pricing values.
10. Human approval boundaries remain intact for pricing changes, quote sends, proof decisions, production, dispatch, and other governed writes.

---

## Implementation note

Do not implement the full learning loop as part of a demo hotfix. Keep the current Packaging Pricing answer correction small and stable, then implement this document as a dedicated reviewed work package.
