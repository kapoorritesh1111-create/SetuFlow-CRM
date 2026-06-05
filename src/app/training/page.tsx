'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

export const metadata = undefined; // client component — set in layout if needed

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'sales' | 'operations' | 'dispatch' | 'manager';

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

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
};

type TrainingModule = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  icon: string;
  accent: string;
  audience: string;
  outcome: string;
  roles: Role[];
  screens: TrainingScreen[];
  quiz?: QuizQuestion;
};

// ─── HeyGen Video Plan (hidden from UI, kept for future production) ──────────
// Video 1: "Setu Flow — Product Overview" (90 sec)
//   Script: Introduce Setu Flow as a trade execution CRM for import-export teams.
//   Cover: dashboard queue health → lead capture → quote approval → order dispatch.
//   Style: AI avatar presenter, branded background, Setu Flow logo lower-third.
//   Tool: HeyGen — use "Corporate Presenter" template. Upload ss-dashboard.jpg,
//   ss-leads.jpg, ss-quotebuilder.jpg, operator-11-dispatch-tracking.png as slides.
//   Voiceover script outline:
//   "Setu Flow is built for one job: taking a buyer conversation all the way to
//    dispatch without anything falling through the cracks. Start every day at the
//    Dashboard — your queue health and priority actions are visible the moment you
//    log in. When a new lead comes in — from a trade show, a WhatsApp message, or
//    a website inquiry — capture it in under 60 seconds with all the buyer context
//    your team needs. Build a quote, run it through the approval gate, and send it
//    with confidence. When the buyer confirms, the system moves straight to order
//    execution — documents, packing, freight, and dispatch tracked in one place.
//    That is Setu Flow. Dashboard to dispatch, end to end."
//   Length: ~90 seconds. Output: public/training/videos/00-product-overview.mp4
//
// Videos 2–8: per-module walkthroughs matching trainingModules below.
// Each: 3–5 min, same HeyGen template, script = outcome + screen walkthrough steps.
// Filenames: 01-dashboard.mp4, 02-lead-capture.mp4, 03-trade-show.mp4,
//            04-mobile-vcard.mp4, 05-tasks.mp4, 06-setu-guru.mp4,
//            07-quote.mp4, 08-documents.mp4, 09-dispatch.mp4
// HeyGen account needed: heygen.com — "Instant Avatar" or stock avatar works fine.
// Estimated cost: ~$29/mo for up to 10 videos/month at 1080p.
// ─────────────────────────────────────────────────────────────────────────────

const screenshotBase = '/internal/docs-screenshots';

