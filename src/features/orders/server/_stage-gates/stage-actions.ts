'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hasSupabaseEnv } from '@/lib/env';
import { safeUserError, logServerError } from '@/lib/safe-error';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

const ORDER_TARGET_STAGES = new Set([
  'order_created',
  'payment_requested',
  'payment_partial',
  'payment_paid',
  'production_ready',
  'production_in_progress',
  'dispatch_ready',
  'dispatched',
  'delivered',
  'completed',
  'cancelled',
]);

type OrderLookup = {
  id: string;
  lead_id: string;
  source_quote_id: string;
  legacy_contract_id: string | null;
  order_lifecycle_status?: string | null;
};

function buildOrdersRedirect(notice: string, sourceQuoteId?: string | null) {
  const params = new URLSearchParams({ notice });
  if (sourceQuoteId) params.set('sourceQuoteId', sourceQuoteId);
  return `/orders?${params.toString()}`;
}

function orderStageError(error: unknown, fallback = 'Order stage could not be updated. Please refresh and try again.') {
  logServerError('order-stage-advance', error);
  return safeUserError(error, fallback);
}

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function boolValue(value: FormDataEntryValue | null) {
  const normalized = clean(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

async function resolveOrderForStageAction(db: any, organizationId: string, input: { orderId?: string; sourceQuoteId?: string; contractId?: string; actorUserId?: string | null; notes?: string | null }) {
  if (input.orderId) {
    const { data, error } = await db
      .from('orders')
      .select('id, lead_id, source_quote_id, legacy_contract_id, order_lifecycle_status')
      .eq('organization_id', organizationId)
      .eq('id', input.orderId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data as OrderLookup;
  }

  if (input.sourceQuoteId) {
    const { data, error } = await db
      .from('orders')
      .select('id, lead_id, source_quote_id, legacy_contract_id, order_lifecycle_status')
      .eq('organization_id', organizationId)
      .eq('source_quote_id', input.sourceQuoteId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data as OrderLookup;
  }

  if (input.contractId) {
    const { data: orderByContract, error: orderByContractError } = await db
      .from('orders')
      .select('id, lead_id, source_quote_id, legacy_contract_id, order_lifecycle_status')
      .eq('organization_id', organizationId)
      .eq('legacy_contract_id', input.contractId)
      .maybeSingle();
    if (orderByContractError) throw orderByContractError;
    if (orderByContract?.id) return orderByContract as OrderLookup;

    const { data: contract, error: contractError } = await db
      .from('contracts')
      .select('id, quote_id, lead_id')
      .eq('organization_id', organizationId)
      .eq('id', input.contractId)
      .maybeSingle();
    if (contractError) throw contractError;
    if (contract?.quote_id) input.sourceQuoteId = contract.quote_id;
  }

  if (input.sourceQuoteId) {
    const { data: quote, error: quoteError } = await db
      .from('quotes')
      .select('id, lead_id, status, accepted_version_id')
      .eq('organization_id', organizationId)
      .eq('id', input.sourceQuoteId)
      .maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote?.id) throw new Error('Accepted quote was not found for this order.');
    if (String(quote.status ?? '').toLowerCase() !== 'accepted' || !quote.accepted_version_id) {
      throw new Error('Accept the quote before order execution can be advanced.');
    }

    const { data: ensured, error: ensureError } = await db.rpc('app_ensure_order_for_accepted_quote_tx', {
      p_organization_id: organizationId,
      p_quote_id: quote.id,
      p_lead_id: quote.lead_id,
      p_actor_user_id: input.actorUserId ?? null,
      p_notes: input.notes ?? null,
    });
    if (ensureError) throw ensureError;
    const ensuredRow = Array.isArray(ensured) ? ensured[0] : ensured;
    if (ensuredRow?.order_id) {
      const { data, error } = await db
        .from('orders')
        .select('id, lead_id, source_quote_id, legacy_contract_id, order_lifecycle_status')
        .eq('organization_id', organizationId)
        .eq('id', ensuredRow.order_id)
        .maybeSingle();
      if (error) throw error;
      if (data?.id) return data as OrderLookup;
    }
  }

  throw new Error('Canonical order record was not found. Accept the quote and refresh the order workspace.');
}

export async function advanceOrderStageAction(formData: FormData): Promise<void> {
  const sourceQuoteId = clean(formData.get('source_quote_id')) || clean(formData.get('quote_id')) || null;
  let redirectTo = buildOrdersRedirect('order-state-blocked:Order stage could not be updated. Please refresh and try again.', sourceQuoteId);

  try {
    if (!hasSupabaseEnv) throw new Error('Supabase environment variables are not configured.');

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) throw new Error('Sign in and select a workspace before updating orders.');

    const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
    const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
    if (!canManage && !canReviewCompliance) {
      throw new Error(getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot update order execution.');
    }

    const targetStage = clean(formData.get('target_stage')).toLowerCase();
    if (!ORDER_TARGET_STAGES.has(targetStage)) throw new Error('Select a valid order stage action.');

    const db = (await createClient()) as any;
    const order = await resolveOrderForStageAction(db, workspace.organization.id, {
      orderId: clean(formData.get('order_id')) || undefined,
      sourceQuoteId: sourceQuoteId ?? undefined,
      contractId: clean(formData.get('contract_id')) || undefined,
      actorUserId: workspace.user.id,
      notes: clean(formData.get('note')) || null,
    });

    const payload = {
      idempotency_key: clean(formData.get('idempotency_key')) || `${order.id}:${order.order_lifecycle_status ?? 'unknown'}->${targetStage}`,
      source: 'advanceOrderStageAction',
      note: clean(formData.get('note')) || null,
      deferred_payment_approved: boolValue(formData.get('deferred_payment_approved')),
      payment_gate_waived: boolValue(formData.get('payment_gate_waived')),
      payment_terms_note: clean(formData.get('payment_terms_note')) || null,
    };

    const { data, error } = await db.rpc('app_advance_order_stage_tx', {
      p_organization_id: workspace.organization.id,
      p_order_id: order.id,
      p_target_stage: targetStage,
      p_actor_user_id: workspace.user.id,
      p_payload: payload,
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const changed = result?.changed === false ? 'unchanged' : 'updated';

    revalidatePath('/orders');
    revalidatePath('/contracts');
    revalidatePath('/documents');
    revalidatePath('/compliance');
    revalidatePath('/pipeline');
    if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
    revalidatePath('/leads');

    redirectTo = buildOrdersRedirect(changed === 'unchanged' ? `order-state-progressed:${targetStage}` : `order-state-progressed:${targetStage}`, order.source_quote_id ?? sourceQuoteId);
  } catch (error) {
    const message = orderStageError(error, 'Order stage could not be updated. Please refresh and try again.');
    redirectTo = buildOrdersRedirect(`order-state-blocked:${message}`, sourceQuoteId);
  }

  redirect(redirectTo);
}
