"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/marketing/site-shell";

type Role = "sales" | "operations" | "dispatch" | "manager";
type Tab = "workflow" | "lessons" | "videos" | "progress";
type Group = "Capture" | "Convert" | "Execute";

type Screen = {
  title: string;
  file: string;
  callout: string;
  firstClick: string;
  check: string;
  doneWhen: string;
  tip: string;
};

type Module = {
  id: string;
  number: string;
  group: Group;
  title: string;
  shortTitle: string;
  roles: Role[];
  outcome: string;
  screens: Screen[];
};

const SS = "/internal/docs-screenshots";

const ROLE_LABELS: Record<Role, string> = {
  sales: "Sales owner",
  operations: "Operations owner",
  dispatch: "Dispatch owner",
  manager: "Manager / Admin",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  sales: "Captures leads, manages buyer context, prepares quotes, and keeps follow-up from going cold.",
  operations: "Checks product, quote, document, order, approval, packing, and freight readiness.",
  dispatch: "Confirms shipment handoff, updates dispatch status, and records movement details.",
  manager: "Reviews queue health, bottlenecks, overdue tasks, and handoff quality across the workflow.",
};

const ROLE_MODULES: Record<Role, string[]> = {
  sales: ["dashboard", "lead-capture", "trade-show", "mobile-vcard", "tasks", "setu-guru", "quote"],
  operations: ["dashboard", "tasks", "setu-guru", "quote", "documents", "dispatch"],
  dispatch: ["dashboard", "tasks", "documents", "dispatch"],
  manager: ["dashboard", "lead-capture", "trade-show", "tasks", "setu-guru", "quote", "documents", "dispatch"],
};

const screen = (
  title: string,
  file: string,
  callout: string,
  firstClick: string,
  check: string,
  doneWhen: string,
  tip: string,
): Screen => ({ title, file, callout, firstClick, check, doneWhen, tip });