const trainingModules: TrainingModule[] = [
  {
    id: 'dashboard',
    number: '01',
    title: 'Dashboard command view',
    shortTitle: 'Dashboard',
    icon: '▦',
    accent: 'from-blue-500 to-indigo-500',
    audience: 'Every user, manager, sales owner, operations owner',
    outcome: 'Start the day by understanding queue health, activity, market visibility, and where attention is needed first.',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    screens: [
      {
        title: 'Dashboard overview',
        file: 'ss-dashboard.jpg',
        alt: 'Setu Flow dashboard overview',
        firstClick: 'Open Dashboard from the main navigation.',
        check: "Review today's open queues, priority cards, overdue activity, and records needing intervention.",
        doneWhen: 'You know which record or queue should be opened first and which owner is responsible.',
        tip: 'Use Dashboard as the daily starting point before opening individual leads, quotes, or orders.',
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
        focus: 'Performance trend, bottleneck insight, management review',
      },
    ],
    quiz: {
      q: 'What should you check first when you open Dashboard each morning?',
      options: [
        'Jump straight to creating a new lead',
        'Review queue health, overdue records, and who owns the next action',
        'Open Analytics and export a report',
      ],
      correct: 1,
    },
  },
  {
    id: 'lead-capture',
    number: '02',
    title: 'Lead capture and qualification',
    shortTitle: 'Lead Capture',
    icon: '👤',
    accent: 'from-emerald-500 to-teal-500',
    audience: 'Sales owners, field teams, trade-show teams',
    outcome: 'Create a clean lead, confirm buyer context, and make sure the lead has owner, status, notes, and next action.',
    roles: ['sales', 'manager'],
    screens: [
      {
        title: 'Capture workspace',
        file: 'ss-capture.jpg',
        alt: 'Setu Flow capture workspace',
        firstClick: 'Press Add Lead or the primary capture action.',
        check: 'Enter company, contact, country, source, product interest, and conversation notes.',
        doneWhen: 'The record is saved with source, owner, status, and next follow-up visible.',
        tip: 'Do not leave a captured inquiry without a next action.',
        focus: 'Primary capture button, source field, owner field, save action',
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
        firstClick: 'Use lead command controls to update status, assign owner, or add the next follow-up.',
        check: 'Confirm the reason for the status change and whether another team needs to take over.',
        doneWhen: 'Owner, status, notes, and next follow-up are aligned with the real business situation.',
        tip: 'Every status movement needs context. This is where discipline matters most.',
        focus: 'Status control, owner control, add note, create follow-up',
      },
    ],
    quiz: {
      q: 'What is the minimum a lead record must have before you move to the next step?',
      options: [
        'Company name only — you can fill in the rest later',
        'Source, owner, status, and at least one note or next action',
        'Email address and product interest',
      ],
      correct: 1,
    },
  },
  {
    id: 'trade-show',
    number: '03',
    title: 'Trade show and event capture',
    shortTitle: 'Trade Show',
    icon: '▣',
    accent: 'from-violet-500 to-purple-500',
    audience: 'Event teams, sales owners, managers',
    outcome: 'Convert event conversations into clean, assigned, follow-up-ready CRM records.',
    roles: ['sales', 'manager'],
    screens: [
      {
        title: 'Pipeline / event view',
        file: 'ss-pipeline.jpg',
        alt: 'Setu Flow pipeline screen',
        firstClick: 'Open the event, campaign, or pipeline bucket that contains new conversations.',
        check: 'Review source, lead stage, buyer interest, and whether the event record has a next follow-up.',
        doneWhen: 'Each event lead has a clear stage, owner, and follow-up action.',
        tip: 'Trade show leads should be cleaned up quickly after the event while memory is fresh.',
        focus: 'Pipeline stage, event source, lead movement',
      },
    ],
    quiz: {
      q: 'When is the best time to clean up and qualify trade show leads?',
      options: [
        'Within 48 hours while conversation context is still fresh',
        'At the end of the month during pipeline review',
        'Only when the buyer reaches out again',
      ],
      correct: 0,
    },
  },
  {
    id: 'mobile-vcard',
    number: '04',
    title: 'Mobile field capture and vCard',
    shortTitle: 'Mobile / vCard',
    icon: '📱',
    accent: 'from-orange-500 to-amber-500',
    audience: 'Field teams, event teams, sales users away from desk',
    outcome: 'Capture contact and buyer interest quickly from phone, then clean it up from desktop later.',
    roles: ['sales'],
    screens: [
      {
        title: 'Mobile capture',
        file: 'ss-mobile-capture.jpg',
        alt: 'Setu Flow mobile capture screen',
        firstClick: 'Tap Quick Lead, Capture, or the mobile capture action.',
        check: 'Capture name, company, phone/email, source, product interest, and notes.',
        doneWhen: 'The mobile record is saved and ready for desktop review.',
        tip: 'Mobile capture should be fast. Clean and qualify the record later from the full workspace.',
        focus: 'Quick lead CTA, mobile save button, source and notes fields',
      },
      {
        title: 'vCard capture',
        file: 'ss-vcard.jpg',
        alt: 'Setu Flow vCard capture screen',
        firstClick: 'Tap scan/import vCard or use the business card capture action.',
        check: 'Verify name, company, title, phone, email, and source after extraction.',
        doneWhen: 'The contact is converted into a usable lead with notes and next follow-up.',
        tip: 'Always verify extracted fields before saving. Card scan data is rarely perfect.',
        focus: 'Scan/import CTA, extracted fields, confirm/save',
      },
    ],
    quiz: {
      q: 'After scanning a business card with vCard capture, what must you do before saving?',
      options: [
        'Immediately mark the lead as qualified',
        'Verify all extracted fields — name, company, phone, email — are accurate',
        'Assign it to another team member to check',
      ],
      correct: 1,
    },
  },
  {
    id: 'tasks',
    number: '05',
    title: 'Tasks and follow-up discipline',
    shortTitle: 'Tasks',
    icon: '✓',
    accent: 'from-cyan-500 to-sky-500',
    audience: 'Every user who owns follow-up work',
    outcome: 'Prevent leads, quotes, documents, and dispatch items from going cold by giving each action an owner and due date.',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    screens: [
      {
        title: 'Tasks workspace',
        file: 'ss-tasks.jpg',
        alt: 'Setu Flow tasks screen',
        firstClick: 'Press New Task or open the due task from the task list.',
        check: 'Confirm owner, due date, priority, linked record, and task note.',
        doneWhen: 'The task clearly explains what needs to happen next and who owns it.',
        tip: 'A good task should be understandable even if another teammate opens it tomorrow.',
        focus: 'New task CTA, due date, owner, linked lead/order',
      },
    ],
    quiz: {
      q: 'What should always happen before you close a completed task?',
      options: [
        'Nothing — just mark it complete and move on',
        'Add a completion note or convert it into the next follow-up action',
        'Delete the task to keep the list clean',
      ],
      correct: 1,
    },
  },
  {
    id: 'setu-guru',
    number: '06',
    title: 'Setu Guru AI guidance',
    shortTitle: 'Setu Guru',
    icon: '🧘',
    accent: 'from-blue-600 to-teal-500',
    audience: 'All users, with manager approval for sensitive actions',
    outcome: 'Use Setu Guru to understand the current page, resolve blockers, check pricing defaults, HS codes, compliance, and get next-step guidance.',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    screens: [
      {
        title: 'Setu Guru interface',
        placeholder: true,
        alt: 'Setu Guru mobile dashboard help',
        firstClick: 'Tap Dashboard help or type a question in the Setu Guru input box.',
        check: 'Review the response, then use Helpful or Missing detail to give feedback.',
        doneWhen: 'You understand the recommended next step and a human has approved any price, compliance, send, or write-back action.',
        tip: 'Setu Guru checks page context and live organisation data, but humans still approve important actions.',
        focus: 'Ask question, review response, Helpful / Missing detail feedback',
      },
    ],
    quiz: {
      q: 'Setu Guru recommends a pricing default for a quote. What do you do next?',
      options: [
        'Accept it and send the quote immediately',
        'A human approves the price before any send or write-back action is taken',
        'Ignore Guru and set the price manually',
      ],
      correct: 1,
    },
  },
  {
    id: 'quote',
    number: '07',
    title: 'Quote workflow',
    shortTitle: 'Quote',
    icon: '₹',
    accent: 'from-emerald-500 to-green-600',
    audience: 'Sales, operations, approvers',
    outcome: 'Move from quote draft to approval, approved send, outcome update, and order creation without losing assumptions.',
    roles: ['sales', 'operations', 'manager'],
    screens: [
      {
        title: 'Quote builder',
        file: 'ss-quotebuilder.jpg',
        alt: 'Setu Flow quote builder screen',
        firstClick: 'Press New Quote or open the quote builder from the qualified lead.',
        check: 'Confirm product, quantity, pack size, currency, freight, pricing assumptions, and destination.',
        doneWhen: 'The quote draft contains enough detail for approval or buyer review.',
        tip: 'Do not send a quote until assumptions and approvals are visible.',
        focus: 'Build quote CTA, product line items, pricing/freight fields',
      },
      {
        title: 'Quote approval gate',
        file: 'operator-05-quote-approval-gate.png',
        alt: 'Quote approval gate screen',
        firstClick: 'Press Submit for Approval or review the approval gate panel.',
        check: 'Confirm margin, freight, terms, documentation, compliance, and approval notes.',
        doneWhen: 'The quote is approved, returned with notes, or held for missing inputs.',
        tip: 'Approval gate protects the team from sending incomplete commercial terms.',
        focus: 'Approval gate, approve/return action, missing input warnings',
      },
      {
        title: 'Approved quote send',
        file: 'operator-06-approved-quote-send.png',
        alt: 'Approved quote send screen',
        firstClick: 'Press Send Quote only after approval and final review.',
        check: 'Confirm recipient, buyer-facing terms, attachments, and message before sending.',
        doneWhen: 'The quote is sent and the follow-up task is created or scheduled.',
        tip: 'Sending is a business action. Review before pressing the final button.',
        focus: 'Send quote CTA, recipient review, follow-up task',
      },
    ],
    quiz: {
      q: 'When is it correct to press "Send Quote"?',
      options: [
        'When the draft looks complete enough',
        'As soon as the buyer asks for pricing',
        'Only after approval is confirmed and recipient details are verified',
      ],
      correct: 2,
    },
  },
  {
    id: 'documents',
    number: '08',
    title: 'Documents and order readiness',
    shortTitle: 'Documents',
    icon: '▤',
    accent: 'from-violet-500 to-indigo-500',
    audience: 'Operations, order coordinators, dispatch owners',
    outcome: 'Confirm documents, product, packing, freight, and order stage readiness before dispatch.',
    roles: ['operations', 'dispatch', 'manager'],
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
        title: 'Order execution stage panel',
        file: 'operator-08-order-execution-stage-panel.png',
        alt: 'Order execution stage panel',
        firstClick: 'Use the execution stage panel to move the order through the correct stage.',
        check: 'Confirm stage, blockers, notes, document readiness, and next owner.',
        doneWhen: 'The order stage reflects the real operational position.',
        tip: 'Stage changes should always include enough context for the next owner.',
        focus: 'Stage selector, blocker note, next owner',
      },
    ],
    quiz: {
      q: 'An order is almost ready. One document is still missing. What do you do?',
      options: [
        'Mark the order dispatch-ready and sort the document later',
        'Track the missing document as pending with a clear owner, then wait for it before dispatch',
        'Skip the document if the buyer has not asked for it',
      ],
      correct: 1,
    },
  },
  {
    id: 'dispatch',
    number: '09',
    title: 'Dispatch tracking',
    shortTitle: 'Dispatch',
    icon: '▸',
    accent: 'from-orange-500 to-red-500',
    audience: 'Dispatch owners, operations, sales owners',
    outcome: 'Complete the handoff from order readiness to shipment movement, tracking, and post-dispatch follow-up.',
    roles: ['operations', 'dispatch', 'manager'],
    screens: [
      {
        title: 'Dispatch tracking',
        file: 'operator-11-dispatch-tracking.png',
        alt: 'Dispatch tracking screen',
        firstClick: 'Press Update Dispatch, Add Tracking, or the dispatch status action when shipment movement is confirmed.',
        check: 'Confirm dispatch status, tracking number, carrier, date, document handoff, and buyer follow-up owner.',
        doneWhen: 'Dispatch status matches the real-world shipment and the post-dispatch follow-up is visible.',
        tip: 'Do not mark dispatch complete until the real shipment action has happened.',
        focus: 'Dispatch status, tracking field, carrier/date, buyer follow-up task',
      },
    ],
    quiz: {
      q: 'When is it correct to mark a dispatch as complete?',
      options: [
        'When the packing list is ready',
        'When the order is approved internally',
        'Only when the real shipment has physically moved and tracking is confirmed',
      ],
      correct: 2,
    },
  },
];

