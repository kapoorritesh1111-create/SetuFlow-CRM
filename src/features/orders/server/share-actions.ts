'use server';

import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';

type DocumentType = 'order_confirmation' | 'proforma_invoice' | 'dispatch_invoice' | 'packing_sheet' | 'packing_list' | 'delivery_note' | 'freight_request';
type SendChannel = 'email' | 'whatsapp' | 'preview';

function buildAppOrigin() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://www.setuflowcrm.com').replace(/\/$/, '');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : '';
}

function fallbackRecipientForChannel(channel: SendChannel, lead: any) {
  if (channel === 'preview') return '';
  if (channel === 'email') return clean(lead?.email);
  if (channel === 'whatsapp') return clean(lead?.whatsapp_number) || clean(lead?.phone);
  return '';
}

function normalizeDocumentType(value: FormDataEntryValue | null): DocumentType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'proforma_invoice') return 'proforma_invoice';
  if (raw === 'dispatch_invoice' || raw === 'invoice' || raw === 'commercial_invoice') return 'dispatch_invoice';
  if (raw === 'packing_sheet') return 'packing_sheet';
  if (raw === 'packing_list') return 'packing_list';
  if (raw === 'delivery_note') return 'delivery_note';
  if (raw === 'freight_request' || raw === 'shipment_instruction') return 'freight_request';
  return 'order_confirmation';
}

function normalizeChannel(value: FormDataEntryValue | null): SendChannel {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'whatsapp') return 'whatsapp';
  if (raw === 'preview') return 'preview';
  return 'email';
}

function labelFor(type: DocumentType) {
  if (type === 'proforma_invoice') return 'Proforma Invoice';
  if (type === 'dispatch_invoice') return 'Dispatch Invoice';
  if (type === 'packing_sheet') return 'Packing Sheet';
  if (type === 'packing_list') return 'Packing List';
  if (type === 'delivery_note') return 'Delivery Note';
  if (type === 'freight_request') return 'Freight Request';
  return 'Order Confirmation';
}

