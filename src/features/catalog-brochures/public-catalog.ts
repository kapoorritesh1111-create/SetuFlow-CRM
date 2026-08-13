import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function validCatalogToken(value: unknown) {
  const token = clean(value);
  return TOKEN_PATTERN.test(token) ? token : null;
}

export function phoneDigits(value: unknown) {
  return clean(value).replace(/[^0-9]/g, '');
}

export function catalogQuoteMessage(brochureName: string) {
  return `Hi, I reviewed your ${brochureName} catalog and would like to request a quote. Please help me with pricing and next steps.`;
}

export async function loadPublicCatalog(tokenValue: unknown) {
  const token = validCatalogToken(tokenValue);
  if (!token) return null;

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return null;

  const { data: share, error } = await admin
    .from('catalog_brochure_shares')
    .select('id, token, expires_at, intake_id, lead_id, catalog_brochures(id,name,description,file_name,storage_bucket,storage_path,is_active,organization_id,organizations(id,name,slug,website,contact_email,contact_phone,whatsapp_phone,logo_storage_path))')
    .eq('token', token)
    .maybeSingle();

  const brochure = firstRelation<any>(share?.catalog_brochures);
  const organization = firstRelation<any>(brochure?.organizations);
  const expired = share?.expires_at ? new Date(share.expires_at).getTime() < Date.now() : false;
  if (error || !share?.id || !brochure?.id || !organization?.id || brochure.is_active === false || expired) return null;

  const { data: brand } = await admin
    .from('organization_brand_settings')
    .select('brand_display_name,primary_color,secondary_color,accent_color,workspace_logo_storage_path,logo_alt_text')
    .eq('organization_id', organization.id)
    .maybeSingle();

  const contactPhone = clean(organization.contact_phone) || clean(organization.whatsapp_phone) || null;
  const whatsappPhone = clean(organization.whatsapp_phone) || clean(organization.contact_phone) || null;
  const logoStoragePath = clean(brand?.workspace_logo_storage_path) || clean(organization.logo_storage_path) || null;

  return {
    share: {
      id: String(share.id),
      token: String(share.token),
      intakeId: share.intake_id ? String(share.intake_id) : null,
      leadId: share.lead_id ? String(share.lead_id) : null,
      expiresAt: share.expires_at ? String(share.expires_at) : null,
    },
    brochure: {
      id: String(brochure.id),
      name: String(brochure.name),
      description: brochure.description == null ? null : String(brochure.description),
      fileName: String(brochure.file_name || 'catalog.pdf'),
      storageBucket: String(brochure.storage_bucket),
      storagePath: String(brochure.storage_path),
    },
    organization: {
      id: String(organization.id),
      name: String(organization.name),
      displayName: clean(brand?.brand_display_name) || String(organization.name),
      slug: clean(organization.slug) || null,
      website: clean(organization.website) || null,
      contactEmail: clean(organization.contact_email) || null,
      contactPhone,
      whatsappPhone,
      logoStoragePath,
      logoAltText: clean(brand?.logo_alt_text) || `${clean(brand?.brand_display_name) || String(organization.name)} logo`,
      primaryColor: clean(brand?.primary_color) || null,
      secondaryColor: clean(brand?.secondary_color) || null,
      accentColor: clean(brand?.accent_color) || null,
    },
  };
}
