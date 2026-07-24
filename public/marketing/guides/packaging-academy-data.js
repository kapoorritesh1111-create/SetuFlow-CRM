(() => {
  'use strict';

  const roles = {
    sales: { name: 'Sales', description: 'Capture, qualify, quote, send and follow up.', flows: ['capture', 'qualify', 'quote', 'approval', 'followup'] },
    design: { name: 'Design', description: 'Manage artwork, proofs and pre-press readiness.', flows: ['design', 'dispatch'] },
    operations: { name: 'Operations', description: 'Move jobs through production and dispatch.', flows: ['dispatch'] },
    ordering: { name: 'Ordering', description: 'Turn accepted quotes into tracked execution.', flows: ['approval', 'dispatch'] },
    admin: { name: 'Owner / Admin', description: 'Manage catalog, pricing, access and reporting.', flows: ['capture', 'qualify', 'quote', 'approval', 'followup', 'design', 'dispatch', 'admin'] },
    viewer: { name: 'Viewer', description: 'Track information without changing records.', flows: ['capture', 'qualify', 'quote', 'approval', 'followup', 'design', 'dispatch'] },
  };

  const definitions = [
    ['capture', 'Capture', '/leads', ['Capture overview', 'Open Quick Lead', 'Choose buyer or supplier', 'Enter required details', 'Record source and trade note', 'Save the lead', 'Find the new lead']],
    ['qualify', 'Qualification', '/leads', ['Open Lead Detail', 'Review lifecycle and readiness', 'Add contact and company context', 'Map packaging interest', 'Capture requirements', 'Schedule next touchpoint', 'Confirm quote readiness']],
    ['quote', 'Quote Builder', '/quotes', ['Start a quote', 'Choose service family', 'Choose pricing template', 'Enter dimensions', 'Enter repeat and web width', 'Select material', 'Select finish and colors', 'Enter quantity', 'Review calculated pricing', 'Add another line', 'Save draft', 'Review customer-facing quote']],
    ['approval', 'Approvals & Sending', '/quotes', ['Review approval requirements', 'Submit for approval', 'Approve or return', 'Resolve approval changes', 'Generate approval link', 'Send to buyer', 'Record buyer response', 'Create order handoff']],
    ['followup', 'Follow-up', '/quote-lifecycle', ['Open Quote Lifecycle', 'Review recommended action', 'Send follow-up', 'Handle revision request', 'Manage expiring quotes', 'Close or hand off']],
    ['design', 'Design & Proofs', '/design-queue', ['Open Design Queue', 'Review production specification', 'Upload proof version', 'Share and record approval', 'Release to pre-press']],
    ['dispatch', 'Production & Dispatch', '/dispatch-board', ['Open Dispatch Board', 'Advance production stage', 'Correct stage and print ticket', 'Mark dispatched']],
    ['admin', 'Catalog & Admin', '/catalog', ['Manage service families', 'Manage pricing templates', 'Maintain reference library']],
  ];

  const flows = definitions.map(([id, name, route, titles]) => ({
    id,
    name,
    route,
    steps: titles.map((title, index) => ({
      id: `${id}-${index + 1}`,
      title,
      summary: `Complete ${title.toLowerCase()} using normal clicks, then confirm the saved state before continuing.`,
    })),
  }));

  const steps = flows.flatMap((flow) => flow.steps.map((step, index) => ({
    ...step,
    flow: flow.id,
    flowName: flow.name,
    route: flow.route,
    index,
  })));

  const instructions = {
    capture: ['Open + Quick Lead from the Setu Flow header.', 'Choose Buyer or Supplier and enter company and country.', 'Add source, trade note and contact information, then save.'],
    qualify: ['Open the lead from Leads.', 'Complete company context, packaging interests and requirements.', 'Save changes and schedule the next touchpoint.'],
    quote: ['Start from a qualified lead.', 'Configure family, template, dimensions, material, finish and quantity.', 'Review pricing, save the draft and preview the customer document.'],
    approval: ['Review whether internal approval is required.', 'Record the decision or requested changes.', 'Generate the buyer link, send it and capture the response.'],
    followup: ['Open Quote Lifecycle and read the recommended action.', 'Send a contextual follow-up or create a controlled revision.', 'Close, expire or hand off the quote cleanly.'],
    design: ['Open Design Queue and verify the production specification.', 'Upload the correct proof version and share approval.', 'Release only approved artwork to pre-press.'],
    dispatch: ['Open Dispatch Board and review the stage funnel.', 'Advance or correct the job stage with notes.', 'Print the job ticket and record dispatch details.'],
    admin: ['Open the appropriate Packaging Admin page.', 'Review active status, linked data and validation warnings.', 'Save and confirm the change appears in the client workflow.'],
  };

  const expected = {
    capture: 'The lead saves once with the correct type and owner and appears in Leads without duplicates.',
    qualify: 'Packaging interests and requirements persist and Quote Builder becomes available when required data is complete.',
    quote: 'The selected template, line names, currency and calculations remain consistent after save.',
    approval: 'Approval status and buyer links are accurate and accepted quotes can move to order handoff.',
    followup: 'The lifecycle queue reflects the latest state and every action appears in activity history.',
    design: 'Proof version, buyer decision and artwork status stay synchronized between Quote and Design Queue.',
    dispatch: 'Stage changes are event-tracked, permissions are respected and dispatch completes the job.',
    admin: 'Catalog configuration is active, internally consistent and usable by the intended role.',
  };

  const mistakes = {
    capture: ['Creating a duplicate', 'Skipping source or notes'],
    qualify: ['Not saving category mapping', 'No next action'],
    quote: ['Mixing specs on one line', 'Ignoring MOQ or currency warnings'],
    approval: ['Sending before approval', 'Editing a locked accepted version'],
    followup: ['Following up without context', 'Overwriting instead of revising'],
    design: ['Uploading to the wrong line', 'Releasing unapproved artwork'],
    dispatch: ['Skipping stages without notes', 'Editing as a read-only role'],
    admin: ['Activating incomplete templates', 'Deleting references already in use'],
  };

  const files = {
    catalog: '/guides/evidence/packaging.setuflowcrm.com_catalog.png',
    quotes: '/guides/evidence/packaging.setuflowcrm.com_Quotes.png',
    quoteBuilder: '/guides/evidence/packaging.setuflowcrm.com_leads_quote%20builder.png',
    leadDetail: '/guides/evidence/packaging.setuflowcrm.com_leads_detail.png',
    leads: '/guides/evidence/packaging.setuflowcrm.com_leads.png',
    quickCapture: '/guides/evidence/packaging.setuflowcrm.com_quick%20capture.png',
    analytics: '/guides/evidence/packaging.setuflowcrm.com_dashboard%20analytics.png',
    dashboard: '/guides/evidence/packaging.setuflowcrm.com_dashboard.png',
  };

  const marker = (x, y, label, route) => ({ x, y, label, route });

  function evidenceForStep(step) {
    const id = step.id;
    if (id === 'capture-1') return { src: files.dashboard, title: 'Packaging workspace dashboard', markers: [marker(85.5, 2.5, 'Quick Lead', '/leads'), marker(4.2, 15, 'Capture navigation', '/contact-exchange/scan')] };
    if (id === 'capture-2') return { src: files.quickCapture, title: 'Open Quick Add Lead', markers: [marker(86.4, 2.8, 'Quick Lead button', '/leads')] };
    if (id === 'capture-3') return { src: files.quickCapture, title: 'Choose buyer or supplier', markers: [marker(84.8, 28.6, 'Buyer', '/leads'), marker(94.1, 28.6, 'Supplier', '/leads')] };
    if (id === 'capture-4') return { src: files.quickCapture, title: 'Enter company and contact details', markers: [marker(84.5, 39.4, 'Company and country', '/leads'), marker(84.6, 48.5, 'Contact details', '/leads')] };
    if (id === 'capture-5') return { src: files.quickCapture, title: 'Record source and trade note', markers: [marker(84.5, 61.5, 'Lead source', '/leads'), marker(86.5, 83.8, 'Trade note', '/leads')] };
    if (id === 'capture-6') return { src: files.quickCapture, title: 'Save the lead', markers: [marker(96.8, 96.4, 'Save lead', '/leads')] };
    if (id === 'capture-7') return { src: files.leads, title: 'Find the saved lead', markers: [marker(83.5, 19.6, 'Open lead', '/leads'), marker(18, 8.3, 'Search and filters', '/leads')] };

    const qualificationMarkers = {
      'qualify-1': [marker(14, 9, 'Lead header', '/leads')],
      'qualify-2': [marker(60, 9.8, 'Lifecycle stage', '/leads'), marker(23, 16, 'Readiness score', '/leads')],
      'qualify-3': [marker(67, 57, 'Quick edit', '/leads')],
      'qualify-4': [marker(30, 58, 'Category mapping', '/leads')],
      'qualify-5': [marker(29, 83.5, 'Qualification notes', '/leads')],
      'qualify-6': [marker(33, 27, 'Next touchpoint', '/leads')],
      'qualify-7': [marker(14.5, 48.2, 'Open Builder', '/quotes')],
    };
    if (qualificationMarkers[id]) return { src: files.leadDetail, title: step.title, markers: qualificationMarkers[id] };

    if (id === 'quote-1') return { src: files.quoteBuilder, title: 'Start a packaging quote', markers: [marker(84.7, 23.5, 'Add packaging line', '/quotes')] };
    if (id === 'quote-2') return { src: files.catalog, title: 'Choose service family', markers: [marker(20, 34.5, 'Service family', '/catalog'), marker(91.8, 61.8, 'Create quote line', '/quotes')] };
    if (id === 'quote-3') return { src: files.catalog, title: 'Choose pricing template', markers: [marker(91.5, 46.2, 'Active pricing template', '/catalog')] };
    if (['quote-4', 'quote-5', 'quote-6', 'quote-7'].includes(id)) return { src: files.quoteBuilder, title: 'Configured packaging line', markers: [marker(31, 27.2, 'Saved specification', '/quotes'), marker(76.5, 27.2, 'Calculated line price', '/quotes')] };
    if (id === 'quote-8') return { src: files.quoteBuilder, title: 'Enter quantity', markers: [marker(42.5, 46, 'MOQ / quantity', '/quotes')] };
    if (id === 'quote-9') return { src: files.quoteBuilder, title: 'Review calculated pricing', markers: [marker(76.5, 27.2, 'Line price', '/quotes'), marker(92.5, 25, 'Quote summary', '/quotes')] };
    if (id === 'quote-10') return { src: files.quoteBuilder, title: 'Add another packaging line', markers: [marker(84.8, 23.5, 'Add packaging line', '/quotes')] };
    if (id === 'quote-11') return { src: files.quoteBuilder, title: 'Save quote draft', markers: [marker(84.5, 56.1, 'Save and continue', '/quotes')] };
    if (id === 'quote-12') return { src: files.quotes, title: 'Review customer-facing quote', markers: [marker(86.3, 34.6, 'Customer PDF', '/quotes')] };

    if (id.startsWith('approval-')) {
      const approvalMarkers = {
        'approval-1': [marker(50, 9.8, 'Quote filters', '/quotes')],
        'approval-2': [marker(86.2, 36.8, 'Edit / revise quote', '/quotes')],
        'approval-3': [marker(24, 42.5, 'Approval outcome', '/quotes')],
        'approval-4': [marker(86.2, 36.8, 'Revise quote', '/quotes')],
        'approval-5': [marker(86.2, 34.6, 'Customer PDF / share', '/quotes')],
        'approval-6': [marker(86.2, 34.6, 'Send customer document', '/quotes')],
        'approval-7': [marker(24, 42.5, 'Record buyer response', '/quotes')],
        'approval-8': [marker(86.2, 29.4, 'Create / open order handoff', '/orders')],
      };
      return { src: files.quotes, title: step.title, markers: approvalMarkers[id] || [] };
    }

    if (id.startsWith('followup-')) return { src: files.quotes, title: step.title, markers: [marker(22, 20, 'Customer quote story', '/quote-lifecycle'), marker(86.2, 40.2, 'Discussion and follow-up', '/quote-lifecycle')] };
    if (id === 'admin-1') return { src: files.catalog, title: 'Packaging catalog', markers: [marker(20, 34.5, 'Service families', '/catalog')] };
    if (id === 'admin-2') return { src: files.catalog, title: 'Pricing templates', markers: [marker(91.5, 46.2, 'Active pricing templates', '/catalog')] };
    if (id === 'admin-3') return { src: files.analytics, title: 'Analytics and reference performance', markers: [marker(95, 10.2, 'Export', '/analytics'), marker(27, 26, 'Conversion funnel', '/analytics')] };
    return null;
  }

  window.PackagingAcademyData = {
    origin: 'https://packaging.setuflowcrm.com',
    api: '/api/packaging-academy/tests',
    roles,
    flows,
    steps,
    instructions,
    expected,
    mistakes,
    files,
    evidenceForStep,
  };
})();