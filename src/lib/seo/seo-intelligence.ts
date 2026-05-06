export type SeoCompetitor = {
  name: string;
  url: string;
  category: 'generic_crm' | 'trade_software' | 'logistics_trade' | 'sales_crm';
  positioning: string;
  likelyStrength: string;
  setuCounterPosition: string;
  keywords: string[];
};

export type SeoKeywordCluster = {
  cluster: string;
  intent: 'commercial' | 'informational' | 'comparison' | 'transactional';
  priority: 'high' | 'medium' | 'low';
  examples: string[];
  recommendedPage: string;
  contentAngle: string;
};

export type SeoOpportunity = {
  title: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  owner: 'seo_bot' | 'content' | 'engineering' | 'sales';
  action: string;
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
  },
  {
    name: 'Zoho CRM',
    url: 'https://www.zoho.com/crm/',
    category: 'generic_crm',
    positioning: 'Affordable configurable CRM suite for SMB sales, marketing, and support.',
    likelyStrength: 'Strong price-led CRM intent and wide app ecosystem.',
    setuCounterPosition: 'Position Setu Flow as the operational CRM for exporters/importers that outgrows spreadsheet quoting and compliance tracking.',
    keywords: ['zoho crm alternative', 'affordable crm', 'crm for exporters', 'crm automation'],
  },
  {
    name: 'Pipedrive',
    url: 'https://www.pipedrive.com/',
    category: 'sales_crm',
    positioning: 'Pipeline-focused CRM for sales teams that want deal visibility and easy adoption.',
    likelyStrength: 'Excellent pipeline and sales management keyword capture.',
    setuCounterPosition: 'Setu Flow should compare against pipeline CRMs by emphasizing post-deal execution, quote approvals, documents, and shipment readiness.',
    keywords: ['sales pipeline crm', 'deal tracking crm', 'pipedrive alternative'],
  },
  {
    name: 'Freshsales',
    url: 'https://www.freshworks.com/crm/sales/',
    category: 'sales_crm',
    positioning: 'AI-assisted sales CRM for pipeline, engagement, and customer data.',
    likelyStrength: 'Strong SMB CRM and AI CRM positioning.',
    setuCounterPosition: 'Setu Flow should use AI as a reviewable operator assist, not the primary category claim. The stronger claim is trade execution CRM.',
    keywords: ['ai crm', 'sales automation crm', 'crm for b2b sales'],
  },
  {
    name: 'CargoWise',
    url: 'https://www.cargowise.com/',
    category: 'logistics_trade',
    positioning: 'Enterprise logistics execution platform for freight forwarders, customs brokers, and logistics providers.',
    likelyStrength: 'Strong logistics, customs, and freight forwarding authority.',
    setuCounterPosition: 'Setu Flow should avoid claiming freight-forwarder ERP. Own exporter/importer CRM before freight execution becomes a logistics back-office problem.',
    keywords: ['export import software', 'freight forwarding software', 'global trade software'],
  },
  {
    name: 'SAP Global Trade Services',
    url: 'https://www.sap.com/products/financial-management/global-trade-services.html',
    category: 'trade_software',
    positioning: 'Enterprise global trade compliance and customs management.',
    likelyStrength: 'Enterprise compliance and SAP ecosystem trust.',
    setuCounterPosition: 'Setu Flow should target SME and mid-market trade teams needing fast CRM-to-execution adoption, not SAP-scale compliance projects.',
    keywords: ['global trade management software', 'export compliance software', 'trade compliance software'],
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
  },
  {
    cluster: 'Export management software for SMEs',
    intent: 'commercial',
    priority: 'high',
    examples: ['export management software', 'export software for small business', 'software for exporters', 'export sales CRM'],
    recommendedPage: '/solutions/export-management-software',
    contentAngle: 'Position Setu Flow as the fast-start operating layer for exporters who need buyer follow-up, quote governance, and order readiness.',
  },
  {
    cluster: 'Trade show lead capture CRM',
    intent: 'transactional',
    priority: 'high',
    examples: ['trade show lead capture app', 'business card scanner CRM', 'trade fair lead management', 'lead capture for exporters'],
    recommendedPage: '/features/trade-show-lead-capture',
    contentAngle: 'Show the mobile capture-to-follow-up workflow, including QR/vCard, OCR, event attribution, and post-show queue management.',
  },
  {
    cluster: 'Quote management for trade teams',
    intent: 'commercial',
    priority: 'high',
    examples: ['quote management software', 'export quote software', 'FOB CIF quote software', 'quotation software for exporters'],
    recommendedPage: '/features/export-quote-management',
    contentAngle: 'Own FOB/CIF/EXW/DDP, FX locking, approval threshold, product catalog pricing, and quote versioning.',
  },
  {
    cluster: 'Trade compliance and document readiness',
    intent: 'informational',
    priority: 'medium',
    examples: ['export compliance checklist', 'shipment document checklist', 'export documents CRM', 'country compliance checklist export'],
    recommendedPage: '/resources/export-compliance-checklist',
    contentAngle: 'Create practical checklists that attract informational searches and route users into Setu Flow execution workflows.',
  },
  {
    cluster: 'CRM alternatives for trade teams',
    intent: 'comparison',
    priority: 'medium',
    examples: ['HubSpot alternative for exporters', 'Zoho CRM for export business', 'Pipedrive alternative for import export', 'best CRM for exporters'],
    recommendedPage: '/compare/crm-for-exporters',
    contentAngle: 'Compare Setu Flow against generic CRM categories without negative claims: pipeline CRM vs trade execution CRM.',
  },
];

export const seoOpportunities: SeoOpportunity[] = [
  {
    title: 'Create solution pages for high-intent import/export CRM searches',
    impact: 'high',
    effort: 'medium',
    owner: 'content',
    action: 'Publish dedicated solution pages instead of relying only on the home page to rank for every keyword cluster.',
  },
  {
    title: 'Add WebSite SearchAction, FAQPage, BreadcrumbList, and SoftwareApplication schema coverage',
    impact: 'high',
    effort: 'low',
    owner: 'engineering',
    action: 'Extend structured data where page content supports it and keep JSON-LD generated from a typed source.',
  },
  {
    title: 'Generate competitor gap report weekly',
    impact: 'medium',
    effort: 'low',
    owner: 'seo_bot',
    action: 'Run the SEO bot on a schedule, store a report artifact, and open a PR when recommendations change.',
  },
  {
    title: 'Build comparison pages for generic CRM alternatives',
    impact: 'medium',
    effort: 'medium',
    owner: 'content',
    action: 'Create comparison pages that focus on feature gaps: incoterms, quote approvals, FX, compliance, documents, trade show capture, and order handoff.',
  },
  {
    title: 'Use homepage internal links to route bots and buyers into topic pages',
    impact: 'medium',
    effort: 'low',
    owner: 'engineering',
    action: 'Add contextual links from home sections into solution, feature, comparison, and resource pages as they are published.',
  },
];

export const seoPageMetadata = {
  siteUrl: 'https://www.setuflowcrm.com',
  primaryPositioning: 'Trade Execution CRM for import-export teams',
  mainOrgAccessNote: 'This page is intended for the Setu Flow main organization only. Customer workspaces should not use competitor or SEO governance tooling.',
};
