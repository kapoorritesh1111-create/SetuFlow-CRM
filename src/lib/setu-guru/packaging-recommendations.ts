import { isPackagingOrganization } from '@/lib/verticals/capability';

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

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (value?: string | null) => value ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / DAY_MS)) : 0;
const text = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => text(value).toLowerCase();
const list = (value: unknown) => Array.isArray(value) ? value : [];
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function latestBy<T extends { uploaded_at?: string | null; entered_at?: string | null; created_at?: string | null; version?: number | null }>(rows: T[]): T | null {
  return [...rows].sort((a, b) => {
    const version = Number(b.version ?? 0) - Number(a.version ?? 0);
    if (version) return version;
    return Date.parse(b.uploaded_at || b.entered_at || b.created_at || '1970-01-01') - Date.parse(a.uploaded_at || a.entered_at || a.created_at || '1970-01-01');
  })[0] ?? null;
}

function isDesignReady(proof: any) {
  if (!proof) return false;
  if (proof.design_source === 'customer_provided') return proof.status !== 'rejected';
  return proof.design_source === 'design_team' && proof.status === 'approved';
}

function templateIssues(template: any): string[] {
  const issues: string[] = [];
  const dimensions = record(template.allowed_dimension_ranges_json);
  const serviceMode = dimensions.area_formula === 'service';
  if (!list(template.material_rates_json).length) issues.push(serviceMode ? 'service items' : 'material rates');
  if (!serviceMode && (!dimensions.width_mm || !dimensions.height_mm)) issues.push('dimension ranges');
  if (!serviceMode && lower(record(template.print_rules_json).basis) === 'none') issues.push('print rules');
  if (!serviceMode && !list(record(template.moq_tiers_json).tiers).length) issues.push('MOQ tiers');
  if (!record(template.lead_time_rules_json).standard) issues.push('standard lead time');
  return issues;
}

function packagingLine(line: any, product: any) {
  const capabilities = list(product?.enabled_capabilities).map(lower);
  const sku = text(product?.sku).toUpperCase();
  return line.line_type === 'packaging'
    || Boolean(line.packaging_family_id || line.packaging_template_id)
    || capabilities.includes('artwork_approval')
    || (sku.startsWith('SP-') && sku !== 'SP-ADDONS');
}

