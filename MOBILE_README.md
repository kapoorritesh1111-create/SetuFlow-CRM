# SETU Flow Mobile Product Handoff

## Release focus

This mobile pass prepares SETU Flow for a polished SaaS demo and production pilot. It keeps the desktop CRM intact while improving the phone experience for lead capture, lead review, quote entry, orders, vCard sharing, and mobile follow-up.

## Mobile principles

- One-handed capture and review.
- Clear primary actions.
- No technical or implementation copy in customer-facing screens.
- Smart scan results are reviewed before save.
- Email and WhatsApp actions open the user’s native communication apps.
- Desktop routes and workflows remain additive and unchanged.

## Included surfaces

- Home
- Leads
- Quick Add Lead
- Capture
- Quote
- Orders
- Notifications
- Settings
- Share vCard
- Public card / vCard download

## Smart card capture

The current investor-demo mode uses direct OpenAI Vision for camera photos and the existing file/PDF scan path for uploaded documents.

Production environment:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Expected user experience:

1. User taps **Use camera** or **Upload file or PDF**.
2. SETU Flow shows a visible reading state.
3. Contact fields are filled in the same Quick Add Lead drawer.
4. User reviews the details.
5. User saves the lead.

The UI does not expose OCR, provider, model, logs, or engineering terminology.

## Email and WhatsApp behavior

- Email links open the device email client with recipient, subject, and body prefilled.
- WhatsApp links use normalized phone numbers and open `wa.me` with a short prefilled message.
- Missing email/WhatsApp values disable or hide the relevant contact action instead of showing broken controls.

## Role-aware leads

- Owner/Admin: all leads.
- Manager: team and direct-report leads.
- Member: assigned leads only.

Visibility is enforced by the app data layer and reflected in the mobile lead list.

## Acceptance checklist

- No visible developer/debug/prototype copy in mobile customer-facing screens.
- Quick Add Lead scan is visible from start to completion.
- Smart scan success copy is short and professional.
- The lead form remains editable after scan.
- vCard shows the signed-in user’s saved card data.
- Desktop routes remain accessible and unchanged at desktop size.
- Mobile routes stay isolated behind `FEATURE_MOBILE_APP_V1` / `NEXT_PUBLIC_FEATURE_MOBILE_APP_V1`.

## Release note

This pass is intended to be deployed after PASS32 as a final polish layer before investor or customer demo. It preserves the working scan path and improves customer-facing copy, contact actions, and handoff documentation.
