'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';

type DocumentType = 'order_confirmation' | 'proforma_invoice' | 'dispatch_invoice';

function normalizeDocumentType(value: FormDataEntryValue | null): DocumentType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'proforma_invoice') return 'proforma_invoice';
  if (raw === 'dispatch_invoice' || raw === 'invoice') return 'dispatch_invoice';
  return 'order_confirmation';
}

function normalizeChannel(value: FormDataEntryValue | null) {
  return String(value ?? '') === 'whatsapp' ? 'whatsapp' : 'email';
}

function labelFor(type: DocumentType) {
  if (type === 'proforma_invoice') return 'Proforma Invoice';
  if (type === 'dispatch_invoice') return 'Dispatch Invoice';
  return 'Order Confirmation';
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
  return db.from('order_stage_events').insert({
    organization_id: payload.organizationId,
    order_id: payload.orderId,
    stage_key: payload.stageKey,
    event_type: payload.eventType,
    actor_user_id: payload.actorUserId,
    summary: payload.summary,
    payload: payload.eventPayload ?? {},
  });
}

async function findOrCreateApprovedOrderDocument(db: any, input: {
  organizationId: string;
  orderId: string;
  documentType: DocumentType;
  actorUserId: string;
  sourceQuoteId?: string | null;
  sourceQuoteVersionId?: string | null;
}) {
  const { data: existing } = await db
    .from('order_documents')
    .select('id, version_no, status')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('document_type', input.documentType)
    .is('superseded_by', null)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing;

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
        source: 'sendOrderDocumentLinkAction',
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
      },
      source_snapshot: {
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
        workflow: 'prepare_preview_approve_send',
      },
      approved_by: input.actorUserId,
      approved_at: now,
    })
    .select('id, version_no, status')
    .single();

  if (error || !inserted?.id) throw error ?? new Error('Could not create order document tracking row');
  return inserted;
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
  const note = String(formData.get('note') ?? '').trim();
  const documentType = normalizeDocumentType(formData.get('document_type') ?? formData.get('document_kind'));
  const channel = normalizeChannel(formData.get('channel'));
  if (!orderId && !contractId) redirect('/orders?notice=order-share-missing-order');

  const db = (await createClient()) as any;
  let order: any = null;

  if (orderId) {
    const { data, error } = await db
      .from('orders')
      .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, current_stage, approval_state, order_number')
      .eq('organization_id', workspace.organization.id)
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data?.id) redirect('/orders?notice=order-share-order-missing');
    order = data;
  }

  if (!order?.id && contractId) {
    const { data } = await db
      .from('orders')
      .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, current_stage, approval_state, order_number')
      .eq('organization_id', workspace.organization.id)
      .eq('legacy_contract_id', contractId)
      .maybeSingle();
    order = data;
  }

  if (!order?.id) redirect('/orders?notice=order-share-order-missing');

  const { data: lead } = order.lead_id
    ? await db.from('leads').select('id, company_name, contact_name, email, phone, whatsapp').eq('organization_id', workspace.organization.id).eq('id', order.lead_id).maybeSingle()
    : { data: null };

  let trackedDocument: any;
  try {
    trackedDocument = await findOrCreateApprovedOrderDocument(db, {
      organizationId: workspace.organization.id,
      orderId: order.id,
      documentType,
      actorUserId: workspace.user.id,
      sourceQuoteId: order.source_quote_id ?? null,
      sourceQuoteVersionId: order.source_quote_version_id ?? null,
    });
  } catch {
    redirect('/orders?notice=order-share-document-track-failed');
  }

  const resolvedRecipient = recipient || lead?.email || lead?.whatsapp || lead?.phone || '';
  const now = new Date().toISOString();
  const documentLabel = labelFor(documentType);

  await db.from('order_documents').update({
    status: 'sent',
    sent_at: now,
    updated_at: now,
    source_snapshot: {
      sent_channel: channel,
      sent_recipient: resolvedRecipient || null,
      source_quote_id: order.source_quote_id ?? null,
      source_quote_version_id: order.source_quote_version_id ?? null,
      note: note || null,
      workflow: 'prepare_preview_approve_send',
    },
  }).eq('organization_id', workspace.organization.id).eq('id', trackedDocument.id);

  await recordOrderStageEvent(db, {
    organizationId: workspace.organization.id,
    orderId: order.id,
    stageKey: documentType,
    eventType: `${documentType}_sent`,
    actorUserId: workspace.user.id,
    summary: `${documentLabel} marked sent${resolvedRecipient ? ` to ${resolvedRecipient}` : ''} by ${channel}.`,
    eventPayload: {
      order_document_id: trackedDocument.id,
      channel,
      recipient: resolvedRecipient || null,
      source_quote_id: order.source_quote_id ?? null,
      source_quote_version_id: order.source_quote_version_id ?? null,
    },
  });

  await db.from('lead_activities').insert({
    organization_id: workspace.organization.id,
    lead_id: order.lead_id,
    actor_user_id: workspace.user.id,
    kind: 'order_document_sent',
    message: `${documentLabel} marked sent${resolvedRecipient ? ` to ${resolvedRecipient}` : ''} by ${channel}.`,
    occurred_at: now,
  }).then(() => null);

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'order_document_sent',
    entityType: 'order_document',
    entityId: trackedDocument.id,
    actorUserId: workspace.user.id,
    payload: {
      previous: { status: trackedDocument.status },
      new: { document_type: documentType, channel, recipient: resolvedRecipient || null, sent_at: now },
      metadata: { source: 'sendOrderDocumentLinkAction', order_id: order.id, quote_id: order.source_quote_id, lead_id: order.lead_id, note },
    },
  });

  revalidatePath('/orders');
  redirect(`/orders?notice=order-document-sent&openOrderId=${encodeURIComponent(order.source_quote_id ?? order.id)}`);
}
