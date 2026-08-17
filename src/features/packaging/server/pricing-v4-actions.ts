'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { calculatePackagingPriceV4, toSalesPricingResult, type PackagingPricingInputV4 } from '@/lib/packaging-pricing/engine-registry';
import { loadKldSnapshot, loadPricingContext } from '@/lib/packaging-pricing/repository';

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
 * Authoritative mutable-draft save path. The browser submits choices, never a
 * unit price. Immutable quote versions remain owned by the existing canonical
 * quote compile transaction (app_create_draft_quote_version_from_compile_tx).
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
      .select('id,organization_id,lead_id,status')
      .eq('organization_id', organizationId).eq('id', params.quoteId).maybeSingle();
    if (quoteError || !quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    if (quote.lead_id && quote.lead_id !== params.leadId) return { ok: false, error: 'Quote does not belong to this lead.' };
    if (new Set(['accepted','rejected','expired','cancelled','declined','sent']).has(String(quote.status ?? '').toLowerCase())) return { ok: false, error: 'This quote is locked. Create a new draft/version before changing pricing.' };

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
    const kld = await loadKldSnapshot(organizationId, kldFileId);
    if (kld && kld.family_id !== family.id) return { ok: false, error: 'Selected KLD does not belong to this packaging family.' };
    if (kld?.product_variation_id && productVariationId && kld.product_variation_id !== productVariationId) {
      return { ok: false, error: 'Selected KLD does not belong to this Product Variation.' };
    }

    const salesResult = toSalesPricingResult(result);
    const inputSnapshot = {
      engine_version: result.engine_version,
      family_id: family.id,
      family_name: family.name,
      template_id: context.template.id,
      template_name: context.template.name,
      template_version: context.template.calculation_version,
      calculation_engine_key: context.template.calculation_engine_key,
      input: params.input,
      source_hash: result.source_hash,
      kld,
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
      // Only sales-safe outputs live on the mutable quote line. COGS remains server-only.
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

    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true, lineId, result: salesResult };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Packaging quote save failed.' };
  }
}
