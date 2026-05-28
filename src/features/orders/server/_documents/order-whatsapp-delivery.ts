'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const PRODUCTION_SHARE_ORIGIN = 'https://www.setuflowcrm.com';

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const clean = configured?.replace(/\/$/, '');
  if (clean && !clean.includes('vercel.app') && !clean.includes('localhost')) return clean;
  return PRODUCTION_SHARE_ORIGIN;
}

function cleanWhatsAppNumber(value: string | null | undefined) {
  return String(value ?? '').replace(/[+\s\-()]/g, '').replace(/[^0-9]/g, '');
}

function docLabel(type: string) {
  return ({
    proforma_invoice: 'Proforma Invoice',
    order_confirmation: 'Order Confirmation',
    packing_sheet: 'Packing Sheet',
    packing_list: 'Packing List',
    delivery_note: 'Delivery Note',
    dispatch_invoice: 'Final / Commercial Invoice',
    final_invoice: 'Final / Commercial Invoice',
    freight_request: 'Freight Request',
  } as Record<string, string>)[type] ?? type.replace(/_/g, ' ');
}

async function findOrCreateApprovedDocument(db: any, input: {
  organizationId: string;
  orderId: string;
  documentType: string;
  actorUserId: string;
  sourceQuoteId?: string | null;
  sourceQuoteVersionId?: string | null;
}) {
  const { data: approved } = await db
    .from('order_documents')
    .select('id, status, version_no')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('document_type', input.documentType)
    .eq('status', 'approved')
    .is('superseded_by', null)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approved?.id) return approved;

  const { data: latest } = await db
    .from('order_documents')
    .select('id, status, version_no')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('document_type', input.documentType)
    .is('superseded_by', null)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id) return latest;

  const now = new Date().toISOString();
  const { data: inserted, error } = await db
    .from('order_documents')
    .insert({
      organization_id: input.organizationId,
      order_id: input.orderId,
      document_type: input.documentType,
      stage_key: input.documentType,
      status: 'approved',
      version_no: 1,
      generated_from_snapshot: {
        source: 'sendOrderDocumentViaWhatsApp',
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
      },
      source_snapshot: {
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
        workflow: 'order_execution_manual_whatsapp_tracked_link',
      },
      approved_by: input.actorUserId,
      approved_at: now,
    })
    .select('id, status, version_no')
    .single();

  if (error || !inserted?.id) throw error ?? new Error('Could not prepare order document tracking row.');
  return inserted;
}

export async function sendOrderDocumentViaWhatsApp(input: {
  orderId?: string | null;
  quoteId: string;
  documentType: string;
  recipient?: string | null;
  note?: string | null;
}) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.user) throw new Error('Workspace required.');

  const db: any = await createClient();
  const orgId = workspace.organization.id;
  const orderQuery = db
    .from('orders')
    .select('id, order_number, lead_id, source_quote_id, source_quote_version_id')
    .eq('organization_id', orgId)
    .limit(1);

  const { data: order, error: orderError } = input.orderId
    ? await orderQuery.eq('id', input.orderId).maybeSingle()
    : await orderQuery.eq('source_quote_id', input.quoteId).maybeSingle();

  if (orderError || !order?.id) throw new Error('Order not found for WhatsApp send.');

  const { data: lead } = order.lead_id
    ? await db
      .from('leads')
      .select('id, company_name, contact_name, whatsapp_number, phone')
      .eq('organization_id', orgId)
      .eq('id', order.lead_id)
      .maybeSingle()
    : { data: null };

  const number = cleanWhatsAppNumber(input.recipient || lead?.whatsapp_number || lead?.phone);
  if (!number) throw new Error('Buyer WhatsApp number is missing.');

  const document = await findOrCreateApprovedDocument(db, {
    organizationId: orgId,
    orderId: order.id,
    documentType: input.documentType,
    actorUserId: workspace.user.id,
    sourceQuoteId: order.source_quote_id ?? input.quoteId,
    sourceQuoteVersionId: order.source_quote_version_id ?? null,
  });

  const { data: existingSend } = await db
    .from('order_document_sends')
    .select('id, share_url, whatsapp_link, whatsapp_phone')
    .eq('organization_id', orgId)
    .eq('order_id', order.id)
    .eq('order_document_id', document.id)
    .eq('channel', 'whatsapp')
    .eq('recipient', input.recipient || lead?.whatsapp_number || lead?.phone || null)
    .not('share_url', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const shareToken = randomUUID();
  const shareUrl = existingSend?.share_url || `${appBaseUrl()}/order-documents/preview/${shareToken}`;
  const orderRef = order.order_number || order.id.slice(0, 8).toUpperCase();
  const buyerName = lead?.contact_name || lead?.company_name || 'there';
  const organizationName = workspace.organization.name || 'SETU Flow';
  const label = docLabel(input.documentType);
  const note = String(input.note ?? '').trim();

  const message = [
    `Hello ${buyerName},`,
    '',
    `Please find ${label} for order ${orderRef} from ${organizationName}.`,
    `View secure document: ${shareUrl}`,
    note ? `Note: ${note}` : '',
    '',
    'Please reply here if you have any questions.'
  ].filter(Boolean).join('\n');

  const url = existingSend?.whatsapp_link || `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const now = new Date().toISOString();

  await db.from('order_document_sends').insert({
    organization_id: orgId,
    order_id: order.id,
    order_document_id: document.id,
    document_type: input.documentType,
    channel: 'whatsapp',
    recipient: input.recipient || lead?.whatsapp_number || lead?.phone || null,
    recipient_role: 'buyer',
    note: note || null,
    status: 'link_created',
    share_token: shareToken,
    share_url: shareUrl,
    whatsapp_link: url,
    whatsapp_phone: number,
    sent_at: now,
    created_by: workspace.user.id,
    metadata: {
      source: 'sendOrderDocumentViaWhatsApp',
      manual_send: true,
      transport_delivery_confirmed: false,
      reused_share_url_from_send_id: existingSend?.id ?? null,
      upgrade_path: 'WhatsApp Business API later; current flow opens manual tracked WhatsApp links.',
    },
  });

  await db
    .from('order_documents')
    .update({ sent_at: now, updated_at: now })
    .eq('organization_id', orgId)
    .eq('id', document.id);

  revalidatePath('/orders');
  return { url, shareUrl, reused: Boolean(existingSend?.id) };
}
