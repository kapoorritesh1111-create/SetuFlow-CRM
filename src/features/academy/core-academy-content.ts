export type AcademyStep = {
  id: string;
  title: string;
  route: string;
  startRoute?: string;
  screenshot: string;
  shows: string[];
  instructions: string[];
  journeys?: Array<'buyers' | 'suppliers' | 'both'>;
};

export type AcademyModule = {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  steps: AcademyStep[];
};

export const CORE_ACADEMY_VERSION = '2026.07.29-v3';

const step = (
  id: string,
  title: string,
  route: string,
  screenshot: string,
  shows: string[],
  instructions: string[],
  options: Pick<AcademyStep, 'startRoute' | 'journeys'> = {},
): AcademyStep => ({ id, title, route, screenshot, shows, instructions, ...options });

export const coreAcademyModules: AcademyModule[] = [
  {
    id: 'navigation-dashboard',
    title: '1. Navigation & Dashboard',
    summary: 'Understand the app shell, workspace perspective, dashboard, analytics, reports, and intervention queues.',
    outcome: 'You can move through Setu Flow without guessing where work lives.',
    steps: [
      step('nav-01', 'Global navigation and workspace perspective', '/dashboard', 'ACADEMY-001-global-navigation.png', ['Left navigation', 'All / Buyers / Suppliers perspective', 'Quick Lead', 'Setu Guru launcher', 'Profile and notifications'], ['Sign in and open Home.', 'Use the workspace perspective control to switch between All, Buyers, and Suppliers.', 'Scan the left navigation from Home through Orders, Tasks, Catalog, Documents, and Admin.', 'Locate Quick Lead, Setu Guru, notifications, and your profile menu.']),
      step('dash-01', 'Dashboard command center', '/dashboard', 'ACADEMY-002-dashboard-command-center.png', ['Date and owner filters', 'KPI strip', 'Market view', 'Needs Attention'], ['Open Home from the left navigation.', 'Set the date, owner, and workspace perspective filters.', 'Review the KPI strip and market view.', 'Open an item from Needs Attention to see the record requiring action.']),
      step('dash-02', 'Market drill-down and next actions', '/dashboard', 'ACADEMY-003-dashboard-market-drilldown.png', ['Selected market', 'Priority accounts', 'Blockers', 'Next action'], ['Select a market or country in the dashboard.', 'Review priority accounts and stalled work for that market.', 'Open a blocker to see the related lead, quote, or order.', 'Return to Home and clear the market filter.']),
      step('dash-03', 'Analytics and Reports', '/dashboard/analytics', 'ACADEMY-004-analytics-and-reports.png', ['Analytics tabs', 'Conversion funnel', 'Pipeline movement', 'Reports entry'], ['Open Analytics from Home.', 'Change the period and workspace perspective.', 'Review conversion, pipeline movement, top products, and anomalies.', 'Open Reports and identify the exportable owner-facing reports.']),
    ],
  },
  {
    id: 'growth-center',
    title: '2. Growth Center',
    summary: 'Define an ICP, discover external opportunities, review fit evidence, and move qualified companies into CRM.',
    outcome: 'You can find new external buyers or distributors instead of only reviewing existing CRM leads.',
    steps: [
      step('growth-01', 'Open Growth Center', '/growth-agent', 'ACADEMY-005-growth-center-overview.png', ['Growth dashboard', 'ICP status', 'Recommendations', 'External discovery'], ['Open Setu Guru from the app shell.', 'Choose Growth Center, or open the Growth Center entry from the Setu Guru menu.', 'Confirm the browser route is /growth-agent.', 'Review ICP status, recommendations, external discovery, and the work queue.']),
      step('growth-02', 'Create or select an ICP', '/growth-agent', 'ACADEMY-006-icp-builder.png', ['Product fit', 'Buyer type', 'Target geography', 'ICP selector'], ['Open the ICP area.', 'Create a new ICP or select one owned by your workspace.', 'Choose products, buyer type, company profile, and target markets.', 'Save the ICP and confirm it remains selected after refresh.']),
      step('growth-03', 'Find external opportunities', '/growth-agent', 'ACADEMY-007-external-opportunity-finder.png', ['External source', 'Company profile', 'Fit reasoning', 'Import action'], ['Start external discovery from the selected ICP.', 'Review the source, website, location, and fit explanation for each result.', 'Reject weak or duplicate companies.', 'Import a qualified external company into CRM and confirm it appears in Leads.']),
      step('growth-04', 'Manage the growth work queue', '/growth-agent', 'ACADEMY-008-growth-work-queue.png', ['Research queue', 'Owner', 'Outreach status', 'Recommended next action'], ['Open the Growth work queue.', 'Assign an owner and review the recommended next action.', 'Generate or record outreach only after validating the company.', 'Move completed research into the correct follow-up state.']),
    ],
  },
  {
    id: 'capture-leads',
    title: '3. Capture, Quick Lead & Lead Queue',
    summary: 'Capture clean buyer or supplier records, review extracted data, and enter the correct command center.',
    outcome: 'Every new relationship enters CRM with the correct type, owner, source, and next action.',
    steps: [
      step('capture-01', 'Create a Quick Lead', '/leads?quickLead=1', 'ACADEMY-009-quick-lead-drawer.png', ['Buyer / Supplier type', 'Company and contact', 'Source', 'Products', 'Follow-up'], ['Open Leads.', 'Select Quick Lead.', 'Choose Buyer or Supplier before entering details.', 'Enter company, contact, phone or email, source, products, market, and next follow-up.', 'Save and confirm the lead appears in the correct queue.']),
      step('capture-02', 'Scan a card or upload a document', '/contact-exchange/scan', 'ACADEMY-010-contact-capture-upload.png', ['Camera or upload', 'Source preview', 'Extraction action', 'Manual fallback'], ['Open Capture.', 'Choose camera, image upload, or document upload.', 'Confirm the source image is readable.', 'Run extraction, or use manual entry when extraction is incomplete.']),
      step('capture-03', 'Review extracted contact details', '/contact-exchange/scan', 'ACADEMY-011-contact-capture-review.png', ['Source beside fields', 'Buyer / Supplier choice', 'Field corrections', 'Create lead'], ['Compare every extracted field with the source image.', 'Correct company, contact, phone, email, title, and country.', 'Choose Buyer or Supplier and retain the capture source.', 'Create the lead only after review.']),
      step('leads-01', 'Use the Lead Queue', '/leads', 'ACADEMY-012-lead-queue.png', ['Saved views', 'Search', 'Filters', 'Critical and due groups', 'Bulk actions'], ['Open Leads.', 'Switch between Buyers and Suppliers.', 'Use search, owner, stage, market, and due-date filters.', 'Open Critical, Due Today, or Active work.', 'Select a record to enter its command center.']),
    ],
  },
  {
    id: 'buyer-journey',
    title: '4. Buyer Journey: Lead to Quote',
    summary: 'Qualify a buyer, map products and markets, build a quote, clear approval, and send it.',
    outcome: 'You can move a buyer from initial follow-up to a governed, tracked quote.',
    steps: [
      step('buyer-01', 'Buyer Lead Command Center', '/leads/[buyerLeadId]', 'ACADEMY-013-buyer-command-center.png', ['Buyer profile', 'Pipeline stage', 'Readiness', 'Next touchpoint', 'Commercial card'], ['Open Leads and choose Buyers.', 'Select a buyer record.', 'Review company and contact details, owner, stage, readiness, activity, and next touchpoint.', 'Update the next action before leaving the record.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('buyer-02', 'Qualify and map buyer demand', '/leads/[buyerLeadId]#qualification', 'ACADEMY-014-lead-qualification-mapping.png', ['Qualification', 'Markets', 'Products', 'Commercial notes'], ['Open the buyer command center.', 'Complete qualification questions and target market details.', 'Map requested categories and products.', 'Record volume, timing, pricing expectation, and decision process.', 'Save and confirm readiness updates.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('quote-01', 'Quote Builder — Product', '/leads/[buyerLeadId]/quote?step=1', 'ACADEMY-016-quote-builder-product.png', ['Builder steps', 'Catalog product', 'Variant', 'MOQ', 'Unit and case pricing'], ['From the buyer command center, choose Create Quote.', 'Select products and variants from Catalog.', 'Review MOQ, units per case, quantity, and base price.', 'Do not continue until every line has a valid price and quantity.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('quote-02', 'Quote Builder — Terms', '/leads/[buyerLeadId]/quote?step=2', 'ACADEMY-017-quote-builder-terms.png', ['Currency', 'FX', 'Incoterm', 'Payment and delivery terms'], ['Continue to Terms.', 'Confirm customer currency and the locked FX context.', 'Choose Incoterm, payment terms, validity, lead time, and delivery terms.', 'Document any exception before continuing.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('quote-03', 'Quote Builder — Pricing', '/leads/[buyerLeadId]/quote?step=3', 'ACADEMY-018-quote-builder-pricing.png', ['Base pricing', 'Discount', 'Freight', 'Override reason', 'Subtotal'], ['Continue to Pricing.', 'Review catalog-derived pricing for every line.', 'Add freight or commercial adjustments.', 'Enter an auditable reason for any manual override or discount.', 'Confirm subtotal and margin posture.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('quote-04', 'Quote Builder — Review and send gate', '/leads/[buyerLeadId]/quote?step=5', 'ACADEMY-019-quote-builder-review.png', ['Customer preview', 'Totals', 'Approval warning', 'PDF preview', 'Send gate'], ['Review the customer-facing quote.', 'Check buyer identity, products, terms, totals, and validity.', 'Preview the PDF in a new tab.', 'Resolve every blocker before submitting for approval or sending.'], { startRoute: '/leads?mode=buyers', journeys: ['buyers', 'both'] }),
      step('approval-01', 'Approval and Sending workspace', '/approval-send', 'ACADEMY-021-approval-queue.png', ['Pending approvals', 'Reason', 'Version', 'Approve / Reject', 'Send readiness'], ['Open Approvals & Sending from the navigation.', 'Select the pending quote.', 'Review the approval reason, quote version, pricing changes, and comments.', 'Approve or reject with a clear note.', 'After approval, confirm the quote is send-ready.'], { journeys: ['buyers', 'both'] }),
      step('send-01', 'Send and track the quote', '/approval-send', 'ACADEMY-023-approval-send-confirmation.png', ['Approved quote', 'Recipient', 'Channel', 'Tracked send', 'History'], ['Open the approved quote in Approvals & Sending.', 'Confirm recipient, version, PDF, and message.', 'Send using the approved channel.', 'Verify the send event appears in communication history and the quote lifecycle updates.'], { journeys: ['buyers', 'both'] }),
      step('quotes-01', 'Manage quote lifecycle and outcomes', '/quotes', 'ACADEMY-024-quotes-lifecycle-workspace.png', ['Lifecycle filters', 'Customer groups', 'Recommended action', 'Won / Lost outcome'], ['Open Quotes.', 'Filter by Draft, Approval, Sent, Viewed, Accepted, Expired, or Lost.', 'Open the recommended next action for a quote.', 'Record the commercial outcome and reason.', 'Convert an accepted quote into an order.'], { journeys: ['buyers', 'both'] }),
    ],
  },
  {
    id: 'supplier-journey',
    title: '5. Supplier Journey',
    summary: 'Verify suppliers, map capability, manage compliance, request costs, and approve supply partners.',
    outcome: 'You can manage suppliers as a distinct sourcing workflow instead of treating them like buyers.',
    steps: [
      step('supplier-01', 'Supplier Command Center', '/leads/[supplierLeadId]?mode=suppliers', 'ACADEMY-015-supplier-command-center.png', ['Supplier phases', 'Capability', 'Compliance', 'Cost requests', 'Approval'], ['Open Leads and choose Suppliers.', 'Select a supplier.', 'Review profile, verification status, capability, compliance, open cost requests, and linked demand.', 'Set the correct supplier stage and next action.'], { startRoute: '/leads?mode=suppliers', journeys: ['suppliers', 'both'] }),
      step('supplier-02', 'Capability and compliance mapping', '/leads/[supplierLeadId]?mode=suppliers', 'ACADEMY-043-setu-guru-lead-tools.png', ['Products and capacity', 'Markets served', 'Certifications', 'Document expiry'], ['Open the supplier command center.', 'Map products, production capacity, lead times, MOQs, and markets served.', 'Record required certifications and upload supporting documents.', 'Flag missing or expiring compliance items.'], { startRoute: '/leads?mode=suppliers', journeys: ['suppliers', 'both'] }),
      step('supplier-03', 'Cost request and response review', '/leads/[supplierLeadId]?mode=suppliers', 'ACADEMY-044-setu-guru-supplier-event-tools.png', ['RFQ / cost request', 'Supplier response', 'Commercial comparison', 'Approval'], ['Create a cost request from the supplier record.', 'Add products, quantities, packaging, destination, terms, and response deadline.', 'Review the supplier response against demand and other suppliers.', 'Approve, reject, or request clarification with a recorded reason.'], { startRoute: '/leads?mode=suppliers', journeys: ['suppliers', 'both'] }),
    ],
  },
  {
    id: 'orders-execution',
    title: '6. Orders & Execution',
    summary: 'Move accepted business through order lines, buyer documents, packing, freight, delivery, invoicing, and closeout.',
    outcome: 'You can prove operational readiness from accepted quote through paid and closed.',
    steps: [
      step('order-01', 'Orders cockpit', '/orders', 'ACADEMY-025-orders-cockpit.png', ['Order KPIs', 'Execution stages', 'Blockers', 'Next action'], ['Open Orders.', 'Filter by execution stage, owner, market, or risk.', 'Open an order with a blocker.', 'Review accepted quote context, order value, release state, and next action.']),
      step('order-02', 'Confirm actual order lines', '/orders', 'ACADEMY-026-order-actual-lines.png', ['Quoted vs actual', 'Change reason', 'Discount reason', 'Approval gate'], ['Open the order.', 'Compare accepted quote lines with actual ordered lines.', 'Record quantity, product, or price changes with reasons.', 'Submit material changes for approval before release.']),
      step('order-03', 'Prepare buyer documents', '/orders', 'ACADEMY-027-order-buyer-document.png', ['Prepare', 'Preview', 'Approve', 'Tracked send'], ['Open the Documents stage within the order.', 'Prepare the required buyer document.', 'Preview the PDF in a new tab.', 'Approve and send the correct version.', 'Confirm the document appears in the global Documents workspace.']),
      step('order-04', 'Packing and freight', '/orders', 'ACADEMY-028-order-packing-freight.png', ['Cartons', 'Pallets', 'Weights', 'CBM', 'Freight request'], ['Open Packing and Freight.', 'Enter cartons, units, gross and net weight, dimensions, pallets, and CBM.', 'Add pickup, destination, readiness date, and freight notes.', 'Create or update the freight request.']),
      step('order-05', 'Processing, delivery, invoice and closeout', '/orders', 'ACADEMY-029-order-processing-closeout.png', ['Pick / Pack / QC', 'Delivery Note', 'Final Invoice', 'Paid & Closed'], ['Complete Pick, Pack, and Quality Check evidence.', 'Prepare and send delivery documentation.', 'Create the final invoice and record payment status.', 'Close the order only after delivery and payment requirements are complete.']),
    ],
  },
  {
    id: 'catalog-pricing',
    title: '7. Catalog, Pricing & Price Lists',
    summary: 'Maintain quote-ready products, pricing rules, and shareable buyer price lists.',
    outcome: 'Catalog becomes the pricing source and price lists become a governed sharing workflow.',
    steps: [
      step('catalog-01', 'Catalog workspace', '/products', 'ACADEMY-034-catalog-workspace.png', ['Products', 'Pricing', 'Spreadsheet view', 'Readiness filters'], ['Open Catalog.', 'Switch between Products, Pricing, and Spreadsheet views.', 'Filter for missing pricing or non-quote-ready products.', 'Open a product to correct its readiness gaps.']),
      step('catalog-02', 'Product details and pricing readiness', '/products', 'ACADEMY-035-product-detail-pricing.png', ['Product identity', 'Variants', 'MOQ', 'Units per case', 'Pricing rules'], ['Open a product.', 'Confirm name, SKU, category, description, images, and active status.', 'Add variants, packaging, MOQ, units per case, currency, and base price.', 'Save and confirm the product becomes quote-ready.']),
      step('price-list-01', 'Create a price list', '/price-lists', 'ACADEMY-045-create-price-list.png', ['Price list name', 'Market', 'Currency', 'Validity', 'Products'], ['Open Price Lists from Catalog.', 'Create a price list and choose market, customer type, currency, validity, and notes.', 'Add products from the quote-ready catalog.', 'Review product count and save the draft list.']),
      step('price-list-02', 'Share and manage a price list', '/price-lists', 'ACADEMY-046-share-price-list.png', ['Share link', 'Customer pricing', 'Preview', 'Status', 'Expiry'], ['Open the saved price list.', 'Adjust buyer-specific prices only where permitted.', 'Preview the customer-facing list.', 'Create or copy the share link and confirm expiry and status.', 'Use the lead-level Share Price List action when sending to a specific buyer.']),
    ],
  },
  {
    id: 'documents',
    title: '8. Documents Workspace',
    summary: 'Find generated and uploaded documents across leads, quotes, contracts, and order execution.',
    outcome: 'You can locate the latest PDF, related client record, version, status, and expiry from one place.',
    steps: [
      step('documents-01', 'Documents library', '/documents', 'ACADEMY-036-documents-workspace.png', ['Client grouping', 'Quote and order documents', 'Status', 'PDF readiness', 'Linked record'], ['Open Documents.', 'Search by client, quote, order, or document type.', 'Group by Client, Status, Type, or Timeline.', 'Open the linked lead, quote, or order record.', 'Open an available PDF in a new tab.']),
      step('documents-02', 'Understand document sources and versions', '/documents', 'ACADEMY-047-document-source-version.png', ['Generated document', 'Uploaded evidence', 'Version', 'Expiry', 'Share history'], ['Open a document entry.', 'Identify whether it came from a lead, quote, or order workflow.', 'Review status, version, created date, expiry, and latest share state.', 'Return to the source record to regenerate or correct the document when needed.']),
    ],
  },
  {
    id: 'tasks-events-card',
    title: '9. Tasks, Trade Events & My Card',
    summary: 'Manage daily work, capture at events, and share your digital contact card.',
    outcome: 'You can handle follow-ups, event capture, and personal sharing without leaving the operating flow.',
    steps: [
      step('tasks-01', 'Task queue and calendar', '/tasks', 'ACADEMY-030-task-queue.png', ['Overdue', 'Today', 'My Tasks', 'Calendar', 'Complete action'], ['Open Tasks.', 'Review Overdue, Today, and My Tasks.', 'Create a task linked to a lead, quote, or order.', 'Use the calendar to reschedule or create work.', 'Complete the task and confirm the related record updates.']),
      step('events-01', 'Trade Events command center', '/trade-events', 'ACADEMY-032-trade-events-command-center.png', ['Live and upcoming events', 'Booth details', 'Capture shortcuts', 'Event metrics'], ['Open Trade Events.', 'Select the live or upcoming event.', 'Review booth, team, goals, and capture shortcuts.', 'Use Add Booth Lead or Scan Badge.', 'Confirm the event source remains attached to the lead.']),
      step('card-01', 'Set up My Digital vCard', '/contact-exchange/vcard', 'ACADEMY-048-my-card-setup.png', ['Identity', 'Photo and logo', 'Phone and links', 'Share slug', 'Preview'], ['Open your profile menu and choose My Card.', 'Add photo, phone, website, title, and social links.', 'Review company identity and share slug.', 'Save and preview the public card.']),
      step('card-02', 'Share My Card and review interest', '/contact-exchange/vcard', 'ACADEMY-049-my-card-share.png', ['QR code', 'Copy link', 'Device share', 'Download contact', 'Quote and appointment interest'], ['Open My Card.', 'Use QR, copy link, device share, or downloadable contact file.', 'Open the public card to validate the experience.', 'Review quote requests, appointment interest, and recent leads created from the card.']),
    ],
  },
  {
    id: 'admin-collaboration-ai',
    title: '10. Admin, Record Discussion & Setu Guru',
    summary: 'Configure the workspace, collaborate on records, and use contextual AI with human approval.',
    outcome: 'You can govern the workspace and use Setu Guru without bypassing business controls.',
    steps: [
      step('admin-01', 'Organization and team setup', '/admin/organization', 'ACADEMY-038-admin-organization-team.png', ['Company identity', 'Currency and geography', 'Members', 'Roles', 'Invitations'], ['Open Admin / Organization.', 'Review company identity, address, geography, currency, and logo.', 'Open people and access settings.', 'Invite users and assign the minimum required role.', 'Confirm changes are reflected in the app shell.']),
      step('admin-02', 'Commercial defaults and governance', '/admin/pricing-engine', 'ACADEMY-040-admin-commercial-governance.png', ['Pricing defaults', 'Approval threshold', 'FX policy', 'Audit trail'], ['Open the relevant Admin commercial settings.', 'Review default currency, FX behavior, pricing rules, and approval thresholds.', 'Confirm roles allowed to override, approve, and send.', 'Review the audit trail after changing a governed setting.'], { startRoute: '/admin/organization' }),
      step('chat-01', 'Record discussion', '/quotes', 'ACADEMY-041-record-discussion-drawer.png', ['Record-bound chat', 'Mentions', 'Replies', 'Attachments', 'Activity context'], ['Open a lead, quote, or order.', 'Open Record Discussion.', 'Mention a teammate and add a clear business question.', 'Reply in thread and attach supporting evidence when needed.', 'Confirm the discussion stays attached to the record.']),
      step('guru-01', 'Use Setu Guru in context', '/dashboard', 'ACADEMY-042-setu-guru-global-assistant.png', ['Setu Guru drawer', 'Current page context', 'Prompt', 'Recommended action', 'Human approval'], ['Open any supported CRM page.', 'Launch Setu Guru from the global shell.', 'Confirm the drawer shows the current page and record context.', 'Ask for research, drafting, analysis, or next-action support.', 'Review and approve every external action before it is sent or saved.']),
    ],
  },
];

export const coreAcademyStepCount = coreAcademyModules.reduce((sum, module) => sum + module.steps.length, 0);
