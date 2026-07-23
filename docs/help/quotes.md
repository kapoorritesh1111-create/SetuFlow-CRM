# Quotes help

Route: `/quotes`
Last updated: 2026-06-08

Purpose: The Quote workspace is a customer-grouped lifecycle command center. Every active quote is organised by customer, lifecycle section, and value bucket. The primary job of this workspace is to help sales teams log outcomes, move accepted quotes to Orders, create governed revisions, and keep the commercial pipeline clean.

## Quote Command Center layout

The quotes page is a customer-grouped Quote Command Center, not a flat quote-row table.

### Left panel — Grouped lifecycle worklist

Quotes are grouped by customer. Each customer card shows:
- Proposed value · Accepted value · Order value · Cleanup value
- Status pills: sent count, accepted count, cleanup count, revision count
- Recommended next action for that customer

The left worklist is organised by these priority sections (collapsed individually by managers):
- **Needs Review** — sent quotes needing an outcome decision
- **Revision Requested** — buyer asked for a better quote; create a governed new version
- **Order Handoff** — accepted quotes ready to move to Orders execution
- **Follow-up Due** — sent quotes past their follow-up date
- **Archive / Closed** — expired, rejected, or voided records
- **Draft / Other** — quotes not yet sent

Managers can switch the grouping mode between: Priority · Lifecycle · Value · Customer · Product.

### Right panel — Customer Quote Story

Clicking a customer opens their full quote story:
- Value buckets: Proposed, Accepted, Order, Cleanup, Exposure
- Recommended next action (green = move to Orders, amber = revision/follow-up, slate = cleanup)
- Commercial line items for the selected quote
- Setu Guru guidance panel (read-only)
- Lifecycle timeline: all quotes for that customer with explicit outcome labels

### Top KPI strip

Six compact tiles: Follow-up count · Revisions · Order Handoff count · Cleanup count · Expiring · Archive.

### Filters

One filter row: Search (customer/quote/product) · Lifecycle · Customer · From date · To date · Mode (buyers/suppliers) · Group · Apply.

---

## Value bucket definitions

| Bucket | Meaning |
|---|---|
| **Proposed** | Sent quotes awaiting buyer outcome |
| **Accepted** | Buyer confirmed; quote is locked; order not yet created |
| **Order** | Accepted quote with a confirmed order handoff |
| **Cleanup** | Zero-line or zero-value accepted records that are stale; void candidates; not active value |
| **Archive** | Expired or rejected quotes; closed history |
| **Exposure** | Max of Proposed, Accepted, or Order per customer — the real risk at stake |

**Critical rule:** Cleanup and Risk are not the same thing.
- **Cleanup** = a zero-value or zero-line accepted record that should be voided or archived. It is not an active deal.
- **Risk** = a record that the system is about to treat as operationally valid for order handoff when it is not.
- Setu Guru must never label a zero-value cleanup quote as a customer-level Risk unless an order handoff is actively pending from that invalid record.

**Do not double-count:** A customer with one sent quote (Proposed $35) and one accepted quote (Accepted $35) does NOT have $70 in active value. The Exposure bucket shows the maximum of the two buckets, not the sum.

---

## Quote lifecycle states

| State | Meaning | Next step |
|---|---|---|
| `draft` | Editable working version | Finish lines → send |
| `pending_approval` | Over approval threshold | Owner/admin reviews approval queue |
| `approved` | Approved; ready to send | Send quote |
| `sent` | Customer-facing; immutable | Log outcome: accepted / rejected / revision requested / no response / expire |
| `revision_requested` | Buyer wants a better quote | Create governed new version — do NOT edit the sent record |
| `accepted` | Buyer accepted; locked | Move to Orders; quote exits the active worklist |
| `accepted_handoff` | Accepted + order created | Lives in Orders workspace; quote is closed history |
| `expired` | Passed validity date | Clone into new version if the buyer is still active |
| `rejected` | Buyer declined | Archive; available for clone if needed |
| `cleanup` | Zero-value / zero-line stale record | Archive or void; never treat as active value |

---

## Sending a quote

After a quote is sent, the Send page (`/send`) shows:
- Large green OK badge with "Quote sent" status
- The full tracked quote link for copy or open
- "Buyer not opened yet" status indicator
- Quick actions: Open WhatsApp · View quote · Back to quotes · Open orders

