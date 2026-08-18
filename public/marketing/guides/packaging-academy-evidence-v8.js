(() => {
  'use strict';

  const data = window.PackagingAcademyData;
  if (!data?.steps?.length || typeof data.evidenceForStep !== 'function') return;

  const baseEvidenceForStep = data.evidenceForStep.bind(data);
  const marker = (x, y, label, route) => ({ x, y, label, route });

  Object.assign(data.files, {
    designQueue: '/guides/evidence/packaging.setuflowcrm.com_design_queue.png',
    dispatchBoard: '/guides/evidence/packaging.setuflowcrm.com_dispatch_board.png',
    tradeEvents: '/guides/evidence/packaging.setuflowcrm.com_trade_events.png',
    documents: '/guides/evidence/packagingreference.com_document.png',
    orderExecution: '/guides/evidence/packagingreference.com_order_execution.png',
    quoteRevision: '/guides/evidence/packagingreference.com_quote%20create%20revision.png',
    packagingAdmin: '/guides/evidence/packaging.setuflowcrm.com_admin.png',
    growthCenter: '/guides/evidence/packaging.setuflowcrm.com_growth_center.png',
    setuGuruHelp: '/guides/evidence/packaging.setuflowcrm.com_setuguru_help.png',
    setuGuruSmartAction: '/guides/evidence/packaging.setuflowcrm.com_setuguru_smartaction.png',
  });

  data.evidenceForStep = (step) => {
    if (!step) return null;

    if (step.id === 'setu-guru-1') {
      return {
        src: data.files.setuGuruHelp,
        title: 'Open Setu Guru from the Packaging workspace',
        markers: [
          marker(84.5, 10, 'Setu Guru drawer', '/setu-guru-ai'),
          marker(89, 73, 'Guided workspace actions', '/setu-guru-ai'),
        ],
      };
    }

    if (step.id === 'setu-guru-2' || step.id === 'setu-guru-3' || step.id === 'setu-guru-5') {
      return {
        src: data.files.setuGuruSmartAction,
        title: step.title,
        markers: [
          marker(74.5, 21, 'Setu Guru research action', '/leads'),
          marker(88, 18, 'Buyer fit summary', '/setu-guru-ai'),
          marker(88, 42, 'Recommended next step', '/setu-guru-ai'),
        ],
      };
    }

    if (step.id === 'setu-guru-4') {
      return {
        src: data.files.setuGuruHelp,
        title: 'Packaging production and dispatch guidance',
        markers: [
          marker(86, 45, 'Production guidance', '/setu-guru-ai'),
          marker(88, 72, 'Open Dispatch or Design Queue', '/dispatch-board'),
        ],
      };
    }

    if (step.flow === 'growth-center') {
      const route = step.route || '/growth-agent?workspace=packaging';
      return {
        src: data.files.growthCenter,
        title: step.title,
        markers: [
          marker(14, 17, 'Packaging Operations', '/growth-agent?workspace=packaging'),
          marker(27, 17, 'External Discovery', '/growth-agent?view=external-discovery'),
          marker(76, 58, 'Open recommendation record', route),
          marker(5, 62, 'ICP setup', '/growth-agent?workspace=packaging'),
        ],
      };
    }

    if (step.id === 'quote-management-3') {
      return {
        src: data.files.quoteRevision,
        title: 'Create a governed quote revision',
        markers: [
          marker(21, 40, 'Revision requested customer story', '/quotes?status=revision_requested'),
          marker(86, 50, 'Keep locked and create revision', '/quotes?status=revision_requested'),
          marker(86, 59, 'Open send and response workflow', '/approval-send'),
        ],
      };
    }

    if (step.flow === 'orders') {
      if (step.id === 'orders-4' || step.id === 'orders-6') {
        return {
          src: data.files.documents,
          title: step.title,
          markers: [
            marker(22, 35, 'Customer document group', '/documents'),
            marker(91, 43, 'Open generated PDF', '/documents'),
            marker(91, 51, 'Open another document version', '/documents'),
          ],
        };
      }
      return {
        src: data.files.orderExecution,
        title: step.title,
        markers: [
          marker(19, 28, 'Order queue', '/orders'),
          marker(48, 31, 'Execution stages', '/orders'),
          marker(29, 47, 'Prepare and preview buyer document', '/orders'),
          marker(87, 24, 'Next best action', '/orders'),
        ],
      };
    }

    if (step.flow === 'design') {
      return {
        src: data.files.designQueue,
        title: step.title,
        markers: [
          marker(12, 16, 'Design Queue metrics', '/design-queue'),
          marker(10, 31, 'Design files', '/design-queue'),
          marker(13, 39, 'Select design source and file', '/design-queue'),
          marker(96, 39, 'Upload design', '/design-queue'),
        ],
      };
    }

    if (step.flow === 'dispatch') {
      return {
        src: data.files.dispatchBoard,
        title: step.title,
        markers: [
          marker(20, 35, 'Production stage funnel', '/dispatch-board'),
          marker(9, 51, 'Resolve design files', '/design-queue'),
          marker(88, 45, 'Advance production stage', '/dispatch-board'),
          marker(96, 45, 'Set stage', '/dispatch-board'),
        ],
      };
    }

    if (step.flow === 'trade-events') {
      return {
        src: data.files.tradeEvents,
        title: step.title,
        markers: [
          marker(66, 13, 'Add Booth Lead', '/trade-events'),
          marker(85, 13, 'Scan Badge', '/trade-events'),
          marker(68, 31, 'Capture buyer or supplier', '/trade-events'),
          marker(66, 20, 'Review Leads', '/trade-events'),
        ],
      };
    }

    if (step.id === 'catalog-2' || step.id === 'catalog-3') {
      return {
        src: data.files.packagingAdmin,
        title: step.title,
        markers: [
          marker(52, 6, 'Packaging Service Families', '/admin/packaging-families'),
          marker(55, 34, 'Choose a Packaging family', '/admin/packaging-families'),
          marker(96, 28, 'Save family', '/admin/packaging-families'),
          marker(58, 6, 'Packaging Pricing Templates', '/admin/packaging-pricing-templates'),
        ],
      };
    }

    return baseEvidenceForStep(step);
  };
})();
