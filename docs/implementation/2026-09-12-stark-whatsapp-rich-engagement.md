# Stark Packmate WhatsApp Rich Engagement

Implemented: 2026-09-12

## Objective

Give Stark Packmate sales users richer WhatsApp engagement from both Inbound Leads and converted Lead Detail communications, with artwork/file sharing, emojis, brochure recommendation, and full CRM traceability.

## Scope implemented

- Inbound Leads WhatsApp composer now supports:
  - Emoji insertion at the textarea cursor.
  - Artwork/file staging for JPG, PNG, WEBP, PDF, Word, Excel and CSV.
  - 12 MB upload limit.
  - Visible attachment preview/remove state before sending.
  - Automatic preselection of the best brochure when the packaging requirement matches an existing brochure family/category mapping.
  - Manual change/remove of the recommended brochure.
  - Combined send states for message + brochure + attachment.

- Converted Lead Detail communications now supports the same WhatsApp engagement controls:
  - Emoji picker.
  - Artwork/file upload.
  - Brochure loading and recommendation based on the lead's stored packaging/product context.
  - Automatic best-match preselection while preserving salesperson override.
  - Existing Setu Guru suggested replies remain available.

- Secure attachment delivery:
  - New `whatsapp_attachment_shares` table stores opaque share records.
  - Files are stored in the existing private `organization-assets` Supabase bucket.
  - Customer-facing links use a random 144-bit URL-safe token.
  - The public route resolves the opaque token server-side and redirects to a short-lived Supabase signed URL.
  - Share records expire after 30 days.
  - Only Stark Packmate owner/admin/manager/sales roles can stage outbound WhatsApp files.

- Conversation traceability:
  - Outbound attachment URL is recorded in `lead_intake_messages.media_url`.
  - Attachment metadata is stored in the outbound message payload and converted-lead `communications.metadata`.
  - Attachment share records are marked `sent` and linked to the provider message id after Interakt accepts the WhatsApp message.

## Interakt delivery decision

Interakt's published public Send WhatsApp API documentation currently documents `Template` as the supported public message type and supports media URLs in media-template headers. The existing Setu Flow connector already has proven free-text sending in production. Because Interakt does not publish a supported free-form media/document payload in the current public API documentation, this release does not invent an undocumented provider payload.

Instead, outbound artwork/files are delivered as secure customer-accessible attachment links inside the free-form WhatsApp message. This keeps sending reliable while allowing customers to open the actual file immediately. The internal CRM still treats the item as an attachment and records it separately from message text.

If Interakt exposes a supported free-form media/document API for this account later, the storage/share model in this release can be reused and the transport layer can be upgraded without changing the user workflow.

## Guardrails retained

- Existing 24-hour WhatsApp free-reply window remains enforced.
- When the reply window is closed, sales users must use the configured approved template restart path.
- Brochures/files are not sent outside the open free-reply window.
- Existing inbound conversation logging and converted-lead timeline behavior remain intact.
- No brochure is silently sent without being visible in the composer; the recommended brochure is preselected but can be removed or changed before Send.

## Database migration

`supabase/migrations/20260912234500_whatsapp_attachment_shares.sql`

Production Supabase migration was applied first and the matching migration file was committed to the repository to keep schema history aligned.

## Primary code paths

- `src/app/api/interakt/attachments/route.ts`
- `src/app/api/public/whatsapp-attachments/[token]/route.ts`
- `src/features/integrations/interakt/sales-message-actions.ts`
- `src/features/integrations/interakt/components/sales-message-composer.tsx`
- `src/features/leads/canonical/StarkCommunicationsDrawer.tsx`
- `tests/s51-inbound-review-refinement.test.mjs`

## Regression expectations

- Inbound Lead messaging continues to send free text during an open reply window.
- Converted Lead messaging continues to send and log WhatsApp communication.
- Approved follow-up template restart remains the only send path when the 24-hour window is closed.
- Recommended brochure selection is derived from existing brochure family/category mappings and current lead/inbound packaging context.
- A salesperson can override or remove a recommendation before sending.