const modules: Module[] = [
  {
    id: "dashboard",
    number: "01",
    group: "Capture",
    title: "Dashboard command view",
    shortTitle: "Dashboard",
    roles: ["sales", "operations", "dispatch", "manager"],
    outcome: "Start every day with queue health, overdue records, and the next priority.",
    screens: [
      screen("Main dashboard", "operator-01-dashboard-nav.png", "The dashboard is your home base. The left navigation takes you to every major workspace.", "Click Dashboard from the navigation.", "Scan priority cards and queue counts before opening records.", "You know which queue needs action first and who owns it.", "Start here before opening individual leads, quotes, orders, or dispatch records."),
      screen("Dashboard overview", "ss-dashboard.jpg", "KPI cards and activity feed show what changed and where attention is needed.", "Scroll through the dashboard overview.", "Review the follow-up queue and any red or amber indicators.", "You know what is healthy, overdue, or blocked.", "Use the dashboard for the daily operating rhythm."),
      screen("Analytics view", "ss-analytics.jpg", "Analytics shows conversion and bottlenecks at a glance.", "Open Analytics or Reports from navigation.", "Look for stages with the most stuck records.", "You can explain what needs manager attention.", "Use analytics for coaching and review, not for editing records."),
      screen("Reports view", "ss-reports.jpg", "Reports need the right filters before the numbers are trusted.", "Set date range, owner, and stage filters.", "Confirm filters before sharing results.", "The report supports a clear follow-up or cleanup decision.", "Always check filters before using numbers in meetings."),
    ],
  },
  {
    id: "lead-capture",
    number: "02",
    group: "Capture",
    title: "Lead capture and qualification",
    shortTitle: "Lead Capture",
    roles: ["sales", "manager"],
    outcome: "Create a clean inquiry with source, owner, product interest, notes, and next action.",
    screens: [
      screen("Lead capture workspace", "ss-capture.jpg", "Use the Add Lead or Capture action to start a new buyer inquiry.", "Click Add Lead or Capture in the leads workspace.", "Enter company, contact, country, source, product interest, and owner.", "The record is saved with owner, status, note, and next follow-up.", "Do not leave a captured inquiry without a next action."),
      screen("Capture lead form", "ss-capture-lead.jpg", "Required fields make sure another teammate can act on the record later.", "Fill company, contact details, product interest, source, owner, and notes.", "Confirm email or phone, product category, and owner before saving.", "Another user can understand and act without asking for context.", "Write the buyer request clearly in Notes."),
      screen("Leads list", "ss-leads.jpg", "Each row is one lead. Status, owner, and last activity tell you what to open first.", "Click a lead row to open the detail view.", "Look at status, owner, and last activity before changing anything.", "You know whether to contact, qualify, quote, hold, or close.", "Read the latest note before changing status."),
      screen("Lead command view", "ss-leads-cmd.jpg", "The detail command area is where status, owner, note, and task updates happen.", "Update status, add a note, or create a task from the detail panel.", "Confirm reason, next owner, and follow-up before saving.", "Status, notes, and next action match the real conversation.", "Every status movement needs a note."),
      screen("Lead detail create quote", "operator-03-lead-detail-create-quote.png", "Create Quote is the handoff from qualified lead to commercial workflow.", "Click Create Quote from the qualified lead detail view.", "Confirm buyer interest, product category, and quantity expectation first.", "A linked quote is created from real buyer context.", "Do not create placeholder quotes from unqualified conversations."),
    ],
  },
  {
    id: "trade-show",
    number: "03",
    group: "Capture",
    title: "Trade show and event capture",
    shortTitle: "Trade Show",
    roles: ["sales", "manager"],
    outcome: "Turn event conversations into assigned, follow-up-ready CRM records before context fades.",
    screens: [
      screen("Pipeline event view", "ss-pipeline.jpg", "Pipeline groups leads by stage and source so event follow-up is visible.", "Open Pipeline and filter by source or event name.", "Check source, stage, owner, and follow-up date.", "Every real event conversation has an owner and next action.", "Clean event leads within 48 hours."),
      screen("Product catalog reference", "ss-catalog.jpg", "Use catalog details to record exact product interest, pack format, and category.", "Open Catalog while reviewing the event lead.", "Note exact product, pack size, and expected quantity.", "Lead context is specific enough for quoting.", "Specific product interest creates better quotes."),
    ],
  },
  {
    id: "mobile-vcard",
    number: "04",
    group: "Capture",
    title: "Mobile field capture and vCard",
    shortTitle: "Mobile / vCard",
    roles: ["sales"],
    outcome: "Capture contact and buyer interest from phone quickly, then clean it up from desktop.",
    screens: [
      screen("Mobile quick capture", "ss-mobile-capture.jpg", "Mobile capture is for speed when you are in the field.", "Tap Quick Lead or the plus action on mobile.", "Capture name, company, phone or email, source, and product interest.", "The new record appears in the mobile leads list.", "Clean and qualify from desktop later."),
      screen("Mobile leads list", "ss-mobile-leads.jpg", "Recent mobile captures appear as lead cards with status indicators.", "Tap a lead card to open it.", "Flag incomplete records for desktop cleanup.", "Your new lead is visible and basic details are correct.", "Before leaving an event, check recent captures."),
      screen("vCard business card scan", "ss-vcard.jpg", "Card scan extracts fields but still needs human verification.", "Tap Scan Card or Import vCard.", "Verify name, company, phone, email, and title.", "The contact is verified and saved as a lead.", "OCR can make mistakes. Verification is not optional."),
    ],
  },
  {
    id: "tasks",
    number: "05",
    group: "Capture",
    title: "Tasks and follow-up discipline",
    shortTitle: "Tasks",
    roles: ["sales", "operations", "dispatch", "manager"],
    outcome: "Keep every lead, quote, order, and dispatch item moving with a clear owner and due date.",
    screens: [
      screen("Tasks workspace", "ss-tasks.jpg", "The task list shows priority, owner, due date, and linked record.", "Click New Task or open an existing task.", "Confirm owner, due date, priority, linked record, and description.", "A teammate can act without asking what the task means.", "Write tasks for clarity, not brevity."),
      screen("Mobile tasks", "ss-tasks-mobile.jpg", "Mobile tasks help close follow-up while away from desktop.", "Tap the completion circle on a task card.", "Add an outcome note before completing.", "The task is closed with context or converted into the next follow-up.", "Never close a task without recording what happened."),
    ],
  },
  {
    id: "setu-guru",
    number: "06",
    group: "Convert",
    title: "Setu Guru AI guidance",
    shortTitle: "Setu Guru",
    roles: ["sales", "operations", "dispatch", "manager"],
    outcome: "Use Setu Guru to resolve blockers, check pricing defaults, HS codes, compliance steps, and next actions.",
    screens: [
      screen("Setu Guru panel", "ss-setu_guru.jpg", "Setu Guru reads page context and gives guidance for the current workflow.", "Open Setu Guru from the sidebar footer or mobile header.", "Ask a clear question and review the recommended next step.", "You understand what to do next, with human approval for commercial actions.", "Guru guides; humans still approve."),
    ],
  },
  {
    id: "quote",
    number: "07",
    group: "Convert",
    title: "Quote workflow",
    shortTitle: "Quote",
    roles: ["sales", "operations", "manager"],
    outcome: "Move from quote draft to approval, send, outcome update, and order creation.",
    screens: [
      screen("Quotes list", "ss-quotes.jpg", "Quote status shows where each commercial offer stands.", "Open a quote row or filter by status.", "Check approval state and last update before acting.", "You know which quote needs edit, approval, send, follow-up, or order creation.", "Quote status must reflect the real buyer conversation."),
      screen("Quote builder", "ss-quotebuilder.jpg", "Build product line items, pricing, freight, and assumptions before approval.", "Click Add Product and enter quantity, pack size, and unit price.", "Confirm product, currency, incoterms, freight, and notes.", "The draft is complete enough for approval review.", "Write pricing assumptions clearly."),
      screen("Quote builder draft", "operator-04-quote-builder-draft.png", "Draft mode is the safe correction stage before approval.", "Review all sections before Submit for Approval.", "Check for validation warnings.", "All sections are complete and ready for approval.", "Once submitted, changes require review."),
      screen("Approval gate", "operator-05-quote-approval-gate.png", "The approval gate protects margin, compliance, freight, and terms.", "Review checklist items and approve or return with notes.", "Confirm margin, freight, incoterms, and compliance.", "The quote is approved, returned, or held with clear reason.", "Approval is not a formality."),
      screen("Approved quote send", "operator-06-approved-quote-send.png", "Send Quote becomes available after approval.", "Review recipient, subject, message, and attachment before sending.", "Confirm the PDF version and buyer details.", "The quote is sent and follow-up is scheduled.", "Sending is a real commercial action."),
      screen("Quote outcome create order", "operator-07-quote-outcome-create-order.png", "Accepted quote becomes the source for order creation.", "Mark Accepted, then Create Order.", "Confirm accepted quantity, price, incoterms, and requirements.", "A linked order is created with the correct terms.", "Only create orders from confirmed acceptance."),
    ],
  },
  {
    id: "documents",
    number: "08",
    group: "Convert",
    title: "Documents and order readiness",
    shortTitle: "Documents",
    roles: ["operations", "dispatch", "manager"],
    outcome: "Confirm documents, packing, freight, and stage details before dispatch handoff.",
    screens: [
      screen("Documents workspace", "ss-documents.jpg", "The document checklist shows attached, pending, or missing items.", "Open Documents and filter to the order.", "Review contract, invoice, packing list, certificates, and compliance documents.", "Required documents are attached or assigned with owner and expected date.", "Document readiness belongs in the system."),
      screen("Orders workspace", "ss-orders.jpg", "Orders show stage, readiness, buyer, product, and ownership.", "Click an order row to open detail.", "Review status, product, quantity, terms, and next action.", "The order clearly shows ready, pending, and owner responsibilities.", "Do not advance stage prematurely."),
      screen("Order execution stage panel", "operator-08-order-execution-stage-panel.png", "The stage panel shows where the order is in execution.", "Review stage requirements before Advance Stage.", "Confirm requirements, blockers, and next owner.", "The stage badge matches real operational status.", "Stage changes should include context notes."),
      screen("Packing and freight details", "operator-10-packing-freight.png", "Packing and freight details must be complete before dispatch readiness.", "Open the Packing / Freight tab.", "Confirm pack count, weight, dimensions, mode, carrier, pickup date, and notes.", "Dispatch can act without calling for missing data.", "Incomplete freight data delays shipment."),
    ],
  },
  {
    id: "dispatch",
    number: "09",
    group: "Execute",
    title: "Dispatch tracking",
    shortTitle: "Dispatch",
    roles: ["operations", "dispatch", "manager"],
    outcome: "Complete shipment movement tracking with carrier details and post-dispatch follow-up.",
    screens: [
      screen("Dispatch tracking and update", "operator-11-dispatch-tracking.png", "Dispatch tracking captures shipment status, carrier, tracking number, and buyer follow-up.", "Click Update Dispatch or Add Tracking after shipment movement is confirmed.", "Confirm dispatch status, tracking number, carrier, date, and buyer follow-up task.", "The record shows real shipment status and next follow-up.", "Do not mark complete before physical shipment movement."),
    ],
  },
];

