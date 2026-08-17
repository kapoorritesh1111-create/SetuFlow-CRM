'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const ADMIN_PATH = '/admin/packaging-templates';
const MATRIX_EXPECTED: Record<string, number> = {
  'stark-center-seal-matrix-v4': 96,
  'stark-3ss-roll-matrix-v4': 48,
  'stark-3ss-pouch-matrix-v4': 48,
};

async function adminDb() {
  const { organization, user } = await requireAdminWorkspace();
  if (!organization || !user) throw new Error('Admin workspace is required.');
  return { organization, user, supabase: (await createClient()) as any };
}

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Rate must be a positive number or left blank for Needs rate.');
  return parsed;
}

export async function updatePackagingCostMasterV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = String(formData.get('id') ?? '');
  const currentRate = optionalNumber(formData.get('current_rate'));
  const { error } = await supabase.from('packaging_cost_master_items').update({ current_rate: currentRate, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('organization_id', organization.id).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function updatePackagingChargeMasterV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = String(formData.get('id') ?? '');
  const currentRate = optionalNumber(formData.get('current_rate'));
  const basis = String(formData.get('basis') ?? '').trim() || null;
  const applicationStage = String(formData.get('application_stage') ?? '').trim() || null;
  const allowedBasis = new Set(['per_unit','per_running_metre','per_frame','flat','percent']);
  const allowedStage = new Set(['before_wastage_margin','after_core_price','separate_quote_line']);
  if (basis && !allowedBasis.has(basis)) throw new Error('Unsupported charge basis.');
  if (applicationStage && !allowedStage.has(applicationStage)) throw new Error('Unsupported charge application stage.');
  const { error } = await supabase.from('packaging_charge_master_items').update({ current_rate: currentRate, basis, application_stage: applicationStage, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('organization_id', organization.id).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function setPackagingVariationQuoteableV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = String(formData.get('id') ?? '');
  const quoteable = String(formData.get('is_quoteable') ?? 'false') === 'true';
  const { error } = await supabase.from('packaging_product_variations').update({ is_quoteable: quoteable, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('organization_id', organization.id).eq('id', id).eq('approval_state', 'approved');
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

async function validateTemplateForPublish(supabase: any, organizationId: string, template: any) {
  const errors: string[] = [];
  if (!template.calculation_engine_key) errors.push('Pricing engine is not configured.');
  if (template.calculation_engine_key === 'matrix_per_frame') {
    const expected = MATRIX_EXPECTED[template.slug];
    const { count, error } = await supabase.from('packaging_pricing_matrix_rows').select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId).eq('template_id', template.id).eq('is_active', true);
    if (error) throw new Error(error.message);
    if (!expected) errors.push('Expected matrix source-row count is not configured for this template.');
    else if ((count ?? 0) !== expected) errors.push(`Matrix source is incomplete: ${count ?? 0}/${expected} rows loaded.`);
  }
  if (template.calculation_engine_key === 'sup_formula') {
    const [{ data: recipes, error: recipeError }, { data: bands, error: bandError }] = await Promise.all([
      supabase.from('packaging_pricing_recipe_items').select('source_type,cost_master_item_id,charge_master_item_id').eq('organization_id', organizationId).eq('template_id', template.id),
      supabase.from('packaging_pricing_commercial_bands').select('id').eq('organization_id', organizationId).eq('template_id', template.id),
    ]);
    if (recipeError) throw new Error(recipeError.message);
    if (bandError) throw new Error(bandError.message);
    if (!recipes?.length) errors.push('SUP recipe has no Master references.');
    if ((bands?.length ?? 0) !== 6) errors.push(`SUP commercial bands are incomplete: ${bands?.length ?? 0}/6.`);
    const costIds = (recipes ?? []).filter((r: any) => r.source_type === 'cost_master').map((r: any) => r.cost_master_item_id).filter(Boolean);
    if (costIds.length) {
      const { data: masters, error } = await supabase.from('packaging_cost_master_items').select('id,name,current_rate').eq('organization_id', organizationId).in('id', costIds);
      if (error) throw new Error(error.message);
      const missing = (masters ?? []).filter((m: any) => m.current_rate == null).map((m: any) => m.name);
      // A null Master may belong only to an unavailable construction. Publish is allowed
      // only when at least the calibrated Matte + Foil path is complete; Test Quote catches
      // construction-specific missing rates before save.
      const calibratedRequired = new Set(['18 Matt BOPP','12 MetPET','PE 75µ','Adhesive','CMYKW Print','Lamination','Slitting','Pouching']);
      const blocking = missing.filter((name: string) => calibratedRequired.has(name));
      if (blocking.length) errors.push(`Required calibrated Master rates are missing: ${blocking.join(', ')}.`);
    }
  }
  return errors;
}

export async function publishPackagingTemplateV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = String(formData.get('id') ?? '');
  const { data: template, error } = await supabase.from('packaging_pricing_templates')
    .select('id,family_id,slug,name,calculation_engine_key,status').eq('organization_id', organization.id).eq('id', id).maybeSingle();
  if (error || !template?.id) throw new Error(error?.message ?? 'Pricing template was not found.');
  const validation = await validateTemplateForPublish(supabase, organization.id, template);
  if (validation.length) throw new Error(validation.join(' '));

  const now = new Date().toISOString();
  const { error: archiveError } = await supabase.from('packaging_pricing_templates').update({ is_active: false, status: 'archived', updated_at: now })
    .eq('organization_id', organization.id).eq('family_id', template.family_id).eq('calculation_version', 4).eq('is_active', true).neq('id', template.id);
  if (archiveError) throw new Error(archiveError.message);
  const { error: publishError } = await supabase.from('packaging_pricing_templates').update({ status: 'published', is_active: true, published_at: now, published_by: user.id, updated_at: now })
    .eq('organization_id', organization.id).eq('id', template.id);
  if (publishError) throw new Error(publishError.message);
  const { error: familyError } = await supabase.from('packaging_service_families').update({ is_quoteable: true, updated_at: now })
    .eq('organization_id', organization.id).eq('id', template.family_id);
  if (familyError) throw new Error(familyError.message);
  const { error: variationsError } = await supabase.from('packaging_product_variations').update({ is_quoteable: true, updated_by: user.id, updated_at: now })
    .eq('organization_id', organization.id).eq('family_id', template.family_id).eq('approval_state', 'approved').eq('is_active', true);
  if (variationsError) throw new Error(variationsError.message);
  revalidatePath(ADMIN_PATH);
}
