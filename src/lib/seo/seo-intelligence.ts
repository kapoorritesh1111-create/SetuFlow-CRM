export type SeoCompetitor = {
  name: string;
  url: string;
  category: 'generic_crm' | 'trade_software' | 'logistics_trade' | 'sales_crm';
  positioning: string;
  likelyStrength: string;
  setuCounterPosition: string;
  keywords: string[];
  authorityScore: number;
  relevanceScore: number;
  setuOpportunityScore: number;
  gap: string;
};

export type SeoKeywordCluster = {
  cluster: string;
  intent: 'commercial' | 'informational' | 'comparison' | 'transactional';
  priority: 'high' | 'medium' | 'low';
  examples: string[];
  recommendedPage: string;
  contentAngle: string;
  currentCoverage: 'missing' | 'partial' | 'ready';
};

export type SeoSearchWindow = 'daily' | 'weekly' | 'monthly';

export type SeoSearchSignal = {
  phrase: string;
  window: SeoSearchWindow;
  intent: 'buy' | 'compare' | 'learn' | 'operate';
  relativeDemand: number;
  buyerReadiness: number;
  recommendedAsset: string;
  pageTarget: string;
  note: string;
};

export type SeoOpportunity = {
  title: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  owner: 'seo_bot' | 'content' | 'engineering' | 'sales';
  action: string;
  status: 'queued' | 'ready_for_pr' | 'needs_review';
};

export type SeoUpgradeAction = {
  title: string;
  type: 'metadata' | 'content' | 'schema' | 'internal_links' | 'automation';
  priority: 'p0' | 'p1' | 'p2';
  target: string;
  expectedLift: string;
  implementation: string;
};

export const seoCompetitors: SeoCompetitor[] = [
  {
    name: 'HubSpot CRM',
    url: 'https://www.hubspot.com/products/crm',
    category: 'generic_crm',
    positioning: 'Broad free CRM and marketing/sales platform for general businesses.',
    likelyStrength: 'High domain authority, strong educational content, and broad CRM search coverage.',
    setuCounterPosition: 'Setu Flow should not fight HubSpot on generic CRM. Win long-tail searches where buyers need export quoting, trade execution, compliance, and shipment handoff.',
    keywords: ['crm software', 'free crm', 'sales crm', 'crm for small business'],
    authorityScore: 96,
    relevanceScore: 52,
    setuOpportunityScore: 68,
    gap: 'They dominate generic CRM education; Setu should own import-export operational CRM intent.',
  },
  {
    name: 'Zoho CRM',
    url: 'https://www.zoho.com/crm/',
    category: 'generic_crm',
    positioning: 'Affordable configurable CRM suite for SMB sales, marketing, and support.',
    likelyStrength: 'Strong price-led CRM intent and wide app ecosystem.',
    setuCounterPosition: 'Position Setu Flow as the operational CRM for exporters/importers that outgrows spreadsheet quoting and compliance tracking.',
    keywords: ['zoho crm alternative', 'affordable crm', 'crm for exporters', 'crm automation'],
    authorityScore: 92,
    relevanceScore: 58,
    setuOpportunityScore: 73,
    gap: 'They win broad SMB CRM searches; Setu can win export workflow and trade-specific comparison searches.',
  },
  {
    name: 'Pipedrive',
    url: 'https://www.pipedrive.com/',
    category: 'sales_crm',
    positioning: 'Pipeline-focused CRM for sales teams that want deal visibility and easy adoption.',
    likelyStrength: 'Excellent pipeline and sales management keyword capture.',
    setuCounterPosition: 'Setu Flow should compare against pipeline CRMs by emphasizing post-deal execution, quote approvals, documents, and shipment readiness.',
    keywords: ['sales pipeline crm', 'deal tracking crm', 'pipedrive alternative'],
    authorityScore: 88,
    relevanceScore: 61,
    setuOpportunityScore: 76,
    gap: 'They rank for pipeline language; Setu should turn pipeline into trade execution and order handoff pages.',
  },
  {
    name: 'Freshsales',
    url: 'https://www.freshworks.com/crm/sales/',
    category: 'sales_crm',
    positioning: 'AI-assisted sales CRM for pipeline, engagement, and customer data.',
    likelyStrength: 'Strong SMB CRM and AI CRM positioning.',
    setuCounterPosition: 'Setu Flow should use AI as a reviewable operator assist, not the primary category claim. The stronger claim is trade execution CRM.',
    keywords: ['ai crm', 'sales automation crm', 'crm for b2b sales'],
    authorityScore: 86,
    relevanceScore: 55,
    setuOpportunityScore: 64,
    gap: 'AI CRM language is crowded; Setu should use AI only where it supports trade workflows.',
  },
  {
    name: 'CargoWise',
    url: 'https://www.cargowise.com/',
    category: 'logistics_trade',
    positioning: 'Enterprise logistics execution platform for freight forwarders, customs brokers, and logistics providers.',
    likelyStrength: 'Strong logistics, customs, and freight forwarding authority.',
    setuCounterPosition: 'Setu Flow should avoid claiming freight-forwarder ERP. Own exporter/importer CRM before freight execution becomes a logistics back-office problem.',
    keywords: ['export import software', 'freight forwarding software', 'global trade software'],
    authorityScore: 83,
    relevanceScore: 72,
    setuOpportunityScore: 81,
    gap: 'They are logistics-heavy; Setu can own exporter/importer CRM before logistics execution.',
  },
  {
    name: 'SAP Global Trade Services',
    url: 'https://www.sap.com/products/financial-management/global-trade-services.html',
    category: 'trade_software',
    positioning: 'Enterprise global trade compliance and customs management.',
    likelyStrength: 'Enterprise compliance and SAP ecosystem trust.',
    setuCounterPosition: 'Setu Flow should target SME and mid-market trade teams needing fast CRM-to-execution adoption, not SAP-scale compliance projects.',
    keywords: ['global trade management software', 'export compliance software', 'trade compliance software'],
    authorityScore: 95,
    relevanceScore: 74,
    setuOpportunityScore: 78,
    gap: 'They win enterprise compliance; Setu should win fast-start export sales operations and SME trade teams.',
  },
];