const GROUP_TEXT: Record<Group, string> = {
  Capture: "Capture buyer intent",
  Convert: "Prepare the commercial offer",
  Execute: "Complete shipment handoff",
};

const STORAGE_KEY = "setuflow-training-v3";

function loadProgress() {
  if (typeof window === "undefined") return { role: null as Role | null, completed: [] as string[] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { role: null, completed: [] };
  } catch {
    return { role: null, completed: [] };
  }
}

function saveProgress(progress: { role: Role | null; completed: string[] }) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <path d="M14 15h6M14 19h4" />
    </svg>
  );
}

function RoleButton({ role, active, onClick }: { role: Role; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-teal-400 bg-teal-50 shadow-sm" : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/60"}`}>
      <p className="text-sm font-bold text-slate-950">{ROLE_LABELS[role]}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{ROLE_DESCRIPTIONS[role]}</p>
    </button>
  );
}

function WorkflowCard({ module, faded, done, onOpen }: { module: Module; faded: boolean; done: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={`group flex min-h-[190px] flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg ${faded ? "border-slate-100 opacity-45" : "border-slate-200"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700"><Icon /></span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>{done ? "Done" : module.number}</span>
      </div>
      <h3 className="mt-4 text-base font-bold tracking-tight text-slate-950">{module.shortTitle}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{module.outcome}</p>
      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">First action</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{module.screens[0]?.firstClick}</p>
        </div>
        <p className="mt-3 text-xs font-bold text-teal-700 group-hover:text-teal-800">Open lesson -&gt;</p>
      </div>
    </button>
  );
}

