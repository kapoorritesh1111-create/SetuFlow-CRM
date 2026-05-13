# Sprint 8.1H Orders Acceptance Baseline

Status: accepted baseline for the Orders / Execution workflow.

## Active Orders workspace

The only active Orders workspace should be:

```text
src/features/orders/components/OrdersProductionWorkspace81F.tsx
```

The active route imports it from:

```text
src/app/(app)/orders/layout.tsx
```

Do not rewire `/orders` back to older temporary sprint components unless explicitly approved.

## Deprecated historical components

The following files are historical references only and should not be imported by `/orders`:

```text
src/features/orders/components/OrdersProductionWorkspace81C.tsx
src/features/orders/components/OrdersProductionWorkspace81DRepair3.tsx
```

`OrdersProductionWorkspace81DRepair3.tsx` is marked deprecated in code. `OrdersProductionWorkspace81C.tsx` remains only as a historical approved-pattern reference until a safe cleanup removes old sprint variants.

## Final accepted workflow

```text
Actual Lines
→ Proforma / Order Confirmation
→ Packing / Rates
→ Processing
→ Delivery Note
→ Final / Commercial Invoice
→ Paid & Closed
```

## Stage behavior and CTA checklist

### 1. Actual Lines

Purpose: turn the accepted quote into the real buyer order.

Functional CTAs:

- Save line
- Add catalog product
- Send for internal approval

Rules:

- The accepted quote version remains the commercial source of truth.
- Actual order lines may differ from the quote after customer confirmation.
- User may add catalog products, change quantities, override final price, and record change/discount reason.
- Do not mutate accepted quote versions in place.

### 2. Proforma / Order Confirmation

Purpose: create the first customer-facing document after actual order review.

Functional CTAs:

- Prepare draft
- Preview Proforma Invoice or Order Confirmation
- Approve Proforma Invoice or Order Confirmation
- Send approved document by Email or WhatsApp composer

Rules:

- Export orders use Proforma Invoice.
- Regional orders use Order Confirmation.
- Preview must open `/order-documents/preview/<token>` in a new tab/window.
- Send creates a tracked link and opens a compose flow. It is not provider-confirmed external delivery until an adapter is connected.

### 3. Packing / Rates

Purpose: create AI-assisted packing information and request freight/delivery rates.

Functional CTAs:

- Prepare packing sheet
- Preview Packing Sheet / Export Packing List
- Send approved packing document by Email or WhatsApp composer
- Approve packing sheet
- Prepare freight request
- Preview Freight Rate Request
- Ready for logistics handoff

Rules:

- Packing estimates should use product/order metadata where available.
- Fallback estimates may be used, but they must remain editable.
- Packing approval advances the order to freight request.
- Freight request approval advances the order to logistics handoff.

### 4. Processing

Purpose: operational pick, pack, and QC stage before delivery/shipment documents.

Functional CTAs:

- Open Packing Sheet
- Preview Delivery Note
- Send Delivery Note review link

Current limitation:

- Pick / Pack / QC checklist is local UI only and is not persisted yet.

### 5. Delivery Note

Purpose: prepare delivery/shipment handoff evidence before final invoice.

Functional CTAs:

- Prepare Delivery Note
- Preview Delivery Note
- Approve Delivery Note
- Send Delivery Note by Email or WhatsApp composer

Rules:

- Delivery Note approval advances order to Final / Commercial Invoice.
- Preview must open in a new tab/window.

### 6. Final / Commercial Invoice

Purpose: prepare and approve final invoice/commercial invoice before closeout.

Functional CTAs:

- Prepare Final / Commercial Invoice
- Preview Final / Commercial Invoice
- Approve Final / Commercial Invoice
- Send Final / Commercial Invoice by Email or WhatsApp composer

Rules:

- Final / Commercial Invoice approval advances order to completed.
- Preview must open in a new tab/window.
- Paid & Closed should continue to allow document preview/re-send history.

### 7. Paid & Closed

Purpose: receipt, finance sync, archive, and closeout posture.

Expected behavior:

- Completed orders should show as Paid & Closed.
- Document tray/history should remain accessible.
- Future pass should persist receipt/archive/finance closeout evidence.

## Document preview rules

Every document preview/review link must open in a new tab/window and use the canonical route:

```text
https://www.setuflowcrm.com/order-documents/preview/<token>
```

The UI must canonicalize bad historical URLs such as:

```text
www.setuflowcrm.com/order-documents/preview/<token>
https://setuflowcrm.com/www.setuflowcrm.com/order-documents/preview/<token>
```

## Send behavior

Email and WhatsApp send CTAs currently perform this workflow:

```text
Create tracked order_document_sends row
→ generate review link
→ redirect back to /orders with composeUrl
→ open mailto: or wa.me composer with the review link
```

Do not claim provider-confirmed delivery until a real email/WhatsApp transport adapter records delivery status.

## PDF / preview content checklist

The tracked preview route must render stage-specific sections for:

- Proforma Invoice / Order Confirmation
- Packing Sheet / Export Packing List / Freight Rate Request
- Delivery Note
- Final / Commercial Invoice

Packing previews should show cartons, units per case, net/gross weight, CBM, pallets, and totals.

Delivery Note previews should show delivery/ship-to, receiver acknowledgement, vehicle/LR/docket placeholder, and shortage/damage notes.

Final / Commercial Invoice previews should show taxable/declared value, tax or duty notes, invoice controls, and signature/stamp zones.

## Known limitations after 8.1H

- Pick / Pack / QC checklist is not persisted yet.
- Dedicated schema fields for line discount and total order discount are not added yet; discount is currently represented through final unit price and change reason.
- Real backend email/WhatsApp delivery adapters are not connected yet.
- Admin document terms editor is still future roadmap.
- Old historical Orders components are still present for reference but must not be reactivated.

## Regression guardrails

- Do not start Sprint 9 while Orders 8.1 hardening is still being accepted.
- Do not touch quote version integrity.
- Do not mutate accepted quote versions.
- Do not use Lead Compliance as an Orders blocker.
- Do not touch Avanti Foods Org data in cleanup or seeding tasks.
- Do not add fake CTAs. Every visible button must either perform a real action or be clearly labeled as local/non-persistent.