function buildComposeUrl(channel: SendChannel, recipient: string, documentLabel: string, shareUrl: string, orderNumber?: string | null) {
  if (channel === 'preview') return '';
  const subject = `${documentLabel}${orderNumber ? ` ${orderNumber}` : ''} for review`;
  const message = `Hello, please review ${documentLabel}${orderNumber ? ` for order ${orderNumber}` : ''}: ${shareUrl}`;
  if (channel === 'email') {
    return `mailto:${encodeURIComponent(recipient || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }
  const digits = (recipient || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

async function recordOrderStageEvent(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  eventType: string;
  actorUserId: string;
  summary: string;
  eventPayload?: Record<string, unknown>;
}) {
  return db.from('order_stage_events').insert({ organization_id: payload.organizationId, order_id: payload.orderId, stage_key: payload.stageKey, event_type: payload.eventType, actor_user_id: payload.actorUserId, summary: payload.summary, payload: payload.eventPayload ?? {} });
}

async function findOrCreatePreviewOrderDocument(db: any, input: { organizationId: string; orderId: string; documentType: DocumentType; actorUserId: string; sourceQuoteId?: string | null; sourceQuoteVersionId?: string | null }) {
  const { data: existing } = await db.from('order_documents').select('id, version_no, status, sent_at').eq('organization_id', input.organizationId).eq('order_id', input.orderId).eq('document_type', input.documentType).is('superseded_by', null).order('version_no', { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) return existing;
  const { data: inserted, error } = await db.from('order_documents').insert({ organization_id: input.organizationId, order_id: input.orderId, document_type: input.documentType, stage_key: input.documentType, status: 'draft', version_no: 1, generated_from_snapshot: { source: 'sendOrderDocumentLinkAction.preview', source_quote_id: input.sourceQuoteId ?? null, source_quote_version_id: input.sourceQuoteVersionId ?? null }, source_snapshot: { source_quote_id: input.sourceQuoteId ?? null, source_quote_version_id: input.sourceQuoteVersionId ?? null, workflow: 'order_confirmed_then_proforma_then_logistics', preview_only: true }, created_by: input.actorUserId }).select('id, version_no, status, sent_at').single();
  if (error || !inserted?.id) throw error ?? new Error('Could not create draft order document tracking row');
  return inserted;
}

async function findApprovedOrderDocument(db: any, input: { organizationId: string; orderId: string; documentType: DocumentType }) {
  const { data: existing } = await db.from('order_documents').select('id, version_no, status, sent_at').eq('organization_id', input.organizationId).eq('order_id', input.orderId).eq('document_type', input.documentType).is('superseded_by', null).order('version_no', { ascending: false }).limit(1).maybeSingle();
  return existing?.status === 'approved' ? existing : null;
}

export async function sendOrderDocumentLinkAction(formData: FormData) {
  if (!hasSupabaseEnv) redirect('/orders?notice=order-share-config-error');
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/orders?notice=order-share-auth-error');
  const canSend = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage') || hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canSend) redirect('/orders?notice=order-share-readonly');

  const orderId = String(formData.get('order_id') ?? '').trim();
  const contractId = String(formData.get('contract_id') ?? '').trim();
  const recipient = String(formData.get('recipient') ?? '').trim();
  const recipientRole = String(formData.get('recipient_role') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const documentType = normalizeDocumentType(formData.get('document_type') ?? formData.get('document_kind'));
  const channel = normalizeChannel(formData.get('channel'));
  const previewOnly = channel === 'preview' || String(formData.get('preview_only') ?? '') === 'true';
  if (!orderId && !contractId) redirect('/orders?notice=order-share-missing-order');

  const db = (await createClient()) as any;
  let order: any = null;
  if (orderId) {
    const { data, error } = await db.from('orders').select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, current_stage, approval_state, order_number').eq('organization_id', workspace.organization.id).eq('id', orderId).maybeSingle();
    if (error || !data?.id) redirect('/orders?notice=order-share-order-missing');
    order = data;
  }
  if (!order?.id && contractId) {
    const { data } = await db.from('orders').select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, current_stage, approval_state, order_number').eq('organization_id', workspace.organization.id).eq('legacy_contract_id', contractId).maybeSingle();
    order = data;
  }
  if (!order?.id) redirect('/orders?notice=order-share-order-missing');

  const { data: lead } = order.lead_id ? await db.from('leads').select('id, company_name, contact_name, email, phone, whatsapp_number').eq('organization_id', workspace.organization.id).eq('id', order.lead_id).maybeSingle() : { data: null };

  let trackedDocument: any;
  try {
    trackedDocument = previewOnly
      ? await findOrCreatePreviewOrderDocument(db, { organizationId: workspace.organization.id, orderId: order.id, documentType, actorUserId: workspace.user.id, sourceQuoteId: order.source_quote_id ?? null, sourceQuoteVersionId: order.source_quote_version_id ?? null })
      : await findApprovedOrderDocument(db, { organizationId: workspace.organization.id, orderId: order.id, documentType });
  } catch {
    redirect('/orders?notice=order-share-document-track-failed');
  }
  if (!trackedDocument?.id) redirect('/orders?notice=order-share-approval-required');

  const resolvedRecipient = previewOnly ? '' : recipient || fallbackRecipientForChannel(channel, lead);
  const now = new Date().toISOString();
  const documentLabel = labelFor(documentType);
  const shareToken = randomUUID();
  const shareUrl = `${buildAppOrigin()}/order-documents/preview/${shareToken}`;
  const sendStatus = previewOnly ? 'previewed' : 'link_created';
  const composeUrl = buildComposeUrl(channel, resolvedRecipient, documentLabel, shareUrl, order.order_number ?? null);

  const { data: sendRow } = await db.from('order_document_sends').insert({ organization_id: workspace.organization.id, order_id: order.id, order_document_id: trackedDocument.id, document_type: documentType, channel, recipient: resolvedRecipient || null, recipient_role: recipientRole || null, note: note || null, status: sendStatus, share_token: shareToken, share_url: shareUrl, sent_at: now, created_by: workspace.user.id, metadata: { source: 'sendOrderDocumentLinkAction', preview_only: previewOnly, transport_delivery_confirmed: false, compose_url_created: Boolean(composeUrl), channel_default_source: recipient ? 'manual_recipient' : channel === 'email' ? 'lead_email' : channel === 'whatsapp' ? 'lead_whatsapp_number_or_phone' : 'preview', source_quote_id: order.source_quote_id ?? null, source_quote_version_id: order.source_quote_version_id ?? null, lead_id: order.lead_id ?? null } }).select('id').single();

  const nextDocumentStatus = previewOnly ? (trackedDocument.status === 'approved' ? 'approved' : 'previewed') : 'link_created';
  await db.from('order_documents').update({ status: nextDocumentStatus, sent_at: previewOnly ? trackedDocument.sent_at ?? null : now, updated_at: now, source_snapshot: { sent_channel: channel, sent_recipient: resolvedRecipient || null, latest_send_id: sendRow?.id ?? null, latest_share_url: shareUrl, preview_only: previewOnly, transport_delivery_confirmed: false, source_quote_id: order.source_quote_id ?? null, source_quote_version_id: order.source_quote_version_id ?? null, note: note || null, workflow: 'order_confirmed_then_proforma_then_logistics' } }).eq('organization_id', workspace.organization.id).eq('id', trackedDocument.id);

  await recordOrderStageEvent(db, { organizationId: workspace.organization.id, orderId: order.id, stageKey: documentType, eventType: previewOnly ? `${documentType}_preview_link_created` : `${documentType}_review_link_created`, actorUserId: workspace.user.id, summary: previewOnly ? `${documentLabel} preview link created.` : `${documentLabel} ${channel} review link${resolvedRecipient ? ` for ${resolvedRecipient}` : ''} created.`, eventPayload: { order_document_id: trackedDocument.id, order_document_send_id: sendRow?.id ?? null, channel, recipient: resolvedRecipient || null, share_url: shareUrl, compose_url: composeUrl || null, preview_only: previewOnly, transport_delivery_confirmed: false, source_quote_id: order.source_quote_id ?? null, source_quote_version_id: order.source_quote_version_id ?? null } });

  if (!previewOnly) {
    await db.from('lead_activities').insert({ organization_id: workspace.organization.id, lead_id: order.lead_id, actor_user_id: workspace.user.id, kind: 'order_document_review_link_created', message: `${documentLabel} ${channel} review link${resolvedRecipient ? ` for ${resolvedRecipient}` : ''} created.`, occurred_at: now }).then(() => null);
  }

  await writeAuditLog({ organizationId: workspace.organization.id, action: previewOnly ? 'order_document_preview_link_created' : 'order_document_review_link_created', entityType: 'order_document_send', entityId: sendRow?.id ?? trackedDocument.id, actorUserId: workspace.user.id, payload: { previous: { document_status: trackedDocument.status }, new: { document_type: documentType, channel, recipient: resolvedRecipient || null, sent_at: now, share_url: shareUrl, preview_only: previewOnly, transport_delivery_confirmed: false }, metadata: { source: 'sendOrderDocumentLinkAction', order_id: order.id, quote_id: order.source_quote_id, lead_id: order.lead_id, order_document_id: trackedDocument.id, note } } });

  revalidatePath('/orders');
  if (previewOnly) redirect(shareUrl);
  const params = new URLSearchParams({ notice: channel === 'whatsapp' ? 'whatsapp-compose-ready' : 'email-compose-ready', openOrderId: order.id, shareUrl });
  if (composeUrl) params.set('composeUrl', composeUrl);
  redirect(`/orders?${params.toString()}`);
}
