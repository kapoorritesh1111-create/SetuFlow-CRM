'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

const stages = [
  { id: 'discover', label: 'Discover', title: 'Find the right opportunities', text: 'Use ICP matching, Growth Center recommendations, market intelligence, and Setu Guru research to identify buyers and suppliers worth pursuing.', accent: 'emerald' },
  { id: 'capture', label: 'Capture', title: 'Capture leads anywhere', text: 'Collect leads from trade shows, business cards, QR codes, WhatsApp, website forms, email imports, or fast manual entry.', accent: 'blue' },
  { id: 'research', label: 'Research', title: 'Know before you connect', text: 'Bring company, contact, product, market, import-export, certification, supplier, and competitor context into one decision-ready view.', accent: 'violet' },
  { id: 'communicate', label: 'Communicate', title: 'Keep every conversation connected', text: 'Coordinate email, WhatsApp, LinkedIn, calls, meetings, tasks, reminders, and follow-ups from one shared timeline.', accent: 'fuchsia' },
  { id: 'convert', label: 'Convert', title: 'Turn interest into controlled commercial action', text: 'Build quotes, compare suppliers, manage price lists, protect margin, route approvals, and track every buyer outcome.', accent: 'orange' },
  { id: 'execute', label: 'Execute', title: 'Deliver with confidence', text: 'Move accepted business into orders, documents, packing, freight, dispatch, shipment tracking, and proof of delivery.', accent: 'cyan' },
  { id: 'grow', label: 'Grow', title: 'Learn what is working', text: 'Use funnel analytics, pipeline movement, trade-show ROI, supplier performance, pricing intelligence, and Setu Guru recommendations.', accent: 'rose' },
] as const;

const workspaceCards = [
  ['Lead Workspace', 'Buyer and supplier relationships, tasks, notes, products, documents, communications, and next actions.'],
  ['Catalog & Price Lists', 'Manage categories, products, collections, market-specific price lists, currency views, and tracked sharing.'],
  ['Digital Business Card', 'Share your vCard, company profile, catalog, price list, website, and QR identity from one branded experience.'],
  ['Commercial Workspace', 'Create quotes, compare suppliers, review pricing, protect margins, manage approvals, and record outcomes.'],
  ['Supplier Workspace', 'Capture, verify, compare, approve, and manage suppliers, RFQs, documents, capabilities, and performance.'],
  ['Order Execution', 'Coordinate documents, packing, freight, dispatch, shipment milestones, readiness, ownership, and proof.'],
  ['Analytics & Insights', 'Understand conversion, value, movement, bottlenecks, team performance, event ROI, and growth signals.'],
  ['Setu Guru', 'Research, communicate, price, compare, guide, recommend, and explain across the entire workflow—with human approval.'],
];

const shareItems = ['Digital business card', 'Company profile', 'Product catalog', 'Market price list', 'Selected collection', 'Website and social links'];

function StageIcon({ index }: { index: number }) {
  const symbols = ['⌕', '+', '◎', '◌', '▤', '▣', '↗'];
  return <span aria-hidden="true" className="text-xl font-black">{symbols[index]}</span>;
}