export const seoKeywordClusters: SeoKeywordCluster[] = [
  {
    cluster: 'Import export CRM',
    intent: 'commercial',
    priority: 'high',
    examples: ['import export CRM', 'CRM for import export business', 'CRM for exporters', 'CRM for importers', 'EXIM CRM software'],
    recommendedPage: '/solutions/import-export-crm',
    contentAngle: 'Explain why generic CRM breaks when quotes, incoterms, documents, compliance, and shipment follow-up live outside the pipeline.',
    currentCoverage: 'partial',
  },
  {
    cluster: 'Export management software for SMEs',
    intent: 'commercial',
    priority: 'high',
    examples: ['export management software', 'export software for small business', 'software for exporters', 'export sales CRM'],
    recommendedPage: '/solutions/export-management-software',
    contentAngle: 'Position Setu Flow as the fast-start operating layer for exporters who need buyer follow-up, quote governance, and order readiness.',
    currentCoverage: 'missing',
  },
  {
    cluster: 'Trade show lead capture CRM',
    intent: 'transactional',
    priority: 'high',
    examples: ['trade show lead capture app', 'business card scanner CRM', 'trade fair lead management', 'lead capture for exporters'],
    recommendedPage: '/features/trade-show-lead-capture',
    contentAngle: 'Show the mobile capture-to-follow-up workflow, including QR/vCard, OCR, event attribution, and post-show queue management.',
    currentCoverage: 'partial',
  },
  {
    cluster: 'Quote management for trade teams',
    intent: 'commercial',
    priority: 'high',
    examples: ['quote management software', 'export quote software', 'FOB CIF quote software', 'quotation software for exporters'],
    recommendedPage: '/features/export-quote-management',
    contentAngle: 'Own FOB/CIF/EXW/DDP, FX locking, approval threshold, product catalog pricing, and quote versioning.',
    currentCoverage: 'partial',
  },
  {
    cluster: 'Trade compliance and document readiness',
    intent: 'informational',
    priority: 'medium',
    examples: ['export compliance checklist', 'shipment document checklist', 'export documents CRM', 'country compliance checklist export'],
    recommendedPage: '/resources/export-compliance-checklist',
    contentAngle: 'Create practical checklists that attract informational searches and route users into Setu Flow execution workflows.',
    currentCoverage: 'missing',
  },
  {
    cluster: 'CRM alternatives for trade teams',
    intent: 'comparison',
    priority: 'medium',
    examples: ['HubSpot alternative for exporters', 'Zoho CRM for export business', 'Pipedrive alternative for import export', 'best CRM for exporters'],
    recommendedPage: '/compare/crm-for-exporters',
    contentAngle: 'Compare Setu Flow against generic CRM categories without negative claims: pipeline CRM vs trade execution CRM.',
    currentCoverage: 'missing',
  },
];

