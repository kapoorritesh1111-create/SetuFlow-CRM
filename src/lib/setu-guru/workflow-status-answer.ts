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

function nextAction(blocker: string, detail: string): string {
  switch (blocker) {
    case 'payment': return `Payment: ${detail}. Confirm terms or issue proforma invoice.`;
    case 'fulfillment': return `Fulfillment: ${detail}. Add packing/processing evidence.`;
    case 'dispatch': return `Dispatch: ${detail}. Complete fulfillment and documents first.`;
    case 'documents': return 'Documents: create proforma, packing list, or delivery note.';
    case 'packing': return 'Packing: add or approve the packing plan.';
    case 'freight': return 'Freight: raise a freight rate request.';
    case 'finance': return 'Finance: queue invoice/accounting handoff.';
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
  if (incomplete(input.order.payment_status)) steps.push(nextAction('payment', humanStatus(input.order.payment_status)));
  if (incomplete(input.order.fulfillment_status)) steps.push(nextAction('fulfillment', humanStatus(input.order.fulfillment_status)));
  if (incomplete(input.order.dispatch_status)) steps.push(nextAction('dispatch', humanStatus(input.order.dispatch_status)));
  if (!input.orderDocuments.length) steps.push(nextAction('documents', ''));
  if (!input.packingPlans.length && label(input.order.current_stage).includes('packing')) steps.push(nextAction('packing', ''));
  if (!input.freightRequests.length) steps.push(nextAction('freight', ''));
  if (!input.financeSync.length) steps.push(nextAction('finance', ''));
  for (const blocker of explicitBlockers) steps.push(blocker);

  const customer = text(input.customerName) || 'this customer';
  const orderNumber = text(input.order.order_number) || 'this order';
  const topSteps = steps.slice(0, 3);
  const remaining = Math.max(steps.length - topSteps.length, 0);
  const blockers = [...explicitBlockers, ...steps];
  const nextLine = topSteps.length ? topSteps.map((step, index) => `${index + 1}. ${step}`).join('\n\n') : 'No open blocker found in the checked workflow records.';
  const evidenceLine = `${input.orderDocuments.length} doc(s) · ${input.freightRequests.length} freight request(s) · ${input.financeSync.length} finance record(s) · ${input.stageEvents.length} stage event(s) · ${input.gates.length} gate(s)`;
  const moreLine = remaining ? `\n\nAlso pending: ${remaining} more item(s). Open the order workspace for full detail.` : '';

  const answer = [
    `Quick view: ${customer} — ${orderNumber}`,
    shortStage(input),
    '',
    'Do next:',
    nextLine + moreLine,
    '',
    `Checked: ${evidenceLine}.`,
    '',
    'Read-only: Setu Guru will not approve, send, sync, book freight, or advance the order without a human click.',
  ].join('\n');

  return { answer, blockers };
}