export function ProductOverviewExperience() {
  const [activeStage, setActiveStage] = useState<(typeof stages)[number]['id']>('discover');
  const active = useMemo(() => stages.find((stage) => stage.id === activeStage) ?? stages[0], [activeStage]);

  return (
    <SiteShell>
      <main className="overflow-hidden bg-white text-slate-950">
        <section className="relative border-b border-slate-100 bg-[radial-gradient(circle_at_75%_20%,rgba(52,179,168,.18),transparent_30%),linear-gradient(180deg,#f8fcff_0%,#ffffff_85%)]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-teal-700 shadow-sm">
                Product overview
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[#0f2f63] sm:text-6xl">
                One platform. Every step of <span className="text-[#199c8b]">global trade.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Setu Flow connects opportunity discovery, lead capture, relationship management, catalogs, price lists, quotes, suppliers, orders, documents, shipment execution, and growth intelligence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#journey" className="rounded-full bg-[#0f766e] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,118,110,.25)] transition hover:-translate-y-0.5 hover:bg-[#0b665f]">Explore the journey</a>
                <Link href="/training" className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#0f2f63] shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50">Open Setu Flow Academy</Link>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {['Importers', 'Exporters', 'Manufacturers', 'Trade teams'].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-center text-sm font-bold text-slate-700 shadow-sm">{item}</div>)}
              </div>
            </div>

            <div className="relative min-h-[420px] rounded-[2rem] border border-white/80 bg-[#082f49] p-5 shadow-[0_35px_90px_rgba(15,47,99,.22)] sm:p-8">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-teal-400/30 blur-3xl" />
                <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
              </div>
              <div className="relative flex items-center justify-between">
                <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={180} height={54} className="h-12 w-auto rounded-xl bg-white px-3 py-1.5" />
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white">
                  <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={30} height={30} className="h-7 w-7 rounded-full" /> Setu Guru
                </div>
              </div>
              <div className="relative mt-10 grid grid-cols-3 gap-3">
                {['Buyer discovered', 'Lead captured', 'Quote approved', 'Supplier selected', 'Order dispatched', 'Growth insight'].map((label, index) => (
                  <div key={label} className={`rounded-2xl border p-4 ${index === 2 || index === 5 ? 'border-teal-300/40 bg-teal-300/15' : 'border-white/10 bg-white/8'}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-teal-200">{index + 1}</div>
                    <p className="mt-5 text-sm font-bold text-white">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">Connected context, ownership, and next action.</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200 backdrop-blur">
                <span className="font-bold text-teal-200">Setu Guru insight:</span> Three high-fit opportunities are ready for research, and one accepted quote needs order handoff.
              </div>
            </div>
          </div>
        </section>

        <section id="journey" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">The Setu Flow journey</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f2f63] sm:text-5xl">From first signal to final delivery.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Click each stage to see how the platform keeps people, products, commercial context, and execution connected.</p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-7">
            {stages.map((stage, index) => (
              <button key={stage.id} type="button" onClick={() => setActiveStage(stage.id)} className={`group rounded-2xl border px-3 py-5 text-left transition ${activeStage === stage.id ? 'border-teal-300 bg-teal-50 shadow-[0_16px_36px_rgba(15,118,110,.13)]' : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg'}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${activeStage === stage.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}><StageIcon index={index} /></div>
                <p className="mt-4 text-sm font-black text-slate-900">{index + 1}. {stage.label}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-6 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 shadow-[0_24px_60px_rgba(15,23,42,.12)] lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">{active.label}</p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">{active.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-300">{active.text}</p>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"><Image src="/setu-guru/guru-avatar-128.png" alt="" width={26} height={26} className="h-6 w-6 rounded-full" /> Setu Guru works inside this stage</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['What needs attention', 'Who owns the next action', 'What is ready to progress', 'What evidence supports the decision'].map((item, index) => <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-teal-300">0{index + 1}</p><p className="mt-3 font-bold leading-6 text-white">{item}</p></div>)}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Connected workspaces</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f2f63] sm:text-5xl">Everything your trade team needs. Connected.</h2></div>
              <p className="max-w-xl text-base leading-7 text-slate-600">Each workspace is focused, but every record shares the same customer, supplier, product, pricing, document, and execution context.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workspaceCards.map(([title, description], index) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,.05)] transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-lg font-black text-teal-700">{String(index + 1).padStart(2, '0')}</div><h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,.08)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Catalog, price lists, and buyer sharing</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f2f63]">Present your business professionally.</h2>
            <p className="mt-4 leading-7 text-slate-600">Build product catalogs, create market-specific price lists, share selected collections, and see what buyers engage with before the next conversation.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">{['Product categories and variants', 'Country and currency price lists', 'Buyer-safe tracked links', 'Catalog and price-list analytics', 'Multi-language sales assets', 'Setu Guru recommendations'].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">✓ {item}</div>)}</div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(145deg,#06263f,#0f766e)] p-7 text-white shadow-[0_24px_60px_rgba(15,118,110,.22)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-200">Digital business identity</p>
            <div className="mt-6 flex items-start gap-5"><Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={92} height={92} className="h-20 w-20 rounded-3xl border border-white/20 bg-white/10 p-2" /><div><h2 className="text-3xl font-black tracking-[-0.04em]">Share more than a vCard.</h2><p className="mt-3 leading-7 text-slate-200">Give buyers one branded place to understand who you are, what you sell, and how to continue the conversation.</p></div></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">{shareItems.map((item) => <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-bold">{item}</div>)}</div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-[#f7fbff]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-24">
            <div><Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={150} height={150} className="h-32 w-32 rounded-[2rem] bg-[#082f49] p-3 shadow-xl" /><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-teal-700">Setu Guru</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0f2f63]">Your AI copilot across every workflow.</h2><p className="mt-4 leading-7 text-slate-600">Guru helps the team understand context, prepare decisions, find blockers, and choose the next action. Humans approve every commercial, compliance, and data-changing decision.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{['Buyer and supplier research', 'Personalized outreach', 'Reply analysis', 'Quote and RFQ assistance', 'Pricing intelligence', 'Supplier comparison', 'Trade-event guidance', 'Execution blocker detection', 'Growth recommendations'].map((item) => <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="h-2 w-12 rounded-full bg-teal-500" /><p className="mt-5 font-black leading-6 text-slate-900">{item}</p></div>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="rounded-[2.5rem] bg-[#082f49] px-6 py-12 text-center text-white shadow-[0_30px_80px_rgba(8,47,73,.25)] sm:px-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">See Setu Flow in action</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">Connect your complete trade workflow.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">Explore the Academy for step-by-step learning, or book a focused walkthrough built around your buyer, supplier, quote, and order process.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/book-demo" className="rounded-full bg-teal-500 px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-400">Book a demo</Link><Link href="/training" className="rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">Explore Setu Flow Academy</Link></div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
