'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import {
  savePackagingChargeMasterV4,
  savePackagingCostMasterV4,
  savePackagingProductVariationV4,
  savePackagingServiceFamilyV4,
} from './pricing-v4-admin-catalog-actions';

const PRODUCT_PATH = '/admin/packaging-families';
const COMPONENT_PATH = '/admin/packaging-reference-library';
const BUILDER_PATH = '/admin/packaging-templates';
const KLD_BUCKET = 'compliance-docs';
const MAX_KLD_BYTES = 10 * 1024 * 1024;

function revalidatePackagingAdmin() {
  revalidatePath(PRODUCT_PATH);
  revalidatePath(COMPONENT_PATH);
  revalidatePath(BUILDER_PATH);
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'question';
}

function safeFileName(value: string) {
  const last = value.split(/[\\/]/).pop() || 'kld.pdf';
  return last.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

export async function savePackagingProductFamilyV4(formData: FormData) {
  await savePackagingServiceFamilyV4(formData);
  revalidatePackagingAdmin();
}

export async function savePackagingProductVariationUxV4(formData: FormData) {
  await savePackagingProductVariationV4(formData);
  revalidatePackagingAdmin();
}

export async function savePricingComponentCostV4(formData: FormData) {
  await savePackagingCostMasterV4(formData);
  revalidatePackagingAdmin();
}

export async function savePricingComponentChargeV4(formData: FormData) {
  await savePackagingChargeMasterV4(formData);
  revalidatePackagingAdmin();
}

export async function savePackagingProductQuoteOptionsV4(formData: FormData) {
  const { organization } = await requireAdminWorkspace();
  if (!organization) throw new Error('Admin workspace is required.');
  const supabase: any = await createClient();
  const id = cleanText(formData.get('id'));
  if (!id) throw new Error('Packaging product is required.');
  const setupMode = cleanText(formData.get('product_setup_mode'));
  if (!new Set(['approved_sizes', 'custom_dimensions', 'both']).has(setupMode)) throw new Error('Unsupported product setup mode.');
  const defaultUom = cleanText(formData.get('default_uom')) || 'pcs';
  const defaultLeadTime = cleanText(formData.get('default_lead_time')) || null;
  const labels = cleanText(formData.get('quote_time_labels'))
    .split('\n')
    .map((label) => label.trim())
    .filter(Boolean);
  const quoteTimeInputs = labels.map((label, index) => ({ key: `${slugify(label)}_${index + 1}`, label }));
  const { error } = await supabase.from('packaging_service_families').update({
    product_setup_mode: setupMode,
    default_uom: defaultUom,
    default_unit: defaultUom,
    default_lead_time: defaultLeadTime,
    quote_time_inputs: quoteTimeInputs,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', organization.id).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePackagingAdmin();
}

export type PackagingKldUploadResult = {
  ok: boolean;
  error?: string;
  fileName?: string;
  version?: number;
};

export async function uploadPackagingKldV4(formData: FormData): Promise<PackagingKldUploadResult> {
  try {
    const { organization, user } = await requireAdminWorkspace();
    if (!organization || !user) return { ok: false, error: 'Admin workspace is required.' };
    const supabase: any = await createClient();
    const familyId = cleanText(formData.get('family_id'));
    const variationId = cleanText(formData.get('product_variation_id'));
    const file = formData.get('file');
    if (!familyId || !variationId) return { ok: false, error: 'Choose a product size before uploading a KLD.' };
    if (!(file instanceof File)) return { ok: false, error: 'Choose a PDF KLD file.' };
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return { ok: false, error: 'KLD files must be PDF.' };
    if (file.size <= 0 || file.size > MAX_KLD_BYTES) return { ok: false, error: 'KLD PDF must be 10 MB or smaller.' };

    const [{ data: variation, error: variationError }, { data: template, error: templateError }] = await Promise.all([
      supabase.from('packaging_product_variations')
        .select('id,family_id,variation_key,name,width_mm,height_mm')
        .eq('organization_id', organization.id).eq('id', variationId).eq('family_id', familyId).maybeSingle(),
      supabase.from('packaging_pricing_templates')
        .select('id')
        .eq('organization_id', organization.id).eq('family_id', familyId).eq('calculation_version', 4)
        .order('published_at', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (variationError || !variation?.id) return { ok: false, error: variationError?.message ?? 'Product size was not found.' };
    if (templateError || !template?.id) return { ok: false, error: templateError?.message ?? 'Create a Pricing Builder recipe for this product before attaching a KLD.' };

    const { data: previous, error: previousError } = await supabase.from('packaging_kld_files')
      .select('id,version').eq('organization_id', organization.id).eq('product_variation_id', variation.id)
      .order('version', { ascending: false }).limit(1);
    if (previousError) return { ok: false, error: previousError.message };
    const version = Number(previous?.[0]?.version ?? 0) + 1;
    const fileName = safeFileName(file.name);
    const path = `${organization.id}/packaging-kld/${familyId}/${variation.variation_key}/v${version}-${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage.from(KLD_BUCKET).upload(path, file, {
      cacheControl: '3600', contentType: 'application/pdf', upsert: false,
    });
    if (uploadError) return { ok: false, error: uploadError.message };

    const { data: inserted, error: insertError } = await supabase.from('packaging_kld_files').insert({
      organization_id: organization.id,
      family_id: familyId,
      template_id: template.id,
      size_preset_key: variation.variation_key,
      file_path: path,
      file_name: file.name,
      mime_type: 'application/pdf',
      file_size: file.size,
      version,
      is_active: true,
      uploaded_by: user.id,
      product_variation_id: variation.id,
      spec_key: variation.variation_key,
    }).select('id').single();
    if (insertError || !inserted?.id) {
      await supabase.storage.from(KLD_BUCKET).remove([path]);
      return { ok: false, error: insertError?.message ?? 'Could not save KLD metadata.' };
    }

    const { error: archiveError } = await supabase.from('packaging_kld_files').update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('organization_id', organization.id).eq('product_variation_id', variation.id).neq('id', inserted.id).eq('is_active', true);
    if (archiveError) return { ok: false, error: archiveError.message };
    revalidatePackagingAdmin();
    return { ok: true, fileName: file.name, version };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'KLD upload failed.' };
  }
}
