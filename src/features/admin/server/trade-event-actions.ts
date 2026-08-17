'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { classifyTradeEventMatch } from '@/lib/trade-events/identity';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const text = (value: FormDataEntryValue | null | undefined) => String(value ?? '').trim() || null;
const date = (value: FormDataEntryValue | null | undefined) => { const v = text(value); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
const url = (value: FormDataEntryValue | null | undefined) => { const v = text(value); return v && (v.startsWith('/') || /^https?:\/\//i.test(v)) ? v : null; };

function captureDefaults(formData: FormData, existing: Record<string, unknown> = {}) {
  const next = { ...existing };
  const image = url(formData.get('image_url'));
  const website = url(formData.get('website_url'));
  if (image) next.image_url = image; else delete next.image_url;
  if (website) next.website_url = website; else delete next.website_url;
  return next;
}

async function context() {
  const workspace = await requireAdminWorkspace();
  if (workspace.missingEnv || !workspace.organization) return null;
  return { supabase: await createClient(), organizationId: workspace.organization.id };
}

function refresh() {
  revalidatePath('/admin/trade-events');
  revalidatePath('/trade-events');
}

function eventPayload(formData: FormData, organizationId?: string) {
  return {
    ...(organizationId ? { organization_id: organizationId } : {}),
    name: text(formData.get('name')),
    city: text(formData.get('city')),
    country: text(formData.get('country')),
    starts_on: date(formData.get('starts_on')),
    ends_on: date(formData.get('ends_on')),
    booth_number: text(formData.get('booth_number')),
    notes: text(formData.get('notes')),
  };
}

export async function createEnrichedTradeEvent(formData: FormData): Promise<void> {
  const ctx = await context();
  if (!ctx) return;
  const payload = eventPayload(formData, ctx.organizationId);
  if (!payload.name) return;

  const { data: existing } = await (ctx.supabase as any).from('trade_events').select('id, name, city, country, starts_on, ends_on').eq('organization_id', ctx.organizationId);
  const matches = (existing ?? []).map((event: any) => ({ event, strength: classifyTradeEventMatch(payload, event) }));
  const exact = matches.find((item: any) => item.strength === 'exact');
  if (exact) redirect(`/admin/trade-events?notice=event-duplicate&eventId=${encodeURIComponent(String(exact.event.id))}&eventName=${encodeURIComponent(payload.name)}`);

  const possible = matches.find((item: any) => item.strength === 'possible');
  const allowDuplicate = String(formData.get('allow_duplicate') ?? '') === '1';
  if (possible && !allowDuplicate) redirect(`/admin/trade-events?notice=event-possible-duplicate&eventId=${encodeURIComponent(String(possible.event.id))}&eventName=${encodeURIComponent(payload.name)}`);

  await (ctx.supabase as any).from('trade_events').insert({ ...payload, capture_defaults: captureDefaults(formData) });
  refresh();
  redirect('/admin/trade-events?notice=event-created');
}

export async function updateEnrichedTradeEvent(formData: FormData): Promise<void> {
  const ctx = await context();
  if (!ctx) return;
  const id = text(formData.get('id'));
  const payload = eventPayload(formData);
  if (!id || !payload.name) return;
  const { data: existing } = await (ctx.supabase as any).from('trade_events').select('id, capture_defaults').eq('id', id).eq('organization_id', ctx.organizationId).maybeSingle();
  if (!existing) return;
  const defaults = existing.capture_defaults && typeof existing.capture_defaults === 'object' && !Array.isArray(existing.capture_defaults) ? existing.capture_defaults : {};
  await (ctx.supabase as any).from('trade_events').update({ ...payload, capture_defaults: captureDefaults(formData, defaults), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', ctx.organizationId);
  refresh();
  redirect('/admin/trade-events?notice=event-updated');
}
