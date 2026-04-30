'use server';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

function cleanWhatsAppNumber(value: string | null | undefined) {
  return String(value ?? '').replace(/[+\s\-()]/g, '').replace(/[^0-9]/g, '');
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function sendQuoteViaWhatsApp(input: { quoteId: string; leadId: string; organizationId: string }) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || workspace.organization.id !== input.organizationId) {
    throw new Error('Workspace organization mismatch.');
  }

  const supabase = await createClient();
  const db = supabase as any;
  const [{ data: lead }, { data: quote }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, whatsapp_number, phone').eq('organization_id', input.organizationId).eq('id', input.leadId).maybeSingle(),
    db.from('quotes').select('id, quote_number, currency, display_currency, current_version_id, accepted_version_id').eq('organization_id', input.organizationId).eq('id', input.quoteId).maybeSingle(),
  ]);

  if (!lead || !quote) throw new Error('Quote or lead not found.');
  const number = cleanWhatsAppNumber(lead.whatsapp_number);
  if (!number) throw new Error('Lead WhatsApp number is missing.');

  const versionId = quote.accepted_version_id ?? quote.current_version_id;
  const { data: version } = versionId
    ? await db.from('quote_versions').select('id, version_no, display_currency, valid_until, total_line_count').eq('id', versionId).maybeSingle()
    : { data: null };
  const { data: lines } = versionId
    ? await db.from('quote_version_line_items').select('product_name, final_case_price, final_kg_price, final_unit_price, display_currency').eq('quote_version_id', versionId).order('sort_order', { ascending: true }).limit(8)
    : { data: [] };

  const currency = version?.display_currency ?? quote.display_currency ?? quote.currency ?? 'USD';
  const lineItems = Array.isArray(lines) ? lines : [];
  const total = lineItems.reduce((sum: number, line: any) => sum + Number(line.final_case_price ?? line.final_kg_price ?? line.final_unit_price ?? 0), 0);
  const productSummary = lineItems.map((line: any) => line.product_name ?? line.description).filter(Boolean).slice(0, 4).join(', ') || `${version?.total_line_count ?? lineItems.length || 0} line items`;
  const shareUrl = `${appBaseUrl()}/api/quotes/${quote.id}/share`;
  const validity = version?.valid_until ? new Date(version.valid_until).toISOString().slice(0, 10) : '7 days';
  const buyerName = lead.contact_name || lead.company_name || 'there';

  const message = [
    `Hi ${buyerName},`,
    '',
    `Sharing quote ${quote.quote_number ?? quote.id.slice(0, 8)} from SETU Flow.`,
    `Products: ${productSummary}`,
    `Total: ${money(total, currency)}`,
    `Validity: ${validity}`,
    `Quote link: ${shareUrl}`,
    '',
    'Please review and reply here with any questions.'
  ].join('\n');

  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const now = new Date().toISOString();
  await db.from('communications').insert({
    organization_id: input.organizationId,
    lead_id: input.leadId,
    quote_id: input.quoteId,
    related_entity: 'quote',
    related_id: input.quoteId,
    communication_type: 'quote_message',
    direction: 'outbound',
    channel: 'whatsapp',
    status: 'sent',
    draft_source: 'system',
    subject: `WhatsApp quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    body: message,
    summary: 'Quote shared through WhatsApp wa.me prefill link.',
    sent_at: now,
    provider_payload: { provider: 'wa.me', url },
    metadata: { upgrade_path: 'Twilio WhatsApp Business API when volume justifies it.', share_url: shareUrl },
  });

  return { url };
}
