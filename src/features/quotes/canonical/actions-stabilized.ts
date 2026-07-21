"use server";

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

const HARD_LOCKED = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined', 'sent', 'superseded']);
const EDIT_LOCKED = new Set([...Array.from(HARD_LOCKED), 'approval_pending']);
const APPROVAL_THRESHOLD_PERCENT = 15;

type DraftLine = { productId: string | null; quantity: number; unitPrice: number | null; currency: string; notes: string | null; packLabel: string | null; basis: string; freight: number | null; priceSource: string | null; discountType: string; discountValue: number | null };
type ProductMeta = { id: string; name: string; sku?: string | null; sku_code?: string | null; hsn_code?: string | null; category_type?: string | null; pack_label?: string | null; pack_size?: string | null; default_price?: number | null; source_fob_usd?: number | null; source_ex_factory_usd?: number | null };

function text(value: FormDataEntryValue | null) { return String(value ?? '').trim(); }
function nullable(value: FormDataEntryValue | null) { const next = text(value); return next ? next : null; }
function numberText(value: string | null | undefined) { const raw = String(value ?? '').trim().replace(/,/g, ''); if (!raw) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function num(value: FormDataEntryValue | null) { return numberText(text(value)); }
function all(formData: FormData, key: string) { return formData.getAll(key).map((value) => String(value ?? '').trim()); }
function safeCurrency(value: string | null | undefined, fallback = 'USD') { return String(value || fallback || 'USD').trim().toUpperCase().slice(0, 3) || 'USD'; }
function safeError(value: unknown) { return encodeURIComponent(value instanceof Error ? value.message : String(value || 'Action could not be completed.')); }
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
  const discountTypes = all(formData, 'discount_type');
  const discountValues = all(formData, 'discount_value');
  const quoteCurrency = safeCurrency(text(formData.get('quote_currency')), 'USD');
  return productIds.map((productId, index) => ({ productId: productId || null, quantity: Math.max(1, numberText(quantities[index]) ?? 1), unitPrice: numberText(unitPrices[index]), currency: safeCurrency(currencies[index], quoteCurrency), notes: notes[index] || null, packLabel: packs[index] || null, basis: String(basis[index] || text(formData.get('pricing_basis')) || text(formData.get('incoterm')) || 'FOB').toLowerCase(), freight: numberText(freight[index]), priceSource: priceSource[index] || 'Price List', discountType: discountTypes[index] === 'amount' ? 'amount' : discountTypes[index] === 'percent' ? 'percent' : 'none', discountValue: numberText(discountValues[index]) })).filter((line, index) => !removed.has(index) && (line.productId || line.notes));
}

async function getQuoteContext(formData: FormData, allowApprovalPending = false) {
  if (!hasSupabaseEnv) throw new Error('Missing Supabase environment variables.');
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const quoteId = text(formData.get('quote_id'));
  const leadId = text(formData.get('lead_id'));
  if (!quoteId || !leadId) throw new Error('Quote and lead are required.');
  const supabase: any = await createClient();
  const { data: quote, error } = await supabase.from('quotes').select('id, lead_id, organization_id, status, currency, display_currency, current_version_id, approval_required').eq('organization_id', workspace.organization.id).eq('lead_id', leadId).eq('id', quoteId).maybeSingle();
  if (error || !quote?.id) throw new Error(error?.message ?? 'Quote not found.');
  if (HARD_LOCKED.has(String(quote.status || '').toLowerCase())) throw new Error('This quote is locked. Create a new quote instead.');
  let version: any = null;
  if (quote.current_version_id) { const { data } = await supabase.from('quote_versions').select('id, status, version_no').eq('quote_id', quoteId).eq('id', quote.current_version_id).maybeSingle(); version = data ?? null; }
  if (!version?.id) { const { data } = await supabase.from('quote_versions').select('id, status, version_no').eq('quote_id', quoteId).in('status', ['draft', 'compiled', 'approval_pending', 'approved', 'in_review']).order('version_no', { ascending: false }).limit(1).maybeSingle(); version = data ?? null; quote.current_version_id = version?.id ?? null; }
  const status = String(version?.status || quote.status || '').toLowerCase();
  if (!allowApprovalPending && EDIT_LOCKED.has(status)) throw new Error(status === 'approval_pending' ? 'This quote is pending approval. Decide the approval before editing.' : 'This quote is locked. Create a new quote instead.');
  return { workspace, supabase, quote, version, quoteId, leadId };
}

