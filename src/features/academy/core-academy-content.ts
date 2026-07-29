export type AcademyStep = {
  id: string;
  title: string;
  route: string;
  screenshot: string;
  shows: string[];
};

export type AcademyModule = {
  id: string;
  title: string;
  summary: string;
  steps: AcademyStep[];
};

export const CORE_ACADEMY_VERSION = '2026.07.29-v1';

export const coreAcademyModules: AcademyModule[] = [
  {
    id: 'navigation-dashboard',
    title: 'Navigation & Dashboard',
    summary: 'Learn the global shell, workspace scope, dashboard filters, commercial signals, market drill-downs, and action queue.',
    steps: [
      { id: 'nav-01', title: 'Global navigation and workspace scope', route: '/dashboard', screenshot: 'ACADEMY-001-global-navigation.png', shows: ['Full left navigation', 'Buyer / Supplier scope', 'Quick Lead', 'Setu Guru', 'User and notification controls'] },
      { id: 'dash-01', title: 'Dashboard command center', route: '/dashboard', screenshot: 'ACADEMY-002-dashboard-command-center.png', shows: ['Dashboard filters', 'KPI strip', 'Market command map', 'Needs attention queue'] },
      { id: 'dash-02', title: 'Market drill-down and next actions', route: '/dashboard', screenshot: 'ACADEMY-003-dashboard-market-drilldown.png', shows: ['Selected market', 'Priority accounts', 'Blockers', 'Clear market action'] },
      { id: 'dash-03', title: 'Analytics and Reports entry paths', route: '/dashboard/analytics', screenshot: 'ACADEMY-004-analytics-and-reports.png', shows: ['Analytics filters', 'Conversion funnel', 'Export action', 'Reports navigation'] },
    ],
  },
  {
    id: 'growth-center',
    title: 'Growth Center',
    summary: 'Define the ICP, target markets, discover external opportunities, review intelligence, and move qualified opportunities into CRM.',
    steps: [
      { id: 'growth-01', title: 'Growth Center overview', route: '/growth-center', screenshot: 'ACADEMY-005-growth-center-overview.png', shows: ['Growth dashboard', 'ICP status', 'Target markets', 'Opportunity finder'] },
      { id: 'growth-02', title: 'ICP Builder', route: '/growth-center', screenshot: 'ACADEMY-006-icp-builder.png', shows: ['Product fit', 'Buyer type', 'Target geography', 'Save and continue'] },
      { id: 'growth-03', title: 'External opportunity discovery', route: '/growth-center', screenshot: 'ACADEMY-007-external-opportunity-finder.png', shows: ['External result source', 'Company details', 'Fit reasoning', 'Import to CRM'] },
      { id: 'growth-04', title: 'Growth work queue', route: '/growth-center', screenshot: 'ACADEMY-008-growth-work-queue.png', shows: ['Queued research', 'Outreach status', 'Owner', 'Recommended next action'] },
    ],
  },
  {
    id: 'capture-leads',
    title: 'Capture, Quick Lead & Leads',
    summary: 'Capture clean buyer or supplier records, review extracted data, qualify leads, and use the canonical Lead Command Center.',
    steps: [
      { id: 'capture-01', title: 'Quick Lead drawer', route: '/leads?quickLead=1', screenshot: 'ACADEMY-009-quick-lead-drawer.png', shows: ['Buyer / Supplier type', 'Company and contact', 'Source', 'Products and market', 'Follow-up'] },
      { id: 'capture-02', title: 'Card and document capture', route: '/contact-exchange/scan', screenshot: 'ACADEMY-010-contact-capture-upload.png', shows: ['Upload area', 'Assist text', 'Source preview', 'Run review extraction'] },
      { id: 'capture-03', title: 'Human review before import', route: '/contact-exchange/scan', screenshot: 'ACADEMY-011-contact-capture-review.png', shows: ['Source beside extracted fields', 'Buyer / Supplier choice', 'Confirm review', 'Create lead'] },
      { id: 'leads-01', title: 'Lead Queue', route: '/leads', screenshot: 'ACADEMY-012-lead-queue.png', shows: ['Saved views', 'Search and filters', 'Critical / Due Today / Active groups', 'Bulk actions'] },
      { id: 'leads-02', title: 'Buyer Lead Command Center', route: '/leads/[buyerLeadId]', screenshot: 'ACADEMY-013-buyer-command-center.png', shows: ['Buyer profile', 'Real pipeline stages', 'Readiness', 'Next touchpoint', 'Commercial card'] },
      { id: 'leads-03', title: 'Qualification and mapping', route: '/leads/[buyerLeadId]#qualification', screenshot: 'ACADEMY-014-lead-qualification-mapping.png', shows: ['Categories', 'Products', 'Markets', 'Qualification notes'] },
      { id: 'leads-04', title: 'Supplier Command Center', route: '/leads/[supplierLeadId]?mode=suppliers', screenshot: 'ACADEMY-015-supplier-command-center.png', shows: ['Supplier journey phases', 'Capability', 'Compliance', 'Cost requests', 'Approval and linked demand'] },
    ],
  },
  {
    id: 'quotes',
    title: 'Quote Builder, Approval & Sending',
    summary: 'Build a governed quote from the lead, clear send gates, obtain approval where required, and send a tracked customer quote.',
    steps: [
      { id: 'quote-01', title: 'Quote Builder — Product', route: '/leads/[buyerLeadId]/quote?step=1', screenshot: 'ACADEMY-016-quote-builder-product.png', shows: ['Five-step builder', 'Product / variant selection', 'MOQ', 'Case and unit price'] },
      { id: 'quote-02', title: 'Quote Builder — Terms', route: '/leads/[buyerLeadId]/quote?step=2', screenshot: 'ACADEMY-017-quote-builder-terms.png', shows: ['Currency', 'FX', 'Pricing type', 'Incoterm and delivery terms'] },
      { id: 'quote-03', title: 'Quote Builder — Pricing', route: '/leads/[buyerLeadId]/quote?step=3', screenshot: 'ACADEMY-018-quote-builder-pricing.png', shows: ['Locked product context', 'Discount', 'Freight', 'Pricing source and subtotal'] },
      { id: 'quote-04', title: 'Quote Builder — Review', route: '/leads/[buyerLeadId]/quote?step=4', screenshot: 'ACADEMY-019-quote-builder-review.png', shows: ['Customer preview', 'Line totals', 'Quote total', 'Approval warning'] },
      { id: 'quote-05', title: 'Quote Builder — Send Gate', route: '/leads/[buyerLeadId]/quote?step=5', screenshot: 'ACADEMY-020-quote-builder-send-gate.png', shows: ['Final checks', 'Blockers', 'Submit for approval', 'Preview PDF and Send Quote'] },
      { id: 'approval-01', title: 'Approval Queue', route: '/approval-queue', screenshot: 'ACADEMY-021-approval-queue.png', shows: ['Pending request', 'Reason', 'Version', 'Approve and Reject controls'] },
      { id: 'approval-02', title: 'Approval pending lock', route: '/leads/[buyerLeadId]/quote?step=5', screenshot: 'ACADEMY-022-approval-pending-lock.png', shows: ['Editing locked', 'Approval state', 'Open Approval Queue', 'Disabled Send Quote'] },
      { id: 'send-01', title: 'Approval to Send confirmation', route: '/approval-send?quoteId=[quoteId]', screenshot: 'ACADEMY-023-approval-send-confirmation.png', shows: ['Approved quote summary', 'Buyer', 'Version', 'Tracked send confirmation'] },
      { id: 'quotes-01', title: 'Quotes lifecycle workspace', route: '/quotes', screenshot: 'ACADEMY-024-quotes-lifecycle-workspace.png', shows: ['Lifecycle filters', 'Customer grouping', 'Recommended action', 'Outcome controls'] },
    ],
  },
  {
    id: 'orders',
    title: 'Orders & Execution',
    summary: 'Move an accepted quote through actual lines, buyer documents, packing, freight, processing, delivery, invoicing, and closeout.',
    steps: [
      { id: 'order-01', title: 'Orders cockpit', route: '/orders', screenshot: 'ACADEMY-025-orders-cockpit.png', shows: ['Order KPIs', 'Order list', 'Execution stage strip', 'Blockers and next action'] },
      { id: 'order-02', title: 'Actual order lines approval', route: '/orders', screenshot: 'ACADEMY-026-order-actual-lines.png', shows: ['Quoted vs actual lines', 'Changes and reasons', 'Discount reason', 'Approval gate'] },
      { id: 'order-03', title: 'Buyer document gate', route: '/orders', screenshot: 'ACADEMY-027-order-buyer-document.png', shows: ['Prepare', 'Preview', 'Approve', 'Tracked send'] },
      { id: 'order-04', title: 'Packing and freight', route: '/orders', screenshot: 'ACADEMY-028-order-packing-freight.png', shows: ['Cartons and pallets', 'Weights and CBM', 'Pickup and destination', 'Freight queue'] },
      { id: 'order-05', title: 'Processing through closeout', route: '/orders', screenshot: 'ACADEMY-029-order-processing-closeout.png', shows: ['Pick / Pack / QC', 'Delivery Note', 'Final Invoice', 'Paid & Closed'] },
    ],
  },
  {
    id: 'work',
    title: 'Tasks, Events, Documents & Catalog',
    summary: 'Manage daily work, trade events, documents, products, pricing readiness, and price lists.',
    steps: [
      { id: 'tasks-01', title: 'Task queue', route: '/tasks', screenshot: 'ACADEMY-030-task-queue.png', shows: ['Overdue and Today groups', 'My tasks', 'SLA risk', 'Create and complete task'] },
      { id: 'tasks-02', title: 'Task calendar', route: '/tasks', screenshot: 'ACADEMY-031-task-calendar.png', shows: ['Month view', 'Task pills', 'Click date to create', 'Completed state'] },
      { id: 'events-01', title: 'Trade Events command center', route: '/trade-events', screenshot: 'ACADEMY-032-trade-events-command-center.png', shows: ['Live / upcoming event', 'Capture shortcuts', 'Event metrics', 'Booth workflow'] },
      { id: 'events-02', title: 'Event capture handoff', route: '/trade-events', screenshot: 'ACADEMY-033-event-capture-handoff.png', shows: ['Add Booth Lead', 'Scan Badge', 'Review Leads', 'Event source retained'] },
      { id: 'catalog-01', title: 'Catalog workspace', route: '/products', screenshot: 'ACADEMY-034-catalog-workspace.png', shows: ['Products / Pricing / Spreadsheet modes', 'Pricing gaps', 'Quote-ready filter', 'Export and Add Product'] },
      { id: 'catalog-02', title: 'Product detail and pricing', route: '/products', screenshot: 'ACADEMY-035-product-detail-pricing.png', shows: ['Product overview', 'Variants', 'MOQ', 'Pricing rules and readiness'] },
      { id: 'documents-01', title: 'Documents workspace', route: '/documents', screenshot: 'ACADEMY-036-documents-workspace.png', shows: ['Required documents', 'Missing / expiring state', 'Upload', 'Related record'] },
    ],
  },
  {
    id: 'admin-collaboration-ai',
    title: 'Admin, Chat & Setu Guru',
    summary: 'Configure the workspace safely, collaborate on records, and use Setu Guru in the correct business context.',
    steps: [
      { id: 'admin-01', title: 'Admin Home', route: '/admin/overview', screenshot: 'ACADEMY-037-admin-home.png', shows: ['Setup progress', 'Identity', 'Trade setup', 'Commerce rules', 'Governance'] },
      { id: 'admin-02', title: 'Organization and team', route: '/admin/organization', screenshot: 'ACADEMY-038-admin-organization-team.png', shows: ['Company profile', 'Geography and currency', 'Members and roles', 'Invitations'] },
      { id: 'admin-03', title: 'Markets, pipelines and catalog setup', route: '/admin/markets', screenshot: 'ACADEMY-039-admin-trade-setup.png', shows: ['Markets', 'Pipelines and stages', 'Catalog', 'Trade events'] },
      { id: 'admin-04', title: 'Commercial defaults and governance', route: '/admin/pricing-engine', screenshot: 'ACADEMY-040-admin-commercial-governance.png', shows: ['Approval threshold', 'Currency and FX', 'Security and roles', 'Audit log'] },
      { id: 'chat-01', title: 'Record discussion drawer', route: '/quotes', screenshot: 'ACADEMY-041-record-discussion-drawer.png', shows: ['Record-bound conversation', 'Participants', 'Mentions', 'Replies, reactions and attachments'] },
      { id: 'guru-01', title: 'Setu Guru global assistant', route: '/setu-guru', screenshot: 'ACADEMY-042-setu-guru-global-assistant.png', shows: ['Current page context', 'Prompt composer', 'Recommended actions', 'Business-safe response'] },
      { id: 'guru-02', title: 'Setu Guru lead tools', route: '/leads/[buyerLeadId]', screenshot: 'ACADEMY-043-setu-guru-lead-tools.png', shows: ['Research', 'Outreach generator', 'Reply analyzer', 'Quote assistant'] },
      { id: 'guru-03', title: 'Setu Guru supplier and trade-event tools', route: '/leads/[supplierLeadId]?mode=suppliers', screenshot: 'ACADEMY-044-setu-guru-supplier-event-tools.png', shows: ['Supplier RFQ assistant', 'Compliance guidance', 'Trade-event recommendations', 'Human approval boundary'] },
    ],
  },
];

export const coreAcademyStepCount = coreAcademyModules.reduce((sum, module) => sum + module.steps.length, 0);
