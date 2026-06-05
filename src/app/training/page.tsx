'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

// ─── HeyGen Video Plan (hidden from UI) ───────────────────────────────────────
// OVERVIEW VIDEO (~90 sec) — heygen.com "Corporate Presenter" template
// Scripts: see docs/training/video-plan.md
// Output: public/training/videos/00-product-overview.mp4
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'sales-owner' | 'sales-exec' | 'operations' | 'dispatch' | 'manager';

type TrainingScreen = {
  title: string;
  file: string;
  alt: string;
  callout: string;
  firstClick: string;
  check: string;
  doneWhen: string;
  tip: string;
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
  roles: Role[];
  outcome: string;
  screens: TrainingScreen[];
  quiz?: QuizQuestion;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  platform: 'Desktop' | 'Mobile' | 'Desktop + Mobile';
  firstAction: string;
  phase: 'capture' | 'convert' | 'execute';
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const SS = '/internal/docs-screenshots';

const trainingModules: TrainingModule[] = [
  {
    id: 'dashboard', number: '01', phase: 'capture',
    duration: '5 min', level: 'Beginner', platform: 'Desktop',
    title: 'Dashboard command view', shortTitle: 'Dashboard',
    firstAction: 'Open Dashboard',
    roles: ['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'],
    outcome: 'Start your day with clarity and control.',
    screens: [
      {
        title: 'Main dashboard',
        file: 'operator-01-dashboard-nav.png',
        alt: 'Setu Flow main dashboard',
        callout: 'The left sidebar is your main navigation. Dashboard is always your home base.',
        firstClick: 'Click "Dashboard" in the left sidebar.',
        check: 'Scan the priority cards and queue counts at the top.',
        doneWhen: 'You can identify which queue has the most overdue items.',
        tip: 'Always start here before opening individual records.',
      },
      {
        title: 'Dashboard KPIs and activity',
        file: 'ss-dashboard.jpg',
        alt: 'Setu Flow dashboard KPI cards',
        callout: 'KPI cards update in real time. Below them is the activity feed.',
        firstClick: 'Scroll down to see the world market map and follow-up queue.',
        check: 'Review the follow-up queue — red or amber indicators need action today.',
        doneWhen: 'You know which record should be opened first and who owns it.',
        tip: 'Use Dashboard as your daily starting point before opening individual leads.',
      },
    ],
    quiz: {
      q: 'What is the primary purpose of the Setu Flow Dashboard?',
      options: ['Sending quotes to buyers', 'Getting a real-time view of queue health and priority actions', 'Uploading documents for dispatch'],
      correct: 1,
    },
  },
  {
    id: 'lead-capture', number: '02', phase: 'capture',
    duration: '10 min', level: 'Beginner', platform: 'Desktop + Mobile',
    title: 'Lead capture and qualification', shortTitle: 'Lead Capture',
    firstAction: 'Add / Capture Lead',
    roles: ['sales-owner', 'sales-exec', 'manager'],
    outcome: 'Capture new leads from inquiries & sources.',
    screens: [
      {
        title: 'Lead capture form',
        file: 'ss-leads.jpg',
        alt: 'Lead capture screen',
        callout: 'The lead form has a source field — always fill it in so you know where each inquiry came from.',
        firstClick: 'Click "+ Add Lead" or the Quick Lead FAB on mobile.',
        check: 'Confirm name, company, source, phone/email, and product interest are all filled.',
        doneWhen: 'The lead is saved and visible in the leads list with a clear source and owner.',
        tip: 'Capture first, qualify later — speed matters more than completeness at point of capture.',
      },
    ],
    quiz: {
      q: 'What is the most important field to fill when capturing a new lead quickly?',
      options: ['Annual revenue of the buyer', 'Source — where the inquiry came from', 'The buyer\'s LinkedIn URL'],
      correct: 1,
    },
  },
  {
    id: 'trade-show', number: '03', phase: 'capture',
    duration: '7 min', level: 'Beginner', platform: 'Desktop + Mobile',
    title: 'Trade show and event capture', shortTitle: 'Trade Show / Event',
    firstAction: 'Open Event / Pipeline',
    roles: ['sales-owner', 'sales-exec', 'manager'],
    outcome: 'Capture leads at events and manage follow-up.',
    screens: [
      {
        title: 'Pipeline — event and stage view',
        file: 'ss-pipeline.jpg',
        alt: 'Pipeline screen',
        callout: 'Look for the "Source" badge on each card — event leads show the trade show name.',
        firstClick: 'Open Pipeline from the left sidebar, then filter by source.',
        check: 'For each event lead: check source, stage, owner, and follow-up date are all set.',
        doneWhen: 'Every event lead has moved out of "New" and has a clear next action.',
        tip: 'Clean up trade show leads within 48 hours — context fades fast.',
      },
    ],
    quiz: {
      q: 'When is the best time to clean up and qualify trade show leads?',
      options: ['Within 48 hours while conversation context is still fresh', 'At the end of the month', 'Only when the buyer reaches out again'],
      correct: 0,
    },
  },
  {
    id: 'mobile-vcard', number: '04', phase: 'capture',
    duration: '5 min', level: 'Beginner', platform: 'Mobile',
    title: 'Mobile field capture and vCard', shortTitle: 'Mobile vCard',
    firstAction: 'Quick Lead / Scan',
    roles: ['sales-owner', 'sales-exec'],
    outcome: 'Capture contacts on the go using mobile.',
    screens: [
      {
        title: 'Mobile quick capture',
        file: 'ss-mobile-capture.jpg',
        alt: 'Mobile capture screen',
        callout: 'Tap the large floating "+" Quick Lead button at the bottom of the screen.',
        firstClick: 'Tap the "+" or "Quick Lead" floating button.',
        check: 'Capture name, company, phone or email, source, and product interest.',
        doneWhen: 'The record is saved and visible in your leads list on mobile.',
        tip: 'Mobile capture is for speed. Clean and qualify from desktop later.',
      },
    ],
    quiz: {
      q: 'After scanning a business card, what must you do before tapping "Save as Lead"?',
      options: ['Immediately mark the lead as qualified', 'Verify every extracted field — name, company, phone, and email', 'Assign it to another team member to check'],
      correct: 1,
    },
  },
  {
    id: 'tasks', number: '05', phase: 'capture',
    duration: '6 min', level: 'Beginner', platform: 'Desktop + Mobile',
    title: 'Tasks and follow-up discipline', shortTitle: 'Tasks',
    firstAction: 'New Task / Open Task',
    roles: ['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'],
    outcome: 'Stay on top of follow-ups and commitments.',
    screens: [
      {
        title: 'Tasks workspace',
        file: 'ss-tasks.jpg',
        alt: 'Tasks screen',
        callout: 'See "+ New Task" in the top-right? Coloured priority flags tell you what to act on first.',
        firstClick: 'Click "+ New Task" or click any existing task row to open and update it.',
        check: 'For every task: confirm owner, due date, priority, linked record, and a clear description.',
        doneWhen: 'The task clearly explains what needs to happen — a teammate could act on it without asking you.',
        tip: 'A good task is understandable even if someone else opens it tomorrow.',
      },
    ],
    quiz: {
      q: 'What should always happen before you mark a task as complete?',
      options: ['Nothing — just tap complete and move on', 'Add a completion note recording the outcome, or create the next follow-up task', 'Delete the task to keep the list clean'],
      correct: 1,
    },
  },
  {
    id: 'setu-guru', number: '06', phase: 'convert',
    duration: '5 min', level: 'Intermediate', platform: 'Desktop + Mobile',
    title: 'Setu Guru AI guidance', shortTitle: 'Setu Guru',
    firstAction: 'Ask Setu Guru',
    roles: ['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'],
    outcome: 'Get AI help for blockers, answers and next steps.',
    screens: [
      {
        title: 'Setu Guru panel',
        file: 'ss-setu_guru.jpg',
        alt: 'Setu Guru panel',
        callout: 'Find Setu Guru in the sidebar footer (desktop) or header icon (mobile). It reads the current page context automatically.',
        firstClick: 'Click the Setu Guru icon to open the panel, then type your question.',
        check: 'After reading the response: use "Helpful" or "Missing detail" to give feedback.',
        doneWhen: 'You understand the recommended next step.',
        tip: 'Guru is a guide, not an executor. Humans still approve all commercial actions.',
      },
    ],
    quiz: {
      q: 'Setu Guru recommends a pricing default for a quote. What is the correct next step?',
      options: ['Accept it and send the quote immediately', 'Have a human review and approve the price before any send or write-back', 'Ignore Guru and set the price manually every time'],
      correct: 1,
    },
  },
  {
    id: 'quote', number: '07', phase: 'convert',
    duration: '12 min', level: 'Intermediate', platform: 'Desktop',
    title: 'Quote workflow', shortTitle: 'Quote',
    firstAction: 'Create / Send Quote',
    roles: ['sales-owner', 'sales-exec', 'operations', 'manager'],
    outcome: 'Create, review, approve and send quotes.',
    screens: [
      {
        title: 'Quote builder',
        file: 'ss-quotebuilder.jpg',
        alt: 'Quote builder screen',
        callout: 'Three sections: Product line items, Pricing and freight, and Assumptions/Notes. All three must be complete before submitting for approval.',
        firstClick: 'Click "+ Add Product" to add the first product, then set quantity, pack size, and unit price.',
        check: 'Before submitting: confirm product, quantity, currency, incoterms, destination, freight, and assumptions.',
        doneWhen: 'The draft has enough detail that an approver can review without asking for missing info.',
        tip: 'Write pricing assumptions in the notes — "Price based on 20ft FCL, FOB Mumbai, valid 30 days."',
      },
      {
        title: 'Approval gate',
        file: 'operator-05-quote-approval-gate.png',
        alt: 'Quote approval gate',
        callout: 'The approval panel shows a checklist — margin, compliance, freight, and terms. All must be confirmed before "Approve" becomes active.',
        firstClick: 'Review each checklist item, then click "Approve" or "Return with Notes".',
        check: 'Confirm: margin acceptable, freight realistic, incoterms match buyer expectation, compliance met.',
        doneWhen: 'Quote is Approved (green badge), Returned with notes, or Held for missing inputs.',
        tip: 'The approval gate protects the team from sending commercially incomplete quotes.',
      },
    ],
    quiz: {
      q: 'When is it correct to click the "Send Quote" button?',
      options: ['When the draft looks complete enough', 'As soon as the buyer asks for pricing', 'Only after the approval gate is confirmed and the recipient and attachment are verified'],
      correct: 2,
    },
  },
  {
    id: 'documents', number: '08', phase: 'convert',
    duration: '10 min', level: 'Intermediate', platform: 'Desktop',
    title: 'Documents and order readiness', shortTitle: 'Documents & Readiness',
    firstAction: 'Open Documents',
    roles: ['operations', 'dispatch', 'manager'],
    outcome: 'Complete documents and prepare orders.',
    screens: [
      {
        title: 'Documents workspace',
        file: 'ss-documents.jpg',
        alt: 'Documents screen',
        callout: 'The checklist shows Attached (green), Pending (amber), or Missing (red) for each document.',
        firstClick: 'Open Documents from the sidebar, then filter to the order you are preparing.',
        check: 'Work through: contract, commercial invoice, packing list, product certificates, compliance documents.',
        doneWhen: 'Every required document is attached (green), or has an owner and expected date for pending items.',
        tip: 'Document readiness should live in the system — not in WhatsApp messages.',
      },
    ],
    quiz: {
      q: 'An order is almost ready but one compliance document is still missing. What do you do?',
      options: ['Mark the order dispatch-ready and sort the document later', 'Record the missing document as Pending with a named owner and expected date', 'Skip the document if the buyer has not specifically asked for it'],
      correct: 1,
    },
  },
  {
    id: 'dispatch', number: '09', phase: 'execute',
    duration: '6 min', level: 'Intermediate', platform: 'Desktop',
    title: 'Dispatch tracking', shortTitle: 'Dispatch Tracking',
    firstAction: 'Update Dispatch',
    roles: ['operations', 'dispatch', 'manager'],
    outcome: 'Dispatch orders and track shipments.',
    screens: [
      {
        title: 'Dispatch tracking and update',
        file: 'operator-11-dispatch-tracking.png',
        alt: 'Dispatch tracking screen',
        callout: 'Three key areas: Shipment status, Tracking number and carrier fields, and Buyer follow-up task.',
        firstClick: 'Click "Update Dispatch" or "Add Tracking" when the shipment has physically moved.',
        check: 'Confirm: status accurate, tracking number entered, carrier and dispatch date set, follow-up task created.',
        doneWhen: 'The dispatch record shows real-world shipment status and post-dispatch follow-up is visible.',
        tip: 'Do not mark dispatch complete until the shipment has actually moved.',
      },
    ],
    quiz: {
      q: 'When is it correct to mark a dispatch as complete in Setu Flow?',
      options: ['When the packing list is finalised', 'When the order is internally approved', 'Only after the shipment has physically moved and tracking number is confirmed'],
      correct: 2,
    },
  },
];

const ROLE_LABELS: Record<Role, string> = {
  'sales-owner': 'Sales Owner',
  'sales-exec': 'Sales Executive',
  operations: 'Operations',
  dispatch: 'Dispatch',
  manager: 'Manager',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  'sales-owner': 'Captures leads, manages buyer context, prepares quotes, keeps follow-up from going cold.',
  'sales-exec': 'Executes daily sales tasks, captures contacts at events, maintains follow-up cadence.',
  operations: 'Checks product, quote, document, order, packing, and freight readiness.',
  dispatch: 'Confirms shipment handoff, updates dispatch status, records movement details.',
  manager: 'Reviews queue health, bottlenecks, overdue tasks, and handoff quality across the full workflow.',
};

const ROLE_MODULES: Record<Role, string[]> = {
  'sales-owner': ['dashboard', 'lead-capture', 'trade-show', 'mobile-vcard', 'tasks', 'setu-guru', 'quote'],
  'sales-exec': ['dashboard', 'lead-capture', 'trade-show', 'mobile-vcard', 'tasks', 'setu-guru'],
  operations: ['dashboard', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
  dispatch: ['dashboard', 'tasks', 'documents', 'dispatch'],
  manager: ['dashboard', 'lead-capture', 'trade-show', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
};

const STORAGE_KEY = 'setuflow-training-v2';

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
  } catch { return { role: null, completed: [], quizAnswers: {} }; }
}
function saveProgress(p: StoredProgress) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// ─── Phase config ─────────────────────────────────────────────────────────────

const phases = [
  { key: 'capture' as const, label: 'CAPTURE', helper: 'Find and qualify the right opportunities', color: 'text-teal-700' },
  { key: 'convert' as const, label: 'CONVERT', helper: 'Create winning offers and get ready', color: 'text-blue-700' },
  { key: 'execute' as const, label: 'EXECUTE', helper: 'Deliver and track with confidence', color: 'text-orange-600' },
];

// ─── Module icon ──────────────────────────────────────────────────────────────

function ModuleIcon({ id, className = 'h-7 w-7' }: { id: string; className?: string }) {
  if (id === 'setu-guru') {
    return (
      <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={40} height={40}
        className="h-9 w-9 rounded-full object-contain" />
    );
  }
  switch (id) {
    case 'dashboard':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><path d="M14 15h7M14 19h5"/></svg>;
    case 'lead-capture':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 19.5c0-3-2.7-5.5-6-5.5s-6 2.5-6 5.5"/><circle cx="9" cy="7" r="4"/><path d="M18 8v6M15 11h6"/></svg>;
    case 'trade-show':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 9h16l-1.2-4H5.2L4 9Z"/><path d="M5 9v10h14V9"/><path d="M8 19v-5h8v5"/><path d="M9 5V3h6v2"/></svg>;
    case 'mobile-vcard':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10 18h4"/><rect x="9.4" y="7" width="5.2" height="4" rx=".8"/><path d="M9.5 14h5"/></svg>;
    case 'tasks':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 7 1.5 1.5L9 5"/><path d="M12 7h7"/><path d="m5 13 1.5 1.5L9 11"/><path d="M12 13h7"/><path d="m5 19 1.5 1.5L9 17"/><path d="M12 19h7"/></svg>;
    case 'quote':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 10h6"/><path d="M9 13h5"/><path d="M10 17h3.5a1.8 1.8 0 0 0 0-3.6H11a1.8 1.8 0 0 1 0-3.6h3"/><path d="M12 8.8v10.4"/></svg>;
    case 'documents':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M6 13h12"/><path d="M6 17h8"/></svg>;
    case 'dispatch':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 10h5"/></svg>;
    default:
      return <span className="text-lg font-bold">{id.slice(0, 2).toUpperCase()}</span>;
  }
}

// ─── Role Icon ────────────────────────────────────────────────────────────────

function RoleIcon({ role }: { role: Role | 'all' }) {
  const cls = 'h-4 w-4';
  if (role === 'all') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (role === 'sales-owner') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M17 11l1.5 1.5L21 10"/></svg>;
  if (role === 'sales-exec') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M13 13l4 4"/></svg>;
  if (role === 'operations') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 1 4.93 19.07"/><path d="M19.07 19.07A10 10 0 0 0 19.07 4.93"/></svg>;
  if (role === 'dispatch') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={cls}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
}


// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div className="relative mx-4 max-h-[90vh] max-w-6xl overflow-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt} width={1600} height={1000} className="h-auto w-full rounded-2xl" priority />
        <p className="mt-2 text-center text-xs text-white/50">Press Esc or click outside to close</p>
      </div>
    </div>
  );
}

