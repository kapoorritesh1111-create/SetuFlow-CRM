'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

type ManualPackagingLineInput = {
  quoteId: string;
  leadId: string;
  familyId: string;
  widthMm: number;
  heightMm: number;
  gussetMm?: number | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  notes?: string | null;
};

export async function saveManualPackagingQuoteLine(params: ManualPackagingLineInput): Promise<{ ok: boolean; error?: string; lineId?: string }> {
  try {
    const workspace = await requireWorkspace();
    if (!workspace?.organization || !workspace?.user) return { ok: false, error: 'Not authenticated.' };
    const supabase: any = await createClient();
    const organizationId = workspace.organization.id;

    const width = Number(params.widthMm);
    const height = Number(params.heightMm);
    const gusset = params.gussetMm == null || params.gussetMm === 0 ? null : Number(params.gussetMm);
    const quantity = Math.floor(Number(params.quantity));
    const unitPrice = Number(params.unitPrice);
    const currency = String(params.currency || 'INR').trim().toUpperCase().slice(0, 8);

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return { ok: false, error: 'Width and height must be greater than zero.' };
    if (gusset != null && (!Number.isFinite(gusset) || gusset < 0)) return { ok: false, error: 'Gusset must be zero or greater.' };
    if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: 'Quantity must be greater than zero.' };
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return { ok: false, error: 'Custom unit price must be greater than zero.' };

    const [{ data: quote }, { data: family }] = await Promise.all([
      supabase.from('quotes').select('id,status,current_version_id').eq('organization_id', organizationId).eq('id', params.quoteId).maybeSingle(),
      supabase.from('packaging_service_families').select('id,name,slug,is_active,is_quoteable,pricing_engine_type,product_setup_mode').eq('organization_id', organizationId).eq('id', params.familyId).maybeSingle(),
    ]);

    if (!quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    if (['sent','accepted','rejected','expired','cancelled','declined'].includes(String(quote.status || '').toLowerCase())) return { ok: false, error: 'This quote is locked. Create a new quote to add a custom packaging line.' };
    if (!family?.id || family.is_active !== true || family.is_quoteable !== true) return { ok: false, error: 'This packaging family is not currently quoteable.' };
    if (family.pricing_engine_type) return { ok: false, error: 'This family uses automated pricing and cannot use the manual-price entry.' };
    if (!quote.current_version_id) return { ok: false, error: 'Create or compile a draft quote version before adding this line.' };

    const dimensionText = `${width}mm x ${height}mm${gusset ? ` · Gusset ${gusset}mm` : ''}`;
    const notes = String(params.notes || '').trim().slice(0, 1200);
    const specSummary = [family.name, dimensionText, notes].filter(Boolean).join(' · ');
    const now = new Date().toISOString();

    const snapshot = {
      source: 'manual_packaging_price',
      family_id: family.id,
      family_name: family.name,
      dimensions_structured: { width_mm: width, height_mm: height, gusset_mm: gusset },
      dimensions_text: dimensionText,
      quantity,
      manual_unit_price: unitPrice,
      currency,
      notes: notes || null,
    };

    const { data: inserted, error: lineError } = await supabase.from('quote_line_items').insert({
      quote_id: quote.id,
      product_id: null,
      product_variant_id: null,
      line_type: 'packaging',
      packaging_family_id: family.id,
      packaging_template_id: null,
      input_snapshot_json: snapshot,
      pricing_breakdown_json: { source: 'manual_custom_price', unit_price: unitPrice, currency },
      calculation_version: null,
      quantity,
      unit_price: unitPrice,
      currency,
      catalog_price_amount: unitPrice,
      catalog_price_currency: currency,
      notes: specSummary,
      is_price_overridden: false,
    }).select('id').maybeSingle();

    if (lineError || !inserted?.id) return { ok: false, error: lineError?.message || 'Unable to save the custom packaging line.' };
    const lineId = inserted.id;

    const { error: versionError } = await supabase.from('quote_version_line_items').insert({
      quote_version_id: quote.current_version_id,
      product_id: null,
      product_variant_id: null,
      line_type: 'packaging',
      sku_code: `PKG-${String(lineId).slice(0, 8).toUpperCase()}`,
      hsn_code: null,
      product_name: `${specSummary} [${String(lineId).slice(0, 8)}]`,
      category_type: 'packaging',
      pack_label: family.name,
      basis_applied: 'manual',
      pricing_mode: 'unit',
      moq: quantity,
      final_unit_price: unitPrice,
      final_case_price: quantity * unitPrice,
      display_currency: currency,
      is_overridden: false,
      line_notes: specSummary,
      sort_order: 550,
      calculation_meta: { source: 'manual_packaging_price', input_snapshot: snapshot, custom_price: true },
    });

    if (versionError) {
      await supabase.from('quote_line_items').delete().eq('id', lineId).eq('quote_id', quote.id);
      return { ok: false, error: versionError.message };
    }

    const { count } = await supabase.from('quote_version_line_items').select('id', { count: 'exact', head: true }).eq('quote_version_id', quote.current_version_id);
    await supabase.from('quote_versions').update({ total_line_count: Number(count ?? 0), updated_at: now }).eq('id', quote.current_version_id).eq('quote_id', quote.id);

    await supabase.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: params.leadId,
      actor_user_id: workspace.user.id,
      kind: 'quote_updated',
      message: `Manual packaging line saved: ${specSummary} · ${currency} ${unitPrice.toFixed(4)} / pc`,
      occurred_at: now,
    });

    revalidatePath(`/leads/${params.leadId}/quote`);
    revalidatePath(`/leads/${params.leadId}`);
    return { ok: true, lineId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save the custom packaging line.' };
  }
}