async function productMetaMap(supabase: any, productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const meta = new Map<string, ProductMeta>();
  if (!uniqueIds.length) return meta;
  const { data: products } = await supabase.from('products').select('id, name, sku, sku_code, hsn_code, category_id, pack_size').in('id', uniqueIds);
  for (const product of products ?? []) meta.set(product.id, { id: product.id, name: product.name, sku: product.sku, sku_code: product.sku_code, hsn_code: product.hsn_code, pack_size: product.pack_size, pack_label: product.pack_size });
  const { data: rules } = await supabase.from('product_pricing_rules').select('product_id, product_name, sku_code, hsn_code, category_type, pack_label, moq, fob_usd, ex_factory_usd, fob_usd_per_case, ex_factory_usd_per_case, fob_usd_per_unit, ex_factory_usd_per_unit, is_active, sort_order').in('product_id', uniqueIds).eq('is_active', true).order('sort_order', { ascending: true });
  for (const rule of rules ?? []) { if (!rule.product_id) continue; const existing: ProductMeta = meta.get(rule.product_id) ?? { id: rule.product_id, name: rule.product_name || 'Product' }; const defaultPrice = [rule.fob_usd_per_case, rule.fob_usd_per_unit, rule.fob_usd, rule.ex_factory_usd_per_case, rule.ex_factory_usd_per_unit, rule.ex_factory_usd].map((value: unknown) => Number(value ?? 0)).find((value: number) => Number.isFinite(value) && value > 0) ?? existing.default_price ?? null; meta.set(rule.product_id, { ...existing, name: existing.name || rule.product_name || 'Product', sku_code: existing.sku_code || rule.sku_code, hsn_code: existing.hsn_code || rule.hsn_code, category_type: rule.category_type || existing.category_type || '', pack_label: existing.pack_label || rule.pack_label, default_price: defaultPrice, source_fob_usd: Number(rule.fob_usd ?? rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? 0) || existing.source_fob_usd || null, source_ex_factory_usd: Number(rule.ex_factory_usd ?? rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? 0) || existing.source_ex_factory_usd || null }); }
  return meta;
}

function pricingState(line: DraftLine, product?: ProductMeta | null) {
  const reference = Number(product?.default_price ?? 0);
  const entered = Number(line.unitPrice ?? 0);
  const base = entered > 0 ? entered : reference > 0 ? reference : 0;
  const discountRaw = Number(line.discountValue ?? 0);
  const discountAmount = line.discountType === 'percent' ? base * Math.max(0, discountRaw) / 100 : line.discountType === 'amount' ? Math.max(0, discountRaw) : 0;
  const finalPrice = Math.max(0, base - discountAmount);
  const discountPercent = base > 0 ? (discountAmount / base) * 100 : 0;
  const requiresApproval = finalPrice <= 0 || discountPercent > APPROVAL_THRESHOLD_PERCENT;
  const withinThreshold = discountPercent > 0 && discountPercent <= APPROVAL_THRESHOLD_PERCENT;
  return { basePrice: base || null, finalPrice, discountAmount: Number(discountAmount.toFixed(2)), discountPercent: Number(discountPercent.toFixed(2)), requiresApproval, withinThreshold };
}

