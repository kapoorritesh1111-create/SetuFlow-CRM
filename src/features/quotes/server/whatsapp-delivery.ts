'use server';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const PRODUCTION_SHARE_ORIGIN = 'https://www.setuflowcrm.com';

function cleanWhatsAppNumber(value: string | null | undefined) {
  return String(value ?? '').replace(/[+\s\-()]/g, '').replace(/[^0-9]/g, '');
}

function safeLogoUrl(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!/^https:\/\//i.test(text)) return '';
  return text;
}

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const clean = configured?.replace(/\/$/, '');
  if (clean && !clean.includes('vercel.app') && !clean.includes('localhost')) return clean;
  return PRODUCTION_SHARE_ORIGIN;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '7 days';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '7 days';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildShareUrl(input: {
  quoteId: string;
  quoteNumber: string;
  buyerName: string;
  products: string;
  total: string;
  validity: string;
  currency: string;
  orgName: string;
  orgLogoUrl: string;
  orgWebsite: string;
}) {
  const url = new URL(`/api/quotes/${input.quoteId}/share`, appBaseUrl());
  url.searchParams.set('quote', input.quoteNumber);
  url.searchParams.set('buyer', input.buyerName);
  url.searchParams.set('products', input.products);
  url.searchParams.set('total', input.total);
  url.searchParams.set('validity', input.validity);
  url.searchParams.set('currency', input.currency);
  url.searchParams.set('org', input.orgName);
  if (input.orgLogoUrl) url.searchParams.set('logo', input.orgLogoUrl);
  if (input.orgWebsite) url.searchParams.set('website', input.orgWebsite);
  return url.toString();
}

export async function sendQuoteViaWhatsApp(input: { quoteId: string; leadId: string; organizationId: string }) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || workspace.organization.id !== input.organizationId) {
    throw new Error('Workspace organization mismatch.');
  }

  const supabase = await createClient();
  const db = supabase;
  const [{ data: lead }, { data: quote }, { data: organization }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, whatsapp_number, phone').eq('organization_id', input.organizationId).eq('id', input.leadId).maybeSingle(),
    db.from('quotes').select('id, quote_number, currency, display_currency, current_version_id, accepted_version_id').eq('organization_id', input.organizationId).eq('id', input.quoteId).maybeSingle(),
    db.from('organizations').select('name, legal_name, logo_url, website').eq('id', input.organizationId).maybeSingle(),
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
  const totalAmount = lineItems.reduce((sum: number, line: any) => sum + Number(line.final_case_price ?? line.final_kg_price ?? line.final_unit_price ?? 0), 0);
  const total = money(totalAmount, currency);
  const productSummary = lineItems.map((line: any) => line.product_name ?? line.description).filter(Boolean).slice(0, 4).join(', ') || `${version?.total_line_count ?? (lineItems.length || 0)} line items`;
  const quoteNumber = quote.quote_number ?? quote.id.slice(0, 8);
  const validity = formatDate(version?.valid_until);
  const buyerName = lead.contact_name || lead.company_name || 'there';
  const orgName = organization?.legal_name || organization?.name || workspace.organization?.name || 'SETU Groups LLC';
  const orgLogoUrl = safeLogoUrl(organization?.logo_url);
  const orgWebsite = organization?.website || 'www.setuflowcrm.com';
  const shareUrl = buildShareUrl({ quoteId: quote.id, quoteNumber, buyerName, products: productSummary, total, validity, currency, orgName, orgLogoUrl, orgWebsite });

  const message = [
    `Hello ${buyerName},`,
    '',
    `Please find quote ${quoteNumber} from ${orgName}.`,
    `Products: ${productSummary}`,
    `Total: ${total}`,
    `Validity: ${validity}`,
    `View quote: ${shareUrl}`,
    '',
    'Please reply here if you would like any revisions or have questions.'
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
    subject: `WhatsApp quote ${quoteNumber}`,
    body: message,
    summary: 'Quote shared through professional production-domain WhatsApp prefill link.',
    sent_at: now,
    provider_payload: { provider: 'wa.me', url },
    metadata: { upgrade_path: 'Twilio WhatsApp Business API when volume justifies it.', share_url: shareUrl, org_logo_url: orgLogoUrl },
  });

  return { url };
}
