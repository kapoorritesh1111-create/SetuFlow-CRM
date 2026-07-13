"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/marketing/site-shell";

type Role = "sales" | "operations" | "dispatch" | "manager";
type Goal = "buyers" | "suppliers" | "trade-show" | "quotes" | "orders" | "catalog";
type Lesson = {
  id: string;
  title: string;
  description: string;
  duration: string;
  image?: string;
  available: boolean;
};
type Track = {
  id: Goal;
  title: string;
  description: string;
  lessons: Lesson[];
  roles: Role[];
  accent: string;
};

const roleLabels: Record<Role, string> = {
  sales: "Sales & Business Development",
  operations: "Operations",
  dispatch: "Dispatch",
  manager: "Manager / Leadership",
};

const tracks: Track[] = [
  {
    id: "buyers",
    title: "Buyer Growth Journey",
    description: "Find, capture, research, engage and convert the right buyers.",
    roles: ["sales", "manager"],
    accent: "teal",
    lessons: [
      { id: "buyer-dashboard", title: "Start from the command view", description: "Understand priorities, follow-ups and opportunity health.", duration: "8 min", image: "/marketing/dashboard-command-center.png", available: true },
      { id: "buyer-capture", title: "Capture a buyer inquiry", description: "Create a complete lead with source, product interest and next action.", duration: "10 min", image: "/marketing/mobile-quick-lead.png", available: true },
      { id: "buyer-followup", title: "Qualify and follow up", description: "Use ownership, tasks and the lead workspace to keep momentum.", duration: "12 min", image: "/marketing/follow-up-queue.png", available: true },
      { id: "buyer-research", title: "Research with Setu Guru", description: "Review company fit, market context and useful evidence before outreach.", duration: "Coming soon", available: false },
      { id: "buyer-outreach", title: "Create targeted outreach", description: "Generate and review channel-ready outreach for email, WhatsApp and LinkedIn.", duration: "Coming soon", available: false },
    ],
  },
  {
    id: "suppliers",
    title: "Supplier Mastery",
    description: "Build, verify and manage a dependable supplier network.",
    roles: ["sales", "operations", "manager"],
    accent: "violet",
    lessons: [
      { id: "supplier-capture", title: "Capture and profile suppliers", description: "Record supplier identity, capabilities, product categories and ownership.", duration: "Coming soon", available: false },
      { id: "supplier-docs", title: "Verification and documents", description: "Track compliance, certifications, missing files and review ownership.", duration: "9 min", image: "/marketing/ss-documents.jpg", available: true },
      { id: "supplier-rfq", title: "RFQ and cost request", description: "Prepare clear supplier requests and compare returned commercial details.", duration: "Coming soon", available: false },
      { id: "supplier-compare", title: "Compare and approve suppliers", description: "Review capability, quality, response and commercial fit before approval.", duration: "Coming soon", available: false },
    ],
  },
  {
    id: "trade-show",
    title: "Trade Show Mastery",
    description: "Prepare, capture and convert event conversations without losing context.",
    roles: ["sales", "manager"],
    accent: "blue",
    lessons: [
      { id: "event-plan", title: "Prepare the event", description: "Set event goals, ownership and follow-up expectations before arrival.", duration: "Coming soon", available: false },
      { id: "event-capture", title: "Capture leads in the field", description: "Use mobile quick lead, business-card scan and event source context.", duration: "9 min", image: "/marketing/mobile-quick-lead.png", available: true },
      { id: "event-cleanup", title: "Clean and qualify event leads", description: "Review source, owner, product interest and next action within 48 hours.", duration: "10 min", image: "/marketing/trade-events.png", available: true },
      { id: "event-followup", title: "Follow up and measure ROI", description: "Create post-event outreach and review conversion performance.", duration: "Coming soon", available: false },
    ],
  },
  {
    id: "catalog",
    title: "Catalog & Sales Assets",
    description: "Present products professionally and share buyer-ready catalogs and price lists.",
    roles: ["sales", "operations", "manager"],
    accent: "amber",
    lessons: [
      { id: "catalog-basics", title: "Build a usable product catalog", description: "Organize categories, product details, images, pack sizes and specifications.", duration: "8 min", image: "/internal/docs-screenshots/ss-catalog.jpg", available: true },
      { id: "catalog-price-list", title: "Create market price lists", description: "Prepare country, currency and buyer-specific price-list views.", duration: "Coming soon", available: false },
      { id: "catalog-share", title: "Share and track buyer interest", description: "Share catalogs, collections and price lists from one branded experience.", duration: "Coming soon", available: false },
      { id: "catalog-vcard", title: "Use your digital business card", description: "Share your vCard, company profile, catalog and contact channels from one QR.", duration: "Coming soon", available: false },
    ],
  },
  {
    id: "quotes",
    title: "Quote Excellence",
    description: "Create controlled offers, complete approvals and convert outcomes into orders.",
    roles: ["sales", "operations", "manager"],
    accent: "orange",
    lessons: [
      { id: "quote-ready", title: "Confirm quote readiness", description: "Review buyer, products, commercial assumptions and required information.", duration: "9 min", image: "/marketing/quote-workflow.png", available: true },
      { id: "quote-build", title: "Build and review the quote", description: "Complete pricing, terms, freight, margin and recipient details.", duration: "12 min", image: "/internal/docs-screenshots/operator-04-quote-builder-draft.png", available: true },
      { id: "quote-approve", title: "Complete approval and send", description: "Use approval gates and share only the approved, tracked buyer link.", duration: "11 min", image: "/internal/docs-screenshots/operator-05-quote-approval-gate.png", available: true },
      { id: "quote-outcome", title: "Log the commercial outcome", description: "Record accepted, rejected, revision, no-response or expiry outcomes.", duration: "Coming soon", available: false },
    ],
  },
  {
    id: "orders",
    title: "Order Execution",
    description: "Move from accepted business to documents, packing, freight and dispatch.",
    roles: ["operations", "dispatch", "manager"],
    accent: "emerald",
    lessons: [
      { id: "order-overview", title: "Understand the order workspace", description: "Review stage, ownership, readiness, value and next action.", duration: "8 min", image: "/marketing/ss-orders.jpg", available: true },
      { id: "order-docs", title: "Complete document readiness", description: "Track required, attached and missing commercial and compliance documents.", duration: "10 min", image: "/marketing/ss-documents.jpg", available: true },
      { id: "order-pack", title: "Prepare packing and freight", description: "Capture package, weight, dimensions, carrier, pickup and shipping details.", duration: "Coming soon", available: false },
      { id: "order-dispatch", title: "Complete dispatch handoff", description: "Confirm proof, tracking, final ownership and delivery follow-up.", duration: "Coming soon", available: false },
    ],
  },
];

