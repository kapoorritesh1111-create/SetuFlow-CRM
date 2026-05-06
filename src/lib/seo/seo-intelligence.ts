export type SeoCompetitor = {
  name: string;
  url: string;
  category: 'generic_crm' | 'trade_software' | 'logistics_trade' | 'sales_crm';
  gap: string;
  authorityScore: number;
  relevanceScore: number;
  setuOpportunityScore: number;
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

export type SeoKeywordGroupSummary = {
  group: string;
  currentIndex: number;
  trend: 'rising' | 'seasonal' | 'growing' | 'flat';
  recommendedPage: string;
  action: string;
  status: 'live' | 'improve_next';
};

export type SeoChangeProof = {
  title: string;
  description: string;
  status: 'live' | 'next_pr' | 'pending' | 'missing';
  icon: string;
};

export type SeoUpgradeAction = {
  title: string;
  type: 'metadata' | 'content' | 'schema' | 'internal_links' | 'automation' | 'analytics';
  priority: 'p0' | 'p1' | 'p2';
  target: string;
  expectedLift: string;
  implementation: string;
};

export type SeoOpportunity = {
  title: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  owner: 'seo_bot' | 'content' | 'engineering' | 'sales';
  action: string;
  status: 'queued' | 'ready_for_pr' | 'needs_review' | 'complete';
};

export const seoCompetitors: SeoCompetitor[] = [
  { name: 'CargoWise', url: 'https://www.cargowise.com/', category: 'logistics_trade', authorityScore: 83, relevanceScore: 72, setuOpportunityScore: 81, gap: 'Strong in logistics execution, but SETU can own exporter/importer CRM before freight and customs handoff.' },
  { name: 'SAP Global Trade Services', url: 'https://www.sap.com/products/financial-management/global-trade-services.html', category: 'trade_software', authorityScore: 95, relevanceScore: 74, setuOpportunityScore: 78, gap: 'Strong enterprise compliance. SETU can win SME and mid-market teams that need fast CRM-to-execution adoption.' },
  { name: 'Pipedrive', url: 'https://www.pipedrive.com/', category: 'sales_crm', authorityScore: 88, relevanceScore: 61, setuOpportunityScore: 76, gap: 'Strong pipeline CRM. SETU should show the gap after deal stage: export quotes, documents, approvals, and orders.' },
  { name: 'Zoho CRM', url: 'https://www.zoho.com/crm/', category: 'generic_crm', authorityScore: 92, relevanceScore: 58, setuOpportunityScore: 73, gap: 'Strong SMB CRM. SETU can win trade-specific workflows and export business comparison searches.' },
  { name: 'HubSpot CRM', url: 'https://www.hubspot.com/products/crm', category: 'generic_crm', authorityScore: 96, relevanceScore: 52, setuOpportunityScore: 68, gap: 'Dominates generic CRM education. SETU should win long-tail import-export operational CRM intent.' },
  { name: 'Freshsales', url: 'https://www.freshworks.com/crm/sales/', category: 'sales_crm', authorityScore: 86, relevanceScore: 55, setuOpportunityScore: 64, gap: 'Crowded AI CRM positioning. SETU should use AI only where it supports concrete trade workflows.' },
];

export const seoKeywordGroupSummaries: SeoKeywordGroupSummary[] = [
  { group: 'Import-export CRM', currentIndex: 92, trend: 'rising', recommendedPage: '/solutions/import-export-crm', action: 'Live. Improve next with more internal links, proof copy, and richer FAQ/schema.', status: 'live' },
  { group: 'Export quote software', currentIndex: 86, trend: 'rising', recommendedPage: '/features/export-quote-management', action: 'Live. Improve next with example quote workflows and screenshots.', status: 'live' },
  { group: 'CRM for exporters comparison', currentIndex: 82, trend: 'rising', recommendedPage: '/compare/crm-for-exporters', action: 'Live. Improve next with comparison table and internal links.', status: 'live' },
  { group: 'Trade show lead capture', currentIndex: 78, trend: 'seasonal', recommendedPage: '/features/trade-show-lead-capture', action: 'Live. Improve next with event playbooks and campaign landing copy.', status: 'live' },
  { group: 'Export checklist and compliance', currentIndex: 74, trend: 'growing', recommendedPage: '/resources/export-compliance-checklist', action: 'Live. Improve next with downloadable checklist and Search Console tracking.', status: 'live' },
  { group: 'Export management software', currentIndex: 80, trend: 'growing', recommendedPage: '/solutions/export-management-software', action: 'Live. Improve next with industry-specific examples and schema.', status: 'live' },
];

export const seoChangeProof: SeoChangeProof[] = [
  { title: 'SEO cockpit added', description: 'The admin SEO Intelligence page exists, is protected, and is now easier to navigate with sticky tabs.', status: 'live', icon: '📈' },
  { title: 'Daily monitoring enabled', description: 'The SEO Autobot GitHub Action runs daily and creates reviewable report PRs.', status: 'live', icon: '🤖' },
  { title: 'Dashboard PR action added', description: 'Internal admins can create reviewable SEO pull requests directly from the SEO Intelligence page.', status: 'live', icon: '🚀' },
  { title: 'First SEO batch deployed', description: 'Import-export CRM, export quote management, and CRM for exporters comparison pages are merged and deployed.', status: 'live', icon: '✅' },
  { title: 'Second SEO batch deployed', description: 'Export compliance checklist, trade show lead capture, and export management software pages are merged and deployed.', status: 'live', icon: '✅' },
  { title: 'Live Trends provider connected', description: 'SearchApi/SerpApi support is wired. The dashboard now uses live data when the provider returns a successful response.', status: 'live', icon: '📊' },
];

export const seoKeywordClusters: SeoKeywordCluster[] = [
  { cluster: 'Import export CRM', intent: 'commercial', priority: 'high', examples: ['import export CRM', 'CRM for import export business', 'CRM for exporters', 'CRM for importers', 'EXIM CRM software'], recommendedPage: '/solutions/import-export-crm', contentAngle: 'Explain why generic CRM breaks when quotes, incoterms, documents, compliance, and shipment follow-up live outside the pipeline.', currentCoverage: 'ready' },
  { cluster: 'Export management software for SMEs', intent: 'commercial', priority: 'high', examples: ['export management software', 'export software for small business', 'software for exporters', 'export sales CRM'], recommendedPage: '/solutions/export-management-software', contentAngle: 'Position Setu Flow as the fast-start operating layer for exporters who need buyer follow-up, quote governance, and order readiness.', currentCoverage: 'ready' },
  { cluster: 'Trade show lead capture CRM', intent: 'transactional', priority: 'high', examples: ['trade show lead capture app', 'business card scanner CRM', 'trade fair lead management', 'lead capture for exporters'], recommendedPage: '/features/trade-show-lead-capture', contentAngle: 'Show the mobile capture-to-follow-up workflow, including QR/vCard, OCR, event attribution, and post-show queue management.', currentCoverage: 'ready' },
  { cluster: 'Quote management for trade teams', intent: 'commercial', priority: 'high', examples: ['quote management software', 'export quote software', 'FOB CIF quote software', 'quotation software for exporters'], recommendedPage: '/features/export-quote-management', contentAngle: 'Own FOB/CIF/EXW/DDP, FX locking, approval threshold, product catalog pricing, and quote versioning.', currentCoverage: 'ready' },
  { cluster: 'Trade compliance and document readiness', intent: 'informational', priority: 'medium', examples: ['export compliance checklist', 'shipment document checklist', 'export documents CRM', 'country compliance checklist export'], recommendedPage: '/resources/export-compliance-checklist', contentAngle: 'Create practical checklists that attract informational searches and route users into Setu Flow execution workflows.', currentCoverage: 'ready' },
  { cluster: 'CRM alternatives for trade teams', intent: 'comparison', priority: 'medium', examples: ['HubSpot alternative for exporters', 'Zoho CRM for export business', 'Pipedrive alternative for import export', 'best CRM for exporters'], recommendedPage: '/compare/crm-for-exporters', contentAngle: 'Compare Setu Flow against generic CRM categories without negative claims: pipeline CRM vs trade execution CRM.', currentCoverage: 'ready' },
];

export const seoUpgradeActions: SeoUpgradeAction[] = [
  { title: 'Add internal links from homepage to all SEO pages', type: 'internal_links', priority: 'p0', target: '/', expectedLift: 'Help crawlers discover new SEO pages faster', implementation: 'Create a PR that adds a public SEO hub/internal link section pointing to all solution, feature, comparison, and resource pages.' },
  { title: 'Add richer schema to public SEO pages', type: 'schema', priority: 'p0', target: 'SEO landing pages', expectedLift: 'Improve entity understanding and rich-result eligibility', implementation: 'Create a PR adding BreadcrumbList, SoftwareApplication, FAQPage, and Organization references across SEO pages where visible copy supports it.' },
  { title: 'Connect Google Search Console history', type: 'analytics', priority: 'p1', target: 'Supabase + Search Console', expectedLift: 'Show impressions, clicks, CTR, and ranking changes instead of provider-only trend lines', implementation: 'Add Supabase tables and a scheduled ingestion job after Search Console API credentials are available.' },
  { title: 'Create proof/content depth upgrades', type: 'content', priority: 'p1', target: 'Live SEO pages', expectedLift: 'Increase conversion and topical authority', implementation: 'Add examples, screenshots, industry workflows, downloadable checklists, and comparison tables.' },
];

export const seoOpportunities: SeoOpportunity[] = [
  { title: 'Generate competitor gap report daily with weekly review', impact: 'medium', effort: 'low', owner: 'seo_bot', action: 'Run the SEO bot daily, store report artifacts, and open PRs when recommendations change.', status: 'complete' },
  { title: 'Improve internal links and schema after all page batches', impact: 'high', effort: 'medium', owner: 'engineering', action: 'Next PR should improve crawl paths, structured data, and page depth now that all first-wave SEO pages are live.', status: 'ready_for_pr' },
];

export const seoPageMetadata = {
  siteUrl: 'https://www.setuflowcrm.com',
  primaryPositioning: 'Trade Execution CRM for import-export teams',
  analyticsNote: 'Live Trends data appears when SearchApi or SerpApi returns successfully. Search Console ingestion can be added later for impressions, clicks, CTR, and query trends.',
};