export async function generatePackagingRecommendations(client: any, orgId: string): Promise<PackagingGeneratedRecommendation[]> {
  if (!(await isPackagingOrganization(orgId, client))) return [];

  const [quotesResult, linesResult, productsResult, proofsResult, stagesResult, templatesResult, ordersResult, leadsResult] = await Promise.all([
    client.from('quotes').select('id,lead_id,quote_number,status,sent_at,last_customer_response_at,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('quote_line_items').select('id,quote_id,product_id,line_type,packaging_family_id,packaging_template_id,quantity,currency,input_snapshot_json,pricing_breakdown_json,created_at,updated_at').limit(5000),
    client.from('products').select('id,name,sku,product_family_code,enabled_capabilities').eq('organization_id', orgId).limit(1000),
    client.from('packaging_proofs').select('id,quote_line_item_id,version,status,design_source,uploaded_at,created_at,reviewed_at').eq('organization_id', orgId).limit(5000),
    client.from('packaging_production_stage_events').select('id,quote_line_item_id,stage,entered_at,created_at').eq('organization_id', orgId).limit(5000),
    client.from('packaging_pricing_templates').select('id,name,slug,is_active,allowed_dimension_ranges_json,material_rates_json,print_rules_json,moq_tiers_json,setup_charges_json,lead_time_rules_json,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('orders').select('id,order_number,source_quote_id,order_lifecycle_status,dispatch_status,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('leads').select('id,company_name,contact_name').eq('organization_id', orgId).limit(1000),
  ]);

  for (const result of [quotesResult, linesResult, productsResult, proofsResult, stagesResult, templatesResult, ordersResult, leadsResult]) {
    if (result.error) throw result.error;
  }

  const quotes = quotesResult.data ?? [];
  const quoteIds = new Set(quotes.map((quote: any) => quote.id));
  const lines = (linesResult.data ?? []).filter((line: any) => quoteIds.has(line.quote_id));
  const products = new Map((productsResult.data ?? []).map((product: any) => [product.id, product]));
  const proofsByLine = new Map<string, any[]>();
  const stagesByLine = new Map<string, any[]>();
  for (const proof of proofsResult.data ?? []) proofsByLine.set(proof.quote_line_item_id, [...(proofsByLine.get(proof.quote_line_item_id) ?? []), proof]);
  for (const stage of stagesResult.data ?? []) stagesByLine.set(stage.quote_line_item_id, [...(stagesByLine.get(stage.quote_line_item_id) ?? []), stage]);
  const leads = new Map((leadsResult.data ?? []).map((lead: any) => [lead.id, lead]));
  const ordersByQuote = new Map((ordersResult.data ?? []).filter((order: any) => order.source_quote_id).map((order: any) => [order.source_quote_id, order]));
  const recommendations: PackagingGeneratedRecommendation[] = [];
  const push = (item: PackagingGeneratedRecommendation) => {
    const key = `${item.recommendation_type}:${item.entity_type}:${item.entity_id}`;
    if (!recommendations.some((candidate) => `${candidate.recommendation_type}:${candidate.entity_type}:${candidate.entity_id}` === key)) recommendations.push(item);
  };

  for (const template of templatesResult.data ?? []) {
    if (!template.is_active) continue;
    const issues = templateIssues(template);
    if (!issues.length) continue;
    push({
      org_id: orgId,
      entity_type: 'packaging_template',
      entity_id: template.id,
      recommendation_type: 'packaging_pricing_template_unhealthy',
      title: `Complete ${template.name || 'Packaging pricing template'}`,
      summary: 'An active Packaging pricing template is missing configuration used by Quote Builder.',
      reason: `Missing or incomplete: ${issues.join(', ')}.`,
      recommended_action: 'Open the template, complete the missing rules, validate the calculation, and keep activation under Admin approval.',
      action_href: `/admin/packaging-templates/${template.id}`,
      priority: issues.includes('material rates') || issues.includes('dimension ranges') ? 'high' : 'medium',
      metadata: { issues, source: 'packaging_template_health' },
    });
  }

  for (const quote of quotes) {
    const lead: any = leads.get(quote.lead_id);
    const customer = lead?.company_name || lead?.contact_name || 'customer';
    const quoteLabel = quote.quote_number || 'Packaging quote';
    const quoteLines = lines.filter((line: any) => line.quote_id === quote.id && packagingLine(line, products.get(line.product_id)));
    if (!quoteLines.length) continue;

    if (quote.status === 'accepted' && !ordersByQuote.has(quote.id)) {
      push({ org_id: orgId, entity_type: 'quote', entity_id: quote.id, recommendation_type: 'packaging_order_handoff_missing', title: `Create the order for ${quoteLabel}`, summary: `${quoteLabel} for ${customer} is accepted but has no canonical order.`, reason: 'Accepted Packaging work cannot be managed through execution, design, production, and dispatch without the matching order.', recommended_action: 'Open the accepted quote and complete the governed order handoff.', action_href: `/quotes?quote=${quote.id}`, priority: 'urgent', metadata: { quote_id: quote.id, lead_id: quote.lead_id } });
    }

    for (const line of quoteLines) {
      const product: any = products.get(line.product_id);
      const input = record(line.input_snapshot_json);
      const lineName = product?.name || `Packaging line ${text(line.id).slice(0, 8)}`;
      const missing: string[] = [];
      if (!Number(line.quantity ?? input.quantity ?? 0)) missing.push('quantity');
      if (!line.packaging_family_id && !product?.product_family_code) missing.push('Packaging family');
      const serviceLine = ['prepress_artwork', 'packshots_3d', 'prototypes_mockups', 'variable_data_printing'].includes(lower(product?.product_family_code));
      if (!serviceLine) {
        if (!Number(input.width_mm ?? input.width ?? 0)) missing.push('width');
        if (!Number(input.height_mm ?? input.height ?? 0)) missing.push('height');
        if (!text(input.material_key ?? input.material ?? input.structure)) missing.push('material structure');
      }
      if (!text(input.artwork_status)) missing.push('artwork status');
      if (missing.length && ['draft', 'pending_approval', 'approved'].includes(quote.status)) {
        push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_specification_incomplete', title: `Complete specifications for ${lineName}`, summary: `${quoteLabel} for ${customer} is missing Packaging quote inputs.`, reason: `Missing: ${missing.join(', ')}.`, recommended_action: 'Open Quote Builder and complete the missing Packaging specifications before approval or send.', action_href: `/quotes?quote=${quote.id}`, priority: quote.status === 'approved' ? 'high' : 'medium', metadata: { quote_id: quote.id, line_id: line.id, missing } });
      }

      const latestProof = latestBy(proofsByLine.get(line.id) ?? []);
      const latestStage = latestBy(stagesByLine.get(line.id) ?? []);
      const ready = isDesignReady(latestProof);
      if (quote.status === 'accepted') {
        if (!latestProof) {
          push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_artwork_required', title: `Artwork required for ${lineName}`, summary: `${quoteLabel} for ${customer} is accepted but no final customer artwork or Design Team proof is recorded.`, reason: 'Every accepted Packaging production line needs customer-provided artwork or an approved Design Team proof before Printing.', recommended_action: 'Open Design Queue and upload customer artwork or a Design Team proof.', action_href: `/design-queue?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id } });
        } else if (latestProof.status === 'rejected') {
          push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_rejected', title: `Revise the rejected proof for ${lineName}`, summary: `${quoteLabel} for ${customer} needs a new proof version.`, reason: 'The latest Packaging proof was rejected and cannot release the job to Printing.', recommended_action: 'Open Design Queue, review the customer comment, and upload a new Design Team proof version.', action_href: `/design-queue?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id, proof_id: latestProof.id } });
        } else if (latestProof.design_source === 'design_team' && latestProof.status !== 'approved') {
          const wait = ageDays(latestProof.uploaded_at || latestProof.created_at);
          push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_waiting_customer', title: `Follow up on proof approval for ${lineName}`, summary: `${quoteLabel} for ${customer} has a Design Team proof waiting for customer approval.`, reason: `The latest proof has been pending for ${wait} day(s).`, recommended_action: 'Open Design Queue, verify the current approval link, and prepare a customer follow-up. Do not claim delivery without provider confirmation.', action_href: `/design-queue?line=${line.id}`, priority: wait >= 3 ? 'high' : 'medium', metadata: { quote_id: quote.id, line_id: line.id, proof_id: latestProof.id, waiting_days: wait } });
        } else if (ready && !latestStage) {
          push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_proof_approved_ready_for_production', title: `Start pre-press for ${lineName}`, summary: `${quoteLabel} for ${customer} has final design evidence and no production stage recorded.`, reason: 'The accepted job is design-ready and can enter the governed production workflow.', recommended_action: 'Open Dispatch Board and start Pre-Press after operator review.', action_href: `/dispatch-board?line=${line.id}`, priority: 'high', metadata: { quote_id: quote.id, line_id: line.id, proof_id: latestProof?.id } });
        }

        if (latestStage) {
          const stageAge = ageDays(latestStage.entered_at || latestStage.created_at);
          if (latestStage.stage !== 'pre_press' && !ready) {
            push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: 'packaging_printing_blocked_by_design', title: `Restore the design gate for ${lineName}`, summary: `${quoteLabel} for ${customer} has production activity beyond Pre-Press without final design readiness.`, reason: `Current stage is ${latestStage.stage}, but the latest artwork/proof is not final.`, recommended_action: 'Open Design Queue and Dispatch Board, resolve final design evidence, and review the production history.', action_href: `/dispatch-board?line=${line.id}`, priority: 'urgent', metadata: { quote_id: quote.id, line_id: line.id, stage: latestStage.stage } });
          } else if (stageAge >= 3 && !['dispatched'].includes(latestStage.stage)) {
            push({ org_id: orgId, entity_type: 'packaging_line', entity_id: line.id, recommendation_type: latestStage.stage === 'pre_press' ? 'packaging_prepress_stalled' : 'packaging_production_stage_overdue', title: `Review stalled ${latestStage.stage} work for ${lineName}`, summary: `${quoteLabel} for ${customer} has remained in ${latestStage.stage} for ${stageAge} day(s).`, reason: 'The Packaging production job has not recorded the next stage within the review threshold.', recommended_action: 'Open Dispatch Board, verify evidence and blockers, and let an operator record the next approved stage.', action_href: `/dispatch-board?line=${line.id}`, priority: stageAge >= 7 ? 'urgent' : 'high', metadata: { quote_id: quote.id, line_id: line.id, stage: latestStage.stage, stage_age_days: stageAge } });
          }
        }
      }
    }
  }

  return recommendations;
}
