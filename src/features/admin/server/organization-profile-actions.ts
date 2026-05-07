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

function currencyFromCountry(country: any, fallback: string | null) {
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

export async function updateOrganizationProfileV2(formData: FormData): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.user || !context.membership || !context.organization) return;

  const supabase = (await createClient()) as any;
  const requestedCountryId = clean(formData.get('default_country_id'));
  let defaultCountry: any = null;

  if (requestedCountryId) {
    const { data } = await supabase
      .from('countries')
      .select('id, name, iso2_code, market_id')
      .eq('id', requestedCountryId)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    defaultCountry = data ?? null;
  }

  const currentSlug = String((context.organization as any).slug ?? 'organization').trim().toLowerCase();
  const nextSlug = normalizeSlug(formData.get('slug'), currentSlug);
  if (nextSlug !== currentSlug) {
    const { data: existingSlug } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', context.organization.id)
      .maybeSingle();
    if (existingSlug?.id) redirectToProfile('slug-taken');
  }

  const manualCurrency = clean(formData.get('default_currency'));
  const nextCurrency = (manualCurrency ?? currencyFromCountry(defaultCountry, context.organization.default_currency ?? 'USD')).toUpperCase().slice(0, 3);

  const payload: Record<string, unknown> = {
    name: clean(formData.get('name')) ?? context.organization.name,
    slug: nextSlug,
    legal_name: clean(formData.get('legal_name')),
    headquarters_country: clean(formData.get('headquarters_country')) ?? defaultCountry?.name ?? null,
    registered_address: clean(formData.get('registered_address')),
    city: clean(formData.get('city')),
    postal_code: clean(formData.get('postal_code')),
    website: clean(formData.get('website')),
    contact_email: clean(formData.get('contact_email')),
    tax_id: clean(formData.get('tax_id')),
    default_currency: nextCurrency,
    default_country_id: requestedCountryId,
    default_market_id: defaultCountry?.market_id ?? null,
    logo_url: clean(formData.get('logo_url')),
    quote_terms_conditions: clean(formData.get('quote_terms_conditions')),
    order_terms_conditions: clean(formData.get('order_terms_conditions')),
    updated_at: new Date().toISOString(),
  };

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
        default_country_id: (context.organization as any).default_country_id ?? null,
        default_market_id: (context.organization as any).default_market_id ?? null,
      },
      next: payload,
      source: 'admin_organization_profile_v2',
    },
  });

  revalidatePath('/admin/organization');
  revalidatePath('/dashboard');
  redirectToProfile('profile-saved');
}
