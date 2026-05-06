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

export type SeoTrendPoint = { month: string; combined: number; commercial: number; education: number };
export type SeoKeywordGroupSummary = { group: string; currentIndex: number; trend: 'rising' | 'seasonal' | 'growing' | 'flat'; recommendedPage: string; action: string };
export type SeoChangeProof = { title: string; description: string; status: 'live' | 'next_pr' | 'pending' | 'missing'; icon: string };
export type SeoUpgradeAction = { title: string; type: 'metadata' | 'content' | 'schema' | 'internal_links' | 'automation'; priority: 'p0' | 'p1' | 'p2'; target: string; expectedLift: string; implementation: string };
export type SeoOpportunity = { title: string; impact: 'high' | 'medium' | 'low'; effort: 'high' | 'medium' | 'low'; owner: 'seo_bot' | 'content' | 'engineering' | 'sales'; action: string; status: 'queued' | 'ready_for_pr' | 'needs_review' };

export const seoCompetitors: SeoCompetitor[] = [
  { name: 'CargoWise', url: 'https://www.cargowise.com/', category: 'logistics_trade', authorityScore: 83, relevanceScore: 72, setuOpportunityScore: 81, gap: 'Strong in logistics execution, but SETU can own exporter/importer CRM before freight and customs handoff.' },
  { name: 'SAP Global Trade Services', url: 'https://www.sap.com/products/financial-management/global-trade-services.html', category: 'trade_software', authorityScore: 95, relevanceScore: 74, setuOpportunityScore: 78, gap: 'Strong enterprise compliance. SETU can win SME and mid-market teams that need fast CRM-to-execution adoption.' },
  { name: 'Pipedrive', url: 'https://www.pipedrive.com/', category: 'sales_crm', authorityScore: 88, relevanceScore: 61, setuOpportunityScore: 76, gap: 'Strong pipeline CRM. SETU should show the gap after deal stage: export quotes, documents, approvals, and orders.' },
  { name: 'Zoho CRM', url: 'https://www.zoho.com/crm/', category: 'generic_crm', authorityScore: 92, relevanceScore: 58, setuOpportunityScore: 73, gap: 'Strong SMB CRM. SETU can win trade-specific workflows and export business comparison searches.' },
  { name: 'HubSpot CRM', url: 'https://www.hubspot.com/products/crm', category: 'generic_crm', authorityScore: 96, relevanceScore: 52, setuOpportunityScore: 68, gap: 'Dominates generic CRM education. SETU should win long-tail import-export operational CRM intent.' },
  { name: 'Freshsales', url: 'https://www.freshworks.com/crm/sales/', category: 'sales_crm', authorityScore: 86, relevanceScore: 55, setuOpportunityScore: 64, gap: 'Crowded AI CRM positioning. SETU should use AI only where it supports concrete trade workflows.' },
];

export const seoTrendPoints: SeoTrendPoint[] = [
  { month: 'Jun', combined: 33, commercial: 29, education: 24 }, { month: 'Jul', combined: 37, commercial: 33, education: 27 }, { month: 'Aug', combined: 40, commercial: 36, education: 30 }, { month: 'Sep', combined: 45, commercial: 42, education: 34 }, { month: 'Oct', combined: 51, commercial: 48, education: 40 }, { month: 'Nov', combined: 53, commercial: 50, education: 44 }, { month: 'Dec', combined: 58, commercial: 55, education: 49 }, { month: 'Jan', combined: 63, commercial: 61, education: 54 }, { month: 'Feb', combined: 68, commercial: 66, education: 58 }, { month: 'Mar', combined: 73, commercial: 71, education: 62 }, { month: 'Apr', combined: 79, commercial: 77, education: 67 }, { month: 'May', combined: 83, commercial: 81, education: 72 },
];

export const seoKeywordGroupSummaries: SeoKeywordGroupSummary[] = [
  { group: 'Import-export CRM', currentIndex: 92, trend: 'rising', recommendedPage: '/solutions/import-export-crm', action: 'Create a dedicated solution page first.' },
  { group: 'Export quote software', currentIndex: 86, trend: 'rising', recommendedPage: '/features/export-quote-management', action: 'Publish quote workflow content with FOB/CIF/EXW/DDP language.' },
  { group: 'Trade show lead capture', currentIndex: 78, trend: 'seasonal', recommendedPage: '/features/trade-show-lead-capture', action: 'Use event-season campaigns and internal links.' },
  { group: 'Export checklist and compliance', currentIndex: 74, trend: 'growing', recommendedPage: '/resources/export-compliance-checklist', action: 'Use checklist content to capture top-of-funnel searches.' },
];