// ─── Screen Card ──────────────────────────────────────────────────────────────

function ScreenCard({ screen, index, total }: { screen: TrainingScreen; index: number; total: number }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      {zoomed && <Lightbox src={`${SS}/${screen.file}`} alt={screen.alt} onClose={() => setZoomed(false)} />}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Screen {index + 1} of {total}</p>
          <button onClick={() => setZoomed(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>
            Zoom screenshot
          </button>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="group relative cursor-zoom-in bg-slate-100 p-2" onClick={() => setZoomed(true)}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image src={`${SS}/${screen.file}`} alt={screen.alt} width={1600} height={1000} className="h-[260px] w-full object-contain object-top transition duration-200 group-hover:scale-[1.01]" />
            </div>
            <div className="pointer-events-none absolute inset-2 flex items-end justify-center rounded-xl pb-3 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">Click to zoom</span>
            </div>
          </div>
          <div className="flex flex-col p-5">
            <h4 className="text-lg font-semibold tracking-tight text-slate-950">{screen.title}</h4>
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">👁 What you&apos;re looking at</p>
              <p className="mt-1.5 text-xs leading-5 text-blue-900">{screen.callout}</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">▶ Click / tap this first</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-700">{screen.firstClick}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">✓ Check before saving</p>
                <p className="mt-1.5 text-xs leading-5 text-amber-900">{screen.check}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">✅ Done when</p>
                <p className="mt-1.5 text-xs leading-5 text-emerald-800">{screen.doneWhen}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500 italic">💡 {screen.tip}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizBlock({ quiz, moduleId, savedAnswer, onAnswer }: { quiz: QuizQuestion; moduleId: string; savedAnswer?: number; onAnswer: (moduleId: string, idx: number) => void }) {
  const answered = savedAnswer !== undefined;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">🧠 Quick knowledge check</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{quiz.q}</p>
      <div className="mt-3 space-y-2">
        {quiz.options.map((opt, idx) => {
          let cls = 'w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-xs font-medium transition ';
          if (!answered) cls += 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50';
          else if (idx === quiz.correct) cls += 'border-emerald-300 bg-emerald-50 text-emerald-800';
          else if (idx === savedAnswer) cls += 'border-red-200 bg-red-50 text-red-700';
          else cls += 'border-slate-100 bg-slate-50 text-slate-400';
          return (
            <button key={idx} className={cls} onClick={() => !answered && onAnswer(moduleId, idx)}>
              <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>{opt}
              {answered && idx === quiz.correct && <span className="ml-2">✓</span>}
              {answered && idx === savedAnswer && idx !== quiz.correct && <span className="ml-2">✗</span>}
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

// ─── PROPOSED DESIGN: Horizontal Operating Path ───────────────────────────────

function HorizontalModuleCard({ module, filterRole, onOpenLesson }: {
  module: TrainingModule;
  filterRole: Role | null;
  onOpenLesson: (id: string) => void;
}) {
  const highlighted = !filterRole || ROLE_MODULES[filterRole].includes(module.id);
  const phaseAccent: Record<string, string> = {
    capture: 'border-teal-200 bg-teal-50',
    convert: 'border-blue-200 bg-blue-50',
    execute: 'border-orange-200 bg-orange-50',
  };
  const iconAccent: Record<string, string> = {
    capture: 'border-teal-100 bg-white text-teal-700',
    convert: 'border-blue-100 bg-white text-blue-700',
    execute: 'border-orange-100 bg-white text-orange-600',
  };
  const linkAccent: Record<string, string> = {
    capture: 'text-teal-700 hover:text-teal-900',
    convert: 'text-blue-700 hover:text-blue-900',
    execute: 'text-orange-600 hover:text-orange-800',
  };

  return (
    <button
      type="button"
      onClick={() => onOpenLesson(module.id)}
      className={`group flex w-[154px] shrink-0 flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        highlighted ? 'border-slate-200 opacity-100' : 'border-slate-100 opacity-40'
      }`}
    >
      {/* Number badge */}
      <div className="flex items-center justify-between">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${phaseAccent[module.phase]}`}>
          {module.number}
        </span>
        {filterRole && highlighted && (
          <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700">Your path</span>
        )}
      </div>

      {/* Icon */}
      <div className={`mt-3 flex h-14 w-14 items-center justify-center self-center rounded-2xl border ${iconAccent[module.phase]}`}>
        <ModuleIcon id={module.id} className="h-7 w-7" />
      </div>

      {/* Title + outcome */}
      <h4 className="mt-3 text-center text-sm font-semibold text-slate-950">{module.shortTitle}</h4>
      <p className="mt-1 text-center text-[11px] leading-4 text-slate-500 line-clamp-2">{module.outcome}</p>

      {/* First action */}
      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">First action</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-700">{module.firstAction}</p>
      </div>

      {/* Link */}
      <p className={`mt-3 text-center text-[11px] font-bold transition ${linkAccent[module.phase]}`}>
        Open this lesson →
      </p>
    </button>
  );
}

function HorizontalOperatingPath({ role, onOpenLesson }: { role: Role | null; onOpenLesson: (id: string) => void }) {
  const [filterRole, setFilterRole] = useState<Role | null>(role);

  useEffect(() => {
    if (role !== null && filterRole === null) setFilterRole(role);
  }, [role]);

  const phaseColors: Record<string, string> = {
    capture: 'text-teal-700',
    convert: 'text-blue-700',
    execute: 'text-orange-600',
  };
  const phaseLineColors: Record<string, string> = {
    capture: 'bg-teal-400',
    convert: 'bg-blue-400',
    execute: 'bg-orange-400',
  };

  return (
    <div className="mt-4 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Setu Flow Operating Path</h2>
          <p className="mt-1.5 text-sm text-slate-500">From first inquiry to dispatch handoff. Follow the end-to-end trading workflow.</p>
        </div>
        {/* "What you'll achieve" card */}
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">What you&apos;ll achieve</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Inquiry captured', 'Follow-up assigned', 'Quote approved', 'Documents ready', 'Dispatch tracked'].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="text-[12px] font-semibold text-slate-700">{item}</span>
                {i < arr.length - 1 && <span className="text-slate-300 text-xs">···</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Phase headers + horizontal scroll */}
      <div className="overflow-x-auto px-6 py-5">
        {/* Phase label row */}
        <div className="flex min-w-max gap-0">
          {phases.map((phase) => {
            const phaseModules = trainingModules.filter(m => m.phase === phase.key);
            const totalWidth = phaseModules.length * 154 + (phaseModules.length - 1) * 8 + (phase.key !== 'execute' ? 32 : 0);
            return (
              <div key={phase.key} style={{ width: `${totalWidth}px` }} className="shrink-0">
                <div className="mb-3 flex items-end gap-2">
                  <span className={`h-0.5 w-8 ${phaseLineColors[phase.key]} rounded-full`} />
                  <p className={`text-sm font-black uppercase tracking-[0.22em] ${phaseColors[phase.key]}`}>{phase.label}</p>
                  <p className="text-xs text-slate-400">{phase.helper}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Module cards row */}
        <div className="flex min-w-max items-start gap-0">
          {trainingModules.map((module, idx) => {
            const isLastInPhase = idx === trainingModules.length - 1 ||
              trainingModules[idx + 1].phase !== module.phase;
            const isLast = idx === trainingModules.length - 1;
            return (
              <div key={module.id} className="flex items-center">
                <HorizontalModuleCard module={module} filterRole={filterRole} onOpenLesson={onOpenLesson} />
                {!isLast && (
                  <div className={`mx-1 flex shrink-0 items-center self-start pt-14 ${isLastInPhase ? 'mx-3' : 'mx-1'}`}>
                    <svg viewBox="0 0 32 12" fill="none" className="h-3 w-8 text-slate-300">
                      <path d="M0 6h26M21 1l6 5-6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connected flow tagline */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="h-px flex-1 border-t border-dashed border-slate-200" />
          <p className="text-xs font-semibold text-slate-400">One connected flow. One source of truth.</p>
          <div className="h-px flex-1 border-t border-dashed border-slate-200" />
        </div>
      </div>

      {/* Role filter row */}
      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <div>
              <span className="block text-[12px] font-semibold text-slate-700">View this path as</span>
              <span className="block text-[11px] text-slate-400">See what&apos;s most relevant for your role.</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setFilterRole(null)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${filterRole === null ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
              <RoleIcon role="all" /> All Users
            </button>
            {(['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setFilterRole(r)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${filterRole === r ? 'bg-teal-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700'}`}>
                <RoleIcon role={r} /> {ROLE_LABELS[r]}
              </button>
            ))}
            {filterRole !== null && (
              <button type="button" onClick={() => setFilterRole(null)} className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-2 text-[11px] text-slate-400 transition hover:bg-slate-50">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3 w-3"><path d="M12 4 4 12M4 4l8 8"/></svg>
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── 3-Column Lesson Panel ────────────────────────────────────────────────────

function NeedHelpPanel({ activeModuleId }: { activeModuleId: string }) {
  const commonQuestions = [
    'How do I capture a lead?',
    'When should I send a quote?',
    'What documents are required?',
    'How to update dispatch?',
  ];
  return (
    <aside className="hidden w-64 shrink-0 xl:block">
      <div className="sticky top-[60px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-950">Need help?</p>
        {/* Setu Guru avatar */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-1">
            <Image src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" width={40} height={40} className="h-full w-full rounded-full object-cover" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Ask Setu Guru</p>
            <p className="text-xs text-slate-500">Get instant help for any step in the workflow.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => alert('Setu Guru public access is coming soon — Sprint 24 (S24-TRAIN-001)')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Ask now
        </button>

        {/* Common questions */}
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Common questions</p>
          <ul className="mt-2 space-y-2">
            {commonQuestions.map((q) => (
              <li key={q}>
                <button type="button"
                  onClick={() => alert('Setu Guru public access is coming soon — Sprint 24 (S24-TRAIN-001)')}
                  className="flex w-full items-start gap-1.5 text-left text-[12px] text-teal-700 transition hover:text-teal-900">
                  <span className="mt-0.5 text-teal-400">›</span>{q}
                </button>
              </li>
            ))}
          </ul>
          <button type="button"
            onClick={() => alert('Setu Guru public access is coming soon — Sprint 24 (S24-TRAIN-001)')}
            className="mt-4 text-[12px] font-semibold text-teal-700 transition hover:text-teal-900">
            See all questions →
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Tab: Training Path (3-col lesson view) ───────────────────────────────────

function TabTrainingPath({
  role, completed, quizAnswers, onComplete, onQuizAnswer, onGoToStart, initialActiveId,
}: {
  role: Role | null; completed: string[]; quizAnswers: Record<string, number>;
  onComplete: (id: string) => void; onQuizAnswer: (id: string, idx: number) => void;
  onGoToStart: () => void;
  initialActiveId?: string | null;
}) {
  const [activeId, setActiveId] = useState<string>('');

  const modules = role ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id)) : trainingModules;

  useEffect(() => {
    if (!modules.length) return;
    if (initialActiveId && modules.some((m) => m.id === initialActiveId)) {
      setActiveId(initialActiveId); return;
    }
    if (!activeId || !modules.some((m) => m.id === activeId)) setActiveId(modules[0].id);
  }, [role, initialActiveId, modules.length]);

  const activeIdx = modules.findIndex((m) => m.id === activeId);
  const active = modules[activeIdx] ?? modules[0];
  const prevModule = activeIdx > 0 ? modules[activeIdx - 1] : null;
  const nextModule = activeIdx < modules.length - 1 ? modules[activeIdx + 1] : null;
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;

  const goNext = useCallback(() => {
    if (!completed.includes(active.id)) onComplete(active.id);
    if (nextModule) setActiveId(nextModule.id);
  }, [active.id, completed, nextModule, onComplete]);

  if (!active) return (
    <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-slate-500">Select your role first to get your personalised lesson path.</p>
      <button onClick={onGoToStart} className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white">← Go to Start Here</button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* ── Left sidebar — module list ── */}
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-[60px] overflow-y-auto p-3">
          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Training Path</p>
          {role && (
            <div className="mb-3 rounded-xl bg-teal-50 px-3 py-2">
              <p className="text-[10px] font-bold text-teal-700">{ROLE_LABELS[role]}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-teal-100">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${modules.length ? Math.round((doneCount / modules.length) * 100) : 0}%` }} />
              </div>
            </div>
          )}
          <nav className="space-y-0.5">
            {modules.map((m) => {
              const done = completed.includes(m.id);
              const isActive = m.id === activeId;
              return (
                <button key={m.id} onClick={() => setActiveId(m.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${isActive ? 'bg-teal-50 font-semibold text-teal-800' : done ? 'text-slate-400 hover:bg-slate-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${done ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-teal-200 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? '✓' : m.number}
                  </span>
                  <span className="flex-1 leading-4">{m.shortTitle}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile picker */}
      <div className="block w-full lg:hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <select value={activeId} onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.number} — {m.shortTitle} {completed.includes(m.id) ? '✓' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Centre — lesson content ── */}
      <div className="flex-1 bg-slate-50">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {/* Module header */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-sm font-bold text-teal-700">
                  {active.number}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950">{active.shortTitle}</h3>
                  <p className="text-sm text-teal-600">{active.outcome}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  {active.duration}
                </span>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${active.level === 'Beginner' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active.level === 'Intermediate' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>
                  {active.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                  {active.platform.includes('Mobile') ? (
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0"><rect x="4.5" y="1.5" width="7" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0"><rect x="1.5" y="2.5" width="13" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 13.5h5M8 11.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  )}
                  {active.platform}
                </span>
                <button onClick={() => { if (!completed.includes(active.id)) onComplete(active.id); if (nextModule) setActiveId(nextModule.id); }}
                  className="rounded-xl bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
                  {completed.includes(active.id) ? (nextModule ? `Next: ${nextModule.shortTitle} →` : '✓ All done!') : 'Start this lesson'}
                </button>
              </div>
            </div>
          </div>

          {/* What you'll learn + Why it matters */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">What you&apos;ll learn</p>
              <ul className="mt-3 space-y-2">
                {active.screens.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                    <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {s.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Why it matters</p>
              <ul className="mt-3 space-y-2">
                {['Know what needs attention first', 'Focus on high value activities', 'Improve response time', 'Drive more conversions'].slice(0, active.screens.length + 1).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                    <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-teal-500"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 8.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Screen cards */}
          <div className="space-y-5">
            {active.screens.map((screen, i) => (
              <ScreenCard key={`${active.id}-${i}`} screen={screen} index={i} total={active.screens.length} />
            ))}
          </div>

          {/* Quiz */}
          {active.quiz && (
            <QuizBlock quiz={active.quiz} moduleId={active.id} savedAnswer={quizAnswers[active.id]} onAnswer={onQuizAnswer} />
          )}
        </div>

        {/* Sticky nav bar */}
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,.08)] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => prevModule && setActiveId(prevModule.id)} disabled={!prevModule}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
              <span className="hidden sm:inline">{prevModule?.shortTitle ?? 'Previous'}</span>
              <span className="sm:hidden">Prev</span>
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {modules.map((m) => (
                <button key={m.id} onClick={() => setActiveId(m.id)} title={m.shortTitle}
                  className={`rounded-full transition ${m.id === activeId ? 'h-2.5 w-2.5 bg-teal-600' : completed.includes(m.id) ? 'h-2 w-2 bg-emerald-400' : 'h-2 w-2 bg-slate-200 hover:bg-slate-400'}`} />
              ))}
            </div>
            {nextModule ? (
              <button onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-teal-700">
                <span className="hidden sm:inline">{completed.includes(active.id) ? `Next: ${nextModule.shortTitle}` : `Done — next: ${nextModule.shortTitle}`}</span>
                <span className="sm:hidden">Next</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ) : (
              <button onClick={() => !completed.includes(active.id) && onComplete(active.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow transition hover:-translate-y-0.5 ${completed.includes(active.id) ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                {completed.includes(active.id) ? '✓ All done!' : '✓ Complete training'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Right — Need Help panel ── */}
      <div className="hidden xl:block xl:w-72 xl:shrink-0 xl:border-l xl:border-slate-200 xl:bg-white">
        <div className="sticky top-[60px] p-5">
          <NeedHelpPanel activeModuleId={activeId} />
        </div>
      </div>
    </div>
  );
}


// ─── Tab: Video Library ───────────────────────────────────────────────────────

function TabVideoLibrary() {
  const slots = [
    { title: 'Product overview', duration: '90 sec', desc: 'Dashboard to dispatch — the complete Setu Flow journey.' },
    { title: 'Dashboard and queue health', duration: '3–5 min', desc: 'How to start every day, read priorities, and act on what matters.' },
    { title: 'Lead capture and qualification', duration: '4–6 min', desc: 'Capture a clean inquiry from any source and keep it moving.' },
    { title: 'Trade show and event intake', duration: '3–4 min', desc: 'Turn booth conversations into follow-up-ready records fast.' },
    { title: 'Mobile capture and vCard', duration: '3–4 min', desc: 'Quick capture from the field and business card scanning.' },
    { title: 'Quote approval workflow', duration: '5–7 min', desc: 'Build, approve, send, and follow up on winning quotes.' },
    { title: 'Documents and order readiness', duration: '5–7 min', desc: 'Confirm everything is in order before dispatch handoff.' },
    { title: 'Dispatch tracking', duration: '4–5 min', desc: 'Shipment movement, tracking, and post-dispatch follow-up.' },
    { title: 'Setu Guru AI guide', duration: '4–5 min', desc: 'How to use Setu Guru to resolve blockers and get next-step guidance.' },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">Video Library</h2>
        <p className="mt-2 text-sm text-slate-500">Step-by-step walkthroughs of every module. Videos are being recorded using HeyGen AI — coming soon.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((s) => (
          <div key={s.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-teal-600 translate-x-0.5">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950 leading-5">{s.title}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{s.duration}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{s.desc}</p>
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2">
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-amber-500"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <p className="text-[11px] font-medium text-amber-700">Coming soon</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: My Progress ─────────────────────────────────────────────────────────

function TabMyProgress({
  role, completed, quizAnswers, onReset, onRoleSelect,
}: {
  role: Role | null; completed: string[]; quizAnswers: Record<string, number>;
  onReset: () => void; onRoleSelect: (r: Role) => void;
}) {
  const modules = role ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id)) : trainingModules;
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;
  const quizCorrect = modules.filter((m) => m.quiz && quizAnswers[m.id] === m.quiz.correct).length;
  const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">My Progress</h2>
        <p className="mt-1.5 text-sm text-slate-500">Track your training completion and quiz scores.</p>
      </div>

      {/* Role selector */}
      {!role && (
        <div className="mb-8 rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <p className="text-sm font-semibold text-teal-900">Select your role to track focused progress</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'] as Role[]).map((r) => (
              <button key={r} onClick={() => onRoleSelect(r)}
                className="rounded-xl border border-teal-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-teal-400 hover:bg-teal-50">
                {ROLE_LABELS[r]}
                <p className="mt-0.5 text-[11px] font-normal text-slate-500">{ROLE_MODULES[r].length} lessons</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {role && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{pct}% complete</p>
              <p className="mt-0.5 text-sm text-slate-500">{doneCount} of {modules.length} lessons done · {quizCorrect} quizzes correct</p>
            </div>
            <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="0" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Module completion list */}
      <div className="space-y-2">
        {modules.map((m) => {
          const done = completed.includes(m.id);
          const quizDone = m.quiz && quizAnswers[m.id] !== undefined;
          const quizCorrectForModule = m.quiz && quizAnswers[m.id] === m.quiz.correct;
          return (
            <div key={m.id} className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm ${done ? 'border-emerald-200' : 'border-slate-200'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {done ? '✓' : m.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-950 truncate">{m.shortTitle}</p>
                <p className="text-xs text-slate-400 truncate">{m.duration} · {m.level}</p>
              </div>
              <div className="flex items-center gap-3">
                {m.quiz && (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${quizCorrectForModule ? 'bg-emerald-50 text-emerald-700' : quizDone ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                    {quizCorrectForModule ? '✓ Quiz' : quizDone ? '✗ Quiz' : 'Quiz'}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                  {done ? 'Done' : 'Not started'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {(completed.length > 0 || Object.keys(quizAnswers).length > 0) && (
        <div className="mt-8 text-center">
          <button onClick={onReset} className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
            Reset progress
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'start' | 'training-path' | 'video-library' | 'progress';

export default function TrainingWorkspacePage() {
  const [tab, setTab] = useState<Tab>('start');
  const [initialLessonId, setInitialLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<StoredProgress>({ role: null, completed: [], quizAnswers: {} });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setProgress(loadProgress()); setHydrated(true); }, []);

  const update = (next: StoredProgress) => { setProgress(next); saveProgress(next); };
  const handleRoleSelect = (r: Role) => update({ ...progress, role: r });
  const handleComplete = (id: string) => { if (progress.completed.includes(id)) return; update({ ...progress, completed: [...progress.completed, id] }); };
  const handleQuizAnswer = (moduleId: string, idx: number) => { if (progress.quizAnswers[moduleId] !== undefined) return; update({ ...progress, quizAnswers: { ...progress.quizAnswers, [moduleId]: idx } }); };
  const handleReset = () => update({ role: progress.role, completed: [], quizAnswers: {} });
  const openLesson = (id: string) => { setInitialLessonId(id); setTab('training-path'); };

  const modules = progress.role ? trainingModules.filter((m) => ROLE_MODULES[progress.role!].includes(m.id)) : trainingModules;
  const doneCount = modules.filter((m) => progress.completed.includes(m.id)).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'start', label: 'Start Here' },
    { id: 'training-path', label: 'Training Path' },
    { id: 'video-library', label: 'Video Library' },
    { id: 'progress', label: 'My Progress' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/logos/setu-flow-logo.svg" alt="Setu Flow" className="h-7 w-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="hidden sm:block">
            <span className="block text-xs font-bold text-slate-900">SETU FLOW</span>
            <span className="block text-[10px] text-slate-400 leading-none">Trade. Simplified.</span>
          </div>
        </div>
        {/* Tabs */}
        <nav className="flex items-center gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative shrink-0 px-4 py-[19px] text-sm font-semibold transition ${tab === t.id ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal-600" />}
              {t.id === 'progress' && hydrated && doneCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">{doneCount}</span>
              )}
            </button>
          ))}
        </nav>
        <a href="/" className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 sm:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-3.5 w-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to App
        </a>
      </header>

      {/* ── Main ── */}
      <main className="min-h-[calc(100vh-60px)] bg-white">
        {/* Start Here tab */}
        {tab === 'start' && (
          <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
            <HorizontalOperatingPath role={progress.role} onOpenLesson={openLesson} />

            {/* Role selection card — shown below the path */}
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">View this path as</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Choose the role lens after seeing the full workflow</h3>
                </div>
                {progress.role && (
                  <p className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">
                    {ROLE_LABELS[progress.role]} · {ROLE_MODULES[progress.role].length} focused lessons
                  </p>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(['sales-owner', 'sales-exec', 'operations', 'dispatch', 'manager'] as Role[]).map((r) => (
                  <button key={r} type="button"
                    onClick={() => { handleRoleSelect(r); openLesson(ROLE_MODULES[r][0]); }}
                    className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${progress.role === r ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'}`}>
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${progress.role === r ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                      <RoleIcon role={r} />
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{ROLE_LABELS[r]}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 line-clamp-2">{ROLE_DESCRIPTIONS[r]}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{ROLE_MODULES[r].length} lessons</p>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${progress.role === r ? 'text-teal-700' : 'text-slate-300 group-hover:text-teal-600'}`}>
                        {progress.role === r ? '✓ Selected' : 'Start →'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tip bar */}
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-teal-500"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              <p className="text-[12px] text-slate-500">Tip: Use filters at the top to focus on your region, stage or owner.</p>
            </div>
          </div>
        )}

        {tab === 'training-path' && (
          <TabTrainingPath
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onComplete={handleComplete}
            onQuizAnswer={handleQuizAnswer}
            onGoToStart={() => setTab('start')}
            initialActiveId={initialLessonId}
          />
        )}

        {tab === 'video-library' && <TabVideoLibrary />}

        {tab === 'progress' && (
          <TabMyProgress
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onReset={handleReset}
            onRoleSelect={handleRoleSelect}
          />
        )}
      </main>

      {/* ── Setu Guru Floating Launcher ── */}
      <button
        type="button"
        aria-label="Open Setu Guru"
        className="fixed bottom-6 right-6 z-[310] flex items-center gap-3 rounded-full border border-white/70 bg-white/95 p-2 pr-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] ring-1 ring-sky-100 backdrop-blur transition hover:-translate-y-0.5"
        onClick={() => alert('Setu Guru public access is coming soon — Sprint 24 (S24-TRAIN-001)')}
      >
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-1 shadow-inner">
          <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-full object-cover" />
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-bold text-slate-950">Setu Guru</span>
          <span className="block text-xs text-slate-500">Ask CRM help</span>
        </span>
      </button>
    </div>
  );
}
