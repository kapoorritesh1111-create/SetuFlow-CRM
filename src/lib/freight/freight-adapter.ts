/**
 * freight-adapter.ts — Sprint 13
 * Freight integration adapter boundary.
 *
 * ARCHITECTURE RULE: External freight booking is NEVER automatic.
 * SetuFlow prepares freight request data → human approves → adapter queues booking request.
 * External carrier/forwarder must confirm booking independently.
 *
 * Current state: Adapter boundary ready. External booking not yet connected.
 * Future: Connect Flexport / Freightos / DHL adapter per provider.
 */

'use server';

import { createClient } from '@/lib/supabase/server';

export type FreightEventType =
  | 'rate_request'
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'tracking_update'
  | 'bol_received'
  | 'awb_received';

export type FreightAdapterName = 'flexport' | 'freightos' | 'dhl' | 'manual' | 'pending';

export interface FreightEventPayload {
  organizationId: string;
  orderId: string;
  freightRateRequestId?: string;
  actorUserId: string;
  eventType: FreightEventType;
  adapterName?: FreightAdapterName;
  shipmentMode?: string;
  carrierName?: string;
  forwarderName?: string;
  bookingReference?: string;
  trackingReference?: string;
  data: Record<string, unknown>;
}

export interface FreightEventResult {
  ok: boolean;
  eventId?: string;
  error?: string;
  status: 'queued' | 'error';
}

/**
 * Queue a freight event for external processing.
 * This is the ONLY entry point for freight integration.
 * Packing sheet and freight request must be approved before calling.
 */
export async function queueFreightEvent(payload: FreightEventPayload): Promise<FreightEventResult> {
  const db = (await createClient()) as any;

  const { data, error } = await db
    .from('freight_booking_events')
    .insert({
      organization_id: payload.organizationId,
      order_id: payload.orderId,
      freight_rate_request_id: payload.freightRateRequestId ?? null,
      event_type: payload.eventType,
      adapter_name: payload.adapterName ?? 'pending',
      status: 'queued',
      shipment_mode: payload.shipmentMode ?? null,
      carrier_name: payload.carrierName ?? null,
      forwarder_name: payload.forwarderName ?? null,
      booking_reference: payload.bookingReference ?? null,
      tracking_reference: payload.trackingReference ?? null,
      payload: payload.data,
      created_by: payload.actorUserId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[freight-adapter] Failed to queue event:', error);
    return { ok: false, error: error.message, status: 'error' };
  }

  return { ok: true, eventId: data.id, status: 'queued' };
}

/**
 * Get freight adapter status for an order.
 */
export async function getFreightAdapterStatus(organizationId: string, orderId: string) {
  const db = (await createClient()) as any;

  const { data } = await db
    .from('freight_booking_events')
    .select('id, event_type, adapter_name, status, booking_reference, tracking_reference, queued_at, confirmed_at, error_message')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('queued_at', { ascending: false })
    .limit(10);

  const events = data ?? [];
  return {
    events,
    hasBookingConfirmed: events.some(
      (e: any) => e.event_type === 'booking_confirmed' && e.status === 'confirmed'
    ),
    latestBookingRef: events.find(
      (e: any) => e.booking_reference
    )?.booking_reference ?? null,
    latestTrackingRef: events.find(
      (e: any) => e.tracking_reference
    )?.tracking_reference ?? null,
  };
}

/**
 * Check whether any external freight adapter is connected and active.
 */
export async function getConnectedFreightAdapter(organizationId: string): Promise<FreightAdapterName> {
  const db = (await createClient()) as any;

  const { data } = await db
    .from('integrations')
    .select('provider, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('provider', ['flexport', 'freightos', 'dhl'])
    .limit(1)
    .maybeSingle();

  if (!data?.provider) return 'pending';
  return data.provider as FreightAdapterName;
}
