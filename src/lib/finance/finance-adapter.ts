/**
 * finance-adapter.ts — Sprint 13
 * Finance integration adapter boundary.
 *
 * ARCHITECTURE RULE: All finance posting is human-approved and queued.
 * No external finance system call is made automatically.
 * This module queues events → adapter workers (Xero/QuickBooks/Tally) consume the queue.
 *
 * Current state: Adapter boundary ready. External posting not yet connected.
 * Future: Connect specific adapter in a dedicated sprint per provider.
 */

'use server';

import { createClient } from '@/lib/supabase/server';

export type FinanceEventType =
  | 'invoice_create'
  | 'invoice_void'
  | 'payment_received'
  | 'reconciliation_complete'
  | 'credit_note_create';

export type FinanceAdapterName = 'xero' | 'quickbooks' | 'tally' | 'pending';

export interface FinanceEventPayload {
  orderId: string;
  orderDocumentId?: string;
  organizationId: string;
  actorUserId: string;
  eventType: FinanceEventType;
  adapterName?: FinanceAdapterName;
  data: Record<string, unknown>;
}

export interface FinanceEventResult {
  ok: boolean;
  eventId?: string;
  error?: string;
  status: 'queued' | 'skipped' | 'error';
}

/**
 * Queue a finance event for external processing.
 * This is the ONLY entry point for finance integration.
 * Requires explicit human approval before calling.
 */
export async function queueFinanceEvent(payload: FinanceEventPayload): Promise<FinanceEventResult> {
  const db = (await createClient()) as any;

  const { data, error } = await db
    .from('finance_integration_events')
    .insert({
      organization_id: payload.organizationId,
      order_id: payload.orderId,
      order_document_id: payload.orderDocumentId ?? null,
      event_type: payload.eventType,
      adapter_name: payload.adapterName ?? 'pending',
      status: 'queued',
      payload: payload.data,
      created_by: payload.actorUserId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[finance-adapter] Failed to queue event:', error);
    return { ok: false, error: error.message, status: 'error' };
  }

  return { ok: true, eventId: data.id, status: 'queued' };
}

/**
 * Get the current status of the finance adapter for an order.
 */
export async function getFinanceAdapterStatus(organizationId: string, orderId: string) {
  const db = (await createClient()) as any;

  const { data } = await db
    .from('finance_integration_events')
    .select('id, event_type, adapter_name, status, external_ref, queued_at, confirmed_at, error_message')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('queued_at', { ascending: false })
    .limit(10);

  return {
    events: data ?? [],
    hasConfirmedInvoice: (data ?? []).some(
      (e: any) => e.event_type === 'invoice_create' && e.status === 'confirmed'
    ),
    hasReconciliation: (data ?? []).some(
      (e: any) => e.event_type === 'reconciliation_complete' && e.status === 'confirmed'
    ),
  };
}

/**
 * Check whether any external finance adapter is connected and active.
 * Returns 'pending' when no provider is configured.
 */
export async function getConnectedFinanceAdapter(organizationId: string): Promise<FinanceAdapterName> {
  const db = (await createClient()) as any;

  const { data } = await db
    .from('integrations')
    .select('provider, configuration, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('provider', ['xero', 'quickbooks', 'tally'])
    .limit(1)
    .maybeSingle();

  if (!data?.provider) return 'pending';
  return data.provider as FinanceAdapterName;
}
