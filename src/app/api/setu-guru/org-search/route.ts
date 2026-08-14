import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getProductsData } from '@/lib/queries/products';
import { hasSupabaseEnv } from '@/lib/env';
import { getBestSetuGuruHelpTopic, getRouteHelpSummary } from '@/lib/setu-guru/help-registry';
import { classifySetuGuruResponse } from '@/lib/setu-guru/guru-response-policy';
import { buildLiveResearchExecutionAnswer, type SetuGuruHsnCatalogReview, type SetuGuruLiveResearchMode, type SetuGuruResearchEntityContext } from '@/lib/setu-guru/live-research';
import { buildConversationalWorkflowStatusAnswer } from '@/lib/setu-guru/workflow-status-answer';
import { buildTrialCoachAnswer, isTrialJourneyQuestion, resolveTrialCoachContext } from '@/lib/setu-guru/trial-coach';
import { writeTelemetry } from '@/lib/setu-guru/telemetry';

type SetuGuruOrgSearchMode = 'catalog_search' | 'buyer_search' | 'supplier_search' | 'lead_search' | 'quote_compliance' | 'workflow_status' | 'pricing_defaults' | 'hsn_enrichment' | 'document_requirements' | 'margin_benchmark' | 'page_help';
type TableRow = Record<string, unknown>;
type QueryResult = { data: TableRow | TableRow[] | null; count?: number | null; error?: Error | null };
type QueryBuilder = PromiseLike<QueryResult> & { select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => QueryBuilder; eq: (column: string, value: unknown) => QueryBuilder; in: (column: string, values: unknown[]) => QueryBuilder; ilike: (column: string, pattern: string) => QueryBuilder; or: (filters: string) => QueryBuilder; order: (column: string, options?: { ascending?: boolean }) => QueryBuilder; limit: (count: number) => QueryBuilder; maybeSingle: () => Promise<{ data: TableRow | null; error?: Error | null }>; };
type SupabaseReader = { from: (table: string) => QueryBuilder };

const MODE_ALIASES: Record<string, SetuGuruOrgSearchMode> = {
  catalog: 'catalog_search', products: 'catalog_search', product: 'catalog_search', categories: 'catalog_search', category: 'catalog_search', catalog_search: 'catalog_search',
  buyers: 'buyer_search', buyer: 'buyer_search', buyer_search: 'buyer_search', suppliers: 'supplier_search', supplier: 'supplier_search', supplier_search: 'supplier_search',
  leads: 'lead_search', lead: 'lead_search', lead_search: 'lead_search', quote_compliance: 'quote_compliance', compliance: 'quote_compliance', quote: 'quote_compliance',
  workflow: 'workflow_status', workflow_status: 'workflow_status', order: 'workflow_status', orders: 'workflow_status', dispatch: 'workflow_status', freight: 'workflow_status', finance: 'workflow_status', payment: 'workflow_status', payments: 'workflow_status',
  pricing_defaults: 'pricing_defaults', pricing: 'pricing_defaults', hsn: 'hsn_enrichment', hs_code: 'hsn_enrichment', hs_code_enrichment: 'hsn_enrichment', hsn_enrichment: 'hsn_enrichment',
  document_requirements: 'document_requirements', document_requirement: 'document_requirements', documents: 'document_requirements', required_documents: 'document_requirements',
  margin_benchmark: 'margin_benchmark', margin: 'margin_benchmark', duties: 'document_requirements', duty: 'document_requirements', tariffs: 'document_requirements', tariff: 'document_requirements', page_help: 'page_help', help: 'page_help',
};

