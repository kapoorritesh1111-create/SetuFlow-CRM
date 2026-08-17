'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { calculatePackagingPriceV4, toSalesPricingResult, type PackagingPricingInputV4 } from '@/lib/packaging-pricing/engine-registry';
import { loadPricingContext } from '@/lib/packaging-pricing/repository';

async function workspaceContext() {
  const workspace = await requireWorkspace();
  if (!workspace?.user || !workspace?.organization || !workspace?.membership) throw new Error('Not authenticated in an active workspace.');
  return workspace;
}

export async function previewPackagingPricingV4(params: { templateId: string; input: PackagingPricingInputV4 }) {
  try {
    const workspace = await workspaceContext();
    const isAdmin = Boolean(workspace.canAccessAdmin);
    const context = await loadPricingContext(workspace.organization!.id, params.templateId, { publishedOnly: !isAdmin });
    const result = calculatePackagingPriceV4(context, params.input);
    return { ok: result.ok, result: isAdmin ? result : toSalesPricingResult(result), error: result.ok ? undefined : result.validation_errors.join(' ') };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Packaging pricing preview failed.' };
  }
}

/**
 * Authoritative v4 save path. The browser submits choices, never a unit price.
 * The server re-loads the published template + current Master rates, calculates,
 * and freezes the full result/source hash into the existing quote/version model.
 */
export async function savePackagingPricingV4QuoteLine(params: {
  quoteId: string;
  leadId: string;
  familyId: string;
  templateId: string;
  input: PackagingPricingInputV4;
  lineId?: string | null;
}) {
  try {
    const workspace = await workspaceContext();
    const organizationId = workspace.organization!.id;
    const supabase: any = await createClient();

    const { data: quote, error: quoteError } = await supabase.from('quotes')
      .select('id,organization_id,lead_id,status,currency,display_currency,current_version_id')
      .eq('organization_id', organizationId).eq('id', params.quoteId).maybeSingle();
    if (quoteError || !quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    if (quote.lead_id && quote.lead_id !== params.leadId) return { ok: false, error: 'Quote does not belong to this lead.' };
    if (new Set(['accepted','rejected','expired','cancelled','declined','sent']).has(String(quote.status ?? '').toLowerCase())) return { ok: false, error: 'This quote version is locked. Create a new version before changing pricing.' };

    const { data: family } = await supabase.from('packaging_service_families')
      .select('id,name,is_quoteable').eq('organization_id', organizationId).eq('id', params.familyId).eq('is_active', true).maybeSingle();
    if (!family?.id || !family.is_quoteable) return { ok: false, error: 'This packaging family is not currently quoteable.' };

    const context = await loadPricingContext(organizationId, params.templateId, { publishedOnly: true });
    if (context.template.family_id !== params.familyId) return { ok: false, error: 'Pricing template does not belong to the selected family.' };
    const result = calculatePackagingPriceV4(context, params.input);
    if (!result.ok) return { ok: false, error: result.validation_errors.join(' ') || 'Fix pricing validation errors before saving.' };

    const inputAny = params.input as any;
    const quantity = Math.max(1, Math.floor(Number(inputAny.quantity ?? 1)));
    const productVariationId = inputAny.product_variation_id ?? null;
    const kldFileId = inputAny.kld_file_id ?? null;
    const salesResult = toSalesPricingResult(result);
    const inputSnapshot = {
      engine_version: result.engine_version,
      family_id: family.id,
      family_name: family.name,
      template_id: context.template.id,
      template_name: context.template.name,
      template_version: context.template.calculation_version,
      input: params.input,
      source_hash: result.source_hash,
      kld_file_id: kldFileId,
    };
    const lineRow = {
      quote_id: quote.id,
      product_id: null,
      product_variant_id: null,
      line_type: 'packaging',
      packaging_family_id: family.id,
      packaging_template_id: context.template.id,
      packaging_product_variation_id: productVariationId,
      packaging_kld_file_id: kldFileId,
      input_snapshot_json: inputSnapshot,
      // Quote line payload is sales-safe. Full COGS is frozen in quote_pricing_snapshots.
      pricing_breakdown_json: salesResult,
      calculation_version: context.template.calculation_version,
      quantity,
      unit_price: result.selling_price.unit_price,
      currency: result.selling_price.currency,
      catalog_price_amount: result.selling_price.unit_price,
      catalog_price_currency: result.selling_price.currency,
      notes: `${family.name} · Packaging pricing v4`,
      is_price_overridden: false,
    };

    let lineId = params.lineId ?? null;
    if (lineId) {
      const { data: updated, error } = await supabase.from('quote_line_items').update(lineRow)
        .eq('id', lineId).eq('quote_id', quote.id).eq('line_type', 'packaging').select('id').maybeSingle();
      if (error || !updated?.id) return { ok: false, error: error?.message ?? 'Packaging quote line was not updated.' };
    } else {
      const { data: inserted, error } = await supabase.from('quote_line_items').insert(lineRow).select('id').maybeSingle();
      if (error || !inserted?.id) return { ok: false, error: error?.message ?? 'Packaging quote line was not created.' };
      lineId = inserted.id;
    }

    if (quote.current_version_id) {
      const displayCurrency = quote.display_currency || quote.currency || result.selling_price.currency;
      const versionSku = `PKG-${String(lineId).slice(0,8).toUpperCase()}`;
      await supabase.from('quote_version_line_items').delete()
        .eq('quote_version_id', quote.current_version_id).eq('line_type', 'packaging').eq('sku_code', versionSku);
      const { error: versionError } = await supabase.from('quote_version_line_items').insert({
        quote_version_id: quote.current_version_id,
        product_id: null, product_variant_id: null, line_type: 'packaging', sku_code: versionSku,
        hsn_code: null, product_name: `${family.name} [${String(lineId).slice(0,8)}]`, category_type: 'packaging', pack_label: family.name,
        basis_applied: 'exw', pricing_mode: 'unit', moq: quantity,
        final_unit_price: result.selling_price.unit_price, final_case_price: result.selling_price.product_total,
        display_currency: displayCurrency, is_overridden: false, line_notes: `${family.name} · Packaging pricing v4`, sort_order: 500,
        calculation_meta: { ...salesResult, input_snapshot: inputSnapshot },
      });
      if (versionError) return { ok: false, error: versionError.message };

      const { error: snapshotError } = await supabase.from('quote_pricing_snapshots').insert({
        quote_version_id: quote.current_version_id,
        fx_base_currency: result.selling_price.currency,
        fx_display_currency: displayCurrency,
        quote_context: { quote_id: quote.id, line_id: lineId, family_id: family.id, template_id: context.template.id },
        freight_context: {},
        calculation_payload: { pricing_v4: result, input_snapshot: inputSnapshot },
        source_hash: result.source_hash,
      });
      if (snapshotError) return { ok: false, error: snapshotError.message };
    }

    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true, lineId, result: salesResult };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Packaging quote save failed.' };
  }
}