const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales owner',
  operations: 'Operations owner',
  dispatch: 'Dispatch owner',
  manager: 'Manager / Admin',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  sales: 'Captures leads, manages buyer context, prepares quotes, keeps follow-up from going cold.',
  operations: 'Checks product, quote, document, order, approval, packing, and freight readiness.',
  dispatch: 'Confirms shipment handoff, updates dispatch status, records movement details.',
  manager: 'Reviews queue health, bottlenecks, overdue tasks, and handoff quality across the full workflow.',
};

const ROLE_MODULES: Record<Role, string[]> = {
  sales: ['dashboard', 'lead-capture', 'trade-show', 'mobile-vcard', 'tasks', 'setu-guru', 'quote'],
  operations: ['dashboard', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
  dispatch: ['dashboard', 'tasks', 'documents', 'dispatch'],
  manager: ['dashboard', 'lead-capture', 'trade-show', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
};

const STORAGE_KEY = 'setuflow-training-v1';

type StoredProgress = {
  role: Role | null;
  completed: string[];
  quizAnswers: Record<string, number>;
};

function loadProgress(): StoredProgress {
  if (typeof window === 'undefined') return { role: null, completed: [], quizAnswers: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { role: null, completed: [], quizAnswers: {} };
    return JSON.parse(raw);
  } catch {
    return { role: null, completed: [], quizAnswers: {} };
  }
}

function saveProgress(p: StoredProgress) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleTag({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    sales: 'bg-emerald-50 text-emerald-700',
    operations: 'bg-violet-50 text-violet-700',
    dispatch: 'bg-orange-50 text-orange-700',
    manager: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${colors[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function SetuGuruPlaceholder() {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="mx-auto w-full max-w-[16rem] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-lg">🧘</div>
          <div>
            <p className="text-sm font-bold text-slate-950">Setu Guru</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Online</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Ask anything</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Dashboard help, pricing defaults, HS codes, compliance, next steps.</p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-700">Helpful</span>
          <span className="rounded-full bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-700">Missing detail</span>
          <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white text-xs">➤</span>
        </div>
      </div>
    </div>
  );
}

function ScreenCard({ screen }: { screen: TrainingScreen }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="bg-slate-100 p-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {screen.placeholder ? (
              <SetuGuruPlaceholder />
            ) : (
              <Image
                src={`${screenshotBase}/${screen.file}`}
                alt={screen.alt ?? screen.title}
                width={1200}
                height={750}
                className="h-[260px] w-full object-contain object-top"
              />
            )}
          </div>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Training screen</p>
          <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{screen.title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{screen.tip}</p>
          <div className="mt-4 space-y-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Press this first</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">{screen.firstClick}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Check before saving</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">{screen.check}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Done when</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">{screen.doneWhen}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizBlock({
  quiz,
  moduleId,
  savedAnswer,
  onAnswer,
}: {
  quiz: QuizQuestion;
  moduleId: string;
  savedAnswer?: number;
  onAnswer: (moduleId: string, idx: number) => void;
}) {
  const answered = savedAnswer !== undefined;
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Quick check</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{quiz.q}</p>
      <div className="mt-3 space-y-2">
        {quiz.options.map((opt, idx) => {
          let cls = 'cursor-pointer rounded-xl border px-4 py-3 text-xs font-medium transition ';
          if (!answered) {
            cls += 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50';
          } else if (idx === quiz.correct) {
            cls += 'border-emerald-300 bg-emerald-50 text-emerald-800';
          } else if (idx === savedAnswer) {
            cls += 'border-red-200 bg-red-50 text-red-700';
          } else {
            cls += 'border-slate-100 bg-slate-50 text-slate-400';
          }
          return (
            <button key={idx} className={cls} onClick={() => !answered && onAnswer(moduleId, idx)}>
              <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
              {opt}
              {answered && idx === quiz.correct && <span className="ml-2 text-emerald-600">✓</span>}
              {answered && idx === savedAnswer && idx !== quiz.correct && <span className="ml-2 text-red-500">✗</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`mt-3 text-xs font-semibold ${savedAnswer === quiz.correct ? 'text-emerald-600' : 'text-slate-500'}`}>
          {savedAnswer === quiz.correct ? '✓ Correct — well done.' : `The correct answer is: ${quiz.options[quiz.correct]}`}
        </p>
      )}
    </div>
  );
}

// ─── Tab: Start Here ──────────────────────────────────────────────────────────

function TabStartHere({ role, onRoleSelect }: { role: Role | null; onRoleSelect: (r: Role) => void }) {
  const roles: Role[] = ['sales', 'operations', 'dispatch', 'manager'];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Step 1 — Start here</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Learn Setu Flow from dashboard to dispatch.
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
        Select your role to get a personalised training path. You can change this any time.
      </p>

      {/* Role selector */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => onRoleSelect(r)}
            className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
              role === r
                ? 'border-teal-400 bg-teal-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'
            }`}
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
              role === r ? 'bg-teal-100' : 'bg-slate-100'
            }`}>
              {r === 'sales' ? '🎯' : r === 'operations' ? '⚙️' : r === 'dispatch' ? '🚚' : '📊'}
            </div>
            <p className="text-sm font-semibold text-slate-950">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{ROLE_DESCRIPTIONS[r]}</p>
            {role === r && (
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">✓ Selected</p>
            )}
          </button>
        ))}
      </div>

      {/* Workflow map */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">End-to-end workflow</p>
        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          Dashboard to dispatch — 9 stages
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Every Setu Flow user operates along this path. Your role determines which stages you own.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {trainingModules.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-3 ${
                role && ROLE_MODULES[role].includes(m.id)
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-slate-100 bg-slate-50'
              }`}
            >
              <p className="text-lg leading-none">{m.icon}</p>
              <p className="mt-2 text-xs font-semibold text-slate-800">{m.shortTitle}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{m.number}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trainingModules.slice(5).map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-3 ${
                role && ROLE_MODULES[role].includes(m.id)
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-slate-100 bg-slate-50'
              }`}
            >
              <p className="text-lg leading-none">{m.icon}</p>
              <p className="mt-2 text-xs font-semibold text-slate-800">{m.shortTitle}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{m.number}</p>
            </div>
          ))}
        </div>
        {role && (
          <p className="mt-4 text-xs text-teal-700">
            <span className="font-bold">Highlighted stages</span> are part of your{' '}
            <span className="font-bold">{ROLE_LABELS[role]}</span> path (
            {ROLE_MODULES[role].length} modules).
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Workflow Lessons ────────────────────────────────────────────────────

function TabLessons({
  role,
  completed,
  quizAnswers,
  onComplete,
  onQuizAnswer,
}: {
  role: Role | null;
  completed: string[];
  quizAnswers: Record<string, number>;
  onComplete: (id: string) => void;
  onQuizAnswer: (moduleId: string, idx: number) => void;
}) {
  const [activeId, setActiveId] = useState<string>('');

  const modules = role
    ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id))
    : trainingModules;

  useEffect(() => {
    if (modules.length && !activeId) setActiveId(modules[0].id);
  }, [role]);

  const active = modules.find((m) => m.id === activeId) ?? modules[0];
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;

  if (!active) return (
    <div className="px-4 py-16 text-center">
      <p className="text-slate-500">Select your role on the <strong>Start Here</strong> tab first.</p>
    </div>
  );

  return (
    <div className="flex min-h-[600px]">
      {/* Sidebar */}
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-[113px] p-4">
          {role && (
            <div className="mb-4 rounded-xl bg-teal-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">{ROLE_LABELS[role]}</p>
              <p className="mt-0.5 text-xs text-teal-600">{doneCount}/{modules.length} complete</p>
            </div>
          )}
          <nav className="space-y-0.5">
            {modules.map((m) => {
              const done = completed.includes(m.id);
              const isActive = m.id === activeId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                    isActive
                      ? 'bg-teal-50 font-semibold text-teal-800'
                      : done
                      ? 'text-slate-400 hover:bg-slate-50'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-300">{m.number}</span>
                  <span className="flex-1 leading-4">{m.shortTitle}</span>
                  {done && <span className="text-emerald-500">✓</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile module picker */}
      <div className="block w-full lg:hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number} — {m.shortTitle} {completed.includes(m.id) ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        {/* Module header */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
              {active.number}
            </span>
            {active.roles.map((r) => <RoleTag key={r} role={r} />)}
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{active.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{active.outcome}</p>
        </div>

        {/* Screen cards */}
        <div className="space-y-5">
          {active.screens.map((screen) => (
            <ScreenCard key={`${active.id}-${screen.title}`} screen={screen} />
          ))}
        </div>

        {/* Quiz */}
        {active.quiz && (
          <QuizBlock
            quiz={active.quiz}
            moduleId={active.id}
            savedAnswer={quizAnswers[active.id]}
            onAnswer={onQuizAnswer}
          />
        )}

        {/* Mark complete */}
        <div className="mt-6 flex items-center justify-between gap-4">
          {completed.includes(active.id) ? (
            <p className="text-sm font-semibold text-emerald-600">✓ Module complete</p>
          ) : (
            <button
              onClick={() => onComplete(active.id)}
              className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-teal-700"
            >
              Mark as complete →
            </button>
          )}
          {/* Next module */}
          {(() => {
            const idx = modules.findIndex((m) => m.id === activeId);
            const next = modules[idx + 1];
            return next ? (
              <button
                onClick={() => setActiveId(next.id)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
              >
                Next: {next.shortTitle} →
              </button>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Video Walkthroughs ──────────────────────────────────────────────────

function TabVideos() {
  const videoSlots = [
    { title: 'Product overview', duration: '90 sec', desc: 'Dashboard to dispatch — the complete Setu Flow journey.' },
    { title: 'Dashboard & queue health', duration: '3–5 min', desc: 'How to start every day, read priorities, and act on what matters.' },
    { title: 'Lead capture & qualification', duration: '4–6 min', desc: 'Capture a clean inquiry from any source and keep it moving.' },
    { title: 'Trade show & event intake', duration: '3–4 min', desc: 'Turn booth conversations into follow-up-ready records fast.' },
    { title: 'Mobile capture & vCard', duration: '3–4 min', desc: 'Quick capture from the field and business card scanning.' },
    { title: 'Quote approval workflow', duration: '5–7 min', desc: 'Build, approve, send, and follow up on winning quotes.' },
    { title: 'Documents & order readiness', duration: '5–7 min', desc: 'Confirm everything is in order before dispatch handoff.' },
    { title: 'Dispatch tracking', duration: '4–5 min', desc: 'Shipment movement, tracking, and post-dispatch follow-up.' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Video walkthroughs</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Watch before you work.
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Short video walkthroughs for every stage of the Setu Flow workflow. Coming soon — check back here as each module is released.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videoSlots.map((v, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-28 items-center justify-center bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-300">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {v.duration}
                </span>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{v.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: My Progress ────────────────────────────────────────────────────────

function TabProgress({
  role,
  completed,
  quizAnswers,
  onReset,
  onRoleSelect,
}: {
  role: Role | null;
  completed: string[];
  quizAnswers: Record<string, number>;
  onReset: () => void;
  onRoleSelect: (r: Role) => void;
}) {
  const modules = role ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id)) : trainingModules;
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;
  const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;
  const quizTaken = Object.keys(quizAnswers).length;
  const quizCorrect = Object.entries(quizAnswers).filter(([id, ans]) => {
    const mod = trainingModules.find((m) => m.id === id);
    return mod?.quiz && mod.quiz.correct === ans;
  }).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">My progress</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Your training status</h2>

      {!role ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Select your role on the <strong>Start Here</strong> tab to track progress.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Modules done</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{doneCount}<span className="text-lg text-slate-300">/{modules.length}</span></p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Quiz score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{quizCorrect}<span className="text-lg text-slate-300">/{quizTaken}</span></p>
              <p className="mt-2 text-xs text-slate-500">correct answers</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your role</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-xs text-slate-400">{modules.length} modules in your path</p>
            </div>
          </div>

          {/* Module checklist */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Module checklist</p>
            </div>
            <div className="divide-y divide-slate-100">
              {modules.map((m) => {
                const done = completed.includes(m.id);
                const quizAns = quizAnswers[m.id];
                const quizOk = m.quiz && quizAns === m.quiz.correct;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? '✓' : m.number}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${done ? 'text-slate-950' : 'text-slate-400'}`}>{m.title}</p>
                    </div>
                    {m.quiz && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        quizAns !== undefined
                          ? quizOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          : 'bg-slate-50 text-slate-400'
                      }`}>
                        {quizAns !== undefined ? (quizOk ? '✓ Quiz' : '✗ Quiz') : 'Quiz pending'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change role / reset */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex-1">
              <p className="text-xs font-semibold text-slate-600 mb-3">Switch role</p>
              <div className="flex flex-wrap gap-2">
                {(['sales', 'operations', 'dispatch', 'manager'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onRoleSelect(r)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      role === r
                        ? 'border-teal-400 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-700'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={onReset}
              className="self-end rounded-2xl border border-red-100 bg-white px-5 py-3 text-xs font-semibold text-red-400 transition hover:border-red-200 hover:bg-red-50"
            >
              Reset all progress
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'start' | 'lessons' | 'videos' | 'progress';

export default function TrainingWorkspacePage() {
  const [tab, setTab] = useState<Tab>('start');
  const [progress, setProgress] = useState<StoredProgress>({ role: null, completed: [], quizAnswers: {} });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  const updateProgress = (next: StoredProgress) => {
    setProgress(next);
    saveProgress(next);
  };

  const handleRoleSelect = (r: Role) => {
    updateProgress({ ...progress, role: r });
  };

  const handleComplete = (id: string) => {
    if (progress.completed.includes(id)) return;
    updateProgress({ ...progress, completed: [...progress.completed, id] });
  };

  const handleQuizAnswer = (moduleId: string, idx: number) => {
    if (progress.quizAnswers[moduleId] !== undefined) return;
    updateProgress({ ...progress, quizAnswers: { ...progress.quizAnswers, [moduleId]: idx } });
  };

  const handleReset = () => {
    updateProgress({ role: progress.role, completed: [], quizAnswers: {} });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'start', label: 'Start Here' },
    { id: 'lessons', label: 'Workflow Lessons' },
    { id: 'videos', label: 'Video Walkthroughs' },
    { id: 'progress', label: 'My Progress' },
  ];

  const modules = progress.role
    ? trainingModules.filter((m) => ROLE_MODULES[progress.role!].includes(m.id))
    : trainingModules;
  const doneCount = modules.filter((m) => progress.completed.includes(m.id)).length;

  return (
    <SiteShell>
      <main className="min-h-screen bg-white text-slate-950">
        {/* Page header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-teal-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Training workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Setu Flow user training
            </h1>
            {hydrated && progress.role && (
              <p className="mt-1 text-sm text-slate-500">
                {ROLE_LABELS[progress.role]} · {doneCount}/{modules.length} modules complete
              </p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="sticky top-[65px] z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative shrink-0 px-5 py-3.5 text-sm font-semibold transition ${
                    tab === t.id
                      ? 'text-teal-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal-600" />
                  )}
                  {t.id === 'progress' && hydrated && doneCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">
                      {doneCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'start' && (
          <TabStartHere role={progress.role} onRoleSelect={(r) => { handleRoleSelect(r); setTab('lessons'); }} />
        )}
        {tab === 'lessons' && (
          <TabLessons
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onComplete={handleComplete}
            onQuizAnswer={handleQuizAnswer}
          />
        )}
        {tab === 'videos' && <TabVideos />}
        {tab === 'progress' && (
          <TabProgress
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onReset={handleReset}
            onRoleSelect={handleRoleSelect}
          />
        )}
      </main>
    </SiteShell>
  );
}
