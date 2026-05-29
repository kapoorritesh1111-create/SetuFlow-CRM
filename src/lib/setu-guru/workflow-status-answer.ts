export type WorkflowStatusRow = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? '').trim();
}

function label(value: unknown) {
  return text(value).replaceAll('_', ' ') || 'not set';
}

function humanStatus(raw: unknown): string {
  const s = text(raw).toLowerCase();
  const map: Record<string, string> = {
    not_requested: 'not requested',
    not_started: 'not started',
    not_ready: 'not ready',
    pending: 'pending',
    draft: 'draft',
    blocked: 'blocked',
    failed: 'failed',
    rejected: 'rejected',
    missing: 'missing',
    open: 'open',
    approved: 'approved',
    waived: 'waived',
    complete: 'complete',
    completed: 'complete',
    ready: 'ready',
    accepted: 'accepted',
    sent: 'sent',
    dispatched: 'dispatched',
    delivered: 'delivered',
  };
  return map[s] ?? label(raw);
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

function actionFor(blocker: string, detail: string): string {
  switch (blocker) {
    case 'payment': return `Confirm payment terms or issue proforma. Payment is ${detail}.`;
    case 'fulfillment': return `Add packing or processing evidence. Fulfillment is ${detail}.`;
    case 'dispatch': return `Complete fulfillment and documents before dispatch. Dispatch is ${detail}.`;
    case 'documents': return 'Create required order document.';
    case 'packing': return 'Add or approve packing plan.';
    case 'freight': return 'Raise freight request.';
    case 'finance': return 'Queue invoice handoff.';
    default: return detail;
  }
}

function shortStage(input: { order: WorkflowStatusRow; quote: WorkflowStatusRow | null }) {
  const stage = humanStatus(input.order.current_stage);
  const approval = humanStatus(input.order.approval_state);
  const quote = input.quote ? `${text(input.quote.quote_number) || 'quote'} ${humanStatus(input.quote.status)}` : 'no linked quote';
  return `${stage} | ${approval} | ${quote}`;
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
  const explicitBlockers: string[] = [
    ...input.gates.filter((row) => blockedStatus(row.status)).map((row) => `${label(row.stage_key)} gate ${label(row.gate_type)} is ${humanStatus(row.status)}`),
    ...input.tradeRequirements.filter((row) => openStatus(row.status)).map((row) => `Trade requirement: ${text(row.title) || text(row.requirement_code)}`),
    ...input.freightRequests.filter((row) => blockedStatus(row.status)).map((row) => `Freight request is ${humanStatus(row.status)}`),
    ...input.financeSync.filter((row) => blockedStatus(row.sync_status)).map((row) => `Finance ${label(row.finance_document_type)} is ${humanStatus(row.sync_status)}`),
  ];

  const steps: string[] = [];
  if (incomplete(input.order.payment_status)) steps.push(actionFor('payment', humanStatus(input.order.payment_status)));
  if (incomplete(input.order.fulfillment_status)) steps.push(actionFor('fulfillment', humanStatus(input.order.fulfillment_status)));
  if (incomplete(input.order.dispatch_status)) steps.push(actionFor('dispatch', humanStatus(input.order.dispatch_status)));
  if (!input.orderDocuments.length) steps.push(actionFor('documents', ''));
  if (!input.packingPlans.length && label(input.order.current_stage).includes('packing')) steps.push(actionFor('packing', ''));
  if (!input.freightRequests.length) steps.push(actionFor('freight', ''));
  if (!input.financeSync.length) steps.push(actionFor('finance', ''));
  for (const blocker of explicitBlockers) steps.push(blocker);

  const customer = text(input.customerName) || 'this customer';
  const orderNumber = text(input.order.order_number) || 'this order';
  const nextAction = steps[0] || 'No blocker found. Review order workspace.';
  const remaining = Math.max(steps.length - 1, 0);
  const blockers = [...explicitBlockers, ...steps];
  const pendingText = remaining ? ` +${remaining} more` : '';

  const answer = [
    `Quick view: ${customer} — ${orderNumber} | ${shortStage(input)}`,
    `Next: ${nextAction}${pendingText}.`,
  ].join('\n\n');

  return { answer, blockers };
}
