import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getProductsData } from '@/lib/queries/products';
import { hasSupabaseEnv } from '@/lib/env';
import { getBestSetuGuruHelpTopic, getRouteHelpSummary } from '@/lib/setu-guru/help-registry';
import { classifySetuGuruResponse } from '@/lib/setu-guru/guru-response-policy';

type SetuGuruOrgSearchMode =
  | 'catalog_search'
  | 'buyer_search'
  | 'supplier_search'
  | 'lead_search'
  | 'quote_compliance'
  | 'pricing_defaults'
  | 'hsn_enrichment'
  | 'document_requirements'
  | 'margin_benchmark'
  | 'page_help';

const MODE_ALIASES: Record<string, SetuGuruOrgSearchMode> = {
  catalog: 'catalog_search',
  products: 'catalog_search',
  product: 'catalog_search',
  categories: 'catalog_search',
  category: 'catalog_search',
  catalog_search: 'catalog_search',
  buyers: 'buyer_search',
  buyer: 'buyer_search',
  buyer_search: 'buyer_search',
  suppliers: 'supplier_search',
  supplier: 'supplier_search',
  supplier_search: 'supplier_search',
  leads: 'lead_search',
  lead: 'lead_search',
  lead_search: 'lead_search',
  quote_compliance: 'quote_compliance',
  compliance: 'quote_compliance',
  quote: 'quote_compliance',
  pricing_defaults: 'pricing_defaults',
  pricing: 'pricing_defaults',
  hsn: 'hsn_enrichment',
  hs_code: 'hsn_enrichment',
  hs_code_enrichment: 'hsn_enrichment',
  hsn_enrichment: 'hsn_enrichment',
  document_requirements: 'document_requirements',
  document_requirement: 'document_requirements',
  documents: 'document_requirements',
  required_documents: 'document_requirements',
  margin_benchmark: 'margin_benchmark',
  margin: 'margin_benchmark',
  duties: 'document_requirements',
  duty: 'document_requirements',
  tariffs: 'document_requirements',
  tariff: 'document_requirements',
  page_help: 'page_help',
  help: 'page_help',
};

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function modeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function isHsnGapQuestion(question: string) {
  const q = question.toLowerCase();
  return (q.includes('missing') || q.includes('count') || q.includes('how many') || q.includes('in my catalog') || q.includes('listed')) && (q.includes('hsn') || q.includes('hs code') || q.includes('hs-code'));
}

function isResearchRoutingMode(mode: SetuGuruOrgSearchMode, question: string) {
  if (mode === 'document_requirements' || mode === 'margin_benchmark') return true;
  if (mode === 'hsn_enrichment') return !isHsnGapQuestion(question);
  return false;
}

function questionMode(question: string): SetuGuruOrgSearchMode {
  const q = question.toLowerCase();
  if (['how do i use this page', 'what can you do', 'what should i do', 'page help', 'help me here'].some((word) => q.includes(word))) return 'page_help';
  if (q.includes('hsn') || q.includes('hs code') || q.includes('hs-code')) return 'hsn_enrichment';
  if (['tariff', 'duty', 'duties', 'customs', 'required document', 'document requirement', 'destination requirement', 'country requirement'].some((word) => q.includes(word))) return 'document_requirements';
  if (['margin benchmark', 'market margin', 'industry margin', 'benchmark margin'].some((word) => q.includes(word))) return 'margin_benchmark';
  if (['compliance', 'blocker', 'document', 'certificate', 'dispatch', 'coa', 'packing list', 'waive', 'ignore', 'fix this'].some((word) => q.includes(word))) return 'quote_compliance';
  if (q.includes('buyer')) return 'buyer_search';
  if (q.includes('supplier')) return 'supplier_search';
  if (q.includes('lead') || q.includes('contact') || q.includes('company')) return 'lead_search';
  return 'catalog_search';
}

export function normalizeSetuGuruOrgSearchMode(rawMode: string, question = ''): SetuGuruOrgSearchMode {
  const key = modeKey(rawMode);
  if (key && MODE_ALIASES[key]) return MODE_ALIASES[key];
  return questionMode(question);
}

function isPureCountQuestion(question: string) {
  const q = question.toLowerCase();
  return /how many|count|total/.test(q) && !/named|called|find|search|filter|missing/.test(q);
}

