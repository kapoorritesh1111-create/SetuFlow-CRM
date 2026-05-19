'use server';

import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';
// Sprint 12: Email + WhatsApp utilities wired in
import { sendOrderDocumentEmail } from '@/lib/email/order-document-email';
import { generateWhatsAppLinks } from '@/lib/whatsapp/whatsapp-link';

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

async function findApprovedOrderDocument(db: any, input: {
  organizationId: string;
  orderId: string;
  documentType: DocumentType;
}) {
  const { data } = await db
    .from('order_documents')
    .select('id, version_no, status')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('document_type', input.documentType)
    .eq('status', 'approved')
    .is('superseded_by', null)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? data : null;
}

async function findLatestStoredWhatsAppSend(db: any, input: {
  organizationId: string;
  orderId: string;
  orderDocumentId: string;
  recipient?: string | null;
}) {
  let query = db
    .from('order_document_sends')
    .select('id, share_url, whatsapp_link, whatsapp_phone, recipient, created_at')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('order_document_id', input.orderDocumentId)
    .eq('channel', 'whatsapp')
    .not('share_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (input.recipient) query = query.eq('recipient', input.recipient);

  const { data } = await query.maybeSingle();
  return data?.share_url ? data : null;
}

async function findOrCreateTrackedOrderDocument(db: any, input: {
  organizationId: string;
  orderId: string;
  documentType: DocumentType;
  actorUserId: string;
  initialStatus: 'draft' | 'previewed' | 'approved';
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
  const initialStatus = input.initialStatus;
  const { data: inserted, error } = await db
    .from('order_documents')
    .insert({
      organization_id: input.organizationId,
      order_id: input.orderId,
      document_type: input.documentType,
      stage_key: input.documentType,
      status: initialStatus,
      version_no: 1,
      generated_from_snapshot: {
        source: 'sendOrderDocumentLinkAction',
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
      },
      source_snapshot: {
        source_quote_id: input.sourceQuoteId ?? null,
        source_quote_version_id: input.sourceQuoteVersionId ?? null,
        workflow: 'order_confirmed_then_proforma_then_logistics',
      },
      approved_by: initialStatus === 'approved' ? input.actorUserId : null,
      approved_at: initialStatus === 'approved' ? now : null,
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
  const recipientRole = String(formData.get('recipient_role') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const documentType = normalizeDocumentType(formData.get('document_type') ?? formData.get('document_kind'));
  const channel = normalizeChannel(formData.get('channel'));
  const previewOnly = channel === 'preview' || String(formData.get('preview_only') ?? '') === 'true';
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
    ? await db.from('leads').select('id, company_name, contact_name, email, phone, whatsapp_number').eq('organization_id', workspace.organization.id).eq('id', order.lead_id).maybeSingle()
    : { data: null };

  let trackedDocument: any;
  if (previewOnly) {
    try {
      trackedDocument = await findOrCreateTrackedOrderDocument(db, {
        organizationId: workspace.organization.id,
        orderId: order.id,
        documentType,
        actorUserId: workspace.user.id,
        initialStatus: 'previewed',
        sourceQuoteId: order.source_quote_id ?? null,
        sourceQuoteVersionId: order.source_quote_version_id ?? null,
      });
    } catch {
      redirect('/orders?notice=order-share-document-track-failed');
    }
  } else {
    trackedDocument = await findApprovedOrderDocument(db, {
      organizationId: workspace.organization.id,
      orderId: order.id,
      documentType,
    });
    if (!trackedDocument?.id) redirect(`/orders?notice=order-document-approval-required&openOrderId=${encodeURIComponent(order.id)}`);
  }

  const resolvedRecipient = previewOnly ? '' : recipient || fallbackRecipientForChannel(channel, lead);
  const now = new Date().toISOString();
  const documentLabel = labelFor(documentType);
  const shareToken = randomUUID();
  const generatedShareUrl = `${buildAppOrigin()}/order-documents/preview/${shareToken}`;
  const sendStatus = previewOnly ? 'previewed' : 'link_created';

  let reusedWhatsAppSend: any = null;
  if (!previewOnly && channel === 'whatsapp' && trackedDocument?.id) {
    reusedWhatsAppSend = await findLatestStoredWhatsAppSend(db, {
      organizationId: workspace.organization.id,
      orderId: order.id,
      orderDocumentId: trackedDocument.id,
      recipient: resolvedRecipient || null,
    });
  }

  const shareUrl = reusedWhatsAppSend?.share_url || generatedShareUrl;

  // Sprint 12/Sprint 18: Generate WhatsApp links before insert; reuse stored tracked URL/link when present.
  let whatsappLink: string | null = reusedWhatsAppSend?.whatsapp_link ?? null;
  let whatsappPhone: string | null = reusedWhatsAppSend?.whatsapp_phone ?? null;
  if (!previewOnly && channel === 'whatsapp' && resolvedRecipient && !whatsappLink) {
    try {
      const orgName = workspace.organization.name ?? 'SETU Flow';
      const waLinks = generateWhatsAppLinks({
        phone: resolvedRecipient,
        organizationName: orgName,
        documentType,
        orderNumber: order.order_number ?? order.id.slice(0, 8).toUpperCase(),
        companyName: lead?.company_name ?? 'Buyer',
        shareUrl,
        note: note || null,
      });
      whatsappLink = waLinks.mobileLink; // Store mobile link; UI picks device-appropriate one
      whatsappPhone = waLinks.phone;
    } catch (waErr) {
      console.error('[share-actions] WhatsApp link generation error:', waErr);
    }
  }

  const { data: sendRow } = await db.from('order_document_sends').insert({
    organization_id: workspace.organization.id,
    order_id: order.id,
    order_document_id: trackedDocument.id,
    document_type: documentType,
    channel,
    recipient: resolvedRecipient || null,
    recipient_role: recipientRole || null,
    note: note || null,
    status: sendStatus,
    share_token: shareToken,
    share_url: shareUrl,
    sent_at: now,
    created_by: workspace.user.id,
    // Sprint 12: WhatsApp link columns
    whatsapp_link: whatsappLink,
    whatsapp_phone: whatsappPhone,
    email_delivery_status: (!previewOnly && channel === 'email') ? 'pending' : null,
    metadata: {
      source: 'sendOrderDocumentLinkAction',
      preview_only: previewOnly,
      transport_delivery_confirmed: false,
      channel_default_source: recipient ? 'manual_recipient' : channel === 'email' ? 'lead_email' : channel === 'whatsapp' ? 'lead_whatsapp_number_or_phone' : 'preview',
      source_quote_id: order.source_quote_id ?? null,
      source_quote_version_id: order.source_quote_version_id ?? null,
      lead_id: order.lead_id ?? null,
      reused_share_url_from_send_id: reusedWhatsAppSend?.id ?? null,
    },
  }).select('id').single();

  // Sprint 12: Fire email via Mailtrap for email channel
  if (!previewOnly && channel === 'email' && resolvedRecipient && sendRow?.id) {
    try {
      const orgName = workspace.organization.name ?? 'SETU Flow';
      const emailResult = await sendOrderDocumentEmail({
        to: resolvedRecipient,
        organizationName: orgName,
        organizationLogo: workspace.organization.logo_url ?? null,
        documentType,
        documentLabel: labelFor(documentType),
        orderNumber: order.order_number ?? order.id.slice(0, 8).toUpperCase(),
        companyName: lead?.company_name ?? 'Buyer',
        shareUrl,
        note: note || null,
        senderName: workspace.user.email ?? null,
      });

      // Update send row with email result
      const emailUpdate: Record<string, unknown> = {
        email_provider: emailResult.ok ? emailResult.provider : null,
        email_sent: emailResult.ok,
        email_delivery_status: emailResult.ok ? 'sent' : 'failed',
        updated_at: now,
      };
      if (emailResult.ok && 'messageId' in emailResult) {
        emailUpdate.email_message_id = emailResult.messageId ?? null;
      }
      await db.from('order_document_sends').update(emailUpdate).eq('id', sendRow.id);

      // Write to email_send_log
      if (emailResult.ok && 'messageId' in emailResult) {
        await db.from('email_send_log').insert({
          organization_id: workspace.organization.id,
          order_document_send_id: sendRow.id,
          provider: emailResult.provider,
          provider_message_id: emailResult.messageId ?? null,
          to_email: resolvedRecipient,
          subject: `${labelFor(documentType)} — ${order.order_number ?? ''} | ${orgName}`,
          template_type: 'order_document',
          status: 'sent',
          sent_at: now,
        });
      }
    } catch (emailErr) {
      console.error('[share-actions] Email send error:', emailErr);
      // Non-fatal — send row already created, UI can show link_created
    }
  }

  await db.from('order_documents').update({
    status: previewOnly ? (trackedDocument.status === 'approved' ? 'approved' : 'previewed') : trackedDocument.status ?? 'approved',
    sent_at: previewOnly ? trackedDocument.sent_at ?? null : now,
    updated_at: now,
    source_snapshot: {
      sent_channel: channel,
      sent_recipient: resolvedRecipient || null,
      latest_send_id: sendRow?.id ?? null,
      latest_share_url: shareUrl,
      preview_only: previewOnly,
      transport_delivery_confirmed: false,
      source_quote_id: order.source_quote_id ?? null,
      source_quote_version_id: order.source_quote_version_id ?? null,
      note: note || null,
      workflow: 'order_confirmed_then_proforma_then_logistics',
      reused_share_url_from_send_id: reusedWhatsAppSend?.id ?? null,
    },
  }).eq('organization_id', workspace.organization.id).eq('id', trackedDocument.id);

  await recordOrderStageEvent(db, {
    organizationId: workspace.organization.id,
    orderId: order.id,
    stageKey: documentType,
    eventType: previewOnly ? `${documentType}_preview_link_created` : `${documentType}_review_link_created`,
    actorUserId: workspace.user.id,
    summary: previewOnly ? `${documentLabel} preview link created.` : `${documentLabel} ${channel} review link${resolvedRecipient ? ` for ${resolvedRecipient}` : ''} created.`,
    eventPayload: {
      order_document_id: trackedDocument.id,
      order_document_send_id: sendRow?.id ?? null,
      channel,
      recipient: resolvedRecipient || null,
      share_url: shareUrl,
      preview_only: previewOnly,
      transport_delivery_confirmed: false,
      source_quote_id: order.source_quote_id ?? null,
      source_quote_version_id: order.source_quote_version_id ?? null,
      reused_share_url_from_send_id: reusedWhatsAppSend?.id ?? null,
    },
  });

  if (!previewOnly) {
    await db.from('lead_activities').insert({
      organization_id: workspace.organization.id,
      lead_id: order.lead_id,
      actor_user_id: workspace.user.id,
      kind: 'order_document_review_link_created',
      message: `${documentLabel} ${channel} review link${resolvedRecipient ? ` for ${resolvedRecipient}` : ''} created.`,
      occurred_at: now,
    }).then(() => null);
  }

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: previewOnly ? 'order_document_preview_link_created' : 'order_document_review_link_created',
    entityType: 'order_document_send',
    entityId: sendRow?.id ?? trackedDocument.id,
    actorUserId: workspace.user.id,
    payload: {
      previous: { document_status: trackedDocument.status },
      new: { document_type: documentType, channel, recipient: resolvedRecipient || null, sent_at: now, share_url: shareUrl, preview_only: previewOnly, transport_delivery_confirmed: false, reused_share_url_from_send_id: reusedWhatsAppSend?.id ?? null },
      metadata: { source: 'sendOrderDocumentLinkAction', order_id: order.id, quote_id: order.source_quote_id, lead_id: order.lead_id, order_document_id: trackedDocument.id, note },
    },
  });

  revalidatePath('/orders');
  if (previewOnly) redirect(shareUrl);
  redirect(`/orders?notice=order-document-review-link-created&openOrderId=${encodeURIComponent(order.id)}`);
}
