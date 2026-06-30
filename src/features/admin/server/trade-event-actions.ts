'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

function normalizeText(value: FormDataEntryValue | null | undefined) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function normalizeDate(value: FormDataEntryValue | null | undefined) {
  const text = normalizeText(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizeUrl(value: FormDataEntryValue | null | undefined) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.startsWith('/')) return text;
  if (/^https?:\/\//i.test(text)) return text;
  return null;
}

function buildCaptureDefaults(formData: FormData, existing?: Record<string, unknown> | null) {
  const imageUrl = normalizeUrl(formData.get('image_url'));
  const websiteUrl = normalizeUrl(formData.get('website_url'));
  const next = { ...(existing ?? {}) } as Record<string, unknown>;

  if (imageUrl) next.image_url = imageUrl;
  else delete next.image_url;

  if (websiteUrl) next.website_url = websiteUrl;
  else delete next.website_url;

  return next;
}

async function getContext() {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.organization) return null;
  const supabase = await createClient();
  return { supabase, organizationId: context.organization.id };
}

function revalidateTradeEvents() {
  revalidatePath('/admin/trade-events');
  revalidatePath('/trade-events');
}

export async function createEnrichedTradeEvent(formData: FormData): Promise<void> {
  const context = await getContext();
  if (!context) return;

  const name = normalizeText(formData.get('name'));
  if (!name) return;

  const payload = {
    organization_id: context.organizationId,
    name,
    city: normalizeText(formData.get('city')),
    country: normalizeText(formData.get('country')),
    starts_on: normalizeDate(formData.get('starts_on')),
    ends_on: normalizeDate(formData.get('ends_on')),
    booth_number: normalizeText(formData.get('booth_number')),
    notes: normalizeText(formData.get('notes')),
    capture_defaults: buildCaptureDefaults(formData),
  };

  await (context.supabase as any).from('trade_events').insert(payload);
  revalidateTradeEvents();
  redirect('/admin/trade-events?notice=event-created');
}

export async function updateEnrichedTradeEvent(formData: FormData): Promise<void> {
  const context = await getContext();
  if (!context) return;

  const id = normalizeText(formData.get('id'));
  const name = normalizeText(formData.get('name'));
  if (!id || !name) return;

  const { data: existing } = await (context.supabase as any)
    .from('trade_events')
    .select('id, capture_defaults')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (!existing) return;

  const currentDefaults = existing.capture_defaults && typeof existing.capture_defaults === 'object' && !Array.isArray(existing.capture_defaults)
    ? existing.capture_defaults as Record<string, unknown>
    : {};

  const payload = {
    name,
    city: normalizeText(formData.get('city')),
    country: normalizeText(formData.get('country')),
    starts_on: normalizeDate(formData.get('starts_on')),
    ends_on: normalizeDate(formData.get('ends_on')),
    booth_number: normalizeText(formData.get('booth_number')),
    notes: normalizeText(formData.get('notes')),
    capture_defaults: buildCaptureDefaults(formData, currentDefaults),
    updated_at: new Date().toISOString(),
  };

  await (context.supabase as any)
    .from('trade_events')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', context.organizationId);

  revalidateTradeEvents();
  redirect('/admin/trade-events?notice=event-updated');
}