export const seoSearchSignals: SeoSearchSignal[] = [
  { phrase: 'CRM for import export business', window: 'daily', intent: 'buy', relativeDemand: 92, buyerReadiness: 91, recommendedAsset: 'Solution page', pageTarget: '/solutions/import-export-crm', note: 'Highest intent phrase for buyers who already know they need CRM plus EXIM context.' },
  { phrase: 'import export CRM', window: 'daily', intent: 'buy', relativeDemand: 88, buyerReadiness: 90, recommendedAsset: 'Homepage + solution page', pageTarget: '/solutions/import-export-crm', note: 'Core category phrase; should appear in title, H1 support copy, and internal links.' },
  { phrase: 'CRM for exporters', window: 'daily', intent: 'buy', relativeDemand: 82, buyerReadiness: 87, recommendedAsset: 'Exporter persona page', pageTarget: '/solutions/crm-for-exporters', note: 'Good commercial phrase for exporters with buyer follow-up and quote pain.' },
  { phrase: 'export quote software', window: 'daily', intent: 'operate', relativeDemand: 79, buyerReadiness: 86, recommendedAsset: 'Feature page', pageTarget: '/features/export-quote-management', note: 'Operational search; strong fit for FOB/CIF/EXW/DDP quote workflows.' },
  { phrase: 'trade show lead capture app', window: 'daily', intent: 'operate', relativeDemand: 76, buyerReadiness: 84, recommendedAsset: 'Feature page', pageTarget: '/features/trade-show-lead-capture', note: 'Seasonal but high converting around trade fair cycles.' },

  { phrase: 'best CRM for exporters', window: 'weekly', intent: 'compare', relativeDemand: 85, buyerReadiness: 88, recommendedAsset: 'Comparison page', pageTarget: '/compare/crm-for-exporters', note: 'Best/buyer-guide wording is ideal for a fair comparison page.' },
  { phrase: 'Zoho CRM for export business', window: 'weekly', intent: 'compare', relativeDemand: 74, buyerReadiness: 81, recommendedAsset: 'Alternative page', pageTarget: '/compare/zoho-crm-for-exporters', note: 'Use factual comparison: generic CRM vs trade execution CRM.' },
  { phrase: 'HubSpot alternative for exporters', window: 'weekly', intent: 'compare', relativeDemand: 71, buyerReadiness: 80, recommendedAsset: 'Alternative page', pageTarget: '/compare/hubspot-alternative-for-exporters', note: 'Capture buyers who like CRM but need export operations.' },
  { phrase: 'export management software for small business', window: 'weekly', intent: 'buy', relativeDemand: 83, buyerReadiness: 82, recommendedAsset: 'Solution page', pageTarget: '/solutions/export-management-software', note: 'Great SME positioning phrase; less crowded than generic CRM.' },
  { phrase: 'quotation software for exporters', window: 'weekly', intent: 'operate', relativeDemand: 78, buyerReadiness: 83, recommendedAsset: 'Feature page', pageTarget: '/features/export-quote-management', note: 'Practical phrase that maps directly to quote workflows and approvals.' },

  { phrase: 'global trade management software', window: 'monthly', intent: 'learn', relativeDemand: 89, buyerReadiness: 64, recommendedAsset: 'Educational guide', pageTarget: '/resources/global-trade-management-vs-trade-crm', note: 'Broad enterprise phrase; use it to explain where Setu Flow fits and where it does not.' },
  { phrase: 'export compliance checklist', window: 'monthly', intent: 'learn', relativeDemand: 84, buyerReadiness: 68, recommendedAsset: 'Checklist resource', pageTarget: '/resources/export-compliance-checklist', note: 'Top-of-funnel resource that can feed product workflows.' },
  { phrase: 'shipment document checklist export', window: 'monthly', intent: 'learn', relativeDemand: 78, buyerReadiness: 66, recommendedAsset: 'Checklist resource', pageTarget: '/resources/export-document-checklist', note: 'Useful for long-tail informational SEO and internal linking.' },
  { phrase: 'software for exporters', window: 'monthly', intent: 'buy', relativeDemand: 82, buyerReadiness: 75, recommendedAsset: 'Category page', pageTarget: '/solutions/software-for-exporters', note: 'Broad but relevant; should route readers into CRM, quotes, documents, and trade show capture.' },
  { phrase: 'EXIM software for small business', window: 'monthly', intent: 'buy', relativeDemand: 76, buyerReadiness: 79, recommendedAsset: 'Solution page', pageTarget: '/solutions/exim-software-for-smes', note: 'Strong SME long-tail keyword with less generic CRM competition.' },
];

