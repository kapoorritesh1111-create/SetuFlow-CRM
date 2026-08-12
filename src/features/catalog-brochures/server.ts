'use server';

import { randomBytes, randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { env } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const BROCHURE_BUCKET = 'organization-assets';
const MAX_BROCHURE_BYTES = 12 * 1024 * 1024;
const ADMIN_ROLES = new Set(['owner', 'admin']);
const SHARE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);

export type CatalogBrochure = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  storage_bucket: string;
  storage_path: string;
  is_active: boolean;
  created_at: string;
  family_ids: string[];
  family_names: string[];
  family_slugs: string[];
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'brochure.pdf';
}

function requestBaseUrl() {
  const h = headers();
  const origin = h.get('origin')?.trim();
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return env.appUrl.replace(/\/$/, '');
}

async function workspaceWithRole(allowed: Set<string>) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership || !workspace.user) throw new Error('Workspace membership is required.');
  if (!workspace.currentRoles.some((role) => allowed.has(String(role)))) throw new Error('You do not have permission for this brochure action.');
  return workspace;
}

export async function listCatalogBrochures(input?: { includeInactive?: boolean }) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership) return [] as CatalogBrochure[];
  const db: any = await createClient();
  let query = db.from('catalog_brochures')
    .select('id, organization_id, name, description, file_name, file_size, storage_bucket, storage_path, is_active, created_at, catalog_brochure_families(packaging_family_id, packaging_service_families(id,name,slug))')
    .eq('organization_id', workspace.organization.id)
    .order('created_at', { ascending: false });
  if (!input?.includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    if (String(error.code ?? '') === '42P01') return [] as CatalogBrochure[];
    throw new Error(`Brochures could not load: ${String(error.message ?? 'unknown database error')}`);
  }
  return (data ?? []).map((row: any) => {
    const mappings = Array.isArray(row.catalog_brochure_families) ? row.catalog_brochure_families : [];
    const families = mappings.map((mapping: any) => mapping.packaging_service_families).filter(Boolean);
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description ?? null,
      file_name: row.file_name,
      file_size: row.file_size == null ? null : Number(row.file_size),
      storage_bucket: row.storage_bucket,
      storage_path: row.storage_path,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      family_ids: families.map((family: any) => String(family.id)),
      family_names: families.map((family: any) => String(family.name)),
      family_slugs: families.map((family: any) => String(family.slug)),
    } satisfies CatalogBrochure;
  });
}

