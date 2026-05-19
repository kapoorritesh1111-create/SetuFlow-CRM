/**
 * whatsapp-link.ts
 * Sprint 11 — WhatsApp link generation for order documents.
 *
 * Strategy (no WhatsApp Business API):
 * - Desktop browser → opens web.whatsapp.com (WhatsApp Web)
 * - Mobile browser → opens wa.me scheme (WhatsApp mobile app)
 *
 * The UI layer decides which link to use based on navigator.userAgent.
 * Both links pre-fill the message with the document share URL.
 *
 * SetuFlow NEVER sends via WhatsApp API automatically.
 * The operator clicks the link → WhatsApp opens with pre-filled message →
 * operator reviews and presses Send in WhatsApp.
 */

export type WhatsAppLinkSet = {
  /** wa.me link — opens the mobile app on iOS/Android */
  mobileLink: string;
  /** web.whatsapp.com link — opens WhatsApp Web on desktop */
  desktopLink: string;
  /** Phone number in E.164 format (e.g. +917900123456) */
  phone: string;
  /** The pre-filled message text */
  message: string;
};

export type WhatsAppLinkInput = {
  /** Recipient phone number — any common format, will be normalized */
  phone: string;
  /** Organization or sender name */
  organizationName: string;
  /** Document type (e.g. proforma_invoice) */
  documentType: string;
  /** Human-readable order number */
  orderNumber: string;
  /** Company name of the buyer */
  companyName: string;
  /** The full tracked share URL to include in the message */
  shareUrl: string;
  /** Optional note from the sender */
  note?: string | null;
  /** Selected currency total (optional) */
  currencyTotal?: string | null;
};

/** Normalize phone to E.164 (strips spaces, dashes, parentheses) */
function normalizePhone(raw: string): string {
  // Remove all non-digit characters except leading +
  const stripped = raw.replace(/[^\d+]/g, '');
  // Ensure it starts with +
  if (stripped.startsWith('+')) return stripped;
  // Default assumption: add + if it looks like a full international number
  if (stripped.length > 10) return `+${stripped}`;
  return stripped;
}

function documentTypeLabel(documentType: string): string {
  const map: Record<string, string> = {
    proforma_invoice: 'Proforma Invoice',
    order_confirmation: 'Order Confirmation',
    packing_sheet: 'Packing Sheet',
    packing_list: 'Packing List',
    delivery_note: 'Delivery Note',
    dispatch_invoice: 'Dispatch Invoice',
    final_invoice: 'Final Invoice',
    freight_rate_request: 'Freight Rate Request',
  };
  return map[documentType] ?? documentType.replace(/_/g, ' ');
}

/**
 * Generate WhatsApp links for a document send.
 * Returns both mobile (wa.me) and desktop (web.whatsapp.com) links.
 */
export function generateWhatsAppLinks(input: WhatsAppLinkInput): WhatsAppLinkSet {
  const phone = normalizePhone(input.phone);
  const docLabel = documentTypeLabel(input.documentType);

  const messageParts = [
    `Hi, this is ${input.organizationName}.`,
    '',
    `Please find your *${docLabel}* for order *${input.orderNumber}* (${input.companyName}) below.`,
    input.currencyTotal ? `Amount: ${input.currencyTotal}` : null,
    input.note ? `Note: ${input.note}` : null,
    '',
    `📄 Open document: ${input.shareUrl}`,
    '',
    '_This is a tracked document link. Powered by SETU Flow._',
  ]
    .filter((p) => p !== null)
    .join('\n');

  const encodedMessage = encodeURIComponent(messageParts);
  const phoneDigits = phone.replace('+', '');

  return {
    phone,
    message: messageParts,
    mobileLink: `https://wa.me/${phoneDigits}?text=${encodedMessage}`,
    desktopLink: `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encodedMessage}`,
  };
}

/**
 * Client-side helper: detect mobile browser and return the appropriate link.
 * Call this in a browser component (not in server actions).
 */
export function getWhatsAppLinkForDevice(links: WhatsAppLinkSet): string {
  if (typeof window === 'undefined') return links.mobileLink;
  const ua = window.navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
  return isMobile ? links.mobileLink : links.desktopLink;
}

/**
 * Convenience: given a phone and share URL, return the correct link for the current device.
 * This is what the UI components should call when generating the "Open in WhatsApp" button.
 */
export function buildWhatsAppOpenLink(input: WhatsAppLinkInput): string {
  const links = generateWhatsAppLinks(input);
  return getWhatsAppLinkForDevice(links);
}