function extractSearchTerm(question: string, mode: string) {
  if (isPureCountQuestion(question)) return '';
  const filler = ['how many', 'count', 'total', 'show me', 'find', 'search', 'filter', 'buyer', 'buyers', 'supplier', 'suppliers', 'lead', 'leads', 'product', 'products', 'catalog', 'category', 'categories', 'named', 'called', 'by name', 'in my', 'my', 'are in', 'there are', 'missing', 'hsn', 'hs code', 'hs-code', mode.replaceAll('_', ' ')];
  let cleaned = question.toLowerCase();
  for (const word of filler) cleaned = cleaned.replaceAll(word, ' ');
  cleaned = cleaned.replace(/[^a-z0-9\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length >= 2 ? cleaned : '';
}

function includesTerm(row: Record<string, unknown>, term: string) {
  if (!term) return true;
  const haystack = Object.values(row).map((value) => String(value ?? '').toLowerCase()).join(' ');
  return haystack.includes(term.toLowerCase());
}

function parseLeadIdFromRoute(route: string) {
  const match = route.match(/\/leads\/([^/?#]+)\/quote/);
  return match?.[1] ?? null;
}

function isOpenStatus(status: unknown) {
  return !['approved', 'waived', 'complete', 'completed', 'ready'].includes(String(status ?? '').toLowerCase());
}

function buildPageHelpAnswer(question: string, route: string) {
  const routeHelp = getRouteHelpSummary(route || '/dashboard');
  const topic = getBestSetuGuruHelpTopic(question || routeHelp.summary, route || '/dashboard');
  const policy = classifySetuGuruResponse(question || topic.title, route);
  const rows = [
    ...topic.commonBlockers.slice(0, 4).map((name, index) => ({ id: `blocker-${index}`, name, type: 'common blocker', next: 'Ask Setu Guru to check live context when this appears on the page' })),
    ...topic.dataSources.slice(0, 4).map((name, index) => ({ id: `source-${index}`, name, type: 'data source', next: 'Use this source before generic guidance' })),
  ];
  const policyText = policy.reminders.length ? `Policy reminder: ${policy.reminders.join(' ')}` : 'Policy reminder: answer from page context and route help before generic guidance.';
  const approvalText = topic.approvalRules.length ? `Human approval boundary: ${topic.approvalRules.join(' ')}` : 'Human approval is required for sends, waivers, write-backs, deletes, pricing decisions, and compliance decisions.';
  const answer = [
    `I checked the Setu Guru help registry for ${routeHelp.routeTitle}.`,
    topic.summary,
    ...topic.answer,
    `Common blockers to inspect: ${topic.commonBlockers.slice(0, 4).join(', ') || 'none listed'}.`,
    `Data sources to check before acting: ${topic.dataSources.slice(0, 5).join(', ') || 'page context and organization data'}.`,
    approvalText,
    policyText,
  ].join('\n\n');
  return { answer, rows, actions: topic.actions, actionHref: topic.actions[0] ? null : undefined, routeHelp, mode: 'page_help' };
}

function buildResearchRoutingAnswer(question: string, route: string, mode: SetuGuruOrgSearchMode) {
  const routeHelp = getRouteHelpSummary(route || '/dashboard');
  const topic = getBestSetuGuruHelpTopic(question || routeHelp.summary, route || '/dashboard');
  const label = mode === 'hsn_enrichment' ? 'HS/HSN enrichment' : mode === 'document_requirements' ? 'document and destination requirements' : 'margin benchmark research';
  const rows = [
    { id: 'research-scope', name: label, type: 'research scope', next: 'Use live, source-backed research before writing CRM values' },
    { id: 'sources-required', name: 'Official or reviewable sources required', type: 'source rule', next: 'Cite customs, tariff, regulator, marketplace, or broker sources when available' },
    { id: 'human-review', name: 'Human review before write-back', type: 'approval boundary', next: 'Do not save HSN, duty, margin, or document rules without approval' },
  ];
  const answer = [
    `I identified this as ${label}.`,
    topic.summary,
    mode === 'hsn_enrichment'
      ? 'Next safe research path: identify product material/use, destination country, HS chapter candidates, official tariff notes, and any local HSN mapping. Treat the result as draft until reviewed.'
      : mode === 'document_requirements'
        ? 'Next safe research path: identify product, destination country, buyer/supplier role, quote/order/dispatch stage, mandatory documents, advisory documents, and validity or inspection rules.'
        : 'Next safe research path: identify product category, buyer market, channel role, landed cost assumptions, distributor/retailer benchmarks, and whether the number should be quote-only or a saved default.',
    'Setu Guru should use live source-backed research for this request and cite reviewable sources before any write-back.',
    'Human approval is required before saving HSN/HS code, duties, tariff assumptions, margin defaults, compliance rules, or document requirements.',
  ].join('\n\n');
  return { answer, confidence: 'medium', mode, rows, actions: ['Ask live research', 'Review sources', ...topic.actions.slice(0, 2)] };
}

async function resolveActiveLead(db: any, organizationId: string, route: string, pageText: string) {
  const leadId = parseLeadIdFromRoute(route);
  if (leadId) {
    const { data } = await db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', organizationId).eq('id', leadId).maybeSingle();
    if (data?.id) return data;
  }

  const visibleText = pageText.toLowerCase();
  const { data: candidates } = await db
    .from('leads')
    .select('id, company_name, contact_name, lead_type, country, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(50);

  const exactVisible = (candidates ?? []).find((lead: any) => {
    const company = String(lead.company_name ?? '').toLowerCase();
    const contact = String(lead.contact_name ?? '').toLowerCase();
    return (company.length > 3 && visibleText.includes(company)) || (contact.length > 3 && visibleText.includes(contact));
  });
  if (exactVisible?.id) return exactVisible;

  const { data: quoteLeadRows } = await db
    .from('quotes')
    .select('lead_id, updated_at, leads(id, company_name, contact_name, lead_type, country)')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(10);
  const quoteVisible = (quoteLeadRows ?? []).map((row: any) => row.leads).find((lead: any) => {
    const company = String(lead?.company_name ?? '').toLowerCase();
    return company.length > 3 && visibleText.includes(company);
  });
  if (quoteVisible?.id) return quoteVisible;
  return quoteLeadRows?.[0]?.leads ?? candidates?.[0] ?? null;
}

function buildQuoteComplianceAnswer(input: {
  organizationName: string;
  lead: any;
  quote: any;
  complianceRows: any[];
  documentRows: any[];
  requirementRows: any[];
  productRows: any[];
  countryName: string;
}) {
  const mandatoryRules = input.requirementRows.filter((rule) => rule.is_mandatory === true);
  const advisoryRules = input.requirementRows.filter((rule) => rule.is_mandatory !== true);
  const openCompliance = input.complianceRows.filter((row) => isOpenStatus(row.status) && row.compliance_checklist_items?.is_mandatory !== false);
  const openDocuments = mandatoryRules.filter((rule) => !input.documentRows.some((doc) => doc.requirement_code === rule.requirement_code && !isOpenStatus(doc.status)));
  const products = input.productRows.map((product) => product.name).filter(Boolean).slice(0, 4).join(', ') || 'linked products';
  const blockers: string[] = [];
  openCompliance.forEach((row) => blockers.push(row.compliance_checklist_items?.description || row.compliance_checklist_items?.code || 'Open compliance item'));
  openDocuments.forEach((rule) => blockers.push(rule.title || rule.requirement_code));
  const blockerText = blockers.length ? blockers.slice(0, 4).join('; ') : 'No mandatory compliance blocker is open for this quote.';
  const advisoryText = advisoryRules.length ? `Advisory before dispatch: ${advisoryRules.map((rule) => rule.title || rule.requirement_code).slice(0, 4).join(', ')}.` : 'No advisory document rule is configured right now.';
  const answer = [
    `I checked this live quote for ${input.lead?.company_name ?? input.organizationName}.`,
    `Destination/context: ${input.countryName || input.lead?.country || 'not set'} · Products: ${products}.`,
    blockers.length ? `True blocker: ${blockerText}.` : blockerText,
    blockers.length ? 'How to fix it: open the lead evidence/compliance area, upload the required document or evidence, submit it for review, then return to quote review. If this is not required at quote stage, an owner/admin should mark it advisory or waive it with a reason.' : 'The quote can move forward from a quote-compliance perspective. Keep product/country documents advisory until dispatch when org policy allows quoting before dispatch readiness.',
    advisoryText,
    'Setu Guru can suggest likely product/country evidence, but it must not approve, waive, or clear compliance automatically. Human approval is required for prices, compliance, sends, and write-backs.',
  ].join('\n\n');
  return { answer, blockers };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = asText(body.question);
    const route = asText(body.route);
    const pageText = asText(body.pageText);
    if (!question) return NextResponse.json({ answer: 'Ask a catalog, product, buyer, supplier, lead, quote blocker, route help, or live research question.', confidence: 'low', rows: [] }, { status: 400 });

    const mode = normalizeSetuGuruOrgSearchMode(asText(body.mode), question);
    if (mode === 'page_help') {
      const help = buildPageHelpAnswer(question, route);
      return NextResponse.json({ ...help, confidence: 'high' });
    }

    if (isResearchRoutingMode(mode, question)) {
      return NextResponse.json(buildResearchRoutingAnswer(question, route, mode));
    }

    if (!hasSupabaseEnv) {
      return NextResponse.json({ answer: 'Setu Guru cannot read live organization data because Supabase environment variables are missing. Ask “what can you do on this page?” for route help, or ask for live research guidance for HS/HSN, document requirements, duties, or margins.', confidence: 'low', rows: [], actions: ['Show page help', 'Ask live research'] }, { status: 500 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in to Setu Flow before asking Setu Guru to search organization data.', confidence: 'low', rows: [] }, { status: 401 });

    const organizationId = workspace.organization.id;
    const organizationName = workspace.organization.name ?? 'this organization';
    const term = asText(body.term) || extractSearchTerm(question, mode);
    const db = (await createClient()) as any;

    if (mode === 'quote_compliance') {
      const lead = await resolveActiveLead(db, organizationId, route, pageText);
      if (!lead?.id) return NextResponse.json({ answer: 'I can help with quote compliance, but I could not identify a lead from the route or visible page. Open the quote or lead workspace and ask again.', confidence: 'medium', rows: [], actions: ['Open Leads', 'Open compliance'], actionHref: '/leads' });

      const [{ data: quotes }, { data: leadProducts }, { data: documents }, { data: complianceRows }, { data: rules }, { data: country }] = await Promise.all([
        db.from('quotes').select('id, quote_number, status, country_id, market_id, currency, display_currency').eq('organization_id', organizationId).eq('lead_id', lead.id).order('updated_at', { ascending: false }).limit(1),
        db.from('lead_product_interests').select('product_id, products(id, name, hsn_code, category_id)').eq('organization_id', organizationId).eq('lead_id', lead.id),
        db.from('documents').select('id, requirement_code, file_name, status, expires_at, related_entity, related_id').eq('organization_id', organizationId).eq('related_entity', 'lead').eq('related_id', lead.id),
        db.from('lead_compliance_items').select('id, status, severity, due_at, compliance_checklist_items(code, description, is_mandatory)').eq('organization_id', organizationId).eq('lead_id', lead.id),
        db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true).in('progression_scope', ['general', 'quote_send']),
        lead.country ? db.from('countries').select('id, name, market_id').eq('organization_id', organizationId).ilike('name', lead.country).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const quote = (quotes ?? [])[0] ?? null;
      const productRows = (leadProducts ?? []).map((row: any) => row.products).filter(Boolean);
      const productIdSet = new Set(productRows.map((product: any) => product.id));
      const marketId = quote?.market_id ?? country?.market_id ?? null;
      const applicableRules = (rules ?? []).filter((rule: any) => {
        if (rule.lead_type && rule.lead_type !== lead.lead_type) return false;
        if (rule.market_id && rule.market_id !== marketId) return false;
        if (rule.product_id && !productIdSet.has(rule.product_id)) return false;
        return true;
      });
      const built = buildQuoteComplianceAnswer({ organizationName, lead, quote, complianceRows: complianceRows ?? [], documentRows: documents ?? [], requirementRows: applicableRules, productRows, countryName: country?.name ?? lead.country ?? '' });
      const rows = [
        ...built.blockers.map((item, index) => ({ id: `blocker-${index}`, name: item, type: 'mandatory blocker', next: 'Upload evidence, submit review, or owner/admin waive with reason' })),
        ...applicableRules.filter((rule: any) => rule.is_mandatory !== true).slice(0, 4).map((rule: any) => ({ id: rule.id, name: rule.title || rule.requirement_code, type: 'advisory before dispatch', next: 'Prepare before order dispatch' })),
      ];
      return NextResponse.json({ answer: built.answer, confidence: 'high', mode, rows, actions: ['Open lead documents', 'Open compliance', 'Ask AI evidence checklist'], actionHref: `/leads/${lead.id}` });
    }

    if (mode === 'catalog_search' || mode === 'hsn_enrichment') {
      const workspaceData = await getProductsData(organizationId);
      const products = workspaceData?.products ?? [];
      const categories = workspaceData?.categories ?? [];
      const categoryNameById = new Map(categories.map((category: any) => [category.id, category.name]));
      const visibleProducts = products.filter((product: any) => product.is_active !== false);
      const missingHsnProducts = visibleProducts.filter((product: any) => !asText(product.hsn_code));
      const sourceProducts = mode === 'hsn_enrichment' ? missingHsnProducts : visibleProducts;
      const matchedProducts = term ? sourceProducts.filter((product: any) => includesTerm({ name: product.name, sku: product.sku, sku_code: product.sku_code, hsn_code: product.hsn_code, category: categoryNameById.get(product.category_id) }, term)) : sourceProducts;
      const rows = matchedProducts.slice(0, 8).map((product: any) => ({ id: product.id, name: product.name, sku: product.sku ?? product.sku_code ?? null, hsnCode: product.hsn_code ?? null, category: categoryNameById.get(product.category_id) ?? null }));
      const answer = mode === 'hsn_enrichment' ? `I found ${missingHsnProducts.length} catalog product(s) missing HSN/HS codes in ${organizationName}. I listed ${rows.length} row(s) for review. For actual HS/HSN assignment, use live source-backed research and human review before write-back.` : term ? `I found ${matchedProducts.length} matching catalog product(s) for "${term}" in ${organizationName}. There are ${visibleProducts.length} catalog product(s) total.` : `You have ${visibleProducts.length} catalog product(s) in ${organizationName}. I did not apply any search filter.`;
      return NextResponse.json({ answer, confidence: 'high', mode, term, rows, metrics: { catalogProducts: visibleProducts.length, categories: categories.length, missingHsnCount: missingHsnProducts.length }, nextAction: mode === 'hsn_enrichment' ? 'Open Products filtered to missing HSN codes.' : 'Open Products to review the catalog.', actionHref: mode === 'hsn_enrichment' ? '/products?guru=missing-hsn' : '/products' });
    }

    if (mode === 'buyer_search' || mode === 'supplier_search' || mode === 'lead_search') {
      let countQuery = db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
      if (mode === 'buyer_search') countQuery = countQuery.eq('lead_type', 'buyer');
      if (mode === 'supplier_search') countQuery = countQuery.eq('lead_type', 'supplier');
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      let query = db.from('leads').select('id, company_name, contact_name, email, phone, lead_type, country, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(8);
      if (mode === 'buyer_search') query = query.eq('lead_type', 'buyer');
      if (mode === 'supplier_search') query = query.eq('lead_type', 'supplier');
      if (term) query = query.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%,country.ilike.%${term}%`);
      const { data: leads, error } = await query;
      if (error) throw error;
      const rows = (leads ?? []).map((lead: any) => ({ id: lead.id, company: lead.company_name, contact: lead.contact_name, email: lead.email, phone: lead.phone, type: lead.lead_type, country: lead.country }));
      const label = mode === 'buyer_search' ? 'buyer' : mode === 'supplier_search' ? 'supplier' : 'lead';
      return NextResponse.json({ answer: term ? `I found ${rows.length} matching ${label} record(s) for "${term}" in ${organizationName}. There are ${count ?? 0} ${label} record(s) total.` : `${organizationName} has ${count ?? 0} ${label} record(s). I listed the latest ${rows.length}.`, confidence: 'high', mode, term, rows, metrics: { count: count ?? 0 }, nextAction: mode === 'buyer_search' ? 'Open Leads in Buyers mode.' : mode === 'supplier_search' ? 'Open Leads in Suppliers mode.' : 'Open Leads to filter or edit records.', actionHref: mode === 'buyer_search' ? '/leads?mode=buyers' : mode === 'supplier_search' ? '/leads?mode=suppliers' : '/leads' });
    }

    return NextResponse.json({ answer: 'I can search live products, HSN gaps, buyers, suppliers, leads, quote compliance blockers, route help, and research-intent routing for HS/HSN, document requirements, duties, tariffs, and margins. Try “what can you do on this page?” for page-specific help.', confidence: 'medium', rows: [], actions: ['Show page help', 'Ask live research'] });
  } catch (error) {
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru organization search failed.', confidence: 'low', rows: [] }, { status: 500 });
  }
}
