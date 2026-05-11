import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { decodeOrderDocumentShareToken, getOrderDocumentLabel, getOrderDocumentPdfPath } from '@/lib/orders/order-document-share';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const payload = decodeOrderDocumentShareToken(params.token);
  if (!payload) redirect('/');

  const admin = createAdminSupabaseClient();
  const openedAt = new Date();
  const documentLabel = getOrderDocumentLabel(payload.documentKind);

  if (admin) {
    await admin.from('audit_logs').insert({
      organization_id: payload.organizationId,
      actor_user_id: null,
      action: 'order_document_opened',
      entity_type: 'contract',
      entity_id: payload.contractId,
      payload: {
        previous: null,
        new: {
          document_kind: payload.documentKind,
          recipient: payload.recipient ?? null,
          opened_at: openedAt.toISOString(),
        },
        metadata: {
          source: 'public_order_document_share',
          lead_id: payload.leadId,
          quote_id: payload.quoteId,
          note: payload.note,
        },
      },
    }).then(() => null);

    if (payload.leadId) {
      await admin.from('lead_activities').insert({
        organization_id: payload.organizationId,
        lead_id: payload.leadId,
        actor_user_id: null,
        kind: 'order_document_opened',
        message: `${documentLabel} opened${payload.recipient ? ` by ${payload.recipient}` : ''}. Follow up in 2 days.`,
        occurred_at: openedAt.toISOString(),
      }).then(() => null);

      await admin.from('scheduled_tasks').insert({
        organization_id: payload.organizationId,
        lead_id: payload.leadId,
        task_type: 'follow_up',
        scheduled_for: addDays(openedAt, 2).toISOString(),
        status: 'pending',
        payload: {
          title: `Follow up on opened ${documentLabel}`,
          notes: `${documentLabel} link was opened${payload.recipient ? ` by ${payload.recipient}` : ''}.`,
          priority: 'normal',
          source: 'order_document_opened',
          contract_id: payload.contractId,
          quote_id: payload.quoteId,
          document_kind: payload.documentKind,
          recipient: payload.recipient,
        },
        created_by: null,
      }).then(() => null);
    }

    await admin.from('documents')
      .update({ status: 'opened', review_notes: `${documentLabel} opened ${openedAt.toISOString()}${payload.recipient ? ` by ${payload.recipient}` : ''}` })
      .eq('organization_id', payload.organizationId)
      .eq('related_entity', 'contract')
      .eq('related_id', payload.contractId)
      .eq('doc_type', payload.documentKind === 'invoice' ? 'invoice' : 'order_confirmation')
      .then(() => null);
  }

  redirect(getOrderDocumentPdfPath(payload.contractId, payload.documentKind));
}
