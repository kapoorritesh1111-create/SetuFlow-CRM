import { createClient } from '@/lib/supabase/server';

// Use loose typing for DB queries — avoids generated-type count inference issues
type CountQuery = PromiseLike<{ count: number | null; error?: unknown }> & {
  select: (cols: string, opts: { count: 'exact'; head: boolean }) => CountQuery;
  eq: (col: string, val: unknown) => CountQuery;
};
type AnyDB = { from: (table: string) => CountQuery };

export type PlaybookIntent = 'onboarding_setup' | 'lead_to_quote' | 'quote_to_order' | 'order_to_dispatch' | 'general';

export type PlaybookStep = {
  step: number;
  title: string;
  action: string;
  route?: string;
  requiresApproval: boolean;
  blockerCheck?: string;
};

export type PlaybookGuidance = {
  intent: PlaybookIntent;
  headline: string;
  steps: PlaybookStep[];
  approvalReminder: string;
};

const PLAYBOOKS: Record<PlaybookIntent, PlaybookGuidance> = {
  onboarding_setup: {
    intent: 'onboarding_setup',
    headline: 'Complete your organization setup before managing leads or quotes.',
    steps: [
      { step: 1, title: 'Add your organization profile', action: 'Open Admin → Organization and fill in name, address, and GSTIN/tax ID.', route: '/admin/organization', requiresApproval: false },
      { step: 2, title: 'Invite your first team member', action: 'Open Admin → Users → Invite. Set their role before sending.', route: '/admin/users', requiresApproval: false },
      { step: 3, title: 'Add at least one product to the catalog', action: 'Open Products and add a product with variant, price, and HSN code.', route: '/products', requiresApproval: false },
      { step: 4, title: 'Set pricing defaults', action: 'Open Admin → Pricing Engine and confirm margin, currency, and freight defaults.', route: '/admin/pricing-engine', requiresApproval: true },
      { step: 5, title: 'Add a market and pipeline stage', action: 'Open Admin → Markets and Admin → Stages to configure your sales pipeline.', route: '/admin/stages', requiresApproval: false },
    ],
    approvalReminder: 'Pricing defaults and compliance rules require admin confirmation before saving.',
  },
  lead_to_quote: {
    intent: 'lead_to_quote',
    headline: 'Move a qualified lead to a sent quote.',
    steps: [
      { step: 1, title: 'Qualify the lead', action: 'Open the lead and confirm company, contact, market, and product interest.', route: '/leads', requiresApproval: false, blockerCheck: 'missing company or contact name' },
      { step: 2, title: 'Check compliance gate', action: 'Check the Compliance tab on the lead. Clear any blockers before building the quote.', requiresApproval: false, blockerCheck: 'open compliance items' },
      { step: 3, title: 'Build the quote', action: 'Click Create Quote from the lead workspace. Add line items, pricing, and currency.', requiresApproval: false },
      { step: 4, title: 'Approve the quote', action: 'Review the quote PDF preview. Approval is required before sending.', requiresApproval: true },
      { step: 5, title: 'Send the quote', action: 'Click Send in the Quote Builder after approval. Confirm the recipient.', requiresApproval: true },
    ],
    approvalReminder: 'Quote approval and send require explicit human confirmation. Setu Guru cannot send quotes.',
  },
  quote_to_order: {
    intent: 'quote_to_order',
    headline: 'Convert an accepted quote to an active order.',
    steps: [
      { step: 1, title: 'Confirm quote acceptance', action: 'Buyer confirms acceptance. Mark the quote as accepted in the Quote workspace.', requiresApproval: true },
      { step: 2, title: 'Verify order creation', action: 'Open Orders and confirm the order was created from the accepted quote.', route: '/orders', requiresApproval: false },
      { step: 3, title: 'Confirm actual lines', action: 'In the Orders workspace, confirm actual line items match the accepted quote.', requiresApproval: true },
      { step: 4, title: 'Set payment terms', action: 'Record payment terms or issue a proforma invoice. Payment must be confirmed before dispatch.', requiresApproval: true },
    ],
    approvalReminder: 'Quote acceptance, actual line confirmation, and payment terms all require human approval.',
  },
  order_to_dispatch: {
    intent: 'order_to_dispatch',
    headline: 'Move an order from processing to dispatched.',
    steps: [
      { step: 1, title: 'Create packing plan', action: 'Open the Packing stage in the Orders workspace and add a packing plan.', requiresApproval: false },
      { step: 2, title: 'Generate order documents', action: 'Generate proforma invoice, packing list, and delivery note in the Buyer Doc stage.', requiresApproval: true },
      { step: 3, title: 'Raise freight request', action: 'Open the Freight Queue stage and raise a freight rate request.', requiresApproval: false },
      { step: 4, title: 'Confirm payment', action: 'Record payment received or confirm approved payment terms in the Processing stage.', requiresApproval: true },
      { step: 5, title: 'Approve dispatch', action: 'Once all gates pass, approve dispatch in the Approval stage and send documents.', requiresApproval: true },
    ],
    approvalReminder: 'Document generation, payment confirmation, and dispatch approval all require explicit human confirmation.',
  },
  general: {
    intent: 'general',
    headline: 'Ask Setu Guru a specific question to get targeted guidance.',
    steps: [
      { step: 1, title: 'Start with a route-specific question', action: 'Ask about the current page: "What can I do here?" or "What is blocking this order?"', requiresApproval: false },
      { step: 2, title: 'Use live research for trade data', action: 'Ask "What is the HSN code for [product]?" or "What documents are needed to export to [country]?"', requiresApproval: false },
      { step: 3, title: 'Use workflow status for order state', action: 'Ask "What is the status of this order?" while on an order workspace.', requiresApproval: false },
    ],
    approvalReminder: 'All data changes require human approval. Setu Guru provides guidance only.',
  },
};