The tracked quote link uses the production domain (`www.setuflowcrm.com`). Do not share Vercel preview URLs.

---

## Quote outcome actions

For any sent quote, the operator must log an explicit outcome. The five outcomes are:

1. **Mark accepted** — locks the quote; creates order handoff; quote moves out of the active workspace into Orders.
2. **Mark rejected** — captures reason; quote moves to archive and shows clone option.
3. **Revision requested** — creates a governed new version from the sent quote; original stays immutable.
4. **No response** — schedules a follow-up task; quote stays in Needs Review.
5. **Expire quote** — archives the quote and shows clone-to-new-version option.

**Outcome persistence rule:** The main quote/order transition is authoritative. Optional lifecycle event logging (timeline, negotiation log) must not block or reverse the main transition if it succeeds. If the main transition succeeds and the optional logging fails, Setu Guru should not show "quote-outcome-error" — the outcome stands.

---

## Accepted quote → Orders handoff

Once a quote is accepted and the order handoff is created:
- The quote **exits** the active Quote workspace worklist
- It no longer appears as normal active quote work
- The Orders workspace becomes the primary workspace for execution
- The quote remains readable in the customer's quote history and lifecycle timeline
- Setu Guru should direct the user to Orders, not back to the Quote workspace

---

## Repeat customer and governed revisions

The Quote Launcher (accessed from the Lead Command Center) gives explicit choices:
- Continue latest draft
- Create new quote (new opportunity)
- Create revision from a sent quote (creates new version; original stays locked)
- Clone an accepted quote into a new opportunity quote
- View quote history

For a revision from a sent quote: the sent record is immutable. Setu Guru must always route to "Create revision" not "Edit quote".

---

## Expiry and Setu Guru automation

- Quotes approaching expiry: Setu Guru should prompt the operator to follow up, revise, or remind the buyer before the validity date passes.
- Expired quotes: leave the active display automatically; move to archive; remain available for review or clone-into-new-version.
- Setu Guru must not auto-expire or auto-archive quotes without operator confirmation.

---

## Common questions Setu Guru should answer

- Why is this quote in the Needs Review section?
- How do I log an outcome for a sent quote?
- What is the difference between Cleanup and Risk?
- Why does this customer show zero active value?
- How do I create a revision when the buyer wants a better quote?
- Why did my accepted quote disappear from the quote workspace?
- How do I move this to Orders?
- Why does the customer show Proposed $35 and Accepted $35 but not $70 total?
- What does "Buyer not opened yet" mean on the Send page?
- How do I use the grouped worklist vs the lifecycle view?

---

## Common blockers

- Sent quote needs an outcome logged before it leaves Needs Review
- Zero-line accepted record dominating a customer's story (treat as Cleanup, not Risk)
- Accepted quote still visible in the quote worklist after order handoff (should have moved to Orders)
- Double-counting proposed and accepted value as one combined active value
- Trying to edit a sent quote instead of creating a governed revision
- Quote outcome action returning an error when optional lifecycle logging fails (the outcome itself should still persist)

---

## Data sources

- `quotes` table — workflow shell; lifecycle fields: `archived_at`, `archive_reason`, `lifecycle_outcome`, `follow_up_at`, `last_customer_response_at`
- `quote_versions` + `quote_version_line_items` — commercial source of truth
- `quote_lifecycle_events` — timeline and negotiation history (optional; must not block main outcome transitions)
- Lead and lead product interests
- `orders` — created from accepted_version_id after handoff

---

## Allowed actions

- Explain which lifecycle section a quote belongs to and why
- Route to Log outcome, Create revision, Move to Orders, or Clone
- Explain value bucket definitions and the difference between Cleanup and Risk
- Explain why an accepted quote exits the quote worklist and lives in Orders
- Explain how to use grouping modes and collapsible sections
- Explain the tracked link on the Send page and how to share it via WhatsApp

## Approval rules

Human approval is required for: quote send, quote acceptance, price deviation approval, compliance waiver, write-back, and any change that alters product/category/organisation defaults. Setu Guru must not auto-log outcomes, auto-archive, auto-expire, create revisions, or advance orders without operator confirmation.
