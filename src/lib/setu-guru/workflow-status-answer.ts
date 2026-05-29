export type WorkflowStatusRow = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? '').trim();
}

function label(value: unknown) {
  return text(value).replaceAll('_', ' ') || 'not set';
}

function incomplete(value: unknown) {
  const status = text(value).toLowerCase();
  return !status || ['not_requested', 'not_started', 'not_ready', 'pending', 'draft', 'blocked', 'failed', 'rejected', 'missing', 'open'].includes(status);
}

function openStatus(value: unknown) {
  return !['approved', 'waived', 'complete', 'completed', 'ready'].includes(text(value).toLowerCase());
}

function blockedStatus(value: unknown) {
  return ['blocked', 'rejected', 'failed', 'missing', 'pending', 'open', 'draft'].includes(text(value).toLowerCase());
}

export function buildConversationalWorkflowStatusAnswer(input: {
  organizationName: string;
  order: WorkflowStatusRow;
  customerName?: string;
  quote: WorkflowStatusRow | null;
  quoteVersions: WorkflowStatusRow[];
  gates: WorkflowStatusRow[];
  stageEvents: WorkflowStatusRow[];
  orderDocuments: WorkflowStatusRow[];
  tradeRequirements: WorkflowStatusRow[];
  packingPlans: WorkflowStatusRow[];
  freightRequests: WorkflowStatusRow[];
  freightQuotes: WorkflowStatusRow[];
  shipments: WorkflowStatusRow[];
  financeSync: WorkflowStatusRow[];
  processingChecks: WorkflowStatusRow[];
}) {
  const explicitBlockers = [
    ...input.gates.filter((row) => blockedStatus(row.status)).map((row) => `${label(row.stage_key) || 'approval'} gate ${label(row.gate_type)} is ${label(row.status)}`),
    ...input.tradeRequirements.filter((row) => openStatus(row.status)).map((row) => `${label(row.stage_key) || 'trade'} requirement is open: ${text(row.title) || text(row.requirement_code)}`),
    ...input.freightRequests.filter((row) => blockedStatus(row.status)).map((row) => `freight request ${text(row.id).slice(0, 8)} is ${label(row.status)}`),
    ...input.financeSync.filter((row) => blockedStatus(row.sync_status)).map((row) => `finance ${label(row.finance_document_type) || 'sync'} is ${label(row.sync_status)}`),
  ];

  const readinessBlockers: string[] = [];
  if (incomplete(input.order.payment_status)) readinessBlockers.push(`payment is ${label(input.order.payment_status)}; request payment or record approved payment terms`);
  if (incomplete(input.order.fulfillment_status)) readinessBlockers.push(`fulfillment is ${label(input.order.fulfillment_status)}; packing or processing evidence is still needed`);
  if (incomplete(input.order.dispatch_status)) readinessBlockers.push(`dispatch is ${label(input.order.dispatch_status)}; the order is not dispatch-ready yet`);
  if (!input.orderDocuments.length) readinessBlockers.push('no order documents are generated or attached yet');
  if (!input.packingPlans.length && label(input.order.current_stage).includes('packing')) readinessBlockers.push('packing is active but no packing plan is recorded yet');
  if (!input.freightRequests.length) readinessBlockers.push('no freight request is created yet');
  if (!input.financeSync.length) readinessBlockers.push('no finance or invoice handoff record exists yet');

  const blockers = [...explicitBlockers, ...readinessBlockers];
  const customer = text(input.customerName) || 'this customer';
  const orderNumber = text(input.order.order_number) || 'this order';
  const headline = blockers.length
    ? `${customer}'s order ${orderNumber} is open and not ready to dispatch or close yet.`
    : `${customer}'s order ${orderNumber} looks clear across the workflow checks I inspected.`;

  const nextStep = blockers.length
    ? `Next work: ${blockers.slice(0, 4).join('; ')}.`
    : 'I did not find an active blocker in the checked workflow records.';

  const answer = [
    headline,
    `Current state: lifecycle ${label(input.order.order_lifecycle_status || input.order.status)}, stage ${label(input.order.current_stage)}, approval ${label(input.order.approval_state)}, payment ${label(input.order.payment_status)}, fulfillment ${label(input.order.fulfillment_status)}, dispatch ${label(input.order.dispatch_status)}.`,
    `Quote handoff: ${input.quote ? `${text(input.quote.quote_number) || 'quote'} is ${label(input.quote.status)} with ${input.quoteVersions.length} version record(s).` : 'I did not find a linked quote for this order.'}`,
    `Evidence checked: ${input.stageEvents.length} stage event(s), ${input.gates.length} gate(s), ${input.orderDocuments.length} order document(s), ${input.tradeRequirements.length} trade requirement(s), ${input.packingPlans.length} packing plan(s), ${input.freightRequests.length} freight request(s), ${input.freightQuotes.length} freight quote(s), ${input.shipments.length} shipment(s), ${input.financeSync.length} finance sync record(s), and ${input.processingChecks.length} processing check(s).`,
    nextStep,
    'Read-only analysis only. Setu Guru can explain the blockers and draft a checklist, but a human must approve documents, payment and finance steps, freight requests, dispatch changes, and order closeout.',
  ].join('\n\n');

  return { answer, blockers };
}
