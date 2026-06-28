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

const SAFE_WORKSPACE_LOGO_URL = '/api/workspace/logo';
const LOGO_BUCKET = 'org-logos';
const SETU_DEFAULT_BRAND = {
  primary_color: '#0B2E4A',
  secondary_color: '#061C2E',
  accent_color: '#0C7FFF',
  sidebar_theme: 'setu-premium-navy',
};

type OrganizationProfilePatch = Record<string, string | null>;
type OrganizationUpdateResult = Promise<{ error: { message: string } | null }>;
type OrganizationTableClient = {
  update(payload: OrganizationProfilePatch): { eq(column: string, value: string): OrganizationUpdateResult };
};
type SlugLookupRow = { id: string };
type DefaultCountryRow = { id: string; name: string | null; iso2_code: string | null; market_id: string | null };

function organizationTable(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from('organizations') as unknown as OrganizationTableClient;
}

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

function currencyFromCountry(country: DefaultCountryRow | null, fallback: string | null) {
  const iso = String(country?.iso2_code ?? '').trim().toUpperCase();
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

function setTextField(payload: OrganizationProfilePatch, formData: FormData, field: string) {
  if (formData.has(field)) payload[field] = clean(formData.get(field));
}

function setBrandColorField(payload: Record<string, string | null>, formData: FormData, field: keyof typeof SETU_DEFAULT_BRAND) {
  if (formData.has(field)) payload[field] = clean(formData.get(field)) ?? SETU_DEFAULT_BRAND[field];
}

async function uploadBrandAsset({ supabase, organizationId, formData, fieldName, folder }: { supabase: Awaited<ReturnType<typeof createClient>>; organizationId: string; formData: FormData; fieldName: string; folder: string }) {
  const entry = formData.get(fieldName);
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (!entry.type.toLowerCase().startsWith('image/')) throw new Error('Brand assets must be image files.');

  const safeName = entry.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const extension = safeName.includes('.') ? safeName.split('.').pop() : 'png';
  const path = `${organizationId}/${folder}/${Date.now()}.${extension ?? 'png'}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, entry, { upsert: true, contentType: entry.type || 'image/png' });
  if (error) throw error;
  return path;
}

async function upsertBrandSettings(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, payload: Record<string, string | null>) {
  const { error } = await (supabase as any)
    .from('organization_brand_settings')
    .upsert({ organization_id: organizationId, ...payload }, { onConflict: 'organization_id' });
  if (error) throw error;
}

export async function updateOrganizationProfileV2(formData: FormData): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.user || !context.membership || !context.organization) return;

  const supabase = await createClient();
  const organizationRecord = context.organization as unknown as Record<string, unknown>;
  const requestedCountryId = formData.has('default_country_id') ? clean(formData.get('default_country_id')) : null;
  let defaultCountry: DefaultCountryRow | null = null;

  if (requestedCountryId) {
    const { data } = await supabase
      .from('countries')
      .select('id, name, iso2_code, market_id')
      .eq('id', requestedCountryId)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    defaultCountry = data as DefaultCountryRow | null;
  }

  const currentSlug = String(organizationRecord.slug ?? 'organization').trim().toLowerCase();
  const nextSlug = formData.has('slug') ? normalizeSlug(formData.get('slug'), currentSlug) : currentSlug;
  if (nextSlug !== currentSlug) {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', context.organization.id)
      .maybeSingle();
    const existingSlug = data as SlugLookupRow | null;
    if (existingSlug) redirectToProfile('slug-taken');
  }

  const payload: OrganizationProfilePatch = { updated_at: new Date().toISOString() };
  const brandPatch: Record<string, string | null> = {};
  const brandAction = clean(formData.get('brand_action'));

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

  if (formData.has('brand_display_name')) brandPatch.brand_display_name = clean(formData.get('brand_display_name')) ?? payload.name ?? context.organization.name;
  setBrandColorField(brandPatch, formData, 'primary_color');
  setBrandColorField(brandPatch, formData, 'secondary_color');
  setBrandColorField(brandPatch, formData, 'accent_color');
  if (formData.has('sidebar_theme')) brandPatch.sidebar_theme = clean(formData.get('sidebar_theme')) ?? SETU_DEFAULT_BRAND.sidebar_theme;
  if (formData.has('logo_alt_text')) brandPatch.logo_alt_text = clean(formData.get('logo_alt_text')) ?? `${payload.name ?? context.organization.name ?? 'Workspace'} logo`;

  if (brandAction === 'reset_setu') {
    brandPatch.primary_color = SETU_DEFAULT_BRAND.primary_color;
    brandPatch.secondary_color = SETU_DEFAULT_BRAND.secondary_color;
    brandPatch.accent_color = SETU_DEFAULT_BRAND.accent_color;
    brandPatch.sidebar_theme = SETU_DEFAULT_BRAND.sidebar_theme;
  }

  if (formData.has('default_country_id')) {
    payload.default_country_id = requestedCountryId;
    payload.default_market_id = defaultCountry?.market_id ?? null;
    payload.headquarters_country = clean(formData.get('headquarters_country')) ?? defaultCountry?.name ?? null;
  }

  if (formData.has('default_currency') || defaultCountry) {
    const manualCurrency = clean(formData.get('default_currency'));
    payload.default_currency = (manualCurrency ?? currencyFromCountry(defaultCountry, String(organizationRecord.default_currency ?? 'USD'))).toUpperCase().slice(0, 3);
  }

  const logoAction = clean(formData.get('logo_action'));
  const faviconAction = clean(formData.get('favicon_action'));
  const appIconAction = clean(formData.get('app_icon_action'));
  const uploadedLogoPath = await uploadBrandAsset({ supabase, organizationId: context.organization.id, formData, fieldName: 'logo_file', folder: 'logos' });
  const uploadedFaviconPath = await uploadBrandAsset({ supabase, organizationId: context.organization.id, formData, fieldName: 'favicon_file', folder: 'favicons' });
  const uploadedAppIconPath = await uploadBrandAsset({ supabase, organizationId: context.organization.id, formData, fieldName: 'app_icon_file', folder: 'app-icons' });

  if (logoAction === 'remove') {
    payload.logo_url = null;
    payload.logo_storage_path = null;
    brandPatch.workspace_logo_storage_path = null;
    brandPatch.login_logo_storage_path = null;
    brandPatch.quote_logo_storage_path = null;
    brandPatch.document_logo_storage_path = null;
  } else if (uploadedLogoPath) {
    payload.logo_url = SAFE_WORKSPACE_LOGO_URL;
    payload.logo_storage_path = uploadedLogoPath;
    brandPatch.brand_display_name = brandPatch.brand_display_name ?? payload.name ?? context.organization.name;
    brandPatch.workspace_logo_storage_path = uploadedLogoPath;
    brandPatch.login_logo_storage_path = uploadedLogoPath;
    brandPatch.quote_logo_storage_path = uploadedLogoPath;
    brandPatch.document_logo_storage_path = uploadedLogoPath;
    brandPatch.logo_alt_text = brandPatch.logo_alt_text ?? `${payload.name ?? context.organization.name ?? 'Workspace'} logo`;
  }

  if (faviconAction === 'remove') brandPatch.favicon_storage_path = null;
  else if (uploadedFaviconPath) brandPatch.favicon_storage_path = uploadedFaviconPath;

  if (appIconAction === 'remove') brandPatch.app_icon_storage_path = null;
  else if (uploadedAppIconPath) brandPatch.app_icon_storage_path = uploadedAppIconPath;

  if (Object.keys(brandPatch).length > 0) {
    await upsertBrandSettings(supabase, context.organization.id, brandPatch);
  }

  const { error } = await organizationTable(supabase)
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
        default_currency: organizationRecord.default_currency ?? null,
        default_country_id: organizationRecord.default_country_id ?? null,
        default_market_id: organizationRecord.default_market_id ?? null,
      },
      next: payload,
      brand: brandPatch,
      source: 'admin_organization_profile_v2',
    },
  });

  revalidatePath('/admin/organization');
  revalidatePath('/dashboard');
  redirectToProfile('profile-saved');
}
