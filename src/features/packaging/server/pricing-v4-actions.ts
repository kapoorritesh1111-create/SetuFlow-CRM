'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { calculatePackagingPriceV4, toSalesPricingResult, type PackagingPricingInputV4 } from '@/lib/packaging-pricing/engine-registry';
import { loadKldSnapshot, loadPricingContext } from '@/lib/packaging-pricing/repository';
import { createPackagingPricingSnapshot, type PackagingPricingInputSnapshotV4 } from '@/lib/packaging-pricing/snapshot';

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
 * Server-authoritative v4 save. The browser submits requirements only. We load
 * the published template + current Master records, recalculate, snapshot KLD
 * metadata, then execute one service-role-only DB transaction that keeps the
 * existing quote, quote-version line and quote-pricing snapshot in sync.
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

    // Authorization uses the authenticated client/workspace. Never trust an org id
    // supplied by the browser; it comes only from requireWorkspace().
    const { data: quote, error: quoteError } = await supabase.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id')
      .eq('organization_id', organizationId).eq('id', params.quoteId).maybeSingle();
    if (quoteError || !quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    if (quote.lead_id && quote.lead_id !== params.leadId) return { ok: false, error: 'Quote does not belong to this lead.' };
    if (new Set(['accepted','rejected','expired','cancelled','declined','sent']).has(String(quote.status ?? '').toLowerCase())) return { ok: false, error: 'This quote is locked. Create a new draft/version before changing pricing.' };
    if (!quote.current_version_id) return { ok: false, error: 'Create or compile a draft quote version before adding Packaging Pricing v4. An immutable pricing snapshot is required.' };

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
    const inputSnapshot: PackagingPricingInputSnapshotV4 = {
      engine_version: result.engine_version,
      family_id: family.id,
      family_name: family.name,
      template_id: context.template.id,
      template_name: context.template.name,
      template_version: context.template.calculation_version,
      calculation_engine_key: context.template.calculation_engine_key,
      input: params.input,
      source_hash: result.source_hash,
      kld: kld ? { ...kld } : null,
    };
    const internalPricingSnapshot = createPackagingPricingSnapshot(inputSnapshot, result);

    const service = createServiceRoleClient() as any;
    if (!service) return { ok: false, error: 'Pricing persistence service is unavailable.' };
    const { data: savedRows, error: saveError } = await service.rpc('app_save_packaging_v4_quote_line_tx', {
      p_organization_id: organizationId,
      p_quote_id: quote.id,
      p_lead_id: params.leadId,
      p_line_id: params.lineId ?? null,
      p_family_id: family.id,
      p_template_id: context.template.id,
      p_product_variation_id: productVariationId,
      p_kld_file_id: kldFileId,
      p_quantity: quantity,
      p_unit_price: result.selling_price.unit_price,
      p_currency: result.selling_price.currency,
      p_input_snapshot: inputSnapshot,
      p_sales_pricing: salesResult,
      p_internal_pricing: internalPricingSnapshot,
      p_source_hash: result.source_hash,
    });
    if (saveError) return { ok: false, error: saveError.message ?? 'Packaging quote line could not be persisted.' };
    const saved = Array.isArray(savedRows) ? savedRows[0] : savedRows;
    const lineId = saved?.line_id ?? params.lineId ?? null;
    if (!lineId) return { ok: false, error: 'Packaging quote transaction completed without a line id.' };

    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true, lineId, quoteVersionId: saved?.quote_version_id ?? null, result: salesResult };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Packaging quote save failed.' };
  }
}