function ScreenCard({ item, index, total }: { item: Screen; index: number; total: number }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Screen {index + 1} of {total}</p>
        <p className="text-xs font-semibold text-slate-400">{item.title}</p>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-slate-100 p-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Image src={`${SS}/${item.file}`} alt={item.title} width={1600} height={1000} className="h-[280px] w-full object-contain object-top" />
          </div>
        </div>
        <div className="p-5">
          <h4 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h4>
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">What you are looking at</p><p className="mt-1.5 text-xs leading-5 text-blue-900">{item.callout}</p></div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Click / tap this first</p><p className="mt-1.5 text-xs leading-5 text-slate-700">{item.firstClick}</p></div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">Check before saving</p><p className="mt-1.5 text-xs leading-5 text-amber-900">{item.check}</p></div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Done when</p><p className="mt-1.5 text-xs leading-5 text-emerald-800">{item.doneWhen}</p></div>
          </div>
          <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] italic leading-5 text-slate-500">Tip: {item.tip}</p>
        </div>
      </div>
    </section>
  );
}

export default function TrainingWorkspacePage() {
  const [tab, setTab] = useState<Tab>("workflow");
  const [role, setRole] = useState<Role | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("dashboard");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadProgress();
    setRole(stored.role);
    setCompleted(stored.completed);
    setHydrated(true);
  }, []);

  const visibleModules = useMemo(() => (role ? modules.filter((m) => ROLE_MODULES[role].includes(m.id)) : modules), [role]);
  const activeModule = visibleModules.find((m) => m.id === activeId) ?? visibleModules[0] ?? modules[0];
  const doneCount = visibleModules.filter((m) => completed.includes(m.id)).length;

  const updateRole = (nextRole: Role | null) => {
    setRole(nextRole);
    saveProgress({ role: nextRole, completed });
  };
  const markDone = (id: string) => {
    if (completed.includes(id)) return;
    const next = [...completed, id];
    setCompleted(next);
    saveProgress({ role, completed: next });
  };
  const openLesson = (id: string) => {
    setActiveId(id);
    setTab("lessons");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "workflow", label: "SETU Workflow" },
    { id: "lessons", label: "Workflow Lessons" },
    { id: "videos", label: "Video Walkthroughs" },
    { id: "progress", label: "My Progress" },
  ];

  return (
    <SiteShell>
      <main className="min-h-screen bg-white text-slate-950">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-teal-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Product overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Setu Flow - learn the system</h1>
            {hydrated && <p className="mt-1 text-sm text-slate-500">{role ? ROLE_LABELS[role] : "All users"} · {doneCount}/{visibleModules.length} modules complete</p>}
          </div>
        </div>

        <div className="sticky top-[65px] z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto">
              {tabs.map((item) => (
                <button key={item.id} onClick={() => setTab(item.id)} className={`relative shrink-0 px-5 py-3.5 text-sm font-semibold transition ${tab === item.id ? "text-teal-700" : "text-slate-500 hover:text-slate-800"}`}>
                  {item.label}
                  {tab === item.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal-600" />}
                  {item.id === "progress" && doneCount > 0 && <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">{doneCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "workflow" && (
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.06)]">
              <div className="grid gap-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-teal-50 px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-7">
                <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">SETU Workflow</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">From inquiry to dispatch</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">A compact overview that keeps the full role paths, lessons, and screenshot training intact.</p></div>
                <div className="rounded-2xl border border-teal-100 bg-white/85 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">What you will achieve</p><div className="mt-3 flex max-w-xl flex-wrap gap-2 text-[11px] font-semibold">{["Inquiry captured", "Follow-up assigned", "Quote approved", "Documents ready", "Dispatch tracked"].map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">✓</span>{item}</span>)}</div></div>
              </div>
              <div className="border-b border-slate-100 px-5 py-5 lg:px-7">
                <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-950">Choose role path</p><button onClick={() => updateRole(null)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!role ? "border-teal-500 bg-teal-600 text-white" : "border-slate-200 text-slate-500"}`}>All users</button></div>
                <div className="grid gap-3 md:grid-cols-4">{(["sales", "operations", "dispatch", "manager"] as Role[]).map((r) => <RoleButton key={r} role={r} active={role === r} onClick={() => updateRole(r)} />)}</div>
              </div>
              <div className="px-5 py-6 lg:px-7"><div className="grid gap-5 xl:grid-cols-[5fr_3fr_1fr]">{(["Capture", "Convert", "Execute"] as Group[]).map((group) => { const groupModules = modules.filter((m) => m.group === group); return <section key={group} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4"><div className="mb-4 flex items-end justify-between gap-3"><div><p className={`text-sm font-black uppercase tracking-[0.28em] ${group === "Capture" ? "text-teal-700" : group === "Convert" ? "text-blue-700" : "text-orange-700"}`}>{group}</p><p className="mt-1 text-xs text-slate-400">{GROUP_TEXT[group]}</p></div><span className="text-[11px] font-semibold text-slate-400">{groupModules.length} steps</span></div><div className={`grid gap-3 ${group === "Capture" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : group === "Convert" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>{groupModules.map((m) => <WorkflowCard key={m.id} module={m} faded={!!role && !ROLE_MODULES[role].includes(m.id)} done={completed.includes(m.id)} onOpen={() => openLesson(m.id)} />)}</div></section>; })}</div></div>
            </section>
          </div>
        )}

        {tab === "lessons" && (
          <div className="flex min-h-screen">
            <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block"><div className="sticky top-[113px] p-4"><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{role ? ROLE_LABELS[role] : "All lessons"}</p><nav className="space-y-1">{visibleModules.map((m) => <button key={m.id} onClick={() => setActiveId(m.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${activeModule.id === m.id ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${completed.includes(m.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{completed.includes(m.id) ? "✓" : m.number}</span><span>{m.shortTitle}</span></button>)}</nav></div></aside>
            <div className="flex-1 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{activeModule.number}</span>{activeModule.roles.map((r) => <span key={r} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">{ROLE_LABELS[r]}</span>)}<span className="ml-auto text-[11px] text-slate-400">{activeModule.screens.length} screens</span></div><h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{activeModule.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{activeModule.outcome}</p><button onClick={() => markDone(activeModule.id)} className={`mt-4 rounded-full px-5 py-2.5 text-sm font-semibold ${completed.includes(activeModule.id) ? "bg-emerald-50 text-emerald-700" : "bg-teal-600 text-white"}`}>{completed.includes(activeModule.id) ? "✓ Completed" : "Mark complete"}</button></div><div className="space-y-5">{activeModule.screens.map((item, i) => <ScreenCard key={`${activeModule.id}-${item.file}`} item={item} index={i} total={activeModule.screens.length} />)}</div></div>
          </div>
        )}

        {tab === "videos" && <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Video walkthroughs</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Watch before you work.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map((m) => <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Coming soon</span><p className="mt-3 text-sm font-semibold text-slate-950">{m.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{m.outcome}</p></div>)}</div></div>}

        {tab === "progress" && <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">My progress</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Your training status</h2><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Modules done</p><p className="mt-2 text-3xl font-semibold text-slate-950">{doneCount}<span className="text-xl text-slate-300">/{visibleModules.length}</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${visibleModules.length ? Math.round((doneCount / visibleModules.length) * 100) : 0}%` }} /></div><button onClick={() => { setCompleted([]); saveProgress({ role, completed: [] }); }} className="mt-4 rounded-full border border-red-100 px-4 py-2 text-xs font-semibold text-red-400">Reset all progress</button></div></div>}
      </main>
    </SiteShell>
  );
}