export async function uploadCatalogBrochure(formData: FormData): Promise<void> {
  const workspace = await workspaceWithRole(ADMIN_ROLES);
  const organizationId = workspace.organization!.id;
  const name = clean(formData.get('name'));
  const description = clean(formData.get('description')) || null;
  const familyIds = formData.getAll('family_ids').map(clean).filter(Boolean);
  const file = formData.get('file');
  if (!name) throw new Error('Brochure name is required.');
  if (!(file instanceof File) || file.size <= 0) throw new Error('Choose a PDF brochure to upload.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Brochures must be PDF files.');
  if (file.size > MAX_BROCHURE_BYTES) throw new Error('Brochure PDF must be 12 MB or smaller.');

  const admin = createAdminSupabaseClient() as any;
  if (!admin) throw new Error('Database admin client is unavailable.');
  if (familyIds.length) {
    const { data: families, error: familyError } = await admin.from('packaging_service_families').select('id').eq('organization_id', organizationId).in('id', familyIds);
    if (familyError || (families ?? []).length !== new Set(familyIds).size) throw new Error('One or more selected product families are invalid.');
  }

  const brochureId = randomUUID();
  const normalizedName = safeFileName(file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`);
  const path = `${organizationId}/catalog-brochures/${brochureId}-${normalizedName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from(BROCHURE_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw new Error(`Brochure upload failed: ${String(uploadError.message ?? 'storage error')}`);

  const { error: insertError } = await admin.from('catalog_brochures').insert({
    id: brochureId,
    organization_id: organizationId,
    name,
    description,
    storage_bucket: BROCHURE_BUCKET,
    storage_path: path,
    file_name: file.name,
    mime_type: 'application/pdf',
    file_size: file.size,
    is_active: formData.get('is_active') !== 'false',
    created_by: workspace.user!.id,
  });
  if (insertError) {
    await admin.storage.from(BROCHURE_BUCKET).remove([path]);
    throw new Error(`Brochure record could not be saved: ${String(insertError.message ?? 'database error')}`);
  }
  if (familyIds.length) {
    const { error: mapError } = await admin.from('catalog_brochure_families').insert(familyIds.map((familyId) => ({ brochure_id: brochureId, packaging_family_id: familyId })));
    if (mapError) throw new Error(`Brochure uploaded, but product-family mapping failed: ${String(mapError.message ?? 'database error')}`);
  }
  revalidatePath('/admin/catalog');
  revalidatePath('/admin/catalog/brochures');
}

export async function updateCatalogBrochure(formData: FormData): Promise<void> {
  const workspace = await workspaceWithRole(ADMIN_ROLES);
  const organizationId = workspace.organization!.id;
  const id = clean(formData.get('id'));
  const name = clean(formData.get('name'));
  const description = clean(formData.get('description')) || null;
  const familyIds = formData.getAll('family_ids').map(clean).filter(Boolean);
  if (!id || !name) throw new Error('Brochure and brochure name are required.');
  const admin = createAdminSupabaseClient() as any;
  if (!admin) throw new Error('Database admin client is unavailable.');
  const { data: brochure, error: loadError } = await admin.from('catalog_brochures').select('id').eq('id', id).eq('organization_id', organizationId).maybeSingle();
  if (loadError || !brochure?.id) throw new Error('Brochure not found.');
  if (familyIds.length) {
    const { data: families } = await admin.from('packaging_service_families').select('id').eq('organization_id', organizationId).in('id', familyIds);
    if ((families ?? []).length !== new Set(familyIds).size) throw new Error('One or more selected product families are invalid.');
  }
  const { error } = await admin.from('catalog_brochures').update({ name, description, is_active: formData.get('is_active') === 'on', updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organizationId);
  if (error) throw new Error(`Brochure could not be updated: ${String(error.message ?? 'database error')}`);
  await admin.from('catalog_brochure_families').delete().eq('brochure_id', id);
  if (familyIds.length) await admin.from('catalog_brochure_families').insert(familyIds.map((familyId) => ({ brochure_id: id, packaging_family_id: familyId })));
  revalidatePath('/admin/catalog/brochures');
}

export async function createCatalogBrochureShare(input: { brochureId: string; leadId?: string | null; intakeId?: string | null; channel?: string | null }) {
  const workspace = await workspaceWithRole(SHARE_ROLES);
  const organizationId = workspace.organization!.id;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) throw new Error('Database admin client is unavailable.');
  const { data: brochure, error } = await admin.from('catalog_brochures').select('id,name,is_active').eq('id', input.brochureId).eq('organization_id', organizationId).maybeSingle();
  if (error || !brochure?.id || brochure.is_active === false) throw new Error('Selected brochure is unavailable.');
  const token = randomBytes(24).toString('hex');
  const { data: share, error: shareError } = await admin.from('catalog_brochure_shares').insert({
    organization_id: organizationId,
    brochure_id: brochure.id,
    token,
    lead_id: input.leadId || null,
    intake_id: input.intakeId || null,
    share_channel: input.channel || null,
    shared_by: workspace.user!.id,
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
  }).select('id,token').single();
  if (shareError) throw new Error(`Brochure link could not be created: ${String(shareError.message ?? 'database error')}`);
  return { id: share.id as string, token: share.token as string, brochureName: brochure.name as string, url: `${requestBaseUrl()}/brochure/${share.token}` };
}

export function brochureMatchesContext(brochure: Pick<CatalogBrochure, 'family_names' | 'family_slugs'>, context: string | null | undefined) {
  const normalized = clean(context).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalized) return false;
  return [...brochure.family_names, ...brochure.family_slugs].some((value) => {
    const family = clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return Boolean(family && (normalized.includes(family) || family.includes(normalized)));
  });
}
