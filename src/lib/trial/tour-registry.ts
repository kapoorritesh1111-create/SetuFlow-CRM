// S24-TRIAL-204 Pass B: declarative guided-tour registry.
// Adding guidance to any page = add a step here + one data-tour attribute on the CTA.
// No copy lives inside feature components; this file is the single source of truth
// and is also readable by Setu Guru (Pass C / S24-TRIAL-205).

import type { TrialCapability, TrialTemplateKey } from '@/lib/trial/capability';

export type TourMilestoneId = 'lead' | 'quote' | 'order' | 'dispatch';

export type TourStep = {
  /** Stable unique id, referenced by Setu Guru show_step in Pass C. */
  id: string;
  /** App route prefix this step belongs to (matched with startsWith). */
  route: string;
  /** Value of the data-tour attribute on the anchored CTA. */
  anchor: string;
  title: string;
  body: string;
  /** Order within the route's tour. */
  order: number;
  /** Journey milestone this step drives toward, if any. */
  milestone?: TourMilestoneId;
  /** Restrict to specific trial templates; omit = all templates. */
  templateKeys?: TrialTemplateKey[];
};

export const TOUR_STEPS: TourStep[] = [
  // /leads
  {
    id: 'leads-quick-lead',
    route: '/leads',
    anchor: 'quick-lead-button',
    title: 'Capture your first lead',
    body: 'Quick Lead opens a fast drawer: scan a card, upload a file, or type the basics. Choose Buyer or Supplier, add company and country, one contact method, then save.',
    order: 1,
    milestone: 'lead',
  },
  {
    id: 'leads-open-row',
    route: '/leads',
    anchor: 'lead-row',
    title: 'Open the lead to continue',
    body: 'Saved leads land in this queue. Click a row to open its command center, review details, and move toward a quote.',
    order: 2,
    milestone: 'lead',
  },
  // /quotes
  {
    id: 'quotes-create',
    route: '/quotes',
    anchor: 'create-quote',
    title: 'Create your first quote',
    body: 'Start a quote from a qualified lead. The guided builder walks line items, pricing, and approval before anything is sent.',
    order: 1,
    milestone: 'quote',
  },
  {
    id: 'quotes-convert-order',
    route: '/quotes',
    anchor: 'convert-order',
    title: 'Convert the quote to an order',
    body: 'Once a quote is sent and the customer agrees, Mark accepted runs the governed acceptance and creates the order handoff automatically.',
    order: 2,
    milestone: 'order',
  },
  // /orders
  {
    id: 'orders-dispatch',
    route: '/orders',
    anchor: 'dispatch-strip',
    title: 'Advance the order to dispatch',
    body: 'This strip moves the order through execution stages. Clear the document and compliance gates, then advance to Dispatched to complete the trial journey.',
    order: 1,
    milestone: 'dispatch',
  },
  // /products
  {
    id: 'products-add',
    route: '/products',
    anchor: 'add-product',
    title: 'Add a product',
    body: 'Your trial workspace is pre-seeded with sample products for your template. Add your own SKUs here to quote real items.',
    order: 1,
  },
  // /tasks
  {
    id: 'tasks-add',
    route: '/tasks',
    anchor: 'add-task',
    title: 'Track follow-ups as tasks',
    body: 'Add a task to schedule the next touch on a lead or order. Overdue and due-today queues keep the day organized.',
    order: 1,
  },
  // /trade-events
  {
    id: 'trade-events-add',
    route: '/trade-events',
    anchor: 'add-trade-event',
    title: 'Set up a trade event',
    body: 'Create an event to fast-lane lead capture from a show floor. Leads tagged to the event stay grouped for follow-up.',
    order: 1,
  },
];

export function isTourStepId(value: string): boolean {
  return TOUR_STEPS.some((step) => step.id === value);
}

export function getTourStep(id: string): TourStep | null {
  return TOUR_STEPS.find((step) => step.id === id) ?? null;
}

export function getTourStepsForRoute(pathname: string, templateKey?: TrialTemplateKey | null): TourStep[] {
  return TOUR_STEPS
    .filter((step) => pathname === step.route || pathname.startsWith(`${step.route}/`) || pathname.startsWith(`${step.route}?`))
    .filter((step) => !step.templateKeys || (templateKey ? step.templateKeys.includes(templateKey) : false))
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Trial journey: derived from live counts in get_trial_capability — no extra
// progress table. Only "dispatched" cannot be derived from capability counts,
// so callers may pass hasDispatchedOrder from a targeted query.
// ---------------------------------------------------------------------------

export type TrialJourneyMilestone = {
  id: TourMilestoneId;
  label: string;
  detail: string;
  done: boolean;
};

export function deriveTrialJourney(
  capability: Pick<TrialCapability, 'lead_count' | 'quote_count' | 'order_count'>,
  options?: { hasDispatchedOrder?: boolean },
): TrialJourneyMilestone[] {
  return [
    {
      id: 'lead',
      label: 'Capture a lead',
      detail: 'Use Quick Lead on the Leads page.',
      done: capability.lead_count > 0,
    },
    {
      id: 'quote',
      label: 'Create a quote',
      detail: 'Build a quote from the saved lead.',
      done: capability.quote_count > 0,
    },
    {
      id: 'order',
      label: 'Convert to an order',
      detail: 'Mark the sent quote accepted to create the order.',
      done: capability.order_count > 0,
    },
    {
      id: 'dispatch',
      label: 'Dispatch the order',
      detail: 'Advance the order through execution to Dispatched.',
      done: Boolean(options?.hasDispatchedOrder),
    },
  ];
}