function asText(value: unknown) { return String(value ?? '').trim(); }
function isRecord(value: unknown): value is TableRow { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function rowList(value: unknown): TableRow[] { return Array.isArray(value) ? value.filter(isRecord) : []; }
function firstRow(value: unknown): TableRow | null { if (Array.isArray(value)) return rowList(value)[0] ?? null; return isRecord(value) ? value : null; }
function nestedRow(value: unknown): TableRow | null { return isRecord(value) ? value : null; }
function compactList(values: unknown[]) { return values.map((value) => asText(value)).filter(Boolean); }
function normalizeText(value: unknown) { return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function normalizeHsn(value: unknown) { return asText(value).replace(/[^0-9]/g, ''); }
function formatHsn(value: string) { const clean = normalizeHsn(value); return clean.length === 8 ? `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}` : asText(value); }
function modeKey(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

function isHsnGapQuestion(question: string) { const q = question.toLowerCase(); return (q.includes('missing') || q.includes('count') || q.includes('how many') || q.includes('in my catalog') || q.includes('listed')) && (q.includes('hsn') || q.includes('hs code') || q.includes('hs-code')); }
function isResearchRoutingMode(mode: SetuGuruOrgSearchMode, question: string) { if (mode === 'document_requirements' || mode === 'margin_benchmark') return true; if (mode === 'hsn_enrichment') return !isHsnGapQuestion(question); return false; }
function asLiveResearchMode(mode: SetuGuruOrgSearchMode): SetuGuruLiveResearchMode { if (mode === 'margin_benchmark') return 'margin_benchmark'; if (mode === 'document_requirements') return 'document_requirements'; return 'hsn_enrichment'; }

function questionMode(question: string): SetuGuruOrgSearchMode {
  const q = question.toLowerCase();
  if (['how do i use this page', 'what can you do', 'what should i do', 'page help', 'help me here'].some((word) => q.includes(word))) return 'page_help';
  if (q.includes('hsn') || q.includes('hs code') || q.includes('hs-code')) return 'hsn_enrichment';
  if (['tariff', 'duty', 'duties', 'customs', 'required document', 'document requirement', 'destination requirement', 'country requirement'].some((word) => q.includes(word))) return 'document_requirements';
  if (['margin benchmark', 'market margin', 'industry margin', 'benchmark margin'].some((word) => q.includes(word))) return 'margin_benchmark';
  if (/sf-o-\d{6}-\d{3}/.test(q)) return 'workflow_status';
  if (['order', 'orders', 'payment', 'payments', 'finance', 'freight', 'shipment', 'dispatch', 'packing', 'accepted quote', 'handoff', 'lifecycle'].some((word) => q.includes(word))) return 'workflow_status';
  if (['compliance', 'blocker', 'document', 'certificate', 'coa', 'packing list', 'waive', 'ignore', 'fix this'].some((word) => q.includes(word))) return 'quote_compliance';
  if (q.includes('buyer')) return 'buyer_search';
  if (q.includes('supplier')) return 'supplier_search';
  if (q.includes('lead') || q.includes('contact') || q.includes('company')) return 'lead_search';
  return 'catalog_search';
}
function normalizeSetuGuruOrgSearchMode(rawMode: string, question = ''): SetuGuruOrgSearchMode { const key = modeKey(rawMode); if (key && MODE_ALIASES[key]) return MODE_ALIASES[key]; return questionMode(question); }
function isPureCountQuestion(question: string) { const q = question.toLowerCase(); return /how many|count|total/.test(q) && !/named|called|find|search|filter|missing/.test(q); }
function extractSearchTerm(question: string, mode: string) { if (isPureCountQuestion(question)) return ''; const filler = ['how many', 'count', 'total', 'show me', 'find', 'search', 'filter', 'buyer', 'buyers', 'supplier', 'suppliers', 'lead', 'leads', 'product', 'products', 'catalog', 'category', 'categories', 'named', 'called', 'by name', 'in my', 'my', 'are in', 'there are', 'missing', 'hsn', 'hs code', 'hs-code', mode.replaceAll('_', ' ')]; let cleaned = question.toLowerCase(); for (const word of filler) cleaned = cleaned.replaceAll(word, ' '); cleaned = cleaned.replace(/[^a-z0-9\s-]/gi, ' ').replace(/\s+/g, ' ').trim(); return cleaned.length >= 2 ? cleaned : ''; }

// --- STRICT WORD-LEVEL FUZZY SEARCH (NO OVERFETCHING) ---
function fuzzyMatchString(source: string, target: string): boolean {
  if (!source || !target) return false;
  const s = source.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const t = target.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  
  if (s.includes(t) || t.includes(s)) return true;

  const targetWords = t.split(/\s+/).filter(w => w.length > 2);
  const sourceWords = s.split(/\s+/).filter(w => w.length > 2);

  if (targetWords.length === 0) return false;

  let matchedWordsCount = 0;
  for (const tWord of targetWords) {
    let wordMatched = false;
    for (const sWord of sourceWords) {
      if (sWord.includes(tWord) || tWord.includes(sWord)) {
        wordMatched = true;
        break;
      }
      let matchCount = 0;
      let sIdx = 0;
      for (let tIdx = 0; tIdx < tWord.length && sIdx < sWord.length; tIdx++) {
        if (tWord[tIdx] === sWord[sIdx]) {
          matchCount++;
          sIdx++;
        } else if (sIdx + 1 < sWord.length && tWord[tIdx] === sWord[sIdx + 1]) {
          matchCount++;
          sIdx += 2;
        }
      }
      // Word match threshold: 75%
      if (matchCount / Math.max(sWord.length, tWord.length) > 0.75) {
        wordMatched = true;
        break;
      }
    }
    if (wordMatched) matchedWordsCount++;
  }
  
  // STRICT RULE: User input ke zyada tar words (>= 70%) match hone chahiye, sirf ek lamba keyword nahi.
  return (matchedWordsCount / targetWords.length) >= 0.7; 
}

function includesTerm(row: Record<string, unknown>, term: string) { 
  if (!term) return true; 
  const haystack = Object.values(row).map((value) => String(value ?? '').toLowerCase()).join(' '); 
  if (haystack.includes(term.toLowerCase())) return true;
  const rowName = String(row.name ?? row.company_name ?? row.contact_name ?? '').toLowerCase();
  return fuzzyMatchString(rowName, term);
}
// ----------------------------------------

function parseRouteId(route: string, pattern: RegExp) { return route.match(pattern)?.[1] ?? null; }
function parseLeadIdFromRoute(route: string) { return parseRouteId(route, /\/leads\/([^/?#]+)/); }
function parseProductIdFromRoute(route: string) { return parseRouteId(route, /\/products\/([^/?#]+)/); }
function parseQuoteIdFromRoute(route: string) { return parseRouteId(route, /\/quotes\/([^/?#]+)/); }
function parseOrderIdFromRoute(route: string) { return parseRouteId(route, /\/orders\/([^/?#]+)/); }
function isOpenStatus(status: unknown) { return !['approved', 'waived', 'complete', 'completed', 'ready'].includes(String(status ?? '').toLowerCase()); }
function isBlockedStatus(status: unknown) { return ['blocked', 'rejected', 'failed', 'missing', 'pending', 'open', 'draft'].includes(String(status ?? '').toLowerCase()); }

function buildPageHelpAnswer(question: string, route: string) {
  const routeHelp = getRouteHelpSummary(route || '/dashboard');
  const topic = getBestSetuGuruHelpTopic(question || routeHelp.summary, route || '/dashboard');
  const policy = classifySetuGuruResponse(question || topic.title, route);
  const rows = [...topic.commonBlockers.slice(0, 4).map((name, index) => ({ id: `blocker-${index}`, name, type: 'common blocker', next: 'Ask Setu Guru to check live context when this appears on the page' })), ...topic.dataSources.slice(0, 4).map((name, index) => ({ id: `source-${index}`, name, type: 'data source', next: 'Use this source before generic guidance' }))];
  const policyText = policy.reminders.length ? `Policy reminder: ${policy.reminders.join(' ')}` : 'Policy reminder: answer from page context and route help before generic guidance.';
  const approvalText = topic.approvalRules.length ? `Human approval boundary: ${topic.approvalRules.join(' ')}` : 'Human approval is required for sends, waivers, write-backs, deletes, pricing decisions, and compliance decisions.';
  const answer = [`I checked the Setu Guru help registry for ${routeHelp.routeTitle}.`, topic.summary, ...topic.answer, `Common blockers to inspect: ${topic.commonBlockers.slice(0, 4).join(', ') || 'none listed'}.`, `Data sources to check before acting: ${topic.dataSources.slice(0, 5).join(', ') || 'page context and organization data'}.`, approvalText, policyText].join('\n\n');
  return { answer, rows, actions: topic.actions, actionHref: topic.actions[0] ? null : undefined, routeHelp, mode: 'page_help' };
}
function buildResearchRoutingAnswer(question: string, route: string, pageText: string, mode: SetuGuruOrgSearchMode, entityContext?: SetuGuruResearchEntityContext | null, hsnCatalogReview?: SetuGuruHsnCatalogReview | null) { return buildLiveResearchExecutionAnswer({ question, route, pageText, mode: asLiveResearchMode(mode), entityContext, hsnCatalogReview }); }

function suggestedHsnForProduct(productName: string, question: string) { const combined = normalizeText(`${productName} ${question}`); if (combined.includes('banana') && combined.includes('chip')) return { code: '20089999', basis: 'Prepared or preserved fruit / other prepared fruit products; verify national subheading by destination market.' }; return null; }
function productMatchScore(product: TableRow, question: string, pageText: string, entityContext?: SetuGuruResearchEntityContext | null) { const name = normalizeText(product.name); if (!name) return 0; const haystack = normalizeText(`${question} ${pageText.slice(0, 500)} ${entityContext?.product ?? ''}`); const tokens = name.split(' ').filter((token) => token.length > 2); let score = haystack.includes(name) ? 10 : 0; score += tokens.filter((token) => haystack.includes(token)).length; return score; }
async function resolveHsnCatalogReview(organizationId: string, question: string, pageText: string, entityContext?: SetuGuruResearchEntityContext | null): Promise<SetuGuruHsnCatalogReview | null> { const workspaceData = await getProductsData(organizationId); const products = (workspaceData?.products ?? []).filter((product: TableRow) => product.is_active !== false); const ranked = products.map((product: TableRow) => ({ product, score: productMatchScore(product, question, pageText, entityContext) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score); const match = ranked[0]?.product; if (!match) return null; const suggestion = suggestedHsnForProduct(asText(match.name), question); if (!suggestion) return null; const currentHsn = formatHsn(asText(match.hsn_code)); const suggestedHsn = formatHsn(suggestion.code); const matchesCatalog = normalizeHsn(currentHsn) === normalizeHsn(suggestedHsn); return { productId: asText(match.id), productName: asText(match.name), currentHsn, suggestedHsn, suggestedBasis: suggestion.basis, matchesCatalog, needsApproval: !matchesCatalog }; }

async function resolveLeadResearchContext(db: SupabaseReader, organizationId: string, leadId: string): Promise<SetuGuruResearchEntityContext | null> { const { data: lead } = await db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(); if (!lead?.id) return null; const { data } = await db.from('lead_product_interests').select('product_id, products(id, name, hsn_code, category_id)').eq('organization_id', organizationId).eq('lead_id', lead.id).limit(6); const productNames = compactList(rowList(data).map((row) => nestedRow(row.products)?.name)); return { product: productNames.join(', '), country: asText(lead.country), role: lead.lead_type ? `${lead.lead_type} lead` : 'lead workspace', entityLabel: asText(lead.company_name) || asText(lead.contact_name) || 'active lead', source: 'active_lead' }; }
async function resolveProductResearchContext(db: SupabaseReader, organizationId: string, productId: string): Promise<SetuGuruResearchEntityContext | null> { const { data: product } = await db.from('products').select('id, name, hsn_code, category_id').eq('organization_id', organizationId).eq('id', productId).maybeSingle(); if (!product?.id) return null; return { product: asText(product.name), role: 'catalog product', entityLabel: asText(product.name) || 'active product', source: 'active_product' }; }
async function resolveQuoteResearchContext(db: SupabaseReader, organizationId: string, quoteId: string): Promise<SetuGuruResearchEntityContext | null> { const { data: quote } = await db.from('quotes').select('id, quote_number, lead_id, country_id, market_id, currency, display_currency').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle(); if (!quote?.id) return null; const [leadResult, countryResult] = await Promise.all([quote.lead_id ? db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle() : Promise.resolve({ data: null }), quote.country_id ? db.from('countries').select('id, name').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle() : Promise.resolve({ data: null })]); const lead = leadResult.data; const { data } = quote.lead_id ? await db.from('lead_product_interests').select('product_id, products(id, name, hsn_code, category_id)').eq('organization_id', organizationId).eq('lead_id', quote.lead_id).limit(6) : { data: [] }; const productNames = compactList(rowList(data).map((row) => nestedRow(row.products)?.name)); return { product: productNames.join(', '), country: asText(countryResult.data?.name) || asText(lead?.country), role: lead?.lead_type ? `${lead.lead_type} quote` : 'quote workspace', entityLabel: asText(quote.quote_number) || asText(lead?.company_name) || 'active quote', source: 'active_quote' }; }
async function resolveActiveResearchEntityContext(db: SupabaseReader, organizationId: string, route: string): Promise<SetuGuruResearchEntityContext | null> { const productId = parseProductIdFromRoute(route); if (productId) { const productContext = await resolveProductResearchContext(db, organizationId, productId); if (productContext) return productContext; } const quoteId = parseQuoteIdFromRoute(route); if (quoteId) { const quoteContext = await resolveQuoteResearchContext(db, organizationId, quoteId); if (quoteContext) return quoteContext; } const leadId = parseLeadIdFromRoute(route); if (leadId) { const leadContext = await resolveLeadResearchContext(db, organizationId, leadId); if (leadContext) return leadContext; } return null; }
async function resolveActiveLead(db: SupabaseReader, organizationId: string, route: string, pageText: string) { const leadId = parseLeadIdFromRoute(route); if (leadId) { const { data } = await db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(); if (data?.id) return data; } const visibleText = pageText.toLowerCase(); const { data: candidates } = await db.from('leads').select('id, company_name, contact_name, lead_type, country, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(50); const exactVisible = rowList(candidates).find((lead) => { const company = asText(lead.company_name).toLowerCase(); const contact = asText(lead.contact_name).toLowerCase(); return (company.length > 3 && visibleText.includes(company)) || (contact.length > 3 && visibleText.includes(contact)); }); if (exactVisible?.id) return exactVisible; const { data: quoteLeadRows } = await db.from('quotes').select('lead_id, updated_at, leads(id, company_name, contact_name, lead_type, country)').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(10); const quoteVisible = rowList(quoteLeadRows).map((row) => nestedRow(row.leads)).find((lead) => { const company = asText(lead?.company_name).toLowerCase(); return company.length > 3 && visibleText.includes(company); }); if (quoteVisible?.id) return quoteVisible; return nestedRow(rowList(quoteLeadRows)[0]?.leads) ?? rowList(candidates)[0] ?? null; }
function buildQuoteComplianceAnswer(input: { organizationName: string; lead: TableRow; quote: TableRow | null; complianceRows: TableRow[]; documentRows: TableRow[]; requirementRows: TableRow[]; productRows: TableRow[]; countryName: string; }) { const mandatoryRules = input.requirementRows.filter((rule) => rule.is_mandatory === true); const advisoryRules = input.requirementRows.filter((rule) => rule.is_mandatory !== true); const openCompliance = input.complianceRows.filter((row) => isOpenStatus(row.status) && nestedRow(row.compliance_checklist_items)?.is_mandatory !== false); const openDocuments = mandatoryRules.filter((rule) => !input.documentRows.some((doc) => doc.requirement_code === rule.requirement_code && !isOpenStatus(doc.status))); const products = input.productRows.map((product) => product.name).filter(Boolean).slice(0, 4).join(', ') || 'linked products'; const blockers: string[] = []; openCompliance.forEach((row) => blockers.push(asText(nestedRow(row.compliance_checklist_items)?.description) || asText(nestedRow(row.compliance_checklist_items)?.code) || 'Open compliance item')); openDocuments.forEach((rule) => blockers.push(asText(rule.title) || asText(rule.requirement_code))); const blockerText = blockers.length ? blockers.slice(0, 4).join('; ') : 'No mandatory compliance blocker is open for this quote.'; const advisoryText = advisoryRules.length ? `Advisory before dispatch: ${advisoryRules.map((rule) => asText(rule.title) || asText(rule.requirement_code)).slice(0, 4).join(', ')}.` : 'No advisory document rule is configured right now.'; const answer = [`I checked this live quote for ${asText(input.lead.company_name) || input.organizationName}.`, `Destination/context: ${input.countryName || asText(input.lead.country) || 'not set'} · Products: ${products}.`, blockers.length ? `True blocker: ${blockerText}.` : blockerText, blockers.length ? 'How to fix it: open the lead evidence/compliance area, upload the required document or evidence, submit it for review, then return to quote review. If this is not required at quote stage, an owner/admin should mark it advisory or waive it with a reason.' : 'The quote can move forward from a quote-compliance perspective. Keep product/country documents advisory until dispatch when org policy allows quoting before dispatch readiness.', advisoryText, 'Setu Guru can suggest likely product/country evidence, but it must not approve, waive, or clear compliance automatically. Human approval is required for prices, compliance, sends, and write-backs.'].join('\n\n'); return { answer, blockers }; }

async function resolveActiveWorkflowOrder(db: SupabaseReader, organizationId: string, route: string, pageText: string) { const columns = 'id, order_number, status, current_stage, order_lifecycle_status, approval_state, payment_status, fulfillment_status, dispatch_status, source_quote_id, source_quote_version_id, lead_id, total_order_value, currency, updated_at'; const orderId = parseOrderIdFromRoute(route); if (orderId) { const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('id', orderId).maybeSingle(); if (data?.id) return data; } const quoteId = parseQuoteIdFromRoute(route); if (quoteId) { const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('source_quote_id', quoteId).order('updated_at', { ascending: false }).limit(1); return firstRow(data); } const visibleText = pageText.toLowerCase(); const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(12); return rowList(data).find((order) => asText(order.order_number).toLowerCase() && visibleText.includes(asText(order.order_number).toLowerCase())) ?? rowList(data).find((order) => { const num = asText(order.order_number); return num && visibleText.includes(num.toLowerCase()); }) ?? null; }
function parseOrderNumberFromQuestion(question: string): string | null { const match = question.match(/SF-O-\d{6}-\d{3}/i); return match ? match[0].toUpperCase() : null; }
function workflowRows(rowsByType: Record<string, TableRow[]>) { return Object.entries(rowsByType).flatMap(([type, values]) => values.slice(0, 4).map((row) => ({ id: asText(row.id) || `${type}-${asText(row.status)}`, name: asText(row.title) || asText(row.summary) || asText(row.document_type) || asText(row.gate_type) || asText(row.provider_name) || asText(row.finance_document_type) || asText(row.status) || type, type, status: asText(row.status) || asText(row.sync_status) || asText(row.event_type), next: isBlockedStatus(row.status ?? row.sync_status) ? 'Review this workflow blocker before advancing state' : 'Evidence checked from live workflow state' }))); }
function buildWorkflowStatusAnswer(input: { organizationName: string; order: TableRow; quote: TableRow | null; quoteVersions: TableRow[]; gates: TableRow[]; stageEvents: TableRow[]; orderDocuments: TableRow[]; tradeRequirements: TableRow[]; packingPlans: TableRow[]; freightRequests: TableRow[]; freightQuotes: TableRow[]; shipments: TableRow[]; financeSync: TableRow[]; processingChecks: TableRow[]; }) { const openGates = input.gates.filter((row) => isBlockedStatus(row.status)); const openRequirements = input.tradeRequirements.filter((row) => isOpenStatus(row.status)); const unsentDocs = input.orderDocuments.filter((row) => ['draft', 'generated', 'approved'].includes(asText(row.status).toLowerCase()) && !row.sent_at); const freightBlocked = input.freightRequests.filter((row) => isBlockedStatus(row.status)); const financeBlocked = input.financeSync.filter((row) => isBlockedStatus(row.sync_status)); const blockers = [...openGates.map((row) => `${asText(row.stage_key) || 'approval'} gate ${asText(row.gate_type) || ''}: ${asText(row.status)}`), ...openRequirements.map((row) => `${asText(row.stage_key) || 'trade'} requirement: ${asText(row.title) || asText(row.requirement_code)}`), ...freightBlocked.map((row) => `freight request ${asText(row.id).slice(0, 8)}: ${asText(row.status)}`), ...financeBlocked.map((row) => `finance ${asText(row.finance_document_type) || 'sync'}: ${asText(row.sync_status)}`)]; const answer = [`I checked live workflow state for ${asText(input.order.order_number) || 'the latest active order'} in ${input.organizationName}.`, `Order state: lifecycle ${asText(input.order.order_lifecycle_status) || asText(input.order.status) || 'not set'} · stage ${asText(input.order.current_stage) || 'not set'} · approval ${asText(input.order.approval_state) || 'not set'} · payment ${asText(input.order.payment_status) || 'not set'} · fulfillment ${asText(input.order.fulfillment_status) || 'not set'} · dispatch ${asText(input.order.dispatch_status) || 'not set'}.`, `Quote handoff: ${input.quote ? `${asText(input.quote.quote_number) || 'quote'} status ${asText(input.quote.status) || 'not set'} with ${input.quoteVersions.length} version record(s).` : 'No linked quote was found for this order.'}`, `Evidence checked: order stages ${input.stageEvents.length}, gates ${input.gates.length}, order documents ${input.orderDocuments.length}, trade requirements ${input.tradeRequirements.length}, packing plans ${input.packingPlans.length}, freight requests ${input.freightRequests.length}, freight quotes ${input.freightQuotes.length}, shipments ${input.shipments.length}, finance sync records ${input.financeSync.length}, processing checks ${input.processingChecks.length}.`, blockers.length ? `Current blockers: ${blockers.slice(0, 5).join('; ')}.` : unsentDocs.length ? `Dispatch caution: ${unsentDocs.length} approved/generated order document(s) still need send/open evidence before closing dispatch.` : 'No live blocker was found in the checked workflow records.', 'Read-only analysis only. Setu Guru must not advance order state, send documents, clear gates, sync finance, book freight, or waive compliance without human approval and the existing safe workflow actions.'].join('\n\n'); return { answer, blockers, rows: workflowRows({ approval_gate: input.gates, stage_event: input.stageEvents, order_document: input.orderDocuments, trade_requirement: input.tradeRequirements, freight_request: input.freightRequests, freight_quote: input.freightQuotes, shipment: input.shipments, finance_sync: input.financeSync }) }; }

// ── Disambiguation helpers ────────────────────────────────────────────────────

type DisambiguationResult =
  | { kind: 'found'; order: TableRow; customerName: string }
  | { kind: 'ask_client'; message: string; rows: TableRow[] }
  | { kind: 'pick_order'; customerName: string; message: string; rows: TableRow[] }
  | { kind: 'not_found'; message: string };

function fuzzyMatchClient(name: string, query: string): boolean {
  if (!query || !name) return false;
  const n = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  if (!q) return false;
  return q.split(/\s+/).filter(t => t.length > 1).some(token => n.includes(token));
}

function extractClientNameFromQuestion(question: string): string {
  const q = question.toLowerCase();
  const stripped = q
    .replace(/\b(what is the status|status of|order status|quote status|check|show me|for|of|the|order|quote|sf-o-\d{6}-\d{3}|sf-q-\d{6}-\d{3})\b/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
  return stripped.length >= 2 ? stripped : '';
}

async function resolveOrderWithDisambiguation(
  db: SupabaseReader,
  organizationId: string,
  route: string,
  pageText: string,
  question: string,
): Promise<DisambiguationResult> {
  const columns = 'id, order_number, status, current_stage, order_lifecycle_status, approval_state, payment_status, fulfillment_status, dispatch_status, source_quote_id, source_quote_version_id, lead_id, total_order_value, currency, updated_at';

  const orderNumber = parseOrderNumberFromQuestion(question);
  if (orderNumber) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('order_number', orderNumber).maybeSingle();
    if (data?.id) {
      const leadRes = data.lead_id ? await db.from('leads').select('company_name, contact_name').eq('organization_id', organizationId).eq('id', asText(data.lead_id)).maybeSingle() : { data: null };
      const customerName = asText(leadRes.data?.company_name ?? leadRes.data?.contact_name ?? '');
      return { kind: 'found', order: data, customerName };
    }
  }

  const orderId = parseOrderIdFromRoute(route);
  if (orderId) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('id', orderId).maybeSingle();
    if (data?.id) {
      const leadRes = data.lead_id ? await db.from('leads').select('company_name, contact_name').eq('organization_id', organizationId).eq('id', asText(data.lead_id)).maybeSingle() : { data: null };
      const customerName = asText(leadRes.data?.company_name ?? leadRes.data?.contact_name ?? '');
      return { kind: 'found', order: data, customerName };
    }
  }

  const pageOrderNumber = (/SF-O-\d{6}-\d{3}/i.exec(pageText) ?? [])[0]?.toUpperCase() ?? null;
  if (pageOrderNumber) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('order_number', pageOrderNumber).maybeSingle();
    if (data?.id) {
      const leadRes = data.lead_id ? await db.from('leads').select('company_name, contact_name').eq('organization_id', organizationId).eq('id', asText(data.lead_id)).maybeSingle() : { data: null };
      const customerName = asText(leadRes.data?.company_name ?? leadRes.data?.contact_name ?? '');
      return { kind: 'found', order: data, customerName };
    }
  }

  const clientQuery = extractClientNameFromQuestion(question);
  const { data: recent } = await db.from('orders')
    .select('id, order_number, status, current_stage, order_lifecycle_status, approval_state, payment_status, fulfillment_status, dispatch_status, source_quote_id, source_quote_version_id, lead_id, total_order_value, currency, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(50);

  const orders = rowList(recent);
  if (!orders.length) return { kind: 'not_found', message: 'No orders found in this organization yet.' };

  const leadIds = [...new Set(orders.map(o => asText(o.lead_id)).filter(Boolean))];
  const { data: leadsData } = leadIds.length
    ? await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).in('id', leadIds)
    : { data: [] };
  const leadMap = new Map(rowList(leadsData).map(l => [asText(l.id), asText(l.company_name || l.contact_name)]));

  const annotated = orders.map(o => ({
    order: o,
    customerName: leadMap.get(asText(o.lead_id)) ?? '',
  }));

  if (clientQuery) {
    const matched = annotated.filter(a => fuzzyMatchClient(a.customerName, clientQuery));
    if (matched.length === 1) {
      return { kind: 'found', order: matched[0].order, customerName: matched[0].customerName };
    }
    if (matched.length > 1) {
      const uniqueClients = [...new Set(matched.map(m => m.customerName))];
      if (uniqueClients.length === 1) {
        const rows = matched.slice(0, 5).map(m => ({
          id: asText(m.order.id),
          name: asText(m.order.order_number),
          type: 'order',
          next: `Stage: ${asText(m.order.current_stage) || 'unknown'} · Value: ${asText(m.order.currency)} ${asText(m.order.total_order_value)}`,
          url: `/orders/${asText(m.order.id)}`,
          citation: asText(m.order.order_number),
        }));
        return {
          kind: 'pick_order',
          customerName: uniqueClients[0],
          message: `I found ${matched.length} orders for ${uniqueClients[0]}. Which order do you need? Reply with the order number or stage.`,
          rows,
        };
      }
      const rows = matched.slice(0, 5).map(m => ({
        id: asText(m.order.id),
        name: m.customerName,
        type: 'client',
        next: `Order: ${asText(m.order.order_number)} · Stage: ${asText(m.order.current_stage) || 'unknown'}`,
        citation: asText(m.order.order_number),
      }));
      return {
        kind: 'ask_client',
        message: `I found ${matched.length} matching records. Which client did you mean? Reply with their name or order number.`,
        rows,
      };
    }
  }

  return {
    kind: 'ask_client',
    message: "Which client or order number are you asking about? Give me a client name or order number (like SF-O-202605-004) and I'll pull the live status.",
    rows: [],
  };
}

async function resolveQuoteWithDisambiguation(
  db: SupabaseReader,
  organizationId: string,
  question: string,
  pageText: string,
): Promise<{ kind: 'found'; lead: TableRow; quote: TableRow } | { kind: 'ask' | 'pick'; message: string; rows: TableRow[] }> {
  const clientQuery = extractClientNameFromQuestion(question);
  const { data: leads } = await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(50);
  const leadRows = rowList(leads);

  const matched = clientQuery
    ? leadRows.filter(l => fuzzyMatchClient(asText(l.company_name ?? l.contact_name), clientQuery))
    : [];

  if (matched.length === 0 && !clientQuery) {
    return { kind: 'ask', message: "Which client's quote do you want to check? Give me a name and I'll pull the compliance status.", rows: [] };
  }

  const targetLeads = matched.length > 0 ? matched : leadRows.slice(0, 3);

  const leadIds = targetLeads.map(l => asText(l.id));
  const { data: quotes } = await db.from('quotes').select('id, quote_number, status, lead_id').eq('organization_id', organizationId).in('lead_id', leadIds).order('updated_at', { ascending: false }).limit(20);
  const quoteRows = rowList(quotes);

  if (matched.length === 1 && quoteRows.filter(q => asText(q.lead_id) === asText(matched[0].id)).length === 1) {
    const lead = matched[0];
    const quote = quoteRows.find(q => asText(q.lead_id) === asText(lead.id))!;
    return { kind: 'found', lead, quote };
  }

  const rows = quoteRows.slice(0, 5).map(q => {
    const lead = leadRows.find(l => asText(l.id) === asText(q.lead_id));
    return { id: asText(q.id), name: asText(lead?.company_name ?? lead?.contact_name ?? 'Unknown'), type: 'quote', next: `${asText(q.quote_number)} · ${asText(q.status)}`, citation: asText(q.quote_number) };
  });

  return {
    kind: 'pick',
    message: matched.length === 0
      ? "Which client's quote do you want to check? Give me a name and I'll pull the compliance status."
      : `I found ${rows.length} quotes for matching clients. Which one do you need?`,
    rows,
  };
}

async function buildWorkflowStatusResponse(db: SupabaseReader, organizationId: string, organizationName: string, route: string, pageText: string, mode: SetuGuruOrgSearchMode, question = '') {
  const result = await resolveOrderWithDisambiguation(db, organizationId, route, pageText, question);

  if (result.kind === 'ask_client' || result.kind === 'pick_order') {
    return NextResponse.json({
      answer: result.kind === 'ask_client' ? result.message : result.message,
      confidence: 'low',
      mode,
      rows: result.rows,
      actions: ['Open Orders'],
      actionHref: '/orders',
      disambiguation: true,
    });
  }
  if (result.kind === 'not_found') {
    return NextResponse.json({ answer: result.message, confidence: 'low', mode, rows: [], actions: ['Open Orders'], actionHref: '/orders' });
  }

  const { order, customerName } = result;
  const orderId = asText(order.id);
  const quoteId = asText(order.source_quote_id);
  const [quoteResult, versionsResult, gatesResult, stagesResult, docsResult, requirementsResult, packingResult, freightRequestsResult, freightQuotesResult, shipmentsResult, financeResult, checksResult] = await Promise.all([
    quoteId ? db.from('quotes').select('id, quote_number, status, accepted_version_id, current_version_id, sent_version_id').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle() : Promise.resolve({ data: null }),
    quoteId ? db.from('quote_versions').select('id, quote_id, version_no, status, sent_at, approved_at, parent_version_id').eq('quote_id', quoteId).order('version_no', { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    db.from('order_approval_gates').select('id, stage_key, gate_type, status, previewed_at, approved_at, sent_at, completed_at, reason, notes').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('order_stage_events').select('id, stage_key, event_type, summary, event_at').eq('organization_id', organizationId).eq('order_id', orderId).order('event_at', { ascending: false }).limit(12),
    db.from('order_documents').select('id, document_type, stage_key, status, version_no, approved_at, sent_at, opened_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('trade_requirements').select('id, title, requirement_code, stage_key, status, severity, due_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('packing_plans').select('id, plan_type, status, total_units, total_gross_weight_kg, total_cbm, approved_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(4),
    db.from('freight_rate_requests').select('id, status, shipment_mode, incoterm, sent_at, selected_quote_id').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('freight_rate_quotes').select('id, request_id, provider_name, provider_type, quoted_amount, currency, status, selected_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(10),
    db.from('shipments').select('id, status, shipment_mode, carrier_name, forwarder_name, tracking_number, booking_reference, dispatched_at, delivered_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('finance_sync_records').select('id, finance_document_type, external_system, sync_status, synced_at, error_message').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('order_processing_checks').select('id, order_line_id, picked, packed, qc_checked, processing_note, checked_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(8),
  ]);
  const built = buildConversationalWorkflowStatusAnswer({ organizationName, order, customerName, quote: quoteResult.data, quoteVersions: rowList(versionsResult.data), gates: rowList(gatesResult.data), stageEvents: rowList(stagesResult.data), orderDocuments: rowList(docsResult.data), tradeRequirements: rowList(requirementsResult.data), packingPlans: rowList(packingResult.data), freightRequests: rowList(freightRequestsResult.data), freightQuotes: rowList(freightQuotesResult.data), shipments: rowList(shipmentsResult.data), financeSync: rowList(financeResult.data), processingChecks: rowList(checksResult.data) });
  const rows = workflowRows({ approval_gate: rowList(gatesResult.data), stage_event: rowList(stagesResult.data), order_document: rowList(docsResult.data), trade_requirement: rowList(requirementsResult.data), freight_request: rowList(freightRequestsResult.data), freight_quote: rowList(freightQuotesResult.data), shipment: rowList(shipmentsResult.data), finance_sync: rowList(financeResult.data) }).slice(0, 12);
  return NextResponse.json({ answer: built.answer, confidence: 'high', mode, rows, metrics: { blockers: built.blockers.length, orderStages: rowList(stagesResult.data).length, orderDocuments: rowList(docsResult.data).length, freightRequests: rowList(freightRequestsResult.data).length, financeSyncRecords: rowList(financeResult.data).length }, actions: ['Open order workspace', 'Review order approval boundary', 'Draft dispatch evidence checklist'], actionHref: `/orders/${orderId}`, actionHrefs: { 'Open order workspace': `/orders/${orderId}`, 'Review order approval boundary': `/orders/${orderId}?tab=approvals`, 'Draft dispatch evidence checklist': `/orders/${orderId}?tab=documents` } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = asText(body.question);
    const qNormalized = question.trim().toLowerCase();

    // --- API LEVEL FIX 1: Smart Conversational Interceptors (Zero Hallucination) ---
    // 1. Greetings (Varied responses to feel human)
    if (/^(hi+|hello|hey+|heya|namaste|greetings)[\s!?.]*$/.test(qNormalized)) {
      const greetings = [
        "Hello! This is Setu Guru AI. How can I help you today? You can ask me about catalog products, active leads, or CRM workflows.",
        "Hi there! Setu Guru here. Looking for a specific product, lead, or quote status?",
        "Namaste! I'm Setu Guru. Need help finding a catalog item or checking on a workflow?",
        "Hey! I'm your Setu Guru assistant. What can I look up for you in the CRM today?"
      ];
      return NextResponse.json({
        answer: greetings[Math.floor(Math.random() * greetings.length)],
        confidence: 'high',
        mode: 'page_help',
        rows: [],
        actions: ['Open Products', 'Open Leads']
      });
    }

    // 2. Closings & Acknowledgements (MULTI-WORD SUPPORT)
    const isClosing = qNormalized.split(/\s+/).every(w => /^(bye+|goodbye|thanks+|thank|you|ok+|okay+|okey|alright|cool|awesome|great|nice|perfect|done|achha|ha|haan)$/.test(w.replace(/[^a-z]/g, '')));
    
    if (isClosing && qNormalized.length > 0) {
      const closings = [
        "You're very welcome! I'm right here if you need to check anything else.",
        "Happy to help! Let me know if you need anything else from Setu Flow.",
        "Anytime! Just type here if you need to look up more leads or products.",
        "Got it! Have a great day, and let me know if you need further assistance."
      ];
      return NextResponse.json({
        answer: closings[Math.floor(Math.random() * closings.length)],
        confidence: 'high',
        mode: 'page_help',
        rows: [],
        actions: []
      });
    }
    // ---------------------------------------------------------

    const route = asText(body.route);
    const pageText = asText(body.pageText);
    if (!question) return NextResponse.json({ answer: 'Ask a catalog, product, buyer, supplier, lead, quote blocker, workflow, route help, or live research question.', confidence: 'low', rows: [] }, { status: 400 });
    const mode = normalizeSetuGuruOrgSearchMode(asText(body.mode), question);
    
    if (mode === 'page_help') return NextResponse.json({ ...buildPageHelpAnswer(question, route), confidence: 'high' });
    if (isResearchRoutingMode(mode, question)) { let entityContext: SetuGuruResearchEntityContext | null = null; let hsnCatalogReview: SetuGuruHsnCatalogReview | null = null; if (hasSupabaseEnv) { const workspace = await getWorkspaceAccess().catch(() => null); if (workspace?.user && workspace.organization) { const db = await createClient() as unknown as SupabaseReader; entityContext = await resolveActiveResearchEntityContext(db, workspace.organization.id, route).catch(() => null); if (mode === 'hsn_enrichment') hsnCatalogReview = await resolveHsnCatalogReview(workspace.organization.id, question, pageText, entityContext).catch(() => null); } } return NextResponse.json(buildResearchRoutingAnswer(question, route, pageText, mode, entityContext, hsnCatalogReview)); }
    if (!hasSupabaseEnv) return NextResponse.json({ answer: 'Setu Guru cannot read live organization data because Supabase environment variables are missing. Ask “what can you do on this page?” for route help, or ask for live research guidance for HS/HSN, document requirements, duties, tariffs, or margins.', confidence: 'low', rows: [], actions: ['Show page help', 'Ask live research'] }, { status: 500 });
    
    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in to Setu Flow before asking Setu Guru to search organization data.', confidence: 'low', rows: [] }, { status: 401 });
    
    const organizationId = workspace.organization.id;
    const organizationName = workspace.organization.name ?? 'this organization';
    const term = asText(body.term) || extractSearchTerm(question, mode);
    const db = await createClient() as unknown as SupabaseReader;

    const startedAt = Date.now();
    const trialCoach = await resolveTrialCoachContext(organizationId).catch(() => null);
    if (trialCoach && isTrialJourneyQuestion(question)) {
      const coachAnswer = buildTrialCoachAnswer(trialCoach, organizationName);
      void writeTelemetry({ organizationId, userId: workspace.user.id, route: route || '/', mode: 'trial_journey', confidence: 'high', blockerCount: 0, answerSourceType: coachAnswer.trialAction ? 'trial_coach_show_step' : 'trial_coach', latencyMs: Date.now() - startedAt, blocked: false });
      return NextResponse.json(coachAnswer);
    }
    
    if (mode === 'workflow_status') return buildWorkflowStatusResponse(db, organizationId, organizationName, route, pageText, mode, question);
    
    if (mode === 'quote_compliance') { const lead = await resolveActiveLead(db, organizationId, route, pageText); if (!lead?.id) return NextResponse.json({ answer: 'I can help with quote compliance, but I could not identify a lead from the route or visible page. Open the quote or lead workspace and ask again.', confidence: 'medium', rows: [], actions: ['Open Leads', 'Open compliance'], actionHref: '/leads' }); const [{ data: quotes }, { data: leadProducts }, { data: documents }, { data: complianceRows }, { data: rules }, { data: country }] = await Promise.all([db.from('quotes').select('id, quote_number, status, country_id, market_id, currency, display_currency').eq('organization_id', organizationId).eq('lead_id', lead.id).order('updated_at', { ascending: false }).limit(1), db.from('lead_product_interests').select('product_id, products(id, name, hsn_code, category_id)').eq('organization_id', organizationId).eq('lead_id', lead.id), db.from('documents').select('id, requirement_code, file_name, status, expires_at, related_entity, related_id').eq('organization_id', organizationId).eq('related_entity', 'lead').eq('related_id', lead.id), db.from('lead_compliance_items').select('id, status, severity, due_at, compliance_checklist_items(code, description, is_mandatory)').eq('organization_id', organizationId).eq('lead_id', lead.id), db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true).in('progression_scope', ['general', 'quote_send']), lead.country ? db.from('countries').select('id, name, market_id').eq('organization_id', organizationId).ilike('name', asText(lead.country)).maybeSingle() : Promise.resolve({ data: null })]); const quote = firstRow(quotes); const productRows = rowList(leadProducts).map((row) => nestedRow(row.products)).filter(isRecord); const productIdSet = new Set(productRows.map((product) => product.id)); const marketId = quote?.market_id ?? country?.market_id ?? null; const applicableRules = rowList(rules).filter((rule) => { if (rule.lead_type && rule.lead_type !== lead.lead_type) return false; if (rule.market_id && rule.market_id !== marketId) return false; if (rule.product_id && !productIdSet.has(rule.product_id)) return false; return true; }); const built = buildQuoteComplianceAnswer({ organizationName, lead, quote, complianceRows: rowList(complianceRows), documentRows: rowList(documents), requirementRows: applicableRules, productRows, countryName: asText(country?.name) || asText(lead.country) }); const rows = [...built.blockers.map((item, index) => ({ id: `blocker-${index}`, name: item, type: 'mandatory blocker', next: 'Upload evidence, submit review, or owner/admin waive with reason' })), ...applicableRules.filter((rule) => rule.is_mandatory !== true).slice(0, 4).map((rule) => ({ id: rule.id, name: rule.title || rule.requirement_code, type: 'advisory before dispatch', next: 'Prepare before order dispatch' }))]; return NextResponse.json({ answer: built.answer, confidence: 'high', mode, rows, actions: ['Open lead documents', 'Open compliance', 'Ask AI evidence checklist'], actionHref: `/leads/${lead.id}`, actionHrefs: { 'Open lead documents': `/leads/${lead.id}?tab=documents`, 'Open compliance': `/compliance/assist?leadId=${lead.id}`, 'Ask AI evidence checklist': `/compliance/assist?leadId=${lead.id}&mode=evidence` } }); }
    
    if (mode === 'catalog_search' || mode === 'hsn_enrichment') { 
      const workspaceData = await getProductsData(organizationId); 
      const products = workspaceData?.products ?? []; 
      const categories = workspaceData?.categories ?? []; 
      const categoryNameById = new Map(categories.map((category: TableRow) => [category.id, category.name])); 
      const visibleProducts = products.filter((product: TableRow) => product.is_active !== false); 
      const missingHsnProducts = visibleProducts.filter((product: TableRow) => !asText(product.hsn_code)); 
      const sourceProducts = mode === 'hsn_enrichment' ? missingHsnProducts : visibleProducts; 
      
      const matchedProducts = term ? sourceProducts.filter((product: TableRow) => includesTerm({ name: product.name, sku: product.sku, sku_code: product.sku_code, hsn_code: product.hsn_code, category: categoryNameById.get(product.category_id) }, term)) : sourceProducts; 
      
      const rows = matchedProducts.slice(0, 8).map((product: TableRow) => ({ id: product.id, name: product.name, sku: product.sku ?? product.sku_code ?? null, hsnCode: product.hsn_code ?? null, category: categoryNameById.get(product.category_id) ?? null })); 
      const answer = mode === 'hsn_enrichment' ? `I found ${missingHsnProducts.length} catalog product(s) missing HSN/HS codes in ${organizationName}. I listed ${rows.length} row(s) for review. For actual HS/HSN assignment, use live source-backed research and human review before write-back.` : term ? `I found ${matchedProducts.length} matching catalog product(s) for "${term}" in ${organizationName}. There are ${visibleProducts.length} catalog product(s) total.` : `You have ${visibleProducts.length} catalog product(s) in ${organizationName}. I did not apply any search filter.`; 
      
      return NextResponse.json({ answer, confidence: 'high', mode, term, rows, metrics: { catalogProducts: visibleProducts.length, categories: categories.length, missingHsnCount: missingHsnProducts.length }, nextAction: mode === 'hsn_enrichment' ? 'Open Products filtered to missing HSN codes.' : 'Open Products to review the catalog.', actionHref: mode === 'hsn_enrichment' ? '/products?guru=missing-hsn' : '/products' }); 
    }
    
    if (mode === 'buyer_search' || mode === 'supplier_search' || mode === 'lead_search') { 
      let countQuery = db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId); 
      if (mode === 'buyer_search') countQuery = countQuery.eq('lead_type', 'buyer'); 
      if (mode === 'supplier_search') countQuery = countQuery.eq('lead_type', 'supplier'); 
      const { count, error: countError } = await countQuery; 
      if (countError) throw countError; 
      
      let query = db.from('leads').select('id, company_name, contact_name, email, phone, lead_type, country, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(50);
      if (mode === 'buyer_search') query = query.eq('lead_type', 'buyer'); 
      if (mode === 'supplier_search') query = query.eq('lead_type', 'supplier'); 
      
      const { data: leads, error } = await query; 
      if (error) throw error; 
      
      let filteredLeads = rowList(leads);
      if (term) {
        filteredLeads = filteredLeads.filter(lead => includesTerm({
          name: lead.company_name,
          contact: lead.contact_name,
          email: lead.email,
          country: lead.country
        }, term));
      }
      
      const rows = filteredLeads.slice(0, 8).map((lead) => ({ id: lead.id, company: lead.company_name, contact: lead.contact_name, email: lead.email, phone: lead.phone, type: lead.lead_type, country: lead.country })); 
      const label = mode === 'buyer_search' ? 'buyer' : mode === 'supplier_search' ? 'supplier' : 'lead'; 
      return NextResponse.json({ answer: term ? `I found ${rows.length} matching ${label} record(s) for "${term}" in ${organizationName}. There are ${count ?? 0} ${label} record(s) total.` : `${organizationName} has ${count ?? 0} ${label} record(s). I listed the latest ${rows.length}.`, confidence: 'high', mode, term, rows, metrics: { count: count ?? 0 }, nextAction: mode === 'buyer_search' ? 'Open Leads in Buyers mode.' : mode === 'supplier_search' ? 'Open Leads in Suppliers mode.' : 'Open Leads to filter or edit records.', actionHref: mode === 'buyer_search' ? '/leads?mode=buyers' : mode === 'supplier_search' ? '/leads?mode=suppliers' : '/leads' }); 
    }
    
    return NextResponse.json({ answer: 'I can search live products, HSN gaps, buyers, suppliers, leads, quote compliance blockers, workflow state, route help, and research-intent routing for HS/HSN, document requirements, duties, tariffs, and margins. Try “what can you do on this page?” for page-specific help.', confidence: 'medium', rows: [], actions: ['Show page help', 'Ask live research'] });
  } catch (error) { 
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru organization search failed.', confidence: 'low', rows: [] }, { status: 500 }); 
  }
}