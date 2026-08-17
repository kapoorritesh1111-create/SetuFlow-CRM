'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export type EventSpendState = { error?: string; success?: string };
const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const amount = (formData: FormData, key: string) => Math.max(0, Number(text(formData, key) || 0) || 0);

export async function saveEventSpend(_previous: EventSpendState | undefined, formData: FormData): Promise<EventSpendState> {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const eventId = text(formData, 'trade_event_id');
  if (!eventId) return { error: 'Trade event is required.' };

  const db: any = await createClient();
  const { data: event, error: loadError } = await db.from('trade_events').select('id, capture_defaults').eq('organization_id', workspace.organization.id).eq('id', eventId).maybeSingle();
  if (loadError || !event?.id) return { error: loadError?.message ?? 'Trade event was not found.' };
  const defaults = event.capture_defaults && typeof event.capture_defaults === 'object' && !Array.isArray(event.capture_defaults) ? event.capture_defaults : {};
  const eventSpend = {
    currency: (text(formData, 'currency') || 'INR').toUpperCase(),
    booth: amount(formData, 'booth'), registration: amount(formData, 'registration'), travel: amount(formData, 'travel'), hotel: amount(formData, 'hotel'), collateral: amount(formData, 'collateral'), misc: amount(formData, 'misc'),
  };
  const { error } = await db.from('trade_events').update({ capture_defaults: { ...defaults, event_spend: eventSpend }, updated_at: new Date().toISOString() }).eq('organization_id', workspace.organization.id).eq('id', eventId);
  if (error) return { error: error.message ?? 'Could not save event spend.' };
  revalidatePath('/trade-events');
  return { success: 'Event spend updated. ROI will use won order revenue only when currencies match.' };
}
