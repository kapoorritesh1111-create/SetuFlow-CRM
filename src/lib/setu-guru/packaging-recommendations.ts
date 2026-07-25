import { isPackagingOrganization } from '@/lib/verticals/capability';
import { recommendPackagingPrintProcess } from '@/lib/setu-guru/packaging-intelligence-core';

export type PackagingGeneratedRecommendation = {
  org_id: string;
  entity_type: 'packaging_line' | 'packaging_template' | 'packaging_order' | 'quote';
  entity_id: string;
  recommendation_type: string;
  title: string;
  summary: string;
  reason: string;
  recommended_action: string;
  action_href: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: Record<string, unknown>;
};

const DAY_MS = 86_400_000;
const ageDays = (value?: string | null) => value ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / DAY_MS)) : 0;
const text = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => text(value).toLowerCase();
const list = (value: unknown) => Array.isArray(value) ? value : [];
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

function latestBy<T extends { uploaded_at?: string | null; entered_at?: string | null; created_at?: string | null; version?: number | null }>(rows: T[]): T | null {
  return [...rows].sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0) || Date.parse(b.uploaded_at || b.entered_at || b.created_at || '1970-01-01') - Date.parse(a.uploaded_at || a.entered_at || a.created_at || '1970-01-01'))[0] ?? null;
}
function isDesignReady(proof: any) { return Boolean(proof && ((proof.design_source === 'customer_provided' && proof.status !== 'rejected') || (proof.design_source === 'design_team' && proof.status === 'approved'))); }
function packagingLine(line: any, product: any) {
  const capabilities = list(product?.enabled_capabilities).map(lower); const sku = text(product?.sku).toUpperCase();
  return line.line_type === 'packaging' || Boolean(line.packaging_family_id || line.packaging_template_id) || capabilities.includes('artwork_approval') || (sku.startsWith('SP-') && sku !== 'SP-ADDONS');
}
function templateIssues(template: any): string[] {
  const issues: string[] = []; const dimensions = record(template.allowed_dimension_ranges_json); const serviceMode = dimensions.area_formula === 'service';
  if (!list(template.material_rates_json).length) issues.push(serviceMode ? 'service items' : 'material rates');
  if (!serviceMode && (!dimensions.width_mm || !dimensions.height_mm)) issues.push('dimension ranges');
  if (!serviceMode && lower(record(template.print_rules_json).basis) === 'none') issues.push('print rules');
  if (!serviceMode && !list(record(template.moq_tiers_json).tiers).length) issues.push('MOQ tiers');
  if (!record(template.lead_time_rules_json).standard) issues.push('standard lead time');
  return issues;
}
function tierRows(template: any) { const moq = record(template?.moq_tiers_json); return list(moq.tiers ?? template?.moq_tiers_json).map((row: any) => record(row)).sort((a, b) => Number(a.min_qty ?? a.quantity ?? 0) - Number(b.min_qty ?? b.quantity ?? 0)); }

