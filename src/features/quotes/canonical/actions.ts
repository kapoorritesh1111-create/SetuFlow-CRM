"use server";

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

const LOCKED = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined', 'sent', 'superseded']);

type DraftLine = {
  productId: string | null;
  quantity: number;
  unitPrice: number | null;
  currency: string;
  notes: string | null;
  packLabel: string | null;
  basis: string;
  freight: number | null;
  priceSource: string | null;
};

type ProductPriceMeta = {
  id: string;
  name: string;
  sku?: string | null;
  sku_code?: string | null;
  hsn_code?: string | null;
  category_type?: string | null;
  pack_label?: string | null;
  pack_size?: string | null;
  moq?: number | null;
  default_price?: number | null;
  source_fob_usd?: number | null;
  source_ex_factory_usd?: number | null;
};

function text(value: FormDataEntryValue | null) { return String(value ?? '').trim(); }
function nullable(value: FormDataEntryValue | null) { const v = text(value); return v ? v : null; }
function num(value: FormDataEntryValue | null) { return numText(text(value)); }
function numText(value: string | null | undefined) { const raw = String(value ?? '').trim().replace(/,/g, ''); if (!raw) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function all(formData: FormData, key: string) { return formData.getAll(key).map((value) => String(value ?? '').trim()); }
function currency(value: string | null | undefined, fallback = 'USD') { return String(value || fallback || 'USD').trim().toUpperCase().slice(0, 3) || 'USD'; }
function actionError(value: unknown) { return encodeURIComponent(value instanceof Error ? value.message : String(value || 'Action could not be completed.')); }
function isNextRedirect(error: unknown) { return typeof (error as { digest?: unknown })?.digest === 'string' && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT'); }

function parseLines(formData: FormData): DraftLine[] {
  const removed = new Set(all(formData, 'remove_index').map((value) => Number(value)).filter((value) => Number.isFinite(value)));
  const productIds = all(formData, 'product_id');
  const quantities = all(formData, 'quantity');
  const unitPrices = all(formData, 'unit_price');
  const currencies = all(formData, 'currency');
  const notes = all(formData, 'line_notes');
  const packs = all(formData, 'pack_label');
  const basis = all(formData, 'basis');
  const freight = all(formData, 'freight');
  const priceSource = all(formData, 'price_source');
  return productIds.map((productId, index) => {
    const quantity = numText(quantities[index]) ?? 1;
    return {
      productId: productId || null,
      quantity: quantity > 0 ? quantity : 1,
      unitPrice: numText(unitPrices[index]),
      currency: currency(currencies[index], currency(text(formData.get('quote_currency')), 'USD')),
      notes: notes[index] || null,
      packLabel: packs[index] || null,
      basis: String(basis[index] || text(formData.get('pricing_basis')) || 'FOB').toLowerCase(),
      freight: numText(freight[index]),
      priceSource: priceSource[index] || null,
    };
  }).filter((line, index) => !removed.has(index) && (line.productId || line.notes));
}

async function getMutableQuote(formData: FormData) {
  if (!hasSupabaseEnv) throw new Error('Missing Supabase environment variables.');
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const quoteId = text(formData.get('quote_id'));
  const leadId = text(formData.get('lead_id'));
  if (!quoteId || !leadId) throw new Error('Quote and lead are required.');
  const supabase: any = await createClient();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, lead_id, organization_id, status, currency, display_currency, current_version_id, approval_required')
    .eq('organization_id', workspace.organization.id)
    .eq('lead_id', leadId)
    .eq('id', quoteId)
    .maybeSingle();
  if (error || !quote?.id) throw new Error(error?.message ?? 'Quote not found.');
  if (LOCKED.has(String(quote.status || '').toLowerCase())) throw new Error('This quote is locked. Create a new quote instead.');

  if (!quote.current_version_id) {
    const { data: version } = await supabase
      .from('quote_versions')
      .select('id')
      .eq('quote_id', quoteId)
      .in('status', ['draft', 'compiled', 'approval_pending', 'approved', 'in_review'])
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    quote.current_version_id = version?.id ?? null;
  }

  return { workspace, supabase, quote, quoteId, leadId };
}

async function productMetaMap(supabase: any, productIds: string[]) {
  if (!productIds.length) return new Map<string, ProductPriceMeta>();

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const meta = new Map<string, ProductPriceMeta>();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, sku_code, hsn_code, category_id, pack_size')
    .in('id', uniqueIds);
  for (const product of products ?? []) {
    meta.set(product.id, {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sku_code: product.sku_code,
      hsn_code: product.hsn_code,
      pack_size: product.pack_size,
      pack_label: product.pack_size,
    });
  }

  const { data: rules } = await supabase
    .from('product_pricing_rules')
    .select('product_id, product_name, sku_code, hsn_code, category_type, pack_label, moq, fob_usd, ex_factory_usd, fob_usd_per_case, ex_factory_usd_per_case, fob_usd_per_unit, ex_factory_usd_per_unit, is_active, sort_order')
    .in('product_id', uniqueIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  for (const rule of rules ?? []) {
    if (!rule.product_id) continue;
    const existing: ProductPriceMeta = meta.get(rule.product_id) ?? { id: rule.product_id, name: rule.product_name || 'Product' };
    const defaultPrice = [rule.fob_usd_per_case, rule.fob_usd_per_unit, rule.fob_usd, rule.ex_factory_usd_per_case, rule.ex_factory_usd_per_unit, rule.ex_factory_usd]
      .map((value: unknown) => Number(value ?? 0))
      .find((value: number) => Number.isFinite(value) && value > 0) ?? existing.default_price ?? null;
    meta.set(rule.product_id, {
      ...existing,
      name: existing.name || rule.product_name || 'Product',
      sku_code: existing.sku_code || rule.sku_code,
      hsn_code: existing.hsn_code || rule.hsn_code,
      category_type: rule.category_type || existing.category_type || '',
      pack_label: existing.pack_label || rule.pack_label,
      moq: rule.moq ?? existing.moq ?? null,
      default_price: defaultPrice,
      source_fob_usd: Number(rule.fob_usd ?? rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? 0) || existing.source_fob_usd || null,
      source_ex_factory_usd: Number(rule.ex_factory_usd ?? rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? 0) || existing.source_ex_factory_usd || null,
    });
  }

  return meta;
}

function linePrice(line: DraftLine, product?: ProductPriceMeta | null) {
  if (line.unitPrice != null) return line.unitPrice;
  const fallback = Number(product?.default_price ?? 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

async function replaceQuoteLines(input: { supabase: any; quote: any; lines: DraftLine[]; quoteCurrency: string; userId: string }) {
  const { supabase, quote, lines, quoteCurrency, userId } = input;
  const now = new Date().toISOString();
  const productMap = await productMetaMap(supabase, lines.map((line) => line.productId).filter(Boolean) as string[]);
  const quoteLineRows = lines.map((line) => {
    const product = line.productId ? productMap.get(line.productId) : null;
    const price = linePrice(line, product);
    const isOverride = line.unitPrice != null && line.priceSource === 'Manual';
    return {
      quote_id: quote.id,
      product_id: line.productId,
      product_variant_id: null,
      catalog_price_id: null,
      catalog_price_amount: price,
      catalog_price_currency: line.currency || quoteCurrency,
      quantity: line.quantity,
      unit_price: price,
      currency: line.currency || quoteCurrency,
      is_price_overridden: isOverride,
      override_reason: isOverride ? 'Manual price set in canonical quote builder' : null,
      overridden_by: isOverride ? userId : null,
      overridden_at: isOverride ? now : null,
      notes: line.notes,
    };
  });

  await supabase.from('quote_line_items').delete().eq('quote_id', quote.id);
  if (quoteLineRows.length) {
    const { error } = await supabase.from('quote_line_items').insert(quoteLineRows);
    if (error) throw new Error(error.message);
  }

  if (quote.current_version_id) {
    await supabase.from('quote_version_line_items').delete().eq('quote_version_id', quote.current_version_id);
    const versionRows = lines.map((line, index) => {
      const product = line.productId ? productMap.get(line.productId) : null;
      const price = linePrice(line, product);
      const isOverride = line.unitPrice != null && line.priceSource === 'Manual';
      return {
        quote_version_id: quote.current_version_id,
        product_id: line.productId,
        product_variant_id: null,
        sku_code: product?.sku_code || product?.sku || `QUOTE-LINE-${index + 1}`,
        hsn_code: product?.hsn_code || null,
        product_name: product?.name || `Product ${index + 1}`,
        category_type: product?.category_type || '',
        pack_label: line.packLabel || product?.pack_label || product?.pack_size || null,
        basis_applied: line.basis || 'fob',
        pricing_mode: 'case',
        moq: line.quantity,
        source_ex_factory_usd: product?.source_ex_factory_usd ?? null,
        source_fob_usd: product?.source_fob_usd ?? price,
        final_unit_price: price,
        final_case_price: price * line.quantity,
        display_currency: line.currency || quoteCurrency,
        is_overridden: isOverride,
        override_reason: isOverride ? 'Manual price set in canonical quote builder' : null,
        overridden_by: isOverride ? userId : null,
        overridden_at: isOverride ? now : null,
        line_notes: line.notes,
        sort_order: index,
        calculation_meta: { source: 'canonical_quote_builder', price_source: line.priceSource || 'Price List', freight: line.freight },
        catalog_price_snapshot: { product_id: line.productId, fallback_price: price },
      };
    });
    if (versionRows.length) {
      const { error } = await supabase.from('quote_version_line_items').insert(versionRows);
      if (error) throw new Error(error.message);
    }
    const { error: versionError } = await supabase.from('quote_versions').update({ total_line_count: versionRows.length, display_currency: quoteCurrency, updated_at: now }).eq('id', quote.current_version_id).eq('quote_id', quote.id);
    if (versionError) throw new Error(versionError.message);
  }
}

async function activity(supabase: any, organizationId: string, leadId: string, userId: string, message: string, kind = 'quote_updated') {
  await supabase.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, actor_user_id: userId, kind, message, occurred_at: new Date().toISOString() });
}

function refreshPaths(leadId: string) {
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
}

function finish(leadId: string, quoteId: string, step: number, saved = 'quote') {
  refreshPaths(leadId);
  redirect(`/leads/${leadId}/quote?quoteId=${quoteId}&step=${step}&saved=${saved}`);
}

function fail(leadId: string, quoteId: string, step: number, error: unknown) {
  refreshPaths(leadId);
  redirect(`/leads/${leadId}/quote?quoteId=${quoteId}&step=${step}&quoteActionError=${actionError(error)}`);
}

export async function saveCanonicalQuoteProducts(formData: FormData) {
  const leadId = text(formData.get('lead_id'));
  const quoteId = text(formData.get('quote_id'));
  try {
    const { workspace, supabase, quote } = await getMutableQuote(formData);
    const quoteCurrency = currency(text(formData.get('quote_currency')), quote.display_currency || quote.currency || 'USD');
    await replaceQuoteLines({ supabase, quote, lines: parseLines(formData), quoteCurrency, userId: workspace.user!.id });
    await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote products saved from the canonical builder.');
    finish(leadId, quoteId, 2, 'products');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    fail(leadId, quoteId, 1, error);
  }
}

export async function saveCanonicalQuotePricing(formData: FormData) {
  const leadId = text(formData.get('lead_id'));
  const quoteId = text(formData.get('quote_id'));
  try {
    const { workspace, supabase, quote } = await getMutableQuote(formData);
    const quoteCurrency = currency(text(formData.get('quote_currency')), quote.display_currency || quote.currency || 'USD');
    await replaceQuoteLines({ supabase, quote, lines: parseLines(formData), quoteCurrency, userId: workspace.user!.id });
    await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote pricing saved from the canonical builder.');
    finish(leadId, quoteId, 3, 'pricing');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    fail(leadId, quoteId, 2, error);
  }
}

export async function saveCanonicalQuoteTerms(formData: FormData) {
  const leadId = text(formData.get('lead_id'));
  const quoteId = text(formData.get('quote_id'));
  try {
    const { workspace, supabase, quote } = await getMutableQuote(formData);
    const quoteCurrency = currency(text(formData.get('currency')), quote.display_currency || quote.currency || 'USD');
    const pricingBasis = text(formData.get('incoterm')) || 'FOB';
    const validityDays = num(formData.get('validity_days')) ?? 30;
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const customerMessage = [
      `Incoterm: ${pricingBasis}`,
      `Port of loading: ${text(formData.get('port_loading')) || 'Not specified'}`,
      `Port of discharge: ${text(formData.get('port_discharge')) || 'Not specified'}`,
      `Payment terms: ${text(formData.get('payment_terms')) || 'Not specified'}`,
      `Lead time: ${text(formData.get('lead_time')) || 'Not specified'}`,
      `Packaging: ${text(formData.get('packaging')) || 'Not specified'}`,
      text(formData.get('shipment_notes')),
      text(formData.get('special_notes')),
    ].filter(Boolean).join('\n');
    if (quote.current_version_id) {
      const { error } = await supabase.from('quote_versions').update({ display_currency: quoteCurrency, pricing_basis: pricingBasis.toLowerCase(), valid_until: validUntil, customer_message: customerMessage, internal_notes: nullable(formData.get('internal_notes')), updated_at: new Date().toISOString() }).eq('quote_id', quoteId).eq('id', quote.current_version_id);
      if (error) throw new Error(error.message);
    }
    await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote terms saved from the canonical builder.');
    finish(leadId, quoteId, 4, 'terms');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    fail(leadId, quoteId, 3, error);
  }
}

export async function submitCanonicalQuoteApproval(formData: FormData) {
  const leadId = text(formData.get('lead_id'));
  const quoteId = text(formData.get('quote_id'));
  try {
    const { workspace, supabase, quote } = await getMutableQuote(formData);
    if (!quote.current_version_id) throw new Error('Current quote version is required.');
    const { error } = await supabase.rpc('app_submit_quote_approval_tx', { p_organization_id: workspace.organization!.id, p_quote_id: quoteId, p_quote_version_id: quote.current_version_id, p_actor_user_id: workspace.user!.id, p_rule: 'canonical_send_gate', p_reason: text(formData.get('reason')) || 'Submitted from canonical quote send gate.' });
    if (error) throw new Error(error.message);
    await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote submitted for approval from the canonical send gate.', 'quote_approval_requested');
    finish(leadId, quoteId, 5, 'approval');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    fail(leadId, quoteId, 5, error);
  }
}

export async function sendCanonicalQuote(formData: FormData) {
  const leadId = text(formData.get('lead_id'));
  const quoteId = text(formData.get('quote_id'));
  try {
    const { workspace, supabase, quote } = await getMutableQuote(formData);
    if (!quote.current_version_id) throw new Error('Current quote version is required.');
    const approvalRequired = text(formData.get('approval_required')) === 'true' || Boolean(quote.approval_required);
    const { error } = await supabase.rpc('app_send_quote_version_with_fanout_tx', { p_quote_version_id: quote.current_version_id, p_actor_user_id: workspace.user!.id, p_actor_name: workspace.user!.email || 'Setu Flow user', p_plain_notes: text(formData.get('plain_notes')) || 'Quote sent from canonical send gate.', p_approval_required: approvalRequired, p_approval_state: approvalRequired ? 'pending' : 'none', p_action_source: 'canonical_quote_builder' });
    if (error) throw new Error(error.message);
    await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote sent from the canonical send gate.', 'quote_sent');
    finish(leadId, quoteId, 5, 'sent');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    fail(leadId, quoteId, 5, error);
  }
}
