'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const ADMIN_PATH = '/admin/packaging-templates';
const SETUP_MODES = new Set(['approved_sizes','custom_dimensions','both']);
const ENGINES = new Set(['sup_formula','matrix_per_frame','service_formula']);
const COST_TYPES = new Set(['material','process']);
const COST_BASES = new Set(['per_kg','per_running_metre','per_frame','per_unit','flat']);
const CHARGE_CATEGORIES = new Set(['extra','pre','post']);
const CHARGE_BASES = new Set(['per_unit','per_running_metre','per_frame','flat','percent']);
const CHARGE_STAGES = new Set(['before_wastage_margin','after_core_price','separate_quote_line']);

async function adminDb() {
  const { organization, user } = await requireAdminWorkspace();
  if (!organization || !user) throw new Error('Admin workspace is required.');
  return { organization, user, supabase: (await createClient()) as any };
}

function text(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim(); }
function required(formData: FormData, key: string, label: string) {
  const raw = text(formData,key);
  if (!raw) throw new Error(`${label} is required.`);
  return raw;
}
function optionalNumber(formData: FormData, key: string, positive = false) {
  const raw = text(formData,key);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || (positive ? parsed <= 0 : parsed < 0)) throw new Error(`${key} is outside the allowed range.`);
  return parsed;
}
function requiredNumber(formData: FormData, key: string, label: string, positive = false) {
  const parsed = optionalNumber(formData,key,positive);
  if (parsed == null) throw new Error(`${label} is required.`);
  return parsed;
}
function slugify(raw: string) {
  const slug = raw.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if (!slug) throw new Error('A valid key is required.');
  return slug;
}
function checked(formData: FormData, key: string, fallback = false) {
  if (!formData.has(key)) return fallback;
  return ['true','1','on','yes'].includes(text(formData,key).toLowerCase());
}
function selectedIds(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map((entry)=>String(entry).trim()).filter(Boolean))];
}