export const seoUpgradeActions: SeoUpgradeAction[] = [
  {
    title: 'Publish import-export CRM solution page',
    type: 'content',
    priority: 'p0',
    target: '/solutions/import-export-crm',
    expectedLift: 'High-intent commercial visibility',
    implementation: 'Create a focused page with keyword-led title, H1, FAQs, SoftwareApplication schema, and internal links from home/admin SEO recommendations.',
  },
  {
    title: 'Add export quote management feature page',
    type: 'content',
    priority: 'p0',
    target: '/features/export-quote-management',
    expectedLift: 'Capture quote workflow searches',
    implementation: 'Build content around FOB/CIF/EXW/DDP, FX, approvals, product catalog pricing, and quote-to-order handoff.',
  },
  {
    title: 'Upgrade public homepage structured data',
    type: 'schema',
    priority: 'p0',
    target: '/',
    expectedLift: 'Cleaner entity understanding',
    implementation: 'Add WebSite SearchAction, Organization, SoftwareApplication, and FAQPage JSON-LD where visible copy supports it.',
  },
  {
    title: 'Create fair CRM comparison hub',
    type: 'content',
    priority: 'p1',
    target: '/compare/crm-for-exporters',
    expectedLift: 'Comparison-intent traffic',
    implementation: 'Compare generic CRM, sales pipeline CRM, trade compliance software, and Setu Flow without unsupported competitor claims.',
  },
  {
    title: 'Add resource checklist pages',
    type: 'content',
    priority: 'p1',
    target: '/resources/export-compliance-checklist',
    expectedLift: 'Monthly informational traffic',
    implementation: 'Publish checklists that link into Setu Flow workflows for documents, compliance, orders, and shipment readiness.',
  },
  {
    title: 'Switch SEO bot cadence to daily monitoring',
    type: 'automation',
    priority: 'p1',
    target: '.github/workflows/seo-autobot.yml',
    expectedLift: 'Faster gap detection',
    implementation: 'Run the bot daily with weekly review discipline; report changes are still opened as reviewable PRs.',
  },
];

export const seoOpportunities: SeoOpportunity[] = [
  {
    title: 'Create solution pages for high-intent import/export CRM searches',
    impact: 'high',
    effort: 'medium',
    owner: 'content',
    action: 'Publish dedicated solution pages instead of relying only on the home page to rank for every keyword cluster.',
    status: 'ready_for_pr',
  },
  {
    title: 'Add WebSite SearchAction, FAQPage, BreadcrumbList, and SoftwareApplication schema coverage',
    impact: 'high',
    effort: 'low',
    owner: 'engineering',
    action: 'Extend structured data where page content supports it and keep JSON-LD generated from a typed source.',
    status: 'ready_for_pr',
  },
  {
    title: 'Generate competitor gap report daily with weekly review',
    impact: 'medium',
    effort: 'low',
    owner: 'seo_bot',
    action: 'Run the SEO bot daily, store report artifacts, and open PRs when recommendations change.',
    status: 'queued',
  },
  {
    title: 'Build comparison pages for generic CRM alternatives',
    impact: 'medium',
    effort: 'medium',
    owner: 'content',
    action: 'Create comparison pages that focus on feature gaps: incoterms, quote approvals, FX, compliance, documents, trade show capture, and order handoff.',
    status: 'needs_review',
  },
  {
    title: 'Use homepage internal links to route bots and buyers into topic pages',
    impact: 'medium',
    effort: 'low',
    owner: 'engineering',
    action: 'Add contextual links from home sections into solution, feature, comparison, and resource pages as they are published.',
    status: 'queued',
  },
];

export const seoPageMetadata = {
  siteUrl: 'https://www.setuflowcrm.com',
  primaryPositioning: 'Trade Execution CRM for import-export teams',
  mainOrgAccessNote: 'This page is intended for the Setu Flow main organization only. Customer workspaces should not use competitor or SEO governance tooling.',
  analyticsNote: 'Keyword demand scores are relative planning signals until Google Search Console, Google Ads Keyword Planner, or a Google Trends feed is connected.',
};
