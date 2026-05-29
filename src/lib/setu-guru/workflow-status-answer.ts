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
    not_requested: 'not requested yet',
    not_started: 'not started yet',
    not_ready: 'not ready yet',
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
    case 'payment': return `Payment — ${detail}. Confirm payment terms or issue a proforma invoice.`;
    case 'fulfillment': return `Fulfillment — ${detail}. Packing plan and processing evidence needed before dispatch.`;
    case 'dispatch': return `Dispatch — ${detail}. Cannot dispatch until fulfillment and documents are confirmed.`;
    case 'documents': return `Order documents — none generated yet. Create a proforma, packing list, or delivery note to proceed.`;
    case 'packing': return `Packing plan — active stage but no plan recorded. Add a packing plan to continue.`;
    case 'freight': return `Freight — no rate request raised yet. Start the freight queue to get quotes.`;
    case 'finance': return `Finance handoff — no invoice sync record. Queue the invoice for accounting review.`;
    default: return detail;
  }
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
    ...input.gates.filter((row) => blockedStatus(row.status)).map((row) => `${label(row.stage_key) || 'approval'} gate ${label(row.gate_type)} is ${humanStatus(row.status)}`),
    ...input.tradeRequirements.filter((row) => openStatus(row.status)).map((row) => `trade requirement open: ${text(row.title) || text(row.requirement_code)}`),
    ...input.freightRequests.filter((row) => blockedStatus(row.status)).map((row) => `freight request ${text(row.id).slice(0, 8)} is ${humanStatus(row.status)}`),
    ...input.financeSync.filter((row) => blockedStatus(row.sync_status)).map((row) => `finance ${label(row.finance_document_type) || 'sync'} is ${humanStatus(row.sync_status)}`),
  ];

  const steps: string[] = [];
  let stepNum = 1;

  if (incomplete(input.order.payment_status)) {
    steps.push(`${stepNum++}. ${nextAction('payment', humanStatus(input.order.payment_status))}`);
  }
  if (incomplete(input.order.fulfillment_status)) {
    steps.push(`${stepNum++}. ${nextAction('fulfillment', humanStatus(input.order.fulfillment_status))}`);
  }
  if (incomplete(input.order.dispatch_status)) {
    steps.push(`${stepNum++}. ${nextAction('dispatch', humanStatus(input.order.dispatch_status))}`);
  }
  if (!input.orderDocuments.length) {
    steps.push(`${stepNum++}. ${nextAction('documents', '')}`);
  }
  if (!input.packingPlans.length && label(input.order.current_stage).includes('packing')) {
    steps.push(`${stepNum++}. ${nextAction('packing', '')}`);
  }
  if (!input.freightRequests.length) {
    steps.push(`${stepNum++}. ${nextAction('freight', '')}`);
  }
  if (!input.financeSync.length) {
    steps.push(`${stepNum++}. ${nextAction('finance', '')}`);
  }
  for (const b of explicitBlockers) {
    steps.push(`${stepNum++}. ${b}`);
  }

  const customer = text(input.customerName) || 'this customer';
  const orderNumber = text(input.order.order_number) || 'this order';
  const quoteStatus = input.quote ? `${text(input.quote.quote_number) || 'quote'} ${humanStatus(input.quote.status)}` : 'no linked quote';
  const stage = humanStatus(input.order.current_stage);
  const approval = humanStatus(input.order.approval_state);

  const headerLine = `${customer} — ${orderNumber}`;
  const statusLine = `Stage: ${stage}  |  Approval: ${approval}  |  Quote: ${quoteStatus}`;

  const evidenceLine = [
    `${input.orderDocuments.length} doc(s)`,
    `${input.freightRequests.length} freight request(s)`,
    `${input.financeSync.length} finance record(s)`,
    `${input.stageEvents.length} stage event(s)`,
    `${input.gates.length} gate(s)`,
  ].join(' · ');

  const blockers = [...explicitBlockers, ...steps];

  let answer: string;
  if (steps.length) {
    answer = [
      headerLine,
      statusLine,
      '',
      'What needs to happen next:',
      ...steps,
      '',
      `Evidence checked: ${evidenceLine}.`,
      '',
      'Setu Guru is read-only here. Open the order workspace to take action.',
    ].join('\n');
  } else {
    answer = [
      headerLine,
      statusLine,
      '',
      'No open blockers found across the workflow checks I reviewed.',
      '',
      `Evidence checked: ${evidenceLine}.`,
      '',
      'Setu Guru is read-only here. Open the order workspace to take action.',
    ].join('\n');
  }

  return { answer, blockers };
}