export async function generatePackagingRecommendations(client: any, orgId: string): Promise<PackagingGeneratedRecommendation[]> {
  if (!(await isPackagingOrganization(orgId, client))) return [];
  const [quotesResult, linesResult, productsResult, proofsResult, stagesResult, templatesResult, ordersResult, leadsResult] = await Promise.all([
    client.from('quotes').select('id,lead_id,quote_number,status,sent_at,last_customer_response_at,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('quote_line_items').select('id,quote_id,product_id,line_type,packaging_family_id,packaging_template_id,quantity,currency,input_snapshot_json,pricing_breakdown_json,created_at,updated_at').limit(5000),
    client.from('products').select('id,name,sku,product_family_code,enabled_capabilities').eq('organization_id', orgId).limit(1000),
    client.from('packaging_proofs').select('id,quote_line_item_id,version,status,design_source,uploaded_at,created_at,reviewed_at').eq('organization_id', orgId).limit(5000),
    client.from('packaging_production_stage_events').select('id,quote_line_item_id,stage,entered_at,created_at').eq('organization_id', orgId).limit(5000),
    client.from('packaging_pricing_templates').select('id,name,slug,is_active,print_process,allowed_dimension_ranges_json,material_rates_json,print_rules_json,moq_tiers_json,setup_charges_json,lead_time_rules_json,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('orders').select('id,order_number,lead_id,source_quote_id,order_lifecycle_status,dispatch_status,total_order_value,currency,completed_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('leads').select('id,company_name,contact_name,products_or_needs,last_contacted_at').eq('organization_id', orgId).limit(1000),
  ]);
  for (const result of [quotesResult, linesResult, productsResult, proofsResult, stagesResult, templatesResult, ordersResult, leadsResult]) if (result.error) throw result.error;

  const quotes = quotesResult.data ?? []; const quoteIds = new Set(quotes.map((q: any) => q.id));
  const lines = (linesResult.data ?? []).filter((line: any) => quoteIds.has(line.quote_id));
  const products = new Map((productsResult.data ?? []).map((row: any) => [row.id, row]));
  const templates = new Map((templatesResult.data ?? []).map((row: any) => [row.id, row]));
  const leads = new Map((leadsResult.data ?? []).map((row: any) => [row.id, row]));
  const proofsByLine = new Map<string, any[]>(); const stagesByLine = new Map<string, any[]>();
  for (const row of proofsResult.data ?? []) proofsByLine.set(row.quote_line_item_id, [...(proofsByLine.get(row.quote_line_item_id) ?? []), row]);
  for (const row of stagesResult.data ?? []) stagesByLine.set(row.quote_line_item_id, [...(stagesByLine.get(row.quote_line_item_id) ?? []), row]);
  const ordersByQuote = new Map((ordersResult.data ?? []).filter((row: any) => row.source_quote_id).map((row: any) => [row.source_quote_id, row]));
  const recommendations: PackagingGeneratedRecommendation[] = [];
  const push = (item: PackagingGeneratedRecommendation) => { const key = `${item.recommendation_type}:${item.entity_type}:${item.entity_id}`; if (!recommendations.some((row) => `${row.recommendation_type}:${row.entity_type}:${row.entity_id}` === key)) recommendations.push(item); };

  for (const template of templatesResult.data ?? []) {
    if (!template.is_active) continue; const issues = templateIssues(template); if (!issues.length) continue;
    push({ org_id: orgId, entity_type: 'packaging_template', entity_id: template.id, recommendation_type: 'packaging_pricing_template_unhealthy', title: `Complete ${template.name || 'Packaging pricing template'}`, summary: 'An active Packaging template is missing quote-driving rules.', reason: `Missing or incomplete: ${issues.join(', ')}.`, recommended_action: 'Open the template, complete the missing rules, validate the calculation, and keep activation under Admin approval.', action_href: `/admin/packaging-templates/${template.id}`, priority: issues.includes('material rates') || issues.includes('dimension ranges') ? 'high' : 'medium', metadata: { issues, source: 'packaging_template_health' } });
  }

  const acceptedFamiliesByLead = new Map<string, Set<string>>();
  for (const quote of quotes) {
    const lead: any = leads.get(quote.lead_id); const customer = lead?.company_name || lead?.contact_name || 'customer'; const quoteLabel = quote.quote_number || 'Packaging quote';
    const quoteLines = lines.filter((line: any) => line.quote_id === quote.id && packagingLine(line, products.get(line.product_id)));
    if (!quoteLines.length) continue;
    if (quote.status === 'accepted' && !ordersByQuote.has(quote.id)) push({ org_id: orgId, entity_type: 'quote', entity_id: quote.id, recommendation_type: 'packaging_order_handoff_missing', title: `Create the order for ${quoteLabel}`, summary: `${quoteLabel} for ${customer} is accepted but has no canonical order.`, reason: 'Accepted Packaging work cannot enter design, production, and dispatch without the matching order.', recommended_action: 'Open the accepted quote and complete the governed order handoff.', action_href: `/quotes?quote=${quote.id}`, priority: 'urgent', metadata: { quote_id: quote.id, lead_id: quote.lead_id } });

    for (const line of quoteLines) {
      const product: any = products.get(line.product_id); const input = record(line.input_snapshot_json); const lineName = product?.name || `Packaging line ${text(line.id).slice(0, 8)}`;
      const family = lower(product?.product_family_code || line.packaging_family_id || lineName); if (quote.status === 'accepted' && quote.lead_id) acceptedFamiliesByLead.set(quote.lead_id, new Set([...(acceptedFamiliesByLead.get(quote.lead_id) ?? []), family]));
      const missing: string[] = [];
      if (!Number(line.quantity ?? input.quantity ?? 0)) missing.push('quantity'); if (!line.packaging_family_id && !product?.product_family_code) missing.push('Packaging family');
      const serviceLine = ['prepress_artwork', 'packshots_3d', 'prototypes_mockups', 'variable_data_printing'].includes(lower(product?.product_family_code));
      if (!serviceLine) { if (!Number(input.width_mm ?? input.width ?? 0)) missing.push('width'); if (!Number(input.height_mm ?? input.height ?? 0)) missing.push('height'); if (!text(input.material_key ?? input.material ?? input.structure)) missing.push('material structure'); }
      if (!text(input.artwork_status)) missing.push('artwork status');
      if (missing.length && ['draft', 'pending_approval', 'approved'].includes(quote.status)) push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_specification_incomplete', title: `Complete specifications for ${lineName}`, summary: `${quoteLabel} for ${customer} is missing Packaging quote inputs.`, reason: `Missing: ${missing.join(', ')}.`, recommended_action: 'Open Quote Builder and complete the missing Packaging specifications before approval or send.', action_href: `/quotes?quote=${quote.id}`, priority: quote.status === 'approved' ? 'high' : 'medium', metadata: { quote_id: quote.id, line_id: line.id, missing } });

      const template: any = templates.get(line.packaging_template_id); const quantity = Number(line.quantity ?? input.quantity ?? 0); const tiers = tierRows(template);
      if (template && quantity) {
        const nextTier = tiers.find((tier) => Number(tier.min_qty ?? tier.quantity ?? 0) > quantity);
        const currentTier = [...tiers].reverse().find((tier) => Number(tier.min_qty ?? tier.quantity ?? 0) <= quantity);
        if (nextTier && Number(nextTier.unit_rate ?? nextTier.rate ?? 0) < Number(currentTier?.unit_rate ?? currentTier?.rate ?? Infinity)) push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_quantity_tier_savings', title: `Review the next quantity tier for ${lineName}`, summary: `${quoteLabel} may have a lower configured unit rate at the next volume tier.`, reason: `Current quantity ${quantity.toLocaleString()} is below the next configured tier ${Number(nextTier.min_qty ?? nextTier.quantity).toLocaleString()}.`, recommended_action: 'Review the buyer forecast and compare the next tier in Quote Builder. Do not change quantity or price without buyer and approver confirmation.', action_href: `/quotes?quote=${quote.id}`, priority: 'medium', metadata: { quote_id: quote.id, line_id: line.id, current_quantity: quantity, next_tier: nextTier } });
      }
      const process = recommendPackagingPrintProcess({ quantity, annualVolume: Number(input.annual_volume ?? 0), designCount: Number(input.design_count ?? input.sku_count ?? 1), turnaroundDays: Number(input.turnaround_days ?? 0) || null, variableData: family.includes('variable'), serviceOnly: serviceLine });
      if (!serviceLine && (!template?.print_process || lower(template.print_process) !== process.process) && process.process !== 'needs_review') push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_print_process_review', title: `Review ${process.process} for ${lineName}`, summary: `${quoteLabel} has a deterministic print-process recommendation that differs from or is missing in the selected template.`, reason: process.reason, recommended_action: 'Compare configured digital, flexo, and rotogravure economics before changing the template or quote.', action_href: `/quotes?quote=${quote.id}`, priority: 'medium', metadata: { quote_id: quote.id, line_id: line.id, process } });

      const latestProof = latestBy(proofsByLine.get(line.id) ?? []); const latestStage = latestBy(stagesByLine.get(line.id) ?? []); const ready = isDesignReady(latestProof);
      if (quote.status === 'accepted') {
        if (!latestProof) push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_artwork_required', title: `Artwork required for ${lineName}`, summary: `${quoteLabel} for ${customer} is accepted but no final artwork/proof is recorded.`, reason: 'Every accepted Packaging production line needs customer artwork or an approved Design Team proof before Printing.', recommended_action: 'Open Design Queue and upload customer artwork or a Design Team proof.', action_href: `/design-queue?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id } });
        else if (latestProof.status === 'rejected') push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_rejected', title: `Revise the rejected proof for ${lineName}`, summary: `${quoteLabel} needs a new proof version.`, reason: 'The latest proof was rejected and cannot release the job to Printing.', recommended_action: 'Open Design Queue, review the comment, and upload a new proof version.', action_href: `/design-queue?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id, proof_id: latestProof.id } });
        else if (latestProof.design_source === 'design_team' && latestProof.status !== 'approved') { const wait = ageDays(latestProof.uploaded_at || latestProof.created_at); push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_waiting_customer', title: `Follow up on proof approval for ${lineName}`, summary: `${quoteLabel} has a Design Team proof waiting for customer approval.`, reason: `Pending for ${wait} day(s).`, recommended_action: 'Open Design Queue and prepare a customer follow-up. Do not claim delivery without provider confirmation.', action_href: `/design-queue?line=${line.id}`, priority: wait >= 3 ? 'high' : 'medium', metadata: { quote_id: quote.id, line_id: line.id, proof_id: latestProof.id, waiting_days: wait } }); }
        else if (ready && !latestStage) push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_approved_ready_for_production', title: `Start pre-press for ${lineName}`, summary: `${quoteLabel} has final design evidence and no production stage recorded.`, reason: 'The accepted job is design-ready.', recommended_action: 'Open Dispatch Board and start Pre-Press after operator review.', action_href: `/dispatch-board?line=${line.id}`, priority: 'high', metadata: { quote_id: quote.id, line_id: line.id } });
        if (latestStage) { const stageAge = ageDays(latestStage.entered_at || latestStage.created_at); if (latestStage.stage !== 'pre_press' && !ready) push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_printing_blocked_by_design', title: `Restore the design gate for ${lineName}`, summary: `${quoteLabel} has production activity beyond Pre-Press without final design readiness.`, reason: `Current stage is ${latestStage.stage}.`, recommended_action: 'Resolve final design evidence and review production history.', action_href: `/dispatch-board?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id, stage: latestStage.stage } }); else if (stageAge >= 3 && latestStage.stage !== 'dispatched') push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: latestStage.stage === 'pre_press' ? 'packaging_prepress_stalled' : 'packaging_production_stage_overdue', title: `Review stalled ${latestStage.stage} work for ${lineName}`, summary: `${quoteLabel} has remained in ${latestStage.stage} for ${stageAge} day(s).`, reason: 'The job has not recorded the next stage within the review threshold.', recommended_action: 'Open Dispatch Board and let an operator record the next approved stage.', action_href: `/dispatch-board?line=${line.id}`, priority: stageAge >= 7 ? 'urgent' : 'high', metadata: { quote_id: quote.id, line_id: line.id, stage: latestStage.stage, stage_age_days: stageAge } }); }
      }
    }
  }

  for (const order of ordersResult.data ?? []) {
    const lifecycle = lower(order.order_lifecycle_status); const completedDate = order.completed_at || order.updated_at; const days = ageDays(completedDate); const lead: any = leads.get(order.lead_id);
    if (['completed', 'delivered', 'dispatched'].includes(lifecycle) && days >= 45) push({ org_id: orgId, entity_type: 'packaging_order', entity_id: order.id, recommendation_type: 'packaging_repeat_order_due', title: `Review repeat order timing for ${lead?.company_name || order.order_number || 'Packaging customer'}`, summary: 'A prior Packaging order may be entering its reorder window.', reason: `${order.order_number || 'The order'} reached ${lifecycle} ${days} day(s) ago.`, recommended_action: 'Open the customer/order history, confirm consumption and forecast, then prepare a reviewable reorder conversation.', action_href: `/orders?order=${order.id}`, priority: days >= 90 ? 'high' : 'medium', metadata: { order_id: order.id, lead_id: order.lead_id, age_days: days, prior_value: order.total_order_value, currency: order.currency } });
  }

  for (const [leadId, families] of acceptedFamiliesByLead) {
    const lead: any = leads.get(leadId); const label = lead?.company_name || lead?.contact_name || 'Packaging customer'; const joined = [...families].join(' ');
    const crossSells = [
      !/label|shrink/.test(joined) && ['packaging_cross_sell_labels', 'Explore labels or shrink sleeves', 'The customer has accepted Packaging work but no labels/sleeves family is recorded.'],
      !/packshot/.test(joined) && ['packaging_cross_sell_packshot', 'Offer 3D packshots', 'The customer has accepted Packaging work but no packshot service is recorded.'],
      !/prepress|artwork/.test(joined) && ['packaging_cross_sell_prepress', 'Offer artwork and pre-press support', 'The customer has accepted Packaging work but no pre-press service is recorded.'],
    ].filter(Boolean) as string[][];
    for (const [type, title, reason] of crossSells) push({ org_id: orgId, entity_type: 'quote', entity_id: leadId, recommendation_type: type, title: `${title} for ${label}`, summary: 'Evidence-backed account expansion based on accepted Packaging families.', reason, recommended_action: 'Open the buyer record, confirm the need, and prepare a reviewable cross-sell conversation. Nothing is sent automatically.', action_href: `/leads/${leadId}`, priority: 'low', metadata: { lead_id: leadId, accepted_families: [...families], source: 'accepted_packaging_history' } });
  }
  return recommendations;
}
