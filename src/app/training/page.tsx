import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

export const metadata = {
  title: 'Training Workspace',
  description:
    'Guided Setu Flow training workspace for new users learning the capture-to-dispatch trade execution workflow.',
};

type TrainingScreen = {
  title: string;
  file?: string;
  alt?: string;
  firstClick: string;
  check: string;
  doneWhen: string;
  tip: string;
  focus: string;
  placeholder?: boolean;
};

type TrainingStage = {
  id: string;
  number: string;
  title: string;
  audience: string;
  outcome: string;
  screens: TrainingScreen[];
};

const screenshotBase = '/internal/docs-screenshots';

const journey = [
  'Dashboard',
  'Lead capture',
  'Trade show',
  'Mobile vCard',
  'Tasks',
  'Setu Guru',
  'Quote',
  'Documents',
  'Dispatch',
];

const trainingStages: TrainingStage[] = [
  {
    id: 'dashboard',
    number: '01',
    title: 'Dashboard command view',
    audience: 'Every user, manager, sales owner, operations owner',
    outcome: 'Start the day by understanding queue health, activity, market visibility, and where attention is needed first.',
    screens: [
      {
        title: 'Dashboard overview',
        file: 'ss-dashboard.jpg',
        alt: 'Setu Flow dashboard overview',
        firstClick: 'Open Dashboard from the main navigation.',
        check: 'Review today\'s open queues, priority cards, overdue activity, and records needing intervention.',
        doneWhen: 'You know which record or queue should be opened first and which owner is responsible.',
        tip: 'Use Dashboard as the daily starting point before opening individual leads, quotes, documents, or orders.',
        focus: 'Queue health, priority cards, owner visibility, next action areas',
      },
      {
        title: 'Analytics view',
        file: 'ss-analytics.jpg',
        alt: 'Setu Flow analytics screen',
        firstClick: 'Open the analytics/reporting view from Dashboard or Reports.',
        check: 'Look for bottlenecks, stale records, conversion movement, and areas where follow-up quality is dropping.',
        doneWhen: 'You can explain what is healthy, what is stuck, and what needs manager attention.',
        tip: 'Use analytics for coaching and pipeline review, not for editing day-to-day records.',
        focus: 'Performance trend, bottleneck insight, management review CTA',
      },
      {
        title: 'Reports view',
        file: 'ss-reports.jpg',
        alt: 'Setu Flow reports screen',
        firstClick: 'Open Reports when you need a structured view across teams or workflow stages.',
        check: 'Confirm the selected filters, date range, owner, and stage before reading the result.',
        doneWhen: 'The report explains which workflow needs follow-up, cleanup, or handoff attention.',
        tip: 'Always confirm filters before using reports in a meeting or training session.',
        focus: 'Filter controls, report summary, export/review action if available',
      },
    ],
  },
  {
    id: 'lead-capture',
    number: '02',
    title: 'Lead capture and qualification',
    audience: 'Sales owners, field teams, trade-show teams',
    outcome: 'Create a clean lead, confirm buyer context, and make sure the lead has owner, status, notes, and next action.',
    screens: [
      {
        title: 'Capture workspace',
        file: 'ss-capture.jpg',
        alt: 'Setu Flow capture workspace',
        firstClick: 'Press Add Lead, Capture Lead, or the primary capture action on the screen.',
        check: 'Enter company, contact, country, source, product interest, and conversation notes while context is fresh.',
        doneWhen: 'The record is saved with source, owner, status, and next follow-up visible.',
        tip: 'Do not leave a captured inquiry without a next action. A lead without follow-up becomes stale quickly.',
        focus: 'Primary capture button, source field, owner field, save action',
      },
      {
        title: 'Capture lead form',
        file: 'ss-capture-lead.jpg',
        alt: 'Setu Flow capture lead form',
        firstClick: 'Start in the first required field, then complete contact and requirement details before saving.',
        check: 'Verify email or phone, product category, expected quantity, buyer need, source, and owner.',
        doneWhen: 'The saved lead is complete enough for another user to understand the buyer request without asking you again.',
        tip: 'Use notes to capture the exact buyer ask, not just a generic summary.',
        focus: 'Required fields, product interest, notes, Save Lead CTA',
      },
      {
        title: 'Leads list',
        file: 'ss-leads.jpg',
        alt: 'Setu Flow leads list',
        firstClick: 'Open the lead row that needs review or follow-up.',
        check: 'Look at status, owner, source, last activity, and next action before changing anything.',
        doneWhen: 'You know whether the lead should be contacted, qualified, assigned, quoted, held, or closed.',
        tip: 'Read the most recent note before changing status.',
        focus: 'Lead row, status column, owner column, next action indicator',
      },
      {
        title: 'Lead command view',
        file: 'ss-leads-cmd.jpg',
        alt: 'Setu Flow lead command screen',
        firstClick: 'Use the lead command controls to update status, assign owner, or add the next follow-up.',
        check: 'Confirm the reason for the status change and whether another team needs to take over.',
        doneWhen: 'Owner, status, notes, and next follow-up are aligned with the real business situation.',
        tip: 'This is where training should emphasize discipline: every movement needs context.',
        focus: 'Status control, owner control, add note, create task/follow-up CTA',
      },
    ],
  },
  {
    id: 'trade-show',
    number: '03',
    title: 'Trade show and event capture',
    audience: 'Event teams, sales owners, managers',
    outcome: 'Convert event conversations into clean, assigned, follow-up-ready CRM records.',
    screens: [
      {
        title: 'Pipeline/event view',
        file: 'ss-pipeline.jpg',
        alt: 'Setu Flow pipeline screen',
        firstClick: 'Open the event, campaign, or pipeline bucket that contains new conversations.',
        check: 'Review source, lead stage, buyer interest, and whether the event record has a next follow-up.',
        doneWhen: 'Each event lead has a clear stage, owner, and follow-up action.',
        tip: 'Trade show leads should be cleaned up quickly after the event while memory is fresh.',
        focus: 'Pipeline stage, event source, lead movement CTA',
      },
      {
        title: 'Catalog/product context',
        file: 'ss-catalog.jpg',
        alt: 'Setu Flow catalog screen',
        firstClick: 'Open Catalog or product reference when the buyer asks about product options.',
        check: 'Confirm product category, pack size, expected quantity, and any special requirement.',
        doneWhen: 'The lead or quote record references the right product interest and required product detail.',
        tip: 'Use catalog context to avoid vague entries like interested in snacks or interested in powder.',
        focus: 'Product card, category detail, add/select product CTA',
      },
    ],
  },
  {
    id: 'mobile-vcard',
    number: '04',
    title: 'Mobile field capture and vCard',
    audience: 'Field teams, event teams, sales users away from desk',
    outcome: 'Capture contact and buyer interest quickly from phone, then clean it up from desktop later.',
    screens: [
      {
        title: 'Mobile capture',
        file: 'ss-mobile-capture.jpg',
        alt: 'Setu Flow mobile capture screen',
        firstClick: 'Tap Quick Lead, Capture, or the mobile capture CTA.',
        check: 'Capture name, company, phone/email, source, product interest, and notes before leaving the conversation.',
        doneWhen: 'The mobile record is saved and ready for desktop review.',
        tip: 'Mobile capture should be fast. Clean and qualify the record later from the full workspace.',
        focus: 'Quick lead CTA, mobile save button, source and notes fields',
      },
      {
        title: 'Mobile leads',
        file: 'ss-mobile-leads.jpg',
        alt: 'Setu Flow mobile leads screen',
        firstClick: 'Open the newly captured lead from the mobile leads list.',
        check: 'Confirm the captured contact details and whether the record needs cleanup.',
        doneWhen: 'The record is either ready for follow-up or flagged for desktop cleanup.',
        tip: 'Do not assume card scan data is perfect. Always verify extracted fields.',
        focus: 'Lead card, open detail action, cleanup indicator',
      },
      {
        title: 'vCard capture',
        file: 'ss-vcard.jpg',
        alt: 'Setu Flow vCard capture screen',
        firstClick: 'Tap scan/import vCard or use the business card capture action.',
        check: 'Verify name, company, title, phone, email, and source after extraction.',
        doneWhen: 'The contact is converted into a usable lead with notes and next follow-up.',
        tip: 'The most important training point is verification before save.',
        focus: 'Scan/import CTA, extracted fields, confirm/save CTA',
      },
    ],
  },
  {
    id: 'tasks',
    number: '05',
    title: 'Tasks and follow-up discipline',
    audience: 'Every user who owns follow-up work',
    outcome: 'Prevent leads, quotes, documents, and dispatch items from going cold by giving each action an owner and due date.',
    screens: [
      {
        title: 'Tasks workspace',
        file: 'ss-tasks.jpg',
        alt: 'Setu Flow tasks screen',
        firstClick: 'Press New Task, Add Task, or open the due task from the task list.',
        check: 'Confirm owner, due date, priority, linked record, and task note.',
        doneWhen: 'The task clearly explains what needs to happen next and who owns it.',
        tip: 'A good task should be understandable even if another teammate opens it tomorrow.',
        focus: 'New task CTA, due date, owner, linked lead/order',
      },
      {
        title: 'Mobile tasks',
        file: 'ss-tasks-mobile.jpg',
        alt: 'Setu Flow mobile tasks screen',
        firstClick: 'Tap the task card or completion action after the follow-up is done.',
        check: 'Add a completion note or next-step note before marking complete.',
        doneWhen: 'The task is closed with a clear outcome or converted into the next follow-up.',
        tip: 'Never close a task without recording the outcome.',
        focus: 'Task card, complete CTA, follow-up note field',
      },
    ],
  },
  {
    id: 'setu-guru',
    number: '06',
    title: 'Setu Guru help and AI guidance',
    audience: 'All users, with manager approval for sensitive actions',
    outcome: 'Use Setu Guru to understand the current page, blockers, missing data, pricing defaults, HS codes, compliance, and next steps.',
    screens: [
      {
        title: 'Setu Guru mobile dashboard help',
        placeholder: true,
        alt: 'Setu Guru mobile dashboard help placeholder',
        firstClick: 'Tap Dashboard help or type a question in the Setu Guru input box.',
        check: 'Review the response, then use Helpful or Missing detail to give feedback.',
        doneWhen: 'You understand the recommended next step and a human has approved any price, compliance, send, or write-back action.',
        tip: 'Setu Guru checks page context and live organization data, but humans still approve important actions.',
        focus: 'Dashboard help, response policy help, send button, Helpful/Missing detail feedback',
      },
    ],
  },
  {
    id: 'quote',
    number: '07',
    title: 'Quote workflow',
    audience: 'Sales, operations, approvers',
    outcome: 'Move from quote draft to approval, approved send, outcome update, and order creation without losing assumptions.',
    screens: [
      {
        title: 'Quote builder',
        file: 'ss-quotebuilder.jpg',
        alt: 'Setu Flow quote builder screen',
        firstClick: 'Press New Quote, Build Quote, or open the quote builder from the qualified lead.',
        check: 'Confirm product, quantity, pack size, currency, freight, pricing assumptions, and destination.',
        doneWhen: 'The quote draft contains enough detail for approval or buyer review.',
        tip: 'Do not send a quote until assumptions and approvals are visible.',
        focus: 'Build quote CTA, product line items, pricing/freight fields',
      },
      {
        title: 'Quotes list',
        file: 'ss-quotes.jpg',
        alt: 'Setu Flow quotes list screen',
        firstClick: 'Open the quote that is draft, awaiting approval, ready to send, or awaiting outcome.',
        check: 'Check status, owner, approval state, buyer, amount, and last activity.',
        doneWhen: 'You know whether to edit, approve, send, follow up, or create order.',
        tip: 'Quote status should match the real buyer conversation.',
        focus: 'Quote row, status, approval state, open action',
      },
      {
        title: 'Operator quote draft',
        file: 'operator-04-quote-builder-draft.png',
        alt: 'Operator quote builder draft screen',
        firstClick: 'Use the draft controls to add or adjust line items before approval.',
        check: 'Validate product detail, price, freight, notes, and internal assumptions.',
        doneWhen: 'The draft is ready to move to approval gate.',
        tip: 'Draft is the safe stage for correction. Approval should not be used for cleanup.',
        focus: 'Line item edit, draft save, submit for approval CTA',
      },
      {
        title: 'Quote approval gate',
        file: 'operator-05-quote-approval-gate.png',
        alt: 'Operator quote approval gate screen',
        firstClick: 'Press Submit for Approval or review the approval gate panel.',
        check: 'Confirm margin, freight, terms, documentation, compliance, and approval notes.',
        doneWhen: 'The quote is either approved, returned with notes, or held for missing inputs.',
        tip: 'Approval gate protects the team from sending incomplete commercial terms.',
        focus: 'Approval gate, approve/return action, missing input warnings',
      },
      {
        title: 'Approved quote send',
        file: 'operator-06-approved-quote-send.png',
        alt: 'Operator approved quote send screen',
        firstClick: 'Press Send Quote only after approval and final review.',
        check: 'Confirm recipient, buyer-facing terms, attachments, and message before sending.',
        doneWhen: 'The quote is sent and the follow-up task is created or scheduled.',
        tip: 'Sending is a business action. Review before pressing the final CTA.',
        focus: 'Send quote CTA, recipient review, follow-up task action',
      },
      {
        title: 'Quote outcome and create order',
        file: 'operator-07-quote-outcome-create-order.png',
        alt: 'Operator quote outcome create order screen',
        firstClick: 'Press Mark Accepted, Update Outcome, or Create Order when the buyer confirms.',
        check: 'Confirm accepted terms, quantity, buyer confirmation, and order readiness.',
        doneWhen: 'The accepted quote becomes an order-ready record with the right handoff details.',
        tip: 'Only create order from a real accepted outcome, not from a hopeful follow-up.',
        focus: 'Outcome action, accepted status, create order CTA',
      },
    ],
  },
  {
    id: 'documents',
    number: '08',
    title: 'Documents and order readiness',
    audience: 'Operations, order coordinators, dispatch owners',
    outcome: 'Confirm documents, product, packing, freight, and order stage readiness before dispatch.',
    screens: [
      {
        title: 'Documents workspace',
        file: 'ss-documents.jpg',
        alt: 'Setu Flow documents screen',
        firstClick: 'Open the document checklist or document record connected to the order.',
        check: 'Confirm contract, invoice, packing list, product documents, compliance files, and owner for missing items.',
        doneWhen: 'Every required document is attached, tracked, or clearly assigned as pending.',
        tip: 'Document readiness should be visible in the system, not hidden in chat messages.',
        focus: 'Document checklist, upload/request CTA, pending owner',
      },
      {
        title: 'Orders workspace',
        file: 'ss-orders.jpg',
        alt: 'Setu Flow orders screen',
        firstClick: 'Open the order that needs execution review or readiness update.',
        check: 'Review order status, buyer/seller, product, quantity, terms, documents, and dispatch readiness.',
        doneWhen: 'The order clearly shows what is ready, what is pending, and who owns the next action.',
        tip: 'Order status must reflect real readiness, not expected readiness.',
        focus: 'Order row/detail, status, readiness panel, owner field',
      },
      {
        title: 'Order execution stage panel',
        file: 'operator-08-order-execution-stage-panel.png',
        alt: 'Operator order execution stage panel screen',
        firstClick: 'Use the execution stage panel to move the order through the correct stage.',
        check: 'Confirm stage, blockers, notes, document readiness, and next owner.',
        doneWhen: 'The order stage reflects the real operational position.',
        tip: 'Stage changes should always include enough context for the next owner.',
        focus: 'Stage selector, blocker note, next owner CTA',
      },
      {
        title: 'Packing and freight',
        file: 'operator-10-packing-freight.png',
        alt: 'Operator packing and freight screen',
        firstClick: 'Open packing/freight details before marking the order dispatch-ready.',
        check: 'Confirm pack count, weight, dimensions, freight mode, pickup/dispatch timing, and freight notes.',
        doneWhen: 'Packing and freight information is complete enough for dispatch to act.',
        tip: 'Dispatch cannot move cleanly if packing and freight are guessed.',
        focus: 'Packing fields, freight mode, dispatch timing, save CTA',
      },
    ],
  },
  {
    id: 'dispatch',
    number: '09',
    title: 'Dispatch tracking',
    audience: 'Dispatch owners, operations, sales owners',
    outcome: 'Complete the handoff from order readiness to shipment movement, tracking, and post-dispatch follow-up.',
    screens: [
      {
        title: 'Dispatch tracking',
        file: 'operator-11-dispatch-tracking.png',
        alt: 'Operator dispatch tracking screen',
        firstClick: 'Press Update Dispatch, Add Tracking, or the dispatch status action when shipment movement is confirmed.',
        check: 'Confirm dispatch status, tracking number, carrier, date, document handoff, and buyer follow-up owner.',
        doneWhen: 'Dispatch status matches the real-world shipment and the post-dispatch follow-up is visible.',
        tip: 'Do not mark dispatch complete until the real shipment action has happened.',
        focus: 'Dispatch status, tracking field, carrier/date, buyer follow-up task',
      },
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
    body: 'Checks product, quote, document, order, approval, packing, freight, and readiness details before the record moves toward execution.',
  },
  {
    title: 'Dispatch owner',
    body: 'Confirms shipment handoff, updates dispatch status, records movement details, and keeps post-dispatch follow-up visible.',
  },
  {
    title: 'Manager',
    body: 'Reviews queue health, bottlenecks, overdue tasks, stuck records, and handoff quality across the full workflow.',
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

function MiniLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function SetuGuruPlaceholder() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="mx-auto w-full max-w-[18rem] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,.12)]">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl">🧘</div>
          <div>
            <p className="text-lg font-bold tracking-[-0.03em] text-slate-950">Setu Guru</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Online</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Quick starts</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Dashboard help, response policy help, blockers, missing data, pricing defaults, HS codes, compliance, and next steps.</p>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
          Ask about this page, products, pricing defaults, buyers, HS codes...
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Helpful</span>
          <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Missing detail</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white">➤</span>
        </div>
      </div>
    </div>
  );
}

function ScreenCard({ screen }: { screen: TrainingScreen }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.08)]">
      <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="bg-slate-100 p-3">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
            {screen.placeholder ? (
              <SetuGuruPlaceholder />
            ) : (
              <Image
                src={`${screenshotBase}/${screen.file}`}
                alt={screen.alt ?? screen.title}
                width={1600}
                height={1000}
                className="h-[360px] w-full object-contain object-top"
              />
            )}
          </div>
        </div>
        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Training screen</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500">{screen.file ?? 'Placeholder'}</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{screen.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">{screen.tip}</p>
          <div className="mt-5 grid gap-3">
            <MiniLabel label="Press this first" value={screen.firstClick} />
            <MiniLabel label="Check before saving" value={screen.check} />
            <MiniLabel label="Done when" value={screen.doneWhen} />
          </div>
          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">Zoom / CTA focus</p>
            <p className="mt-2 text-sm leading-6 text-white/75">{screen.focus}</p>
          </div>
        </div>
      </div>
    </article>
  );
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
                Learn Setu Flow from dashboard to dispatch.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                A true training workspace for new users: each screen explains what button to press, what to check, and what the record should look like before moving forward.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#screen-walkthrough" className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] transition hover:-translate-y-0.5 hover:bg-teal-700">
                  Start screen walkthrough
                </a>
                <Link href="/field-mobile" className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  See mobile capture
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <Image
                src={`${screenshotBase}/ss-dashboard.jpg`}
                alt="Setu Flow dashboard training overview"
                width={1600}
                height={1000}
                className="rounded-[1.55rem] object-contain object-top"
                priority
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)] sm:p-7">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {journey.map((item, index) => (
                <a key={item} href={`#${trainingStages[index]?.id ?? 'screen-walkthrough'}`} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/15 sm:text-sm">
                  {index + 1}. {item}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Role clarity"
            title="Know who owns each step"
            body="Every screen in this guide tells users what to press, what to verify, and when the handoff is ready. This keeps sales, operations, dispatch, and managers aligned."
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

        <section id="screen-walkthrough" className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Screen walkthrough"
            title="Use the right screen at the right moment"
            body="Follow the sections in order for a complete dashboard-to-dispatch training path. Each screen includes the practical CTA, checks, and completion rule."
          />

          <div className="mx-auto mt-12 max-w-7xl space-y-12">
            {trainingStages.map((stage) => (
              <section key={stage.id} id={stage.id} className="scroll-mt-28">
                <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,.06)] sm:p-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-sm font-bold text-teal-700">{stage.number}</span>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">{stage.audience}</span>
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{stage.title}</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">{stage.outcome}</p>
                </div>
                <div className="space-y-6">
                  {stage.screens.map((screen) => (
                    <ScreenCard key={`${stage.id}-${screen.title}`} screen={screen} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-950 px-7 py-9 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-200">Trainer notes</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">This is now ready for guided onboarding and future video narration.</h2>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  Trainers can use each screenshot card as a talk track: press this first, check this before saving, and only move forward when the done condition is true.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-semibold text-white">Future video sequence</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-white/70">
                  <li>1. Dashboard and queue health</li>
                  <li>2. Lead capture and trade show/event intake</li>
                  <li>3. Mobile capture, vCard, and tasks</li>
                  <li>4. Setu Guru guidance and human approval</li>
                  <li>5. Quote approval, documents, order readiness, and dispatch tracking</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