async function replaceQuoteLines(input: { supabase: any; quote: any; lines: DraftLine[]; quoteCurrency: string; userId: string }) {
  const { supabase, quote, lines, quoteCurrency, userId } = input;
  const now = new Date().toISOString();
  const productMap = await productMetaMap(supabase, lines.map((line) => line.productId).filter(Boolean) as string[]);
  let approvalRequired = false;
  const quoteLineRows = lines.map((line) => { const product = line.productId ? productMap.get(line.productId) : null; const state = pricingState(line, product); approvalRequired ||= state.requiresApproval; return { quote_id: quote.id, product_id: line.productId, product_variant_id: null, catalog_price_id: null, catalog_price_amount: state.basePrice ?? state.finalPrice, catalog_price_currency: line.currency || quoteCurrency, quantity: line.quantity, unit_price: state.finalPrice, currency: line.currency || quoteCurrency, is_price_overridden: state.requiresApproval, override_reason: state.requiresApproval ? `Discount ${state.discountPercent}% exceeds ${APPROVAL_THRESHOLD_PERCENT}% threshold or price is missing.` : state.withinThreshold ? `Discount ${state.discountPercent}% within allowed threshold.` : null, overridden_by: state.requiresApproval ? userId : null, overridden_at: state.requiresApproval ? now : null, notes: line.notes }; });
  // S24-SPEN: replace only product lines. Packaging lines (line_type='packaging')
  // are managed by the packaging configurator and must survive product saves.
  await supabase.from('quote_line_items').delete().eq('quote_id', quote.id).neq('line_type', 'packaging');
  if (quoteLineRows.length) { const { error } = await supabase.from('quote_line_items').insert(quoteLineRows); if (error) throw new Error(error.message); }
  if (quote.current_version_id) {
    await supabase.from('quote_version_line_items').delete().eq('quote_version_id', quote.current_version_id).neq('line_type', 'packaging');
    const versionRows = lines.map((line, index) => { const product = line.productId ? productMap.get(line.productId) : null; const state = pricingState(line, product); return { quote_version_id: quote.current_version_id, product_id: line.productId, product_variant_id: null, sku_code: product?.sku_code || product?.sku || `QUOTE-LINE-${index + 1}`, hsn_code: product?.hsn_code || null, product_name: product?.name || `Product ${index + 1}`, category_type: product?.category_type || '', pack_label: line.packLabel || product?.pack_label || product?.pack_size || null, basis_applied: line.basis || 'fob', pricing_mode: 'case', moq: line.quantity, source_ex_factory_usd: product?.source_ex_factory_usd ?? null, source_fob_usd: state.basePrice ?? state.finalPrice, final_unit_price: state.finalPrice, final_case_price: state.finalPrice * line.quantity, display_currency: line.currency || quoteCurrency, is_overridden: state.requiresApproval, override_status: state.requiresApproval ? 'approval_required' : state.withinThreshold ? 'within_threshold' : null, override_reason: state.requiresApproval ? `Discount ${state.discountPercent}% exceeds ${APPROVAL_THRESHOLD_PERCENT}% threshold or price is missing.` : state.withinThreshold ? `Discount ${state.discountPercent}% within allowed threshold.` : null, overridden_by: state.requiresApproval ? userId : null, overridden_at: state.requiresApproval ? now : null, line_notes: line.notes, sort_order: index, calculation_meta: { source: 'canonical_quote_builder', price_source: line.priceSource || 'Price List', freight: line.freight, base_price: state.basePrice, final_price: state.finalPrice, discount_type: line.discountType, discount_value: line.discountValue, discount_amount: state.discountAmount, discount_percent: state.discountPercent, approval_threshold_percent: APPROVAL_THRESHOLD_PERCENT, approval_required: state.requiresApproval }, catalog_price_snapshot: { product_id: line.productId, base_price: state.basePrice, final_price: state.finalPrice } }; });
    if (versionRows.length) { const { error } = await supabase.from('quote_version_line_items').insert(versionRows); if (error) throw new Error(error.message); }
    const { count: totalLineCount } = await supabase.from('quote_version_line_items').select('id', { count: 'exact', head: true }).eq('quote_version_id', quote.current_version_id);
    const { error: versionError } = await supabase.from('quote_versions').update({ total_line_count: Number(totalLineCount ?? versionRows.length), display_currency: quoteCurrency, updated_at: now }).eq('id', quote.current_version_id).eq('quote_id', quote.id);
    if (versionError) throw new Error(versionError.message);
  }
  return { approvalRequired };
}