function detectIntent(question: string): PlaybookIntent {
  const q = question.toLowerCase();
  if (/onboard|setup|set up|getting started|first time|new org/.test(q)) return 'onboarding_setup';
  if (/lead.*quote|qualify.*lead|convert.*lead|create quote/.test(q)) return 'lead_to_quote';
  if (/quote.*order|accept.*quote|order.*from quote/.test(q)) return 'quote_to_order';
  if (/dispatch|ship|fulfill|packing|freight|delivery/.test(q)) return 'order_to_dispatch';
  return 'general';
}

export async function buildPlaybookGuidance(
  organizationId: string,
  question: string,
): Promise<{ answer: string; playbook: PlaybookGuidance; rows: Array<Record<string, unknown>> }> {
  const intent = detectIntent(question);
  const playbook = PLAYBOOKS[intent];

  // Check for live org setup gaps to personalize the guidance
  let setupGapNote = '';
  try {
    const db = (await createClient()) as unknown as AnyDB;
    const [{ count: productCount }, { count: leadCount }] = await Promise.all([
      db.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    ]);
    if ((productCount ?? 0) === 0) {
      setupGapNote = '\n\nInternal check: No products found in your catalog. Add at least one product before creating quotes.';
    } else if ((leadCount ?? 0) === 0 && intent === 'lead_to_quote') {
      setupGapNote = '\n\nInternal check: No leads found. Import or add a lead before building a quote.';
    }
  } catch {
    // Non-blocking — continue without personalization
  }

  const stepLines = playbook.steps.map(
    (s) => `${s.step}. ${s.title} — ${s.action}${s.requiresApproval ? ' [Human approval required]' : ''}`,
  );

  const answer = [
    playbook.headline,
    '',
    ...stepLines,
    '',
    `Approval reminder: ${playbook.approvalReminder}`,
    setupGapNote,
  ]
    .join('\n')
    .trim();

  const rows = playbook.steps.map((s) => ({
    id: String(s.step),
    name: s.title,
    type: s.requiresApproval ? 'approval_required' : 'self_service',
    next: s.action,
    url: s.route ?? '',
    citation: `Step ${s.step}`,
  }));

  return { answer, playbook, rows };
}
