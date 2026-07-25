(() => {
  'use strict';

  const VERSION = '2026.07.25-v7';
  const roles = {
    sales: { name: 'Sales', description: 'Capture, qualify, quote, use Setu Guru, manage Growth Center actions, send and hand accepted work to Orders.', flows: ['capture', 'qualify', 'setu-guru', 'growth-center', 'quote', 'approval', 'quote-management', 'orders', 'tasks', 'trade-events'] },
    design: { name: 'Design', description: 'Receive accepted packaging work, use Guru guidance, manage artwork versions and release approved files.', flows: ['setu-guru', 'design', 'dispatch', 'tasks'] },
    operations: { name: 'Operations', description: 'Use Growth Center intelligence and run accepted work through Orders, production readiness and dispatch.', flows: ['growth-center', 'setu-guru', 'orders', 'dispatch', 'tasks'] },
    ordering: { name: 'Ordering', description: 'Validate accepted quote handoff and complete the execution cockpit.', flows: ['setu-guru', 'approval', 'quote-management', 'orders', 'design', 'dispatch'] },
    admin: { name: 'Owner / Admin', description: 'Validate the full client journey, Setu Guru, Growth Center, catalog, pricing, users, settings and audit.', flows: ['capture', 'qualify', 'setu-guru', 'growth-center', 'quote', 'approval', 'quote-management', 'orders', 'design', 'dispatch', 'catalog', 'tasks', 'trade-events', 'admin'] },
    viewer: { name: 'Viewer', description: 'Confirm read-only intelligence and workflow visibility without changing customer or operational records.', flows: ['setu-guru', 'growth-center', 'capture', 'qualify', 'quote-management', 'orders', 'design', 'dispatch', 'catalog', 'tasks', 'trade-events'] },
  };

  const S = (title, summary, route, status = 'retest') => ({ title, summary, route, status });
  const definitions = [
    { id: 'capture', name: 'Capture', route: '/leads', steps: [
      S('Open Quick Lead', 'Click the global + Quick Lead button. Confirm one drawer opens and the background page remains stable.', '/leads?quickLead=1', 'passed-before-retest'),
      S('Choose buyer or supplier', 'Click Buyer or Supplier once. Confirm the selected type is visibly active and only one form is mounted.', '/leads?quickLead=1', 'passed-before-retest'),
      S('Enter required contact details', 'Enter company, country, contact name and at least one reachable channel. Add source and trade note before saving.', '/leads?quickLead=1', 'passed-before-retest'),
      S('Save and find the lead', 'Click Save lead once, wait for the success message, close the drawer and search the Lead Queue. Confirm no duplicate was created.', '/leads', 'passed-before-retest'),
    ]},
    { id: 'qualify', name: 'Qualification', route: '/leads', steps: [
      S('Open Lead Detail', 'From Follow-up, click the visible company name or Open action. Confirm the correct lead detail page opens.', '/leads', 'passed-before-retest'),
      S('Complete company and packaging context', 'Use Quick edit and Qualification & Mapping to add contact, website, packaging categories, requirements and notes.', '/leads', 'passed-before-retest'),
      S('Save qualification and next action', 'Click Save qualification & mapping, schedule the next touchpoint, refresh and confirm categories, notes and date persist.', '/leads', 'passed-before-retest'),
      S('Open Quote Builder', 'Click the visible Create Quote or Open Builder action. Confirm any blocker is shown on the page, not only in the URL.', '/leads', 'passed-before-retest'),
    ]},
    { id: 'setu-guru', name: 'Setu Guru for Packaging', route: '/setu-guru-ai', steps: [
      S('Open Setu Guru', 'Open Setu Guru from the visible navigation or assistant control. Confirm the Packaging workspace context is shown and no generic food-only defaults appear.', '/setu-guru-ai', 'untested'),
      S('Ask a specification question', 'Ask what is missing for a packaging quote. Confirm Guru identifies family, dimensions, material, quantity, artwork and compliance gaps from live organization data.', '/setu-guru-ai', 'untested'),
      S('Ask pricing and MOQ guidance', 'Ask Guru to explain the packaging cost drivers and MOQ alternatives. Confirm it uses configured templates and does not invent prices or approve overrides.', '/setu-guru-ai', 'untested'),
      S('Ask artwork and production status', 'Ask about proof, Design Queue, production readiness and dispatch. Confirm the answer routes to the exact live workspace and does not advance any stage.', '/setu-guru-ai', 'untested'),
      S('Create a reviewable sales draft', 'Ask Guru for a packaging follow-up or discovery draft. Confirm the draft uses known facts, flags missing information and requires human review before sending.', '/setu-guru-ai', 'untested'),
    ]},
    { id: 'growth-center', name: 'Growth Center — Packaging Operations', route: '/growth-agent', steps: [
      S('Open Packaging Operations', 'Open Growth Center and select Packaging Operations. Confirm this workspace appears only for the Packaging vertical.', '/growth-agent?workspace=packaging', 'untested'),
      S('Refresh Packaging intelligence', 'Click Refresh intelligence once. Confirm deterministic recommendations are generated from live quotes, templates, proofs, production stages and orders without duplicates.', '/growth-agent?workspace=packaging', 'untested'),
      S('Review quote readiness', 'Open Quote Readiness and confirm missing specification, template, MOQ, freight, pre-press and mixed-currency actions route to the correct quote.', '/growth-agent?workspace=packaging&view=quote-readiness', 'untested'),
      S('Review artwork, production and dispatch', 'Open Artwork & Proofs, Production and Dispatch. Confirm blockers, stage age and next safe actions reconcile to Design Queue and Dispatch Board.', '/growth-agent?workspace=packaging&view=artwork-proofs', 'untested'),
      S('Review template health and repeat orders', 'Open Template Health and Repeat Orders. Confirm recommendations are evidence-backed, reviewable and never change pricing or contact customers automatically.', '/growth-agent?workspace=packaging&view=template-health', 'untested'),
      S('Submit recommendation feedback', 'Mark one test recommendation Helpful or Not relevant. Confirm the feedback and learning metrics update without changing rules or models automatically.', '/growth-agent?workspace=packaging', 'untested'),
      S('Run External Discovery', 'Create a controlled campaign and run the configured AI web-research provider. Confirm every company has a real source URL, remains outside CRM and requires approval before conversion or outreach.', '/growth-agent?view=external-discovery', 'untested'),
    ]},
    { id: 'quote', name: 'Quote Builder', route: '/quotes', steps: [
      S('Start a clean quote', 'From the qualified lead, click Create New Quote once. Confirm a single draft/version is created and the organization currency is selected.', '/quotes', 'needs-retest'),
      S('Add packaging product or service', 'Click Add packaging line or Add product, select the intended family/SKU and verify no unrelated generic line is added.', '/quotes', 'needs-retest'),
      S('Configure specification', 'Choose pricing template, dimensions, material, finish, colors, quantity and artwork status. Resolve MOQ warnings or choose the suggested alternative template.', '/quotes', 'needs-retest'),
      S('Review pricing and currency', 'Open Pricing/Review. Confirm line name, quantity, unit price, totals and currency all describe the same saved line and match the organization default.', '/quotes', 'needs-retest'),
      S('Save and reopen draft', 'Click Save & Continue, leave the page, reopen the same quote and confirm specifications, prices and optional charges persist without duplicate lines.', '/quotes', 'needs-retest'),
      S('Preview customer quote', 'Click Customer PDF or Preview. Confirm it opens in a new tab, uses the customer logo, correct currency and only the intended commercial lines.', '/quotes', 'needs-retest'),
    ]},
    { id: 'approval', name: 'Approvals & Sending', route: '/approval-send', steps: [
      S('Submit for internal approval', 'From the quote send gate, click Submit for approval once. Confirm the quote/version moves to pending approval and cannot be edited silently.', '/quotes?status=pending_approval', 'needs-retest'),
      S('Approve or return the quote', 'Open Approval Queue, select the exact quote, add a decision note and click Approve or Return. Confirm a visible success result.', '/approval-queue', 'needs-retest'),
      S('Open Approvals & Sending', 'From the approved quote, click Send quote. Confirm /approval-send opens with the same customer, version, lines, total and currency.', '/approval-send', 'needs-retest'),
      S('Send and verify tracked link', 'Choose WhatsApp or Email, click the send action once, then open/copy the tracked customer link. Do not claim delivery without provider confirmation.', '/approval-send', 'needs-retest'),
      S('Confirm sent state', 'Return to Quotes and confirm the quote is Sent, locked from direct editing and available for an explicit buyer outcome.', '/quotes?status=sent', 'needs-retest'),
    ]},
    { id: 'quote-management', name: 'Quote Management & Outcomes', route: '/quotes', steps: [
      S('Open the customer quote story', 'Open Quotes, select the customer and verify proposed, accepted, order and cleanup values are not double-counted.', '/quotes', 'needs-retest'),
      S('Record buyer outcome', 'On a Sent quote, choose Accepted, Rejected, Revision requested, No response or Expire. Confirm only the selected outcome is applied.', '/quotes?status=sent', 'needs-retest'),
      S('Create a governed revision', 'For Revision requested, click Create revised quote. Confirm a new editable version is created and the original sent version remains locked.', '/quotes?status=revision_requested', 'needs-retest'),
      S('Confirm accepted quote handoff', 'For Accepted, confirm the quote leaves active quote work, remains in history and the Open order action opens the matching order.', '/quotes?status=accepted', 'needs-retest'),
    ]},
    { id: 'orders', name: 'Orders / Execution', route: '/orders', steps: [
      S('Open the matching order', 'Click Open order from the accepted quote or open Orders and search the customer. Confirm source quote/version, customer, currency and lines match.', '/orders', 'untested'),
      S('Review blockers and next best action', 'Select the order and read the Action Stack. Confirm blockers are explicit and the primary CTA matches the current stage.', '/orders', 'untested'),
      S('Confirm actual order lines', 'Open Actual Lines, compare quoted versus ordered quantities/prices, record any reasoned change and approve the actual-lines gate.', '/orders', 'untested'),
      S('Prepare buyer document', 'Open Buyer Doc, click Prepare, Preview and Approve in sequence. Confirm preview opens in a new tab and accepted quote history remains unchanged.', '/orders', 'untested'),
      S('Save packing and freight readiness', 'Open Packing, enter cartons, pallets, weights, CBM, pickup, delivery, shipment mode and Incoterm; save and approve before queueing freight.', '/orders', 'untested'),
      S('Complete processing and dispatch documents', 'Open Processing, complete required checks, then prepare Delivery Note and Final Invoice with preview and approval.', '/orders', 'untested'),
      S('Record payment and close', 'After dispatch/delivery evidence, record payment reference, reconcile, confirm no blockers and click Close order. Confirm the order moves to Paid & Closed.', '/orders', 'untested'),
    ]},
    { id: 'design', name: 'Design & Proofs', route: '/design-queue', steps: [
      S('Find accepted work needing design', 'Open Design Queue and confirm every accepted packaging production line without final artwork appears with customer and quote reference.', '/design-queue', 'needs-retest'),
      S('Record customer-provided artwork', 'Open Design files, choose Customer provided, upload the final file and confirm it becomes production-ready without a buyer approval link.', '/design-queue', 'needs-retest'),
      S('Upload Design Team proof', 'Choose Design Team, upload a new version, copy the approval link and confirm visible copied/uploaded feedback.', '/design-queue', 'needs-retest'),
      S('Approve or revise proof', 'Open the external approval link, approve or reject with a comment, then refresh Design Queue and confirm the status updates or the job leaves the queue when ready.', '/design-queue', 'needs-retest'),
    ]},
    { id: 'dispatch', name: 'Production & Dispatch', route: '/dispatch-board', steps: [
      S('Open accepted work in Dispatch', 'Open Dispatch Board and confirm accepted packaging quotes, canonical orders and customers are visible even when quote lines are product lines.', '/dispatch-board', 'needs-retest'),
      S('Start pre-press', 'Select a job and advance to Pre-Press. Confirm missing artwork can be resolved here and the event is recorded once.', '/dispatch-board', 'needs-retest'),
      S('Verify design gate', 'Attempt Printing without final design and confirm the app blocks it. Add customer artwork or approve the Design Team proof, then retry successfully.', '/dispatch-board', 'needs-retest'),
      S('Advance through dispatch', 'Advance Printing, converting, finishing, QC, Packed and Dispatched in order. Confirm notes/history persist and the order/dispatch state stays aligned.', '/dispatch-board', 'needs-retest'),
    ]},
    { id: 'catalog', name: 'Catalog & Packaging Pricing', route: '/products', steps: [
      S('Review packaging catalog', 'Click Catalog, search packaging products/services and confirm SKU, family, active status, currency, price basis and quoteability are clear.', '/products', 'untested'),
      S('Open product management', 'As Admin, open Catalog admin, edit one safe test field and save. Confirm the change appears in Catalog without altering unrelated products.', '/admin/product-management', 'untested'),
      S('Review packaging families and templates', 'Open Packaging Families and Pricing Templates, verify active templates, MOQ, dimensions, materials, finishes and lead time.', '/admin/packaging-families', 'untested'),
      S('Validate quote from catalog', 'Start a quote from Catalog, select the updated item and confirm the correct price, currency and specification reach Quote Builder.', '/products', 'untested'),
    ]},
    { id: 'tasks', name: 'Tasks', route: '/tasks', steps: [
      S('Create a lead-linked task', 'Click Tasks, New task, enter title, due date, owner and linked lead, then save. Confirm it appears in the correct date group.', '/tasks', 'untested'),
      S('Edit and complete a task', 'Open the task, change priority/date or owner, save, then mark complete. Confirm it moves to Completed with no duplicate.', '/tasks', 'untested'),
      S('Verify calendar and filters', 'Switch List/Calendar, use My tasks, SLA risk and lead-linked filters, then reopen the linked lead from the task.', '/tasks', 'untested'),
    ]},
    { id: 'trade-events', name: 'Trade Events', route: '/trade-events', steps: [
      S('Open event command center', 'Click Trade events, select a live/upcoming event and verify dates, location, booth and quick actions use real organization data.', '/trade-events', 'untested'),
      S('Capture an event lead', 'Click Add Booth Lead or Scan Badge, save a buyer with the event source, then confirm the lead appears in event and lead views.', '/trade-events', 'untested'),
      S('Follow up and review conversion', 'Open Review Leads, create a next action or quote, then return to the event and confirm capture/follow-up counts update truthfully.', '/trade-events', 'untested'),
    ]},
    { id: 'admin', name: 'Admin & Settings', route: '/admin/organization', steps: [
      S('Review organization settings', 'Open Admin & Settings, verify organization identity, country, default currency and packaging vertical. Change only an approved safe field and save.', '/admin/organization', 'untested'),
      S('Review people and access', 'Open People & access, confirm roles and invitations. Invite or adjust a test user and verify permissions match the selected role.', '/admin/users', 'untested'),
      S('Review integrations and documents', 'Open Integrations and Documents/Templates. Confirm unavailable providers are labeled honestly and preview-only features do not claim delivery.', '/admin/integrations', 'untested'),
      S('Review audit trail', 'Open Audit trail and confirm the recent catalog/settings/user change records actor, action, entity and timestamp for this organization only.', '/admin/audit', 'untested'),
    ]},
  ];

  const flows = definitions.map((definition) => ({ id: definition.id, name: definition.name, route: definition.route, steps: definition.steps.map((item, index) => ({ id: `${definition.id}-${index + 1}`, title: item.title, summary: `${item.summary} Testing status: ${item.status === 'untested' ? 'Not tested yet' : item.status === 'needs-retest' ? 'Requires production retest' : 'Passed previously; retest after recent changes'}.`, route: item.route || definition.route, status: item.status })) }));
  const steps = flows.flatMap((flow) => flow.steps.map((step, index) => ({ ...step, flow: flow.id, flowName: flow.name, index })));

  const instructions = {
    capture: ['Use the visible Quick Lead controls only.', 'Save once and wait for confirmation.', 'Verify the saved lead from Follow-up.'],
    qualify: ['Open the exact lead from Follow-up.', 'Save company, packaging and next-action context.', 'Refresh before declaring the step passed.'],
    'setu-guru': ['Ask one live Packaging question at a time.', 'Verify the answer against the visible record.', 'Never treat a draft or recommendation as an approval or completed action.'],
    'growth-center': ['Refresh once and wait for completion.', 'Open recommendations through their visible action links.', 'Verify no lead, message, price, proof, production stage or dispatch state changes automatically.'],
    quote: ['Build from one intended customer and one clean draft.', 'Check line identity, currency and totals at every stage.', 'Preview the customer document in a new tab.'],
    approval: ['Submit the exact version for approval.', 'Approve/return with a visible decision.', 'Send only the approved version and verify the tracked link.'],
    'quote-management': ['Manage Sent quotes from the customer story.', 'Record one explicit buyer outcome.', 'Use governed revisions and Orders handoff.'],
    orders: ['Open the order created from the accepted quote.', 'Follow the Action Stack and approval gates.', 'Do not skip documents, packing, dispatch or closeout evidence.'],
    design: ['Use one quote line at a time.', 'Identify customer-provided versus Design Team artwork.', 'Verify final approval before Printing.'],
    dispatch: ['Confirm the job, order and customer match.', 'Advance one stage at a time.', 'Verify the design gate and event history.'],
    catalog: ['Use Catalog as the pricing source.', 'Change only safe test data.', 'Confirm changes reach Quote Builder.'],
    tasks: ['Create one traceable task.', 'Verify edits and completion.', 'Test list, calendar and filters.'],
    'trade-events': ['Use a real event record.', 'Capture with event source attached.', 'Verify lead and event counts reconcile.'],
    admin: ['Use an Owner/Admin test account.', 'Change only approved safe fields.', 'Verify permissions and audit history.'],
  };

  const expected = {
    capture: 'One correctly typed lead is saved with visible confirmation and no duplicate.',
    qualify: 'Qualification data persists after refresh and the correct quote action is available.',
    'setu-guru': 'Guru answers from live Packaging context, exposes uncertainty and requires human review for every draft or action.',
    'growth-center': 'Packaging recommendations reconcile to live records, route correctly, deduplicate and never perform autonomous workflow changes.',
    quote: 'The quote contains only intended lines with matching specifications, totals and organization currency.',
    approval: 'The approved version can be sent once, tracked honestly and displayed as Sent.',
    'quote-management': 'Buyer outcomes persist, revisions create new versions and accepted quotes open the matching order.',
    orders: 'The accepted quote becomes one executable order with truthful blockers, approvals, documents, packing, dispatch and closeout.',
    design: 'Every required packaging design is sourced, versioned and approved before production release.',
    dispatch: 'Accepted packaging work is visible and cannot pass Printing without final design evidence.',
    catalog: 'Catalog and pricing configuration is active, consistent and usable in Quote Builder.',
    tasks: 'Tasks save, filter, link, edit and complete without duplicate records.',
    'trade-events': 'Event capture, lead attribution and follow-up metrics use real workspace data.',
    admin: 'Organization settings, access, integrations and audit remain correctly scoped and truthful.',
  };

  const mistakes = {
    capture: ['Clicking hidden duplicate controls', 'Saving twice before confirmation'],
    qualify: ['Not refreshing to verify persistence', 'No next action'],
    'setu-guru': ['Assuming an AI answer is an approval', 'Accepting unsupported prices, compliance claims or company facts'],
    'growth-center': ['Treating recommendations as completed work', 'Converting or contacting external prospects without review'],
    quote: ['Allowing ghost lines', 'Ignoring mixed currency or MOQ warnings'],
    approval: ['Sending before approval', 'Assuming a link means provider delivery'],
    'quote-management': ['Editing a sent version', 'Double-counting proposed and accepted value'],
    orders: ['Treating accepted as dispatch-ready', 'Skipping approval or document gates'],
    design: ['Uploading to the wrong quote line', 'Treating pending Design Team work as final'],
    dispatch: ['Skipping stages', 'Advancing past Printing without approved design'],
    catalog: ['Editing live pricing without a test plan', 'Activating incomplete templates'],
    tasks: ['Creating an unlinked duplicate', 'Completing the wrong task'],
    'trade-events': ['Capturing without event source', 'Using trial cards in a live org'],
    admin: ['Changing production identity values casually', 'Granting broader roles than required'],
  };

  const files = { catalog: '/guides/evidence/packaging.setuflowcrm.com_catalog.png', quotes: '/guides/evidence/packaging.setuflowcrm.com_Quotes.png', quoteBuilder: '/guides/evidence/packaging.setuflowcrm.com_leads_quote%20builder.png', leadDetail: '/guides/evidence/packaging.setuflowcrm.com_leads_detail.png', leads: '/guides/evidence/packaging.setuflowcrm.com_leads.png', quickCapture: '/guides/evidence/packaging.setuflowcrm.com_quick%20capture.png', analytics: '/guides/evidence/packaging.setuflowcrm.com_dashboard%20analytics.png', dashboard: '/guides/evidence/packaging.setuflowcrm.com_dashboard.png' };
  const marker = (x, y, label, route) => ({ x, y, label, route });
  function evidenceForStep(step) {
    if (step.id === 'capture-1') return { src: files.quickCapture, title: 'Open Quick Lead', markers: [marker(86.4, 2.8, 'Quick Lead', step.route)] };
    if (step.id === 'capture-2') return { src: files.quickCapture, title: 'Choose buyer or supplier', markers: [marker(84.8, 28.6, 'Buyer', step.route), marker(94.1, 28.6, 'Supplier', step.route)] };
    if (step.id === 'capture-3') return { src: files.quickCapture, title: 'Enter lead details', markers: [marker(84.5, 39.4, 'Company and country', step.route), marker(84.6, 61.5, 'Source and note', step.route)] };
    if (step.id === 'capture-4') return { src: files.leads, title: 'Find saved lead', markers: [marker(18, 8.3, 'Search', '/leads'), marker(83.5, 19.6, 'Open lead', '/leads')] };
    if (step.flow === 'qualify') return { src: files.leadDetail, title: step.title, markers: [marker(29, 58, 'Qualification & Mapping', '/leads'), marker(14.5, 48.2, 'Quote action', '/leads')] };
    if (step.flow === 'setu-guru') return { src: files.dashboard, title: step.title, markers: [marker(91, 8, 'Setu Guru', '/setu-guru-ai')] };
    if (step.flow === 'growth-center') return { src: files.analytics, title: step.title, markers: [marker(84, 8, 'Growth Center', '/growth-agent')] };
    if (step.flow === 'quote') return { src: files.quoteBuilder, title: step.title, markers: [marker(31, 27.2, 'Commercial line', '/quotes'), marker(76.5, 27.2, 'Price', '/quotes'), marker(84.5, 56.1, 'Save', '/quotes')] };
    if (step.flow === 'approval' || step.flow === 'quote-management') return { src: files.quotes, title: step.title, markers: [marker(24, 42.5, 'Lifecycle action', step.route), marker(86.2, 34.6, 'Open / send', step.route)] };
    if (step.flow === 'catalog') return { src: files.catalog, title: step.title, markers: [marker(20, 34.5, 'Catalog family', step.route), marker(91.5, 46.2, 'Pricing configuration', step.route)] };
    return null;
  }

  window.PackagingAcademyData = { version: VERSION, origin: 'https://packaging.setuflowcrm.com', api: '/api/packaging-academy/tests', roles, flows, steps, instructions, expected, mistakes, files, evidenceForStep };
})();
