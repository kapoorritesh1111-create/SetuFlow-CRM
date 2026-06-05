import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

export const metadata = {
  title: 'Training Workspace',
  description:
    'Guided Setu Flow training workspace for new users learning the capture-to-dispatch trade execution workflow.',
};

type ModuleStatus = 'Start here' | 'Practice' | 'Checklist' | 'Future video';

type TrainingModule = {
  id: string;
  status: ModuleStatus;
  title: string;
  audience: string;
  goal: string;
  image: string;
  imageAlt: string;
  steps: string[];
  checks: string[];
};

const journey = [
  'Capture inquiry',
  'Review lead',
  'Qualify request',
  'Prepare quote',
  'Confirm documents',
  'Ready for dispatch',
  'Complete handoff',
];

const modules: TrainingModule[] = [
  {
    id: 'orientation',
    status: 'Start here',
    title: 'Understand the workspace',
    audience: 'Every new user',
    goal: 'Learn where the day begins, what the command view means, and how to decide the next action without searching across tools.',
    image: '/marketing/dashboard-command-center.png',
    imageAlt: 'Setu Flow command center overview',
    steps: [
      'Open Setu Flow and begin from the main workspace view.',
      'Review the visible queues, recent activity, and priority cards before opening records.',
      'Use the workspace as the operating source for the day: leads, quote work, documents, order readiness, and dispatch follow-up.',
    ],
    checks: [
      'You know which records need action today.',
      'You can identify whether the record belongs to sales, operations, or dispatch.',
      'You avoid changing records that are owned by another team unless assigned.',
    ],
  },
  {
    id: 'capture',
    status: 'Practice',
    title: 'Capture a new inquiry',
    audience: 'Sales, field teams, trade-show teams',
    goal: 'Create a clean starting record from a buyer inquiry, event conversation, business card, WhatsApp follow-up, or product request.',
    image: '/marketing/trade-events.png',
    imageAlt: 'Trade event capture workflow',
    steps: [
      'Capture the company, contact, product interest, country, source, and conversation notes while the context is fresh.',
      'Attach or reference supporting details such as card scans, event notes, product photos, catalogue requests, or buyer requirements.',
      'Assign an owner and set the next follow-up so the record does not remain unworked.',
    ],
    checks: [
      'Company and contact details are usable for follow-up.',
      'Product interest is specific enough for operations to understand.',
      'Source and owner are set before moving forward.',
    ],
  },
  {
    id: 'qualification',
    status: 'Checklist',
    title: 'Review and qualify the lead',
    audience: 'Sales owners and managers',
    goal: 'Move from raw inquiry to a qualified opportunity by confirming fit, urgency, ownership, and next commercial action.',
    image: '/marketing/follow-up-queue.png',
    imageAlt: 'Follow-up queue for lead qualification',
    steps: [
      'Open the lead record and read the latest notes before changing status.',
      'Confirm buyer requirement, destination, product category, expected quantity, timeline, and decision-maker details.',
      'Update status only after the next action is clear: follow up, request pricing, prepare quote, hold, or close out.',
    ],
    checks: [
      'Status reflects the actual business stage.',
      'Notes explain why the lead is moving forward or stopping.',
      'Next action has an owner and a realistic date.',
    ],
  },
  {
    id: 'quote',
    status: 'Practice',
    title: 'Prepare quote and commercial details',
    audience: 'Sales and operations',
    goal: 'Translate a qualified request into quote-ready information with enough detail for price, product, document, and logistics review.',
    image: '/marketing/quote-workflow.png',
    imageAlt: 'Quote workflow screen',
    steps: [
      'Confirm products, pack size, quantity, shipment terms, destination, and currency before preparing quote work.',
      'Check whether pricing, freight, documentation, and approval inputs are complete.',
      'Record assumptions clearly so the next team can understand what was quoted and what still needs confirmation.',
    ],
    checks: [
      'Products and quantities are not vague.',
      'Commercial assumptions are visible in the record.',
      'Any approval dependency is marked before the quote is shared.',
    ],
  },
  {
    id: 'documents',
    status: 'Checklist',
    title: 'Confirm documents and order readiness',
    audience: 'Operations and order coordinators',
    goal: 'Make sure the record is ready for execution before it reaches dispatch, with required order and document information in place.',
    image: '/marketing/ss-documents.jpg',
    imageAlt: 'Document tracking screen',
    steps: [
      'Open the order or execution record and verify buyer, seller, product, quantity, commercial terms, and document requirements.',
      'Check whether contract, invoice, packing, product, shipment, and compliance inputs are complete enough for processing.',
      'Flag missing information before dispatch work starts so the team avoids rework later.',
    ],
    checks: [
      'Required fields are complete before handoff.',
      'Documents are attached, tracked, or clearly requested.',
      'The record shows what is pending and who owns it.',
    ],
  },
  {
    id: 'dispatch',
    status: 'Practice',
    title: 'Move from ready state to dispatch',
    audience: 'Dispatch and operations',
    goal: 'Complete the operational handoff from order readiness to shipment action with clear status, tracking, and follow-up ownership.',
    image: '/marketing/ss-orders.jpg',
    imageAlt: 'Order execution and dispatch readiness screen',
    steps: [
      'Confirm that the order is approved, documentation is ready, product details are final, and dispatch timing is agreed.',
      'Update the dispatch-related status only when the shipment action is actually ready or completed.',
      'Add tracking, shipment note, or follow-up instruction so sales and operations can see the current truth without separate messages.',
    ],
    checks: [
      'No missing commercial or document requirement remains hidden.',
      'Dispatch status matches the real-world movement.',
      'The next follow-up after dispatch is visible to the right owner.',
    ],
  },
  {
    id: 'mobile',
    status: 'Future video',
    title: 'Use mobile capture in the field',
    audience: 'Field users and event teams',
    goal: 'Capture buyer interest quickly from a phone while keeping enough structure for the office team to qualify and follow up.',
    image: '/marketing/mobile-quick-lead.png',
    imageAlt: 'Mobile quick lead capture screen',
    steps: [
      'Use the field mobile flow for quick lead capture when working at events, factories, buyer meetings, or supplier visits.',
      'Prioritize accurate contact details, product interest, notes, and follow-up timing over long descriptions.',
      'Review captured mobile records from the desktop workspace after the event to clean up and qualify them.',
    ],
    checks: [
      'Contact details are good enough to reach the person again.',
      'The source is clear for reporting and follow-up quality.',
      'The record is reviewed after capture, not left as a raw entry.',
    ],
  },
];