const roleTrackPriority: Record<Role, Goal[]> = {
  sales: ["buyers", "trade-show", "catalog", "quotes", "suppliers", "orders"],
  operations: ["suppliers", "quotes", "orders", "catalog", "buyers", "trade-show"],
  dispatch: ["orders", "suppliers", "quotes", "catalog", "buyers", "trade-show"],
  manager: ["buyers", "suppliers", "trade-show", "catalog", "quotes", "orders"],
};

function TrackCard({ track, onOpen }: { track: Track; onOpen: (track: Track) => void }) {
  const ready = track.lessons.filter((lesson) => lesson.available).length;
  return (
    <button onClick={() => onOpen(track)} className="group flex min-h-[220px] flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-[0_14px_40px_rgba(15,23,42,.06)] transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl font-black text-teal-700">{track.title.slice(0, 1)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">{ready}/{track.lessons.length} ready</span>
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950">{track.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{track.description}</p>
      <span className="mt-auto pt-5 text-sm font-black text-teal-700">Explore learning path →</span>
    </button>
  );
}

export default function SetuFlowAcademyPage() {
  const [role, setRole] = useState<Role>("sales");
  const [goal, setGoal] = useState<Goal>("buyers");
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const recommended = useMemo(() => {
    const preferred = tracks.find((track) => track.id === goal && track.roles.includes(role));
    if (preferred) return preferred;
    return tracks.find((track) => roleTrackPriority[role].includes(track.id)) ?? tracks[0];
  }, [goal, role]);

  const availableLessons = tracks.flatMap((track) => track.lessons).filter((lesson) => lesson.available).length;

  return (
    <SiteShell>
      <main className="min-h-screen bg-[#f7fafc] text-slate-950">
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_15%_10%,rgba(45,212,191,.16),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f3fbfa_52%,#eef4ff_100%)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.35fr_.65fr] lg:px-8 lg:py-16">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">Setu Flow Academy</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">Learn. Apply. Grow global.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Role-based learning for buyer growth, suppliers, trade shows, catalogs, quotes and order execution — guided by Setu Guru.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-white bg-white/90 p-3 shadow-sm">
                  <span className="block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">I work in</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="mt-1 w-full bg-transparent text-sm font-bold text-slate-800 outline-none">
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="rounded-2xl border border-white bg-white/90 p-3 shadow-sm">
                  <span className="block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">I want to learn</span>
                  <select value={goal} onChange={(event) => setGoal(event.target.value as Goal)} className="mt-1 w-full bg-transparent text-sm font-bold text-slate-800 outline-none">
                    {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setActiveTrack(recommended)} className="rounded-full bg-teal-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-800">Show my learning path</button>
                <Link href="/product-overview" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-teal-300 hover:text-teal-700">View product overview</Link>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-[0_25px_70px_rgba(15,23,42,.10)] backdrop-blur">
              <div className="text-center">
                <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={128} height={128} className="mx-auto h-28 w-28 rounded-full object-contain shadow-lg" priority />
                <p className="mt-4 text-lg font-black text-slate-950">Your learning guide</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Setu Guru helps explain workflows, common mistakes and the next best lesson.</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-teal-700">6</p><p className="text-[10px] font-bold text-slate-400">Tracks</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-teal-700">{availableLessons}</p><p className="text-[10px] font-bold text-slate-400">Ready</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-teal-700">24</p><p className="text-[10px] font-bold text-slate-400">Planned</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-teal-700">Recommended for {roleLabels[role]}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{recommended.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{recommended.description}</p>
              </div>
              <button onClick={() => setActiveTrack(recommended)} className="rounded-full border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-black text-teal-700">Open recommended path →</button>
            </div>
            <div className="mt-7 grid gap-3 md:grid-cols-4">
              {recommended.lessons.map((lesson, index) => (
                <button key={lesson.id} onClick={() => lesson.available ? setActiveLesson(lesson) : undefined} className={`rounded-2xl border p-4 text-left ${lesson.available ? "border-slate-200 bg-white hover:border-teal-300" : "border-dashed border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-teal-700">{String(index + 1).padStart(2, "0")}</span><span className="text-[10px] font-bold text-slate-400">{lesson.duration}</span></div>
                  <p className="mt-3 text-sm font-black text-slate-900">{lesson.title}</p>
                  {!lesson.available && <span className="mt-3 inline-flex rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">Coming soon</span>}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Browse the Academy</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Learning paths built around real work</h2></div><p className="hidden max-w-md text-right text-sm leading-6 text-slate-500 md:block">Available lessons use approved screenshots already in the repository. Planned lessons are clearly marked Coming soon.</p></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tracks.map((track) => <TrackCard key={track.id} track={track} onOpen={setActiveTrack} />)}</div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
            <div className="rounded-3xl border border-slate-200 p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">Learn with real screens</p><h3 className="mt-3 text-xl font-black">See the workflow before trying it</h3><p className="mt-3 text-sm leading-6 text-slate-500">Every available lesson uses training-safe screenshots already approved for public guidance.</p></div>
            <div className="rounded-3xl border border-slate-200 p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">Practice in the CRM</p><h3 className="mt-3 text-xl font-black">Move from knowledge to action</h3><p className="mt-3 text-sm leading-6 text-slate-500">Lessons explain the first click, required checks, expected result and common mistakes.</p></div>
            <div className="rounded-3xl border border-slate-200 p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">More coming</p><h3 className="mt-3 text-xl font-black">New lessons will appear here</h3><p className="mt-3 text-sm leading-6 text-slate-500">Videos, practice exercises and certifications remain visible as planned experiences without pretending they are complete.</p></div>
          </div>
        </section>
      </main>

      {activeTrack && (
        <div className="fixed inset-0 z-[10020] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveTrack(null); }}>
          <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 p-6 backdrop-blur"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">Learning path</p><h2 className="mt-2 text-2xl font-black text-slate-950">{activeTrack.title}</h2><p className="mt-2 text-sm text-slate-500">{activeTrack.description}</p></div><button onClick={() => setActiveTrack(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500">×</button></div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {activeTrack.lessons.map((lesson, index) => (
                <button key={lesson.id} onClick={() => lesson.available ? setActiveLesson(lesson) : undefined} className={`overflow-hidden rounded-3xl border text-left ${lesson.available ? "border-slate-200 bg-white hover:border-teal-300" : "border-dashed border-slate-200 bg-slate-50"}`}>
                  {lesson.image ? <div className="relative h-44 bg-slate-100"><Image src={lesson.image} alt="" fill className="object-contain object-top" /></div> : <div className="flex h-44 items-center justify-center bg-slate-100 text-sm font-black text-slate-400">Coming soon</div>}
                  <div className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-black text-teal-700">Lesson {index + 1}</span><span className="text-xs font-bold text-slate-400">{lesson.duration}</span></div><h3 className="mt-3 text-lg font-black text-slate-950">{lesson.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{lesson.description}</p>{lesson.available ? <span className="mt-4 inline-flex text-sm font-black text-teal-700">Open lesson →</span> : <span className="mt-4 inline-flex rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Coming soon</span>}</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeLesson && (
        <div className="fixed inset-0 z-[10030] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveLesson(null); }}>
          <section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between border-b border-slate-200 p-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">Interactive lesson</p><h2 className="mt-2 text-2xl font-black text-slate-950">{activeLesson.title}</h2><p className="mt-2 text-sm text-slate-500">{activeLesson.description}</p></div><button onClick={() => setActiveLesson(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500">×</button></div>
            <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
              <div className="bg-slate-100 p-4 sm:p-6">{activeLesson.image && <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white"><Image src={activeLesson.image} alt={activeLesson.title} fill className="object-contain object-top" /></div>}</div>
              <div className="space-y-4 p-6"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">What this screen teaches</p><p className="mt-2 text-sm leading-6 text-blue-950">Understand the workspace, confirm the required context and complete the next action without losing ownership.</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-600">Check before continuing</p><p className="mt-2 text-sm leading-6 text-amber-950">Confirm the owner, source, linked record, required details and next action match the real business situation.</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600">Done when</p><p className="mt-2 text-sm leading-6 text-emerald-950">Another teammate can open the record, understand what happened and know exactly what should happen next.</p></div><button onClick={() => setActiveLesson(null)} className="w-full rounded-full bg-teal-700 px-5 py-3 text-sm font-black text-white">Mark reviewed</button></div>
            </div>
          </section>
        </div>
      )}
    </SiteShell>
  );
}