export async function savePackagingServiceFamilyV4(formData: FormData) {
  const { organization, supabase } = await adminDb();
  const id = text(formData,'id');
  const name = required(formData,'name','Family name');
  const productSetupMode = required(formData,'product_setup_mode','Product setup mode');
  const engine = required(formData,'pricing_engine_type','Pricing engine');
  if (!SETUP_MODES.has(productSetupMode)) throw new Error('Unsupported product setup mode.');
  if (!ENGINES.has(engine)) throw new Error('Unsupported pricing engine.');
  const defaultUom = required(formData,'default_uom','Default UOM');
  const sortOrder = Math.max(0, Math.trunc(Number(text(formData,'sort_order') || 0)));
  const payload = {
    slug: slugify(text(formData,'slug') || name), name,
    description: text(formData,'description') || null,
    pricing_mode: engine === 'service_formula' ? 'service' : 'dimensional',
    product_setup_mode: productSetupMode,
    pricing_engine_type: engine,
    default_uom: defaultUom,
    default_unit: defaultUom,
    sort_order: sortOrder,
    is_active: checked(formData,'is_active',true),
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from('packaging_service_families').update(payload).eq('organization_id',organization.id).eq('id',id)
    : supabase.from('packaging_service_families').insert({ organization_id:organization.id, ...payload, quote_time_inputs:[], is_quoteable:false });
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingProductVariationV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = text(formData,'id');
  const width = requiredNumber(formData,'width_mm','Width',true);
  const height = requiredNumber(formData,'height_mm','Height',true);
  const gusset = optionalNumber(formData,'bottom_gusset_each_mm') ?? 0;
  const approvalState = required(formData,'approval_state','Approval state');
  if (!new Set(['draft','approved','archived']).has(approvalState)) throw new Error('Unsupported approval state.');
  const payload = {
    family_id: required(formData,'family_id','Service family'),
    variation_key: slugify(required(formData,'variation_key','Variation key')),
    name: required(formData,'name','Variation name'),
    capacity_label: text(formData,'capacity_label') || null,
    width_mm: width,
    height_mm: height,
    bottom_gusset_each_mm: gusset,
    dimension_label: gusset > 0 ? `${width} × ${height} mm · BG ${gusset}+${gusset}` : `${width} × ${height} mm`,
    approval_state: approvalState,
    is_quoteable: approvalState === 'approved' && checked(formData,'is_quoteable',false),
    is_active: approvalState !== 'archived' && checked(formData,'is_active',true),
    sort_order: Math.max(0,Math.trunc(Number(text(formData,'sort_order') || 0))),
    updated_by:user.id, updated_at:new Date().toISOString(),
  };
  const query = id
    ? supabase.from('packaging_product_variations').update(payload).eq('organization_id',organization.id).eq('id',id)
    : supabase.from('packaging_product_variations').insert({ organization_id:organization.id, ...payload, created_by:user.id });
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

async function syncCostFamilies(supabase:any, organizationId:string, userId:string, itemId:string, familyIds:string[]) {
  const { error: clearError } = await supabase.from('packaging_cost_master_family_links').delete().eq('organization_id',organizationId).eq('cost_master_item_id',itemId);
  if (clearError) throw new Error(clearError.message);
  if (!familyIds.length) return;
  const { error } = await supabase.from('packaging_cost_master_family_links').insert(familyIds.map((familyId)=>({organization_id:organizationId,cost_master_item_id:itemId,family_id:familyId,created_by:userId})));
  if (error) throw new Error(error.message);
}

export async function savePackagingCostMasterV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id = text(formData,'id');
  const itemType = required(formData,'item_type','Item type');
  const rateBasis = required(formData,'rate_basis','Rate basis');
  if (!COST_TYPES.has(itemType) || !COST_BASES.has(rateBasis)) throw new Error('Unsupported Cost Master configuration.');
  const payload = {
    code: required(formData,'code','Code').toUpperCase().replace(/[^A-Z0-9_]+/g,'_'),
    name: required(formData,'name','Name'), item_type:itemType,
    specification:text(formData,'specification') || null,
    rate_basis:rateBasis, current_rate:optionalNumber(formData,'current_rate'),
    rate_uom:required(formData,'rate_uom','Rate UOM'), currency:(text(formData,'currency')||'INR').toUpperCase(),
    micron:optionalNumber(formData,'micron',true), gsm:optionalNumber(formData,'gsm'), density:optionalNumber(formData,'density',true),
    is_active:checked(formData,'is_active',true), updated_by:user.id, updated_at:new Date().toISOString(),
  };
  let itemId=id;
  if (id) {
    const { error } = await supabase.from('packaging_cost_master_items').update(payload).eq('organization_id',organization.id).eq('id',id);
    if (error) throw new Error(error.message);
  } else {
    const { data,error } = await supabase.from('packaging_cost_master_items').insert({organization_id:organization.id,...payload,created_by:user.id}).select('id').single();
    if (error || !data?.id) throw new Error(error?.message ?? 'Could not create Cost Master item.');
    itemId=data.id;
  }
  await syncCostFamilies(supabase,organization.id,user.id,itemId,selectedIds(formData,'family_ids'));
  revalidatePath(ADMIN_PATH);
}

async function syncChargeFamilies(supabase:any, organizationId:string, userId:string, itemId:string, familyIds:string[]) {
  const { error: clearError } = await supabase.from('packaging_charge_master_family_links').delete().eq('organization_id',organizationId).eq('charge_master_item_id',itemId);
  if (clearError) throw new Error(clearError.message);
  if (!familyIds.length) return;
  const { error } = await supabase.from('packaging_charge_master_family_links').insert(familyIds.map((familyId)=>({organization_id:organizationId,charge_master_item_id:itemId,family_id:familyId,created_by:userId})));
  if (error) throw new Error(error.message);
}

export async function savePackagingChargeMasterV4(formData: FormData) {
  const { organization, user, supabase } = await adminDb();
  const id=text(formData,'id');
  const category=required(formData,'category','Category');
  const basis=text(formData,'basis') || null;
  const stage=text(formData,'application_stage') || null;
  if (!CHARGE_CATEGORIES.has(category) || (basis && !CHARGE_BASES.has(basis)) || (stage && !CHARGE_STAGES.has(stage))) throw new Error('Unsupported Charge Master configuration.');
  const payload={
    code:required(formData,'code','Code').toUpperCase().replace(/[^A-Z0-9_]+/g,'_'),
    name:required(formData,'name','Name'), category, basis, application_stage:stage,
    current_rate:optionalNumber(formData,'current_rate'), currency:(text(formData,'currency')||'INR').toUpperCase(),
    is_active:checked(formData,'is_active',true), updated_by:user.id, updated_at:new Date().toISOString(),
  };
  let itemId=id;
  if (id) {
    const { error }=await supabase.from('packaging_charge_master_items').update(payload).eq('organization_id',organization.id).eq('id',id);
    if (error) throw new Error(error.message);
  } else {
    const { data,error }=await supabase.from('packaging_charge_master_items').insert({organization_id:organization.id,...payload,created_by:user.id}).select('id').single();
    if (error || !data?.id) throw new Error(error?.message ?? 'Could not create Charge Master item.');
    itemId=data.id;
  }
  await syncChargeFamilies(supabase,organization.id,user.id,itemId,selectedIds(formData,'family_ids'));
  revalidatePath(ADMIN_PATH);
}
