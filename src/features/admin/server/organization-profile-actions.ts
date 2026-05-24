'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { writeAuditLog } from '@/lib/auditLog';

const COUNTRY_CURRENCY: Record<string, string> = {
  IE: 'EUR',
  GB: 'GBP',
  UK: 'GBP',
  IN: 'INR',
  US: 'USD',
  AE: 'AED',
  EU: 'EUR',
};

function clean(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length ? text : null;
}

function normalizeSlug(value: FormDataEntryValue | null, fallback: string) {
  const raw = typeof value === 'string' ? value : '';
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return normalized || fallback;
}

function currencyFromCountry(country: Record<string, unknown> | null, fallback: string | null) {
  const iso = String(country?.iso2_code ?? country?.iso_code ?? '').trim().toUpperCase();
  const byIso = COUNTRY_CURRENCY[iso];
  if (byIso) return byIso;
  const name = String(country?.name ?? '').toLowerCase();
  if (name.includes('ireland')) return 'EUR';
  if (name.includes('united kingdom') || name.includes('uk') || name.includes('england')) return 'GBP';
  if (name.includes('india')) return 'INR';
  if (name.includes('united states')) return 'USD';
  if (name.includes('united arab emirates') || name.includes('uae')) return 'AED';
  return fallback ?? 'USD';
}

function redirectToProfile(notice: string): never {
  redirect(`/admin/organization?notice=${encodeURIComponent(notice)}#company-profile`);
}

function setTextField(payload: Record<string, unknown>, formData: FormData, field: string) {
  if (formData.has(field)) payload[field] = clean(formData.get(field));
}

async function uploadLogoFile({ supabase, organizationId, formData }: { supabase: Awaited<ReturnType<typeof createClient>>; organizationId: string; formData: FormData }) {
  const entry = formData.get('logo_file');
  if (!(entry instanceof File) || entry.size === 0) return null;

  const safeName = entry.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const extension = safeName.includes('.') ? safeName.split('.').pop() : 'png';
  const path = `${organizationId}/${Date.now()}.${extension ?? 'png'}`;
  const { error } = await supabase.storage.from('org-logos').upload(path, entry, { upsert: true, contentType: entry.type || 'image/png' });
  if (error) throw error;
  const { data } = supabase.storage.from('org-logos').getPublicUrl(path);
  return data.publicUrl;
}

export async function updateOrganizationProfileV2(formData: FormData): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.user || !context.membership || !context.organization) return;

  const supabase = await createClient();
  const organizationRecord = context.organization as unknown as Record<string, unknown>;
  const requestedCountryId = formData.has('default_country_id') ? clean(formData.get('default_country_id')) : null;
  let defaultCountry: Record<string, unknown> | null = null;

  if (requestedCountryId) {
    const { data } = await supabase
      .from('countries')
      .select('id, name, iso2_code, market_id')
      .eq('id', requestedCountryId)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    defaultCountry = data ?? null;
  }

  const currentSlug = String(organizationRecord.slug ?? 'organization').trim().toLowerCase();
  const nextSlug = formData.has('slug') ? normalizeSlug(formData.get('slug'), currentSlug) : currentSlug;
  if (nextSlug !== currentSlug) {
    const { data: existingSlug } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', context.organization.id)
      .maybeSingle();
    if (existingSlug?.id) redirectToProfile('slug-taken');
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (formData.has('name')) payload.name = clean(formData.get('name')) ?? context.organization.name;
  if (formData.has('slug')) payload.slug = nextSlug;
  setTextField(payload, formData, 'legal_name');
  setTextField(payload, formData, 'headquarters_country');
  setTextField(payload, formData, 'registered_address');
  setTextField(payload, formData, 'city');
  setTextField(payload, formData, 'postal_code');
  setTextField(payload, formData, 'website');
  setTextField(payload, formData, 'contact_email');
  setTextField(payload, formData, 'tax_id');
  setTextField(payload, formData, 'quote_terms_conditions');
  setTextField(payload, formData, 'order_terms_conditions');

  if (formData.has('default_country_id')) {
    payload.default_country_id = requestedCountryId;
    payload.default_market_id = defaultCountry?.market_id ?? null;
    payload.headquarters_country = clean(formData.get('headquarters_country')) ?? defaultCountry?.name ?? null;
  }

  if (formData.has('default_currency') || defaultCountry) {
    const manualCurrency = clean(formData.get('default_currency'));
    payload.default_currency = (manualCurrency ?? currencyFromCountry(defaultCountry, String(organizationRecord.default_currency ?? 'USD'))).toUpperCase().slice(0, 3);
  }

  if (formData.has('logo_url')) payload.logo_url = clean(formData.get('logo_url'));
  const uploadedLogoUrl = await uploadLogoFile({ supabase, organizationId: context.organization.id, formData });
  if (uploadedLogoUrl) payload.logo_url = uploadedLogoUrl;

  const { error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('id', context.organization.id);

  if (error) throw error;

  await writeAuditLog({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: 'organization_profile_updated',
    entityType: 'organization',
    entityId: context.organization.id,
    payload: {
      previous: {
        name: context.organization.name,
        slug: currentSlug,
        default_currency: context.organization.default_currency,
        default_country_id: organizationRecord.default_country_id ?? null,
        default_market_id: organizationRecord.default_market_id ?? null,
      },
      next: payload,
      source: 'admin_organization_profile_v2',
    },
  });

  revalidatePath('/admin/organization');
  revalidatePath('/dashboard');
  redirectToProfile('profile-saved');
}
