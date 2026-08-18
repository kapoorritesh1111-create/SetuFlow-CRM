# Temporary Test Records — Packaging Workspace Discovery (Phase 1)

Created live in production during this discovery session. **Not yet cleaned up.** Review and delete/archive before or shortly after this discovery package is reviewed.

| # | Record type | Identifier | Organization | Created via | Notes |
|---|---|---|---|---|---|
| 1 | Lead | **GUIDE TEST Packaging Buyer**<br>id `0425d474-3f10-4cd5-a15a-0ce03da67cef` | Stark Packmate — `3f8ef935-16bf-49de-bc04-85b51a3e0cb8` | Quick Add Lead (`+ Quick Lead` header button) | Contact: Journey Test User · Email: journey-test@example.com · Country: India · Source: Trade show · Event/source label: "User Journey Discovery" · Owner: Ritesh Packing · Trade note: "Temporary record created for Packaging workspace journey testing". No quote was created against this lead (creation is currently blocked — see PKG-JOURNEY-005/007 in the gap register). One category checkbox click and one qualification-note edit were attempted against it but did not persist (see PKG-JOURNEY-003/004) — so its qualification state should still show 0 products / 1 market (Asia) on review. |

## Confirmed NOT created / NOT sent

- No orders, order handoffs, or quotes were created.
- No real customer quotes were modified — all quote-lifecycle testing (Mark accepted/rejected/etc., Create/Open Order Handoff) was limited to *viewing* the existing "Himalayan Springs Beverages Ltd" quote story; no lifecycle-changing button was clicked.
- No emails, WhatsApp messages, or notifications were sent to anyone.
- No Supabase data, RLS policy, or production configuration was changed.
- No code was committed, deployed, or modified.

## Cleanup action needed

Delete or archive lead `0425d474-3f10-4cd5-a15a-0ce03da67cef` ("GUIDE TEST Packaging Buyer") from the Stark Packmate org once this discovery package has been reviewed, unless you'd like to keep it around as a live reproduction case for PKG-JOURNEY-003/004/005/007 (it currently reproduces all four).

---

## Retest 1 (July 23, 2026) — additional records

| # | Record type | Identifier | Notes |
|---|---|---|---|
| 1 | Lead | **GUIDE TEST Packing Test Company**<br>(id not captured in retest report — retrieve from Leads workspace) | Contact: Journey Test User · Email: journey-test-2@example.com · Country: India · Source: Trade show · Event/source label: "End-to-End Order Journey Test". Qualified with category "Flexible Pouch / Roll Stock" (closest match to Stand Up Pouches). |
| 2 | Quote | Stand Up Pouches — Gourmet Resealable Pouch, 140×200×40mm, Zipper finish, 5,000 pcs, on the lead above | **Currently stuck/locked** per PKG-JOURNEY-009 — went through Submit for Approval → Approved once, then became unable to Send, Accept, or re-edit. Left in this state deliberately as a live reproduction case for PKG-JOURNEY-009 — do not delete until that bug is fixed and re-verified against this exact record. |
| 3 | Artwork proof | v1 — `Gourmet_Resealable_Pouch_Draft_Artwork_Proof.pdf`, attached to the quote's packaging line above | A synthesized one-page placeholder PDF, generated in-browser for the test (not a real design file). Status: approved (via the external `/proof-approval/<token>` link). |

**Not created:** no order was created (blocked by PKG-JOURNEY-009 — the quote never reached Accepted). No real emails/messages sent; the proof-approval link was opened and actioned directly by the tester, not sent to a real recipient.

**Cleanup note:** unlike record #1 above, do **not** delete the Retest 1 quote (#2) yet — it's the only known live reproduction of PKG-JOURNEY-009 and will be needed to verify that fix once it's made.
