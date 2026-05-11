'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';
import { encodeOrderDocumentShareToken, getOrderDocumentLabel, type OrderDocumentKind } from '@/lib/orders/order-document-share';

function buildAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://www.setuflowcrm.com';
}

function normalizeDocumentKind(value: FormDataEntryValue | null): OrderDocumentKind {
  return String(value ?? '') === 'invoice' ? 'invoice' : 'order-confirmation';
}

function normalizeChannel(value: FormDataEntryValue | null) {
  return String(value ?? '') === 'whatsapp' ? 'whatsapp' : 'email';
}

function toWhatsAppRecipient(value: string) {
  return value.replace(/[^0-9+]/g, '').replace(/^\+/, '');
}

export async function sendOrderDocumentLinkAction(formData: FormData) {
  if (!hasSupabaseEnv) redirect('/orders?notice=order-share-config-error');

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/orders?notice=order-share-auth-error');

  const canSend = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage') || hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canSend) redirect('/orders?notice=order-share-readonly');

  const contractId = String(formData.get('contract_id') ?? '').trim();
  const recipient = String(formData.get('recipient') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const documentKind = normalizeDocumentKind(formData.get('document_kind'));
  const channel = normalizeChannel(formData.get('channel'));
  if (!contractId) redirect('/orders?notice=order-share-missing-contract');

  const db = (await createClient()) as any;
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id, quote_id, lead_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();

  if (contractError || !contract?.id) redirect('/orders?notice=order-share-contract-missing');

  const { data: lead } = contract.lead_id
    ? await db.from('leads').select('id, company_name, contact_name, email, phone, whatsapp').eq('organization_id', workspace.organization.id).eq('id', contract.lead_id).maybeSingle()
    : { data: null };

  const resolvedRecipient = recipient || lead?.email || lead?.whatsapp || lead?.phone || '';
  const token = encodeOrderDocumentShareToken({
    organizationId: workspace.organization.id,
    contractId: contract.id,
    leadId: contract.lead_id ?? null,
    quoteId: contract.quote_id ?? null,
    documentKind,
    recipient: resolvedRecipient || null,
    note: note || null,
    createdAt: new Date().toISOString(),
  });
  const shareUrl = `${buildAppOrigin().replace(/\/$/, '')}/order-documents/${token}`;
  const documentLabel = getOrderDocumentLabel(documentKind);
  const message = [
    `Hello${lead?.contact_name ? ` ${lead.contact_name}` : ''},`,
    '',
    `Please review the ${documentLabel} for ${lead?.company_name ?? 'your order'}:`,
    shareUrl,
    note ? `\nNote: ${note}` : '',
  ].filter(Boolean).join('\n');

  await db.from('lead_activities').insert({
    organization_id: workspace.organization.id,
    lead_id: contract.lead_id,
    actor_user_id: workspace.user.id,
    kind: 'order_document_sent',
    message: `${documentLabel} link sent${resolvedRecipient ? ` to ${resolvedRecipient}` : ''} by ${channel}.`,
    occurred_at: new Date().toISOString(),
  }).then(() => null);

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'order_document_sent',
    entityType: 'contract',
    entityId: contract.id,
    actorUserId: workspace.user.id,
    payload: {
      previous: null,
      new: { document_kind: documentKind, channel, recipient: resolvedRecipient || null, share_url: shareUrl },
      metadata: { source: 'sendOrderDocumentLinkAction', quote_id: contract.quote_id, lead_id: contract.lead_id, note },
    },
  });

  if (channel === 'whatsapp') {
    const phone = toWhatsAppRecipient(resolvedRecipient);
    const href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    redirect(href);
  }

  const mailTo = resolvedRecipient && resolvedRecipient.includes('@') ? resolvedRecipient : '';
  redirect(`mailto:${encodeURIComponent(mailTo)}?subject=${encodeURIComponent(`${documentLabel} - ${lead?.company_name ?? 'Order'}`)}&body=${encodeURIComponent(message)}`);
}
