import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { isPackagingOrganization } from '@/lib/verticals/capability';
import { packagingComplianceLibrary, packagingSalesDiscoveryChecklist, recommendPackagingPrintProcess } from '@/lib/setu-guru/packaging-intelligence-core';

export const dynamic = 'force-dynamic';

const Mode = z.enum([
  'packaging_family_search', 'packaging_template_search', 'packaging_specification_review', 'packaging_quote_readiness',
  'packaging_artwork_status', 'packaging_proof_status', 'packaging_design_queue', 'packaging_dispatch_status',
  'packaging_production_readiness', 'packaging_material_guidance', 'packaging_moq_alternatives',
  'packaging_cost_driver_explanation', 'packaging_sales_discovery', 'packaging_compliance_research', 'packaging_learning_metrics',
]);
const Body = z.object({ mode: Mode, question: z.string().max(2000).default(''), route: z.string().max(500).default('') });
const list = (value: unknown) => Array.isArray(value) ? value : [];
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const text = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => text(value).toLowerCase();
const quoteIdFromRoute = (route: string) => route.match(/\/quotes\/([^/?#]+)/)?.[1] ?? null;
const leadIdFromRoute = (route: string) => route.match(/\/leads\/([^/?#]+)/)?.[1] ?? null;

function response(answer: string, rows: any[] = [], actions: string[] = [], actionHrefs: Record<string, string> = {}) {
  return NextResponse.json({ answer, rows, actions, actionHrefs, confidence: 'high', sourceType: 'live_org_data', approvalRequired: true });
}

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Packaging search request.', details: parsed.error.flatten() }, { status: 422 });
  const workspace = await requireWorkspace(); const orgId = workspace.organization?.id;
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  const supabase = await createClient(); const client = supabase as any;
  if (!(await isPackagingOrganization(orgId, client))) return NextResponse.json({ error: 'Packaging live search is available only for Packaging vertical organizations.' }, { status: 403 });
  const { mode, route } = parsed.data;

  if (mode === 'packaging_family_search') {
    const { data, error } = await client.from('packaging_service_families').select('id,name,slug,description,pricing_mode,quote_time_inputs,default_unit,default_lead_time,is_active').eq('organization_id', orgId).order('sort_order');
    if (error) throw error; const rows = (data ?? []).map((row: any) => ({ id: row.id, name: row.name, status: row.is_active ? 'active' : 'inactive', pricing: row.pricing_mode, lead_time: row.default_lead_time, required_inputs: list(row.quote_time_inputs).map((input: any) => text(input.label || input.key)).filter(Boolean).join(', ') }));
    return response(`I checked ${rows.length} Packaging families in this workspace. Use the active family whose required quote inputs match the customer requirement; inactive families must not be quoted.`, rows, ['Open Packaging Families'], { 'Open Packaging Families': '/admin/packaging-families' });
  }

  if (mode === 'packaging_template_search' || mode === 'packaging_moq_alternatives' || mode === 'packaging_cost_driver_explanation') {
    const { data, error } = await client.from('packaging_pricing_templates').select('id,name,slug,currency,is_active,print_process,allowed_dimension_ranges_json,material_rates_json,print_rules_json,finish_addon_rates_json,moq_tiers_json,setup_charges_json,rush_options_json,lead_time_rules_json,waste_factor_pct').eq('organization_id', orgId).order('name');
    if (error) throw error;
    const rows = (data ?? []).map((row: any) => {
      const tiers = list(record(row.moq_tiers_json).tiers ?? row.moq_tiers_json); const missing = [!list(row.material_rates_json).length && 'material rates', !tiers.length && 'MOQ tiers', !record(row.lead_time_rules_json).standard && 'lead time'].filter(Boolean);
      return { id: row.id, name: row.name, status: row.is_active ? 'active' : 'inactive', process: row.print_process, currency: row.currency, moq_tiers: tiers.length, waste_pct: row.waste_factor_pct, setup_items: list(row.setup_charges_json).length, health: missing.length ? `Missing ${missing.join(', ')}` : 'Configured' };
    });
    const answer = mode === 'packaging_moq_alternatives' ? 'I checked configured MOQ tiers. Compare only active templates that fit the dimensions/material; a lower MOQ is not automatically the best process once setup, waste, and lead time are included.' : mode === 'packaging_cost_driver_explanation' ? 'Packaging price is driven by area/material structure, print method and colors, setup/plates/cylinders, finish/add-ons, waste, quantity tier, rush, lead time, and freight. The rows below show the live template configuration.' : 'I checked the live Packaging pricing templates and their health.';
    return response(answer, rows, ['Open Packaging Templates'], { 'Open Packaging Templates': '/admin/packaging-templates' });
  }

  if (mode === 'packaging_compliance_research' || mode === 'packaging_material_guidance') {
    const rows = packagingComplianceLibrary().map((item, index) => ({ id: `packaging-compliance-${index}`, name: item.topic, evidence: item.evidence.join(', '), next: item.boundary, type: 'internal_review' }));
    return response('This is a Packaging evidence checklist, not a legal approval. Confirm destination market, packed product, material structure, use conditions, and current official requirements before making compliance or environmental claims.', rows, ['Open Compliance'], { 'Open Compliance': '/compliance' });
  }

  if (mode === 'packaging_learning_metrics') {
    const { data, error } = await client.from('packaging_intelligence_learning_metrics_v').select('*').eq('organization_id', orgId).order('total_recommendations', { ascending: false });
    if (error) throw error; const rows = data ?? [];
    return response(`I checked ${rows.length} Packaging recommendation categories. These metrics measure generated, completed, dismissed, expired, helpful, and false-positive outcomes; they do not automatically change rules or models.`, rows, ['Open Packaging Analytics'], { 'Open Packaging Analytics': '/dashboard/analytics' });
  }

  if (mode === 'packaging_sales_discovery' || mode === 'packaging_specification_review') {
    const leadId = leadIdFromRoute(route); let existing: Record<string, unknown> = {};
    if (leadId) { const { data } = await client.from('leads').select('products_or_needs,industry_metadata').eq('organization_id', orgId).eq('id', leadId).maybeSingle(); existing = { ...record(data?.industry_metadata), packed_product: data?.products_or_needs }; }
    const checklist = packagingSalesDiscoveryChecklist(existing);
    return response(`Packaging discovery is ${checklist.completion}% complete. Confirm the missing technical, volume, artwork, timing, supplier-pain, sample, compliance, and sustainability inputs before recommending a family, process, MOQ, or price.`, checklist.missing.slice(0, 12).map((item) => ({ id: item.key, name: item.label, status: 'missing', next: 'Confirm with the customer and save to the lead/quote.' })), ['Open Lead'], leadId ? { 'Open Lead': `/leads/${leadId}` } : { 'Open Lead': '/leads' });
  }

  const quoteId = quoteIdFromRoute(route);
  const { data: quotes, error: quoteError } = await client.from('quotes').select('id,quote_number,lead_id,status,currency,updated_at').eq('organization_id', orgId).order('updated_at', { ascending: false }).limit(quoteId ? 1000 : 50);
  if (quoteError) throw quoteError; const selectedQuotes = quoteId ? (quotes ?? []).filter((row: any) => row.id === quoteId) : quotes ?? []; const ids = selectedQuotes.map((row: any) => row.id);
  const [{ data: lines }, { data: proofs }, { data: stages }, { data: orders }] = await Promise.all([
    ids.length ? client.from('quote_line_items').select('id,quote_id,product_id,line_type,packaging_family_id,packaging_template_id,quantity,currency,input_snapshot_json,pricing_breakdown_json').in('quote_id', ids) : Promise.resolve({ data: [] }),
    client.from('packaging_proofs').select('id,quote_line_item_id,version,status,design_source,uploaded_at,reviewed_at').eq('organization_id', orgId).order('version', { ascending: false }).limit(2000),
    client.from('packaging_production_stage_events').select('id,quote_line_item_id,stage,entered_at,notes').eq('organization_id', orgId).order('entered_at', { ascending: false }).limit(2000),
    client.from('orders').select('id,order_number,source_quote_id,order_lifecycle_status,dispatch_status').eq('organization_id', orgId).limit(1000),
  ]);
  const latestProof = new Map<string, any>(); for (const row of proofs ?? []) if (!latestProof.has(row.quote_line_item_id)) latestProof.set(row.quote_line_item_id, row);
  const latestStage = new Map<string, any>(); for (const row of stages ?? []) if (!latestStage.has(row.quote_line_item_id)) latestStage.set(row.quote_line_item_id, row);
  const orderByQuote = new Map<string, any>((orders ?? []).map((row: any): [string, any] => [String(row.source_quote_id), row]));
  const rows = (lines ?? []).map((line: any) => { const input = record(line.input_snapshot_json); const proof = latestProof.get(line.id); const stage = latestStage.get(line.id); const missing = [!Number(line.quantity ?? input.quantity) && 'quantity', !line.packaging_family_id && 'family', !line.packaging_template_id && 'template', !text(input.artwork_status) && 'artwork status'].filter(Boolean); const process = recommendPackagingPrintProcess({ quantity: Number(line.quantity ?? 0), annualVolume: Number(input.annual_volume ?? 0), designCount: Number(input.design_count ?? 1), variableData: lower(input.variable_data) === 'true' }); const order = orderByQuote.get(String(line.quote_id)); return { id: line.id, name: selectedQuotes.find((q: any) => q.id === line.quote_id)?.quote_number || line.id.slice(0, 8), missing: missing.join(', ') || 'none', proof: proof ? `${proof.design_source} · ${proof.status} · v${proof.version}` : 'not uploaded', production_stage: stage?.stage || 'not started', process: process.process, process_reason: process.reason, order: order?.order_number || 'not created' }; });
  const actions = ['Open Quotes', 'Open Design Queue', 'Open Dispatch Board'];
  return response(`I checked ${rows.length} live Packaging line(s). Quote readiness requires complete specification/template/quantity; Printing requires final artwork; production and dispatch changes remain explicit operator actions.`, rows, actions, { 'Open Quotes': '/quotes', 'Open Design Queue': '/design-queue', 'Open Dispatch Board': '/dispatch-board' });
}