const roles = [
  {
    title: 'Sales owner',
    body: 'Captures and qualifies inquiries, keeps buyer context updated, prepares commercial next steps, and makes sure follow-up does not go cold.',
  },
  {
    title: 'Operations owner',
    body: 'Checks product, quote, document, order, approval, and readiness details before the record moves toward execution.',
  },
  {
    title: 'Dispatch owner',
    body: 'Confirms the shipment handoff, updates dispatch status, records movement details, and keeps the post-dispatch follow-up visible.',
  },
  {
    title: 'Manager',
    body: 'Reviews bottlenecks, stuck records, overdue follow-ups, and handoff quality across the full capture-to-dispatch path.',
  },
];

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{children}</span>;
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-500">{body}</p>
    </div>
  );
}

function CheckIcon() {
  return <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">✓</span>;
}

export default function TrainingWorkspacePage() {
  return (
    <SiteShell>
      <main className="bg-white text-slate-950">
        <section className="relative overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_32%),linear-gradient(180deg,#f8fcfd_0%,#eef6fb_100%)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <Badge>Training workspace</Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
                Learn Setu Flow from capture to dispatch.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                A guided workspace for new users to understand the operating rhythm: capture a clean inquiry, qualify the record, prepare commercial details, verify order readiness, and complete dispatch handoff with confidence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#modules" className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] transition hover:-translate-y-0.5 hover:bg-teal-700">
                  Start training
                </a>
                <Link href="/field-mobile" className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  See mobile capture
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <Image
                src="/marketing/dashboard-command-center.png"
                alt="Setu Flow training workspace overview"
                width={1600}
                height={1000}
                className="rounded-[1.55rem] object-cover object-top"
                priority
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)] sm:p-7">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {journey.map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 sm:text-sm">{item}</span>
                  {index < journey.length - 1 && <span className="hidden text-white/35 sm:inline">→</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Role clarity"
            title="Know who owns each step"
            body="Setu Flow works best when every user understands what they update, when they hand off, and what must be visible before the next team continues."
          />
          <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <article key={role.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,.06)]">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{role.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{role.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modules" className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Guided modules"
            title="Step-by-step training path"
            body="Use each module as a live walkthrough card. Read the goal, follow the steps, complete the checks, then move to the next module."
          />
          <div className="mx-auto mt-12 max-w-7xl space-y-8">
            {modules.map((module, index) => (
              <article key={module.id} className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.08)] lg:grid-cols-[0.92fr_1fr]">
                <div className="bg-slate-100 p-3">
                  <Image
                    src={module.image}
                    alt={module.imageAlt}
                    width={1600}
                    height={1000}
                    className="h-full min-h-[320px] w-full rounded-[1.4rem] object-cover object-top"
                  />
                </div>
                <div className="p-7 sm:p-9">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-sm font-bold text-teal-700">{index + 1}</span>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">{module.status}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{module.audience}</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{module.goal}</p>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Walkthrough steps</p>
                      <ol className="mt-3 space-y-3">
                        {module.steps.map((step) => (
                          <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600">
                            <CheckIcon />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Before moving forward</p>
                      <ul className="mt-3 space-y-3">
                        {module.checks.map((check) => (
                          <li key={check} className="flex gap-3 text-sm leading-6 text-slate-600">
                            <CheckIcon />
                            <span>{check}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-950 px-7 py-9 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-200">Trainer notes</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Use this page as the base for live demos and future videos.</h2>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  Each module is intentionally written as a short teaching block. Trainers can record one short video per module, then attach those videos beside the same steps without changing the learning path.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-semibold text-white">Recommended video sequence</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-white/70">
                  <li>1. Workspace orientation and daily queues</li>
                  <li>2. Capture a new inquiry from event or field source</li>
                  <li>3. Qualify, assign, and set follow-up</li>
                  <li>4. Prepare quote/order readiness</li>
                  <li>5. Complete dispatch handoff and follow-up</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
