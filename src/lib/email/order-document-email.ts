/**
 * order-document-email.ts
 * Sprint 11 — Email delivery for order documents via Mailtrap.
 * Mirrors invitation-email.ts provider pattern.
 *
 * IMPORTANT: This function sends the email AND returns the provider message ID.
 * The caller is responsible for writing the send row and email_send_log.
 * External delivery is still unconfirmed until a webhook confirms it.
 */

export type OrderDocumentEmailResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; provider: string; error: string };

export type OrderDocumentEmailInput = {
  to: string;
  toName?: string | null;
  organizationName: string;
  organizationLogo?: string | null;
  documentType: string;
  documentLabel: string;
  orderNumber: string;
  companyName: string;
  shareUrl: string;
  note?: string | null;
  senderName?: string | null;
};

function fromEmail() {
  return (
    process.env.SETU_NOTIFICATION_FROM_EMAIL ??
    process.env.MAILTRAP_FROM_EMAIL ??
    'help@setugroups.com'
  );
}

function documentTypeLabel(documentType: string): string {
  const map: Record<string, string> = {
    proforma_invoice: 'Proforma Invoice',
    order_confirmation: 'Order Confirmation',
    packing_sheet: 'Packing Sheet',
    packing_list: 'Packing List',
    delivery_note: 'Delivery Note',
    dispatch_invoice: 'Dispatch Invoice',
    final_invoice: 'Final Invoice / Commercial Invoice',
    freight_rate_request: 'Freight Rate Request',
  };
  return map[documentType] ?? documentType.replace(/_/g, ' ');
}

function buildPayload(input: OrderDocumentEmailInput) {
  const displayLabel = documentTypeLabel(input.documentType);
  const subject = `${displayLabel} — ${input.orderNumber} | ${input.organizationName}`;
  const recipientName = input.toName?.trim() || input.to;
  const senderLine = input.senderName ? `<strong>${input.senderName}</strong> from ` : '';

  const text = [
    `Hi ${recipientName},`,
    '',
    `${senderLine}${input.organizationName} has shared a ${displayLabel} for order ${input.orderNumber}.`,
    input.note ? `Note: ${input.note}` : '',
    '',
    `Open document: ${input.shareUrl}`,
    '',
    'This is a tracked document link. Your access will be logged.',
    '',
    '---',
    `${input.organizationName}`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');

  const logoHtml = input.organizationLogo
    ? `<img src="${input.organizationLogo}" alt="${input.organizationName}" style="max-height:40px;margin-bottom:16px" /><br/>`
    : '';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">
  <div style="padding:24px 0 16px">
    ${logoHtml}
    <h2 style="margin:0 0 4px;font-size:20px">${displayLabel}</h2>
    <p style="margin:0;color:#64748b;font-size:14px">Order ${input.orderNumber} · ${input.companyName}</p>
  </div>
  <div style="border-top:1px solid #e2e8f0;padding:20px 0">
    <p>Hi ${recipientName},</p>
    <p>${senderLine}${input.organizationName} has shared a <strong>${displayLabel}</strong> for order <strong>${input.orderNumber}</strong>.</p>
    ${input.note ? `<p style="background:#f8fafc;border-left:3px solid #3b82f6;padding:10px 14px;border-radius:4px;font-size:14px">${input.note}</p>` : ''}
    <p>
      <a href="${input.shareUrl}" style="display:inline-block;background:#0f2244;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
        Open ${displayLabel} →
      </a>
    </p>
    <p style="font-size:12px;color:#94a3b8">Or copy this link: <span style="word-break:break-all">${input.shareUrl}</span></p>
    <p style="font-size:12px;color:#94a3b8">This is a tracked document link. Your access will be recorded.</p>
  </div>
  <div style="border-top:1px solid #e2e8f0;padding:16px 0;font-size:12px;color:#94a3b8">
    Sent by ${input.organizationName} via SETU Flow
  </div>
</div>`.trim();

  return { from: fromEmail(), subject, text, html };
}

async function sendWithMailtrap(
  input: OrderDocumentEmailInput
): Promise<OrderDocumentEmailResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  if (!apiKey) return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_API_KEY is not configured.' };

  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;

  if (useSandbox && !sandboxId)
    return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_SANDBOX_ID required when MAILTRAP_USE_SANDBOX=true.' };

  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';

  const payload = buildPayload(input);

  const body = {
    from: { email: payload.from, name: input.organizationName },
    to: [{ email: input.to, name: input.toName || undefined }],
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    category: 'order_document',
    custom_variables: {
      document_type: input.documentType,
      order_number: input.orderNumber,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, provider: 'mailtrap', error: errorText };
  }

  const data = await response.json().catch(() => ({}));
  return { ok: true, provider: 'mailtrap', messageId: data?.message_ids?.[0] ?? undefined };
}

/**
 * Main export — sends an order document email via the configured provider.
 * Currently: Mailtrap (configured via MAILTRAP_API_KEY).
 */
export async function sendOrderDocumentEmail(
  input: OrderDocumentEmailInput
): Promise<OrderDocumentEmailResult> {
  const provider = (
    process.env.SETU_EMAIL_PROVIDER ??
    (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'none')
  ).toLowerCase();

  if (provider === 'mailtrap') return sendWithMailtrap(input);
  return { ok: false, provider, error: `Email provider "${provider}" not configured. Set MAILTRAP_API_KEY.` };
}

export function getEmailProviderSummary() {
  return {
    provider: (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'not_configured')).toLowerCase(),
    from: fromEmail(),
    hasMailtrap: Boolean(process.env.MAILTRAP_API_KEY),
    sandboxMode: String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true',
  };
}