async function activity(supabase: any, organizationId: string, leadId: string, userId: string, message: string, kind = 'quote_updated') { await supabase.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, actor_user_id: userId, kind, message, occurred_at: new Date().toISOString() }); }
function refreshPaths(leadId: string) { revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quote`); }
function finish(leadId: string, quoteId: string, step: number, saved = 'quote') { refreshPaths(leadId); redirect(`/leads/${leadId}/quote?quoteId=${quoteId}&step=${step}&saved=${saved}`); }
function finishSent(leadId: string, quoteId: string) { refreshPaths(leadId); revalidatePath('/quotes'); redirect(`/quotes?status=sent&mode=buyers&quoteId=${quoteId}&saved=sent`); }
function fail(leadId: string, quoteId: string, step: number, error: unknown) { refreshPaths(leadId); redirect(`/leads/${leadId}/quote?quoteId=${quoteId}&step=${step}&quoteActionError=${safeError(error)}`); }

export async function saveCanonicalQuoteProducts(formData: FormData) { const leadId = text(formData.get('lead_id')); const quoteId = text(formData.get('quote_id')); try { const { workspace, supabase, quote } = await getQuoteContext(formData); const quoteCurrency = safeCurrency(text(formData.get('quote_currency')), quote.display_currency || quote.currency || 'USD'); await replaceQuoteLines({ supabase, quote, lines: parseLines(formData), quoteCurrency, userId: workspace.user!.id }); await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote products saved from the stabilized canonical builder.'); finish(leadId, quoteId, 2, 'products'); } catch (error) { if (isNextRedirect(error)) throw error; fail(leadId, quoteId, 1, error); } }
export async function saveCanonicalQuotePricing(formData: FormData) { const leadId = text(formData.get('lead_id')); const quoteId = text(formData.get('quote_id')); try { const { workspace, supabase, quote } = await getQuoteContext(formData); const quoteCurrency = safeCurrency(text(formData.get('quote_currency')), quote.display_currency || quote.currency || 'USD'); const { approvalRequired } = await replaceQuoteLines({ supabase, quote, lines: parseLines(formData), quoteCurrency, userId: workspace.user!.id }); await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, approvalRequired ? 'Quote pricing saved. Approval is required because discount threshold was exceeded.' : 'Quote pricing saved within approval threshold.'); finish(leadId, quoteId, 4, approvalRequired ? 'pricing-approval-required' : 'pricing'); } catch (error) { if (isNextRedirect(error)) throw error; fail(leadId, quoteId, 3, error); } }
export async function saveCanonicalQuoteTerms(formData: FormData) { const leadId = text(formData.get('lead_id')); const quoteId = text(formData.get('quote_id')); try { const { workspace, supabase, quote } = await getQuoteContext(formData); const quoteCurrency = safeCurrency(text(formData.get('currency')), quote.display_currency || quote.currency || 'USD'); const pricingBasis = text(formData.get('incoterm')) || 'FOB'; const validityDays = num(formData.get('validity_days')) ?? 30; const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); const customerMessage = [`Incoterm: ${pricingBasis}`, `Port of loading: ${text(formData.get('port_loading')) || 'Not specified'}`, `Port of discharge: ${text(formData.get('port_discharge')) || 'Not specified'}`, `Payment terms: ${text(formData.get('payment_terms')) || 'Not specified'}`, `Lead time: ${text(formData.get('lead_time')) || 'Not specified'}`, `Packaging: ${text(formData.get('packaging')) || 'Not specified'}`, text(formData.get('shipment_notes')), text(formData.get('special_notes'))].filter(Boolean).join('\n'); if (quote.current_version_id) { const { error } = await supabase.from('quote_versions').update({ display_currency: quoteCurrency, pricing_basis: pricingBasis.toLowerCase(), valid_until: validUntil, customer_message: customerMessage, internal_notes: nullable(formData.get('internal_notes')), updated_at: new Date().toISOString() }).eq('quote_id', quoteId).eq('id', quote.current_version_id); if (error) throw new Error(error.message); } await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote terms saved from the stabilized canonical builder.'); finish(leadId, quoteId, 3, 'terms'); } catch (error) { if (isNextRedirect(error)) throw error; fail(leadId, quoteId, 2, error); } }
export async function submitCanonicalQuoteApproval(formData: FormData) { const leadId = text(formData.get('lead_id')); const quoteId = text(formData.get('quote_id')); try { const { workspace, supabase, quote } = await getQuoteContext(formData, true); if (!quote.current_version_id) throw new Error('Current quote version is required.'); const { error } = await supabase.rpc('app_submit_quote_approval_tx', { p_organization_id: workspace.organization!.id, p_quote_id: quoteId, p_quote_version_id: quote.current_version_id, p_actor_user_id: workspace.user!.id, p_rule: 'canonical_send_gate', p_reason: text(formData.get('reason')) || 'Pricing threshold requires approval before sending.' }); if (error) throw new Error(error.message); await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote submitted for approval from the stabilized send gate.', 'quote_approval_requested'); finish(leadId, quoteId, 5, 'approval'); } catch (error) { if (isNextRedirect(error)) throw error; fail(leadId, quoteId, 5, error); } }
export async function sendCanonicalQuote(formData: FormData) { const leadId = text(formData.get('lead_id')); const quoteId = text(formData.get('quote_id')); try { const { workspace, supabase, quote } = await getQuoteContext(formData, true); if (!quote.current_version_id) throw new Error('Current quote version is required.'); const approvalRequired = text(formData.get('approval_required')) === 'true' || Boolean(quote.approval_required); const { error } = await supabase.rpc('app_send_quote_version_with_fanout_tx', { p_quote_version_id: quote.current_version_id, p_actor_user_id: workspace.user!.id, p_actor_name: workspace.user!.email || 'Setu Flow user', p_plain_notes: text(formData.get('plain_notes')) || 'Quote sent from canonical send gate.', p_approval_required: approvalRequired, p_approval_state: approvalRequired ? 'pending' : 'none', p_action_source: 'canonical_quote_builder' }); if (error) throw new Error(error.message); await activity(supabase, workspace.organization!.id, leadId, workspace.user!.id, 'Quote sent from the stabilized canonical send gate.', 'quote_sent'); finishSent(leadId, quoteId); } catch (error) { if (isNextRedirect(error)) throw error; fail(leadId, quoteId, 5, error); } }
