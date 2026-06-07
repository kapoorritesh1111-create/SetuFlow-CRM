# S24-205 through S24-208 Follow-up Patch: Quote Cleanup, Outcome Persistence, and Supporting Spaces

## Why this follow-up exists

Live review showed the Quote Command Center was directionally correct but needed a workflow correction pass:

1. **Accepted outcome did not persist for Kenya Family Grocers.** The page returned `notice=quote-outcome-error`, and the quote stayed in `sent_follow_up` instead of moving to accepted/order handoff.
2. **Claude E2E zero-value quote was labeled as customer-level Risk.** Q22 is a stale accepted zero-line record and should be treated as **Cleanup / void candidate**, not as an active risk that dominates the customer story.
3. **The left grouped worklist needed flexible grouping and collapse controls.** Managers need more than one grouping mental model as volume grows.

## Quote workspace rule updates

### Outcome persistence

The primary quote outcome transition is authoritative. Supporting timeline/lifecycle/negotiation logging must not block the main transition once the quote was accepted, rejected, expired, or revised.

- Main quote/order transition failure: show error.
- Optional lifecycle/timeline logging failure after successful transition: log server-side and allow user forward.

### Cleanup versus risk

Accepted zero-line / zero-value quotes are classified as **cleanup** when they are stale or historical records.

Use **Risk** only when the system is about to treat a bad record as operationally valid, such as order handoff on an invalid quote.

Claude sample should display:

- Q21 sent = Proposed USD 35
- Q22 accepted zero-line = Cleanup USD 0
- Q23 accepted = Accepted / order-ready USD 35

Do not display USD 70 as one active value.

### Grouping modes

The quote worklist now supports grouping by:

- Priority
- Lifecycle
- Value
- Customer
- Product

Groups render as collapsible sections so managers can reduce side-scroll noise.

## Supporting space updates required later

### Setu Guru Knowledge

Add Guru knowledge entries for:

- Difference between **Risk** and **Cleanup**.
- Accepted quote means live revenue intent and belongs in Orders.
- Follow-up means choosing a real outcome: accepted, rejected, revision requested, no response, or expired.
- Optional event logging failures should not be described as failed acceptance when the quote/order transition succeeded.

### Training Workspace

Update quote workflow training to include:

- How to mark quote accepted and verify it moves to Orders.
- How to use Cleanup / void candidate records.
- How to use grouping modes and collapsed sections.
- Why sent + accepted records should not be double-counted as one active value.

### Docs Workspace

Add documentation for:

- Quote lifecycle state model.
- Quote value bucket definitions: Proposed, Accepted, Order, Cleanup, Archive, Exposure.
- Archive and cleanup policy.
- UI grouping modes and recommended manager workflows.

## Regression checklist

1. Kenya Family Grocers: Mark accepted should persist and move the quote out of Follow-up.
2. Claude: Q22 should show as Cleanup / void candidate, not customer-level Risk.
3. Claude value summary should show Proposed USD 35, Accepted USD 35, Cleanup USD 0.
4. Left worklist groups should be collapsible.
5. Grouping mode should switch between Priority, Lifecycle, Value, Customer, and Product.
6. Optional quote lifecycle event logging should not cause `quote-outcome-error` after a successful quote outcome transition.