export const seoChangeProof: SeoChangeProof[] = [
  { title: 'SEO cockpit added', description: 'The admin SEO Intelligence page exists and is protected for the main organization.', status: 'live', icon: '📈' },
  { title: 'Daily monitoring enabled', description: 'The SEO Autobot GitHub Action runs every day and creates reviewable PRs.', status: 'live', icon: '🤖' },
  { title: 'Dashboard PR action added', description: 'Internal admins can create a reviewable SEO upgrade pull request directly from the SEO Intelligence page.', status: 'live', icon: '🚀' },
  { title: 'Real Google data connection needed', description: 'The current chart is a SETU planning index, not Google Trends or Search Console data.', status: 'next_pr', icon: '🔌' },
  { title: 'SEO landing pages needed', description: 'Import-export CRM, export quote, and comparison pages are generated through the dashboard PR action.', status: 'next_pr', icon: '📄' },
];

export const seoKeywordClusters: SeoKeywordCluster[] = [
  { cluster: 'Import export CRM', intent: 'commercial', priority: 'high', examples: ['import export CRM', 'CRM for import export business', 'CRM for exporters', 'CRM for importers', 'EXIM CRM software'], recommendedPage: '/solutions/import-export-crm', contentAngle: 'Explain why generic CRM breaks when quotes, incoterms, documents, compliance, and shipment follow-up live outside the pipeline.', currentCoverage: 'partial' },
  { cluster: 'Export management software for SMEs', intent: 'commercial', priority: 'high', examples: ['export management software', 'export software for small business', 'software for exporters', 'export sales CRM'], recommendedPage: '/solutions/export-management-software', contentAngle: 'Position Setu Flow as the fast-start operating layer for exporters who need buyer follow-up, quote governance, and order readiness.', currentCoverage: 'missing' },
  { cluster: 'Trade show lead capture CRM', intent: 'transactional', priority: 'high', examples: ['trade show lead capture app', 'business card scanner CRM', 'trade fair lead management', 'lead capture for exporters'], recommendedPage: '/features/trade-show-lead-capture', contentAngle: 'Show the mobile capture-to-follow-up workflow, including QR/vCard, OCR, event attribution, and post-show queue management.', currentCoverage: 'partial' },
  { cluster: 'Quote management for trade teams', intent: 'commercial', priority: 'high', examples: ['quote management software', 'export quote software', 'FOB CIF quote software', 'quotation software for exporters'], recommendedPage: '/features/export-quote-management', contentAngle: 'Own FOB/CIF/EXW/DDP, FX locking, approval threshold, product catalog pricing, and quote versioning.', currentCoverage: 'partial' },
  { cluster: 'Trade compliance and document readiness', intent: 'informational', priority: 'medium', examples: ['export compliance checklist', 'shipment document checklist', 'export documents CRM', 'country compliance checklist export'], recommendedPage: '/resources/export-compliance-checklist', contentAngle: 'Create practical checklists that attract informational searches and route users into Setu Flow execution workflows.', currentCoverage: 'missing' },
  { cluster: 'CRM alternatives for trade teams', intent: 'comparison', priority: 'medium', examples: ['HubSpot alternative for exporters', 'Zoho CRM for export business', 'Pipedrive alternative for import export', 'best CRM for exporters'], recommendedPage: '/compare/crm-for-exporters', contentAngle: 'Compare Setu Flow against generic CRM categories without negative claims: pipeline CRM vs trade execution CRM.', currentCoverage: 'missing' },
];

export const seoUpgradeActions: SeoUpgradeAction[] = [
  { title: 'Publish import-export CRM solution page', type: 'content', priority: 'p0', target: '/solutions/import-export-crm', expectedLift: 'High-intent commercial visibility', implementation: 'Use the Create PR button to generate the first reviewable landing page.' },
  { title: 'Add export quote management feature page', type: 'content', priority: 'p0', target: '/features/export-quote-management', expectedLift: 'Capture quote workflow searches', implementation: 'Use the Create PR button to generate quote workflow content with FOB/CIF/EXW/DDP language.' },
  { title: 'Create fair CRM comparison hub', type: 'content', priority: 'p1', target: '/compare/crm-for-exporters', expectedLift: 'Comparison-intent traffic', implementation: 'Use the Create PR button to generate a factual, reviewable comparison page.' },
  { title: 'Connect real Google data', type: 'automation', priority: 'p1', target: 'Supabase + Google Search Console', expectedLift: 'Replace planning indexes with real impressions, clicks, CTR, and query trends', implementation: 'Add Supabase tables and scheduled ingestion after Google Search Console access is configured.' },
];

export const seoOpportunities: SeoOpportunity[] = [
  { title: 'Generate competitor gap report daily with weekly review', impact: 'medium', effort: 'low', owner: 'seo_bot', action: 'Run the SEO bot daily, store report artifacts, and open PRs when recommendations change.', status: 'queued' },
];

export const seoPageMetadata = {
  siteUrl: 'https://www.setuflowcrm.com',
  primaryPositioning: 'Trade Execution CRM for import-export teams',
  analyticsNote: 'This chart is a SETU planning index, not Google Trends or Search Console data. Connect Google Search Console later to replace estimates with real impressions, clicks, CTR, and query trends.',
};
