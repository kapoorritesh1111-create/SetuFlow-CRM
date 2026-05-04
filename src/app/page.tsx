export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';
import { BookDemoForm } from '@/components/marketing/book-demo-form';

type IconName = 'chart' | 'file' | 'alert' | 'bridge' | 'scan' | 'users' | 'quote' | 'shield' | 'ship' | 'globe' | 'package' | 'repeat' | 'search' | 'message' | 'qr' | 'box' | 'database';

type Card = { icon: IconName; title: string; body: string };

type WorkflowStep = Card & { step: string; image: string };

type Frame = { eyebrow: string; title: string; body: string; image: string; alt: string };

const workflow: WorkflowStep[] = [
  { step: '01', icon: 'scan', title: 'Capture', body: 'Turn trade-show conversations, vCards and quick leads into structured records before context disappears.', image: '/marketing/mobile-quick-lead.png' },
  { step: '02', icon: 'users', title: 'Qualify', body: 'Add owner, role, market, product interest, value and next action from the first touch.', image: '/marketing/follow-up-queue.png' },
  { step: '03', icon: 'quote', title: 'Quote', body: 'Build governed pricing, terms and quote readiness without rebuilding context in spreadsheets.', image: '/marketing/quote-workflow.png' },
  { step: '04', icon: 'shield', title: 'Approve', body: 'Keep commercial control with approval gates before quotes and deals move forward.', image: '/marketing/pipeline-commercial-view.png' },
  { step: '05', icon: 'ship', title: 'Execute', body: 'Carry accepted quotes into orders, documents, blockers, dispatch and payment readiness.', image: '/marketing/orders-execution.png' }
];

const problemCards: Card[] = [
  { icon: 'chart', title: 'CRM does not equal execution', body: 'Most CRMs stop at deal tracking. Trade teams still need quote control, documents, dispatch and payment visibility.' },
  { icon: 'file', title: 'Quotes live outside the system', body: 'Pricing, terms, freight assumptions and approvals drift across spreadsheets, email threads and chat messages.' },
  { icon: 'alert', title: 'Blockers appear too late', body: 'Compliance and document gaps usually surface when the shipment is already at risk.' }
];

const categoryPoints = [
  { icon: 'scan' as IconName, text: 'Capture buyer and supplier context' },
  { icon: 'quote' as IconName, text: 'Govern quote readiness' },
  { icon: 'shield' as IconName, text: 'Control approval handoffs' },
  { icon: 'ship' as IconName, text: 'Execute with blockers visible' }
];

const productFrames: Frame[] = [
  { eyebrow: 'Command Center', title: 'See everything. Miss nothing.', body: 'Pipeline value, market coverage, quotes in motion, blocked revenue and follow-ups surface in one command view.', image: '/marketing/dashboard-command-center.png', alt: 'Setu Flow command center dashboard with trade KPIs and market map' },
  { eyebrow: 'Follow-up Queue', title: 'Know exactly what needs action next.', body: 'Every lead carries urgency, owner, value, role and stage context so your team works the right accounts first.', image: '/marketing/follow-up-queue.png', alt: 'Setu Flow follow-up queue showing overdue leads and actions' },
  { eyebrow: 'Quote Workflow', title: 'Build, price and approve without spreadsheet drift.', body: 'Product, pricing, terms, review and send gates turn quoting into a repeatable commercial workflow.', image: '/marketing/quote-workflow.png', alt: 'Setu Flow quote workflow with pricing step and quote preview' },
  { eyebrow: 'Execution Desk', title: 'Track documents, shipments and blockers after the deal closes.', body: 'Orders keep commercial context alive with execution stages, missing documents, payment state and dispatch blockers.', image: '/marketing/orders-execution.png', alt: 'Setu Flow order execution desk showing dispatch blockers and document status' }
];

const comparisonRows = [
  ['section', 'Quoting'],
  ['FOB/CIF/Ex-Factory pricing basis', 'Manual calculation', 'Custom field only', 'Native pricing basis logic'],
  ['Live FX + locked rate quoting', 'Manual lookup', 'Not present', 'FX locked at quote time'],
  ['Freight estimate per port/container', 'Separate sheet', 'Not present', 'Port freight profiles'],
  ['Quote versioning with approval gate', 'File versions', 'Workflow add-on', 'Lifecycle states + approval handoff'],
  ['WhatsApp quote delivery', 'Copy-paste link', 'Not present', 'One-tap send from mobile'],
  ['section', 'Lead management'],
  ['Business card OCR → lead in 30s', 'Manual entry', '3rd-party scan app', 'In-app capture + vCard + QR'],
  ['Trade show batch capture with source context', 'Spreadsheet', 'Campaign tag', 'Event context inherited per entry'],
  ['Stage move readiness', 'Free-move', 'Not present', 'Blocks moves until ready'],
  ['Buyer + Supplier in one workspace', 'Separate sheets', 'Single pipeline', 'Role-aware dual view'],
  ['section', 'Compliance + execution'],
  ['Country compliance checklist by destination', 'Manual tracking', 'External tool', 'Driven by product + destination'],
  ['Certificate expiry tracking', 'Calendar reminder', 'Not present', 'Flagged before it blocks shipment'],
  ['Mobile app', 'Not applicable', 'Desktop shrink', 'Field-ready mobile workflow'],
  ['Time to get a 10-person team operational', 'Ongoing chaos', '2–4 weeks', '<5 days · guided setup']
];

const audiences: Card[] = [
  { icon: 'globe', title: 'Exporters', body: 'Manage markets, buyers, products, pricing and shipment readiness from one place.' },
  { icon: 'package', title: 'Importers', body: 'Track sourcing, supplier follow-ups, quotes and operational handoffs without spreadsheet drift.' },
  { icon: 'repeat', title: 'Trading companies', body: 'Run buyer and supplier motion in one workspace with role-aware visibility.' },
  { icon: 'search', title: 'Sourcing teams', body: 'Capture trade-show conversations, qualify opportunities and move fast on next actions.' }
];

const integrations: Card[] = [
  { icon: 'message', title: 'WhatsApp handoffs', body: 'Share quotes and follow up where buyers already respond.' },
  { icon: 'qr', title: 'Smart vCard exchange', body: 'QR, clean contact save, Wallet actions and public reply capture from the same share card.' },
  { icon: 'scan', title: 'Smart scan', body: 'Business card, document and PDF capture for fast lead entry.' },
  { icon: 'box', title: 'Product catalog', body: 'Quote-ready products, variants, MOQ, pricing and market coverage.' },
  { icon: 'file', title: 'Export views', body: 'Commercial lists and operational views ready for team review.' },
  { icon: 'database', title: 'Secure workspace', body: 'Tenant-aware workspace foundation for client operations.' }
];

const pricing = [
  { name: 'Starter', price: '$199', users: 'Up to 5 users', body: 'For small trade teams moving from scattered tools into a structured operating flow.', features: ['Lead + pipeline management', 'Quote workflow foundation', 'vCard, QR and quick capture', 'Mobile-ready workspace', 'Guided onboarding support'], cta: 'Book starter demo', featured: false },
  { name: 'Growth', price: '$499', users: 'Up to 10 users', body: 'For teams running higher volume across markets, products, quotes and execution.', features: ['Everything in Starter', 'Advanced quote and approval flow', 'Orders / execution desk', 'Trade events workspace', 'Catalog and pricing readiness', 'Priority setup support'], cta: 'Book growth demo', featured: true },
  { name: 'Enterprise', price: 'Custom', users: 'Custom users and workflows', body: 'For multi-team trade operations with governance and custom rollout needs.', features: ['Everything in Growth', 'Custom roles and workflow setup', 'Dedicated onboarding', 'Security and audit support', 'Commercial process mapping'], cta: 'Contact sales', featured: false }
];

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const p: Record<IconName, ReactNode> = {
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" /></>,
    bridge: <><path d="M4 17c2.5-4 5.2-6 8-6s5.5 2 8 6" /><path d="M4 17h16" /><path d="M7 17v-4" /><path d="M12 17v-6" /><path d="M17 17v-4" /><path d="M5 7h14" /></>,
    scan: <><path d="M7 3H5a2 2 0 0 0-2 2v2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    quote: <><path d="M7 7h10" /><path d="M7 11h10" /><path d="M7 15h6" /><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></>,
    ship: <><path d="M3 17h18" /><path d="M6 17 4 9h16l-2 8" /><path d="M8 9V5h8v4" /><path d="M6 21c1 0 1.5-.5 2-1s1-1 2-1 1.5.5 2 1 1 1 2 1 1.5-.5 2-1 1-1 2-1 1.5.5 2 1" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20" /><path d="M12 2a15 15 0 0 0 0 20" /></>,
    package: <><path d="m21 16-9 5-9-5V8l9-5 9 5Z" /><path d="m3.3 7.5 8.7 5 8.7-5" /><path d="M12 22v-9.5" /></>,
    repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8" /><path d="M8 13h6" /></>,
    qr: <><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M14 14h2" /><path d="M18 14h2v2" /><path d="M14 18h6" /><path d="M14 20h2" /></>,
    box: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z" /><path d="M12 12 4.2 7.6" /><path d="M12 12l7.8-4.4" /><path d="M12 12v9" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;
}

function IconOrb({ name, dark = false }: { name: IconName; dark?: boolean }) {
  return <div className={dark ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-[#7de2d2]' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]'}><Icon name={name} /></div>;
}

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={light ? 'text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]' : 'text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]'}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return <div className="mx-auto max-w-3xl text-center setu-reveal"><Eyebrow light={light}>{eyebrow}</Eyebrow><h2 className={light ? 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl' : 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl'}>{title}</h2>{body ? <p className={light ? 'mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64' : 'mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600'}>{body}</p> : null}</div>;
}

function Check() {
  return <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#359F91]/12 text-[11px] font-semibold text-[#108477]">✓</span>;
}

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <section className="relative overflow-hidden bg-[#061c2e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(53,159,145,0.30),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(12,127,255,0.22),transparent_34%),linear-gradient(135deg,#061c2e_0%,#0b2e4a_60%,#061c2e_100%)]" />
          <div className="absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
            <div className="setu-reveal">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/24 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]"><Icon name="bridge" className="h-4 w-4" /> Trade Execution CRM</div>
              <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.6rem]">Bridge the gap in your business. Shore to shore.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">From first contact to final shipment, Setu Flow runs your entire trade operation in one calm, connected system.</p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row"><a href="#book-demo" className="rounded-full bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#06263f] shadow-[0_22px_60px_rgba(125,226,210,0.20)] transition hover:-translate-y-0.5">Book demo</a><a href="#platform" className="rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-center text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">Explore platform</a></div>
              <div className="mt-8 grid gap-3 text-sm text-white/62 sm:grid-cols-3">{['Built for import-export teams', 'No implementation cycles', 'Operational in days'].map((item) => <div key={item} className="flex items-center gap-2"><Check /><span>{item}</span></div>)}</div>
            </div>
            <div className="relative setu-float setu-reveal setu-delay-1"><div className="absolute -inset-8 rounded-[3rem] bg-[#359F91]/18 blur-3xl" /><div className="relative rounded-[2.5rem] border border-white/14 bg-white/10 p-3 shadow-[0_50px_150px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:rotate-[-1deg]"><div className="rounded-[2rem] border border-white/10 bg-[#eef6fb] p-2"><Image src="/marketing/dashboard-command-center.png" alt="Setu Flow command center dashboard" width={1628} height={1032} priority className="rounded-[1.55rem]" /></div><div className="absolute -left-4 bottom-8 hidden rounded-2xl border border-white/15 bg-[#061c2e]/90 p-4 shadow-2xl backdrop-blur md:block"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]">Live pipeline</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">$1.05M</p><p className="mt-1 text-xs text-white/55">weighted commercial view</p></div><div className="absolute -right-5 top-8 hidden rounded-2xl border border-[#7de2d2]/24 bg-[#06263f]/90 p-4 shadow-2xl backdrop-blur lg:block"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]">Next best action</p><p className="mt-2 text-base font-semibold">34 follow-ups due</p></div></div></div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="The problem" title="Your trade operation isn’t broken. Your tools are." body="Buyers do not lose confidence because your team lacks effort. They lose confidence when the system can’t carry a deal from conversation to shipment." /><div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">{problemCards.map(({ icon, title, body }, index) => <div key={title} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}><IconOrb name={icon} /><h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></div>)}</div></section>

        <section id="platform" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"><div className="setu-reveal"><Eyebrow>Category creation</Eyebrow><h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">This isn’t a CRM. It’s a Trade Execution System.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Generic CRMs were built for pipelines. Trade teams need execution: quotes, approvals, compliance, orders and commercial handoffs in one flow.</p><div className="mt-8 rounded-[1.6rem] border border-[#359F91]/18 bg-white p-5 shadow-[0_18px_55px_rgba(31,72,124,0.08)]"><p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[#108477]">Conversion insight</p><p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">Spreadsheets didn’t break your workflow. CRMs did.</p></div></div><div className="grid gap-4 sm:grid-cols-2 setu-reveal setu-delay-1">{categoryPoints.map(({ icon, text }) => <div key={text} className="flex items-center gap-4 rounded-[1.45rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_18px_55px_rgba(31,72,124,0.07)]"><IconOrb name={icon} /><p className="text-base font-semibold tracking-[-0.015em] text-slate-950">{text}</p></div>)}</div></div></section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="How it works" title="From chaos to execution — in one flow." body="A simple workflow makes the platform understandable in seconds: Capture → Qualify → Quote → Approve → Execute." /><div className="mx-auto mt-12 grid max-w-7xl gap-4 lg:grid-cols-5">{workflow.map(({ step, icon, title, body, image }, index) => <div key={title} className={`group rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_18px_60px_rgba(31,72,124,0.075)] transition hover:-translate-y-0.5 hover:border-[#359F91]/35 setu-reveal setu-delay-${(index % 4) + 1}`}><div className="flex items-center justify-between gap-3"><IconOrb name={icon} /><span className="rounded-full bg-[#061c2e] px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#7de2d2]">{step}</span></div><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3><p className="mt-3 min-h-[6.2rem] text-sm leading-6 text-slate-600">{body}</p><div className="mt-4 overflow-hidden rounded-[1.1rem] border border-slate-200 bg-[#eef6fb]"><Image src={image} alt={`${title} workflow view`} width={420} height={280} className="h-32 w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" /></div></div>)}</div></section>

        <section className="bg-[#061c2e] px-4 py-14 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur setu-reveal"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]">Mid-page CTA</p><h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">See how Setu Flow fits your workflow.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">Map your current lead, quote and execution process into Setu Flow.</p></div><a href="#book-demo" className="rounded-full bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">Book demo</a></div></div></section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Product showcase" title="Premium product proof, not a documentation wall." body="Four focused product billboards show the operational outcomes buyers care about most." /><div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-2">{productFrames.map(({ eyebrow, title, body, image, alt }, index) => <article key={title} className={`rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_24px_70px_rgba(31,72,124,0.085)] setu-reveal setu-delay-${(index % 4) + 1}`}><div className="relative"><div className="absolute -inset-3 rounded-[1.8rem] bg-[#359F91]/9 blur-2xl" /><div className="relative rounded-[1.6rem] border border-slate-200 bg-white p-2 shadow-[0_15px_45px_rgba(31,72,124,0.12)]"><Image src={image} alt={alt} width={1628} height={1032} className="rounded-[1.25rem]" /></div></div><div className="p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">{eyebrow}</p><h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></div></article>)}</div></section>

        <section className="overflow-hidden bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>Contact Exchange</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Turn every meeting into a saved contact and a next action.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">Setu Flow’s shareable vCard is more than a business card. Prospects can scan, save, share, request a quote, book an appointment, or send their details back into your CRM flow.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ['Smart QR opens the public card'],
                  ['Save contact as a clean vCard'],
                  ['Apple and Google Wallet actions'],
                  ['Lead capture and follow-through']
                ].map(([text]) => (
                  <div key={text} className="flex items-center gap-3 rounded-2xl border border-[#1F487C]/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_38px_rgba(31,72,124,0.06)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8fbf7] text-[#108477]">✓</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <a href="#book-demo" className="mt-8 inline-flex rounded-full bg-[#061c2e] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(6,28,46,0.18)] transition hover:-translate-y-0.5">See contact exchange in the demo →</a>
            </div>
            <div className="relative mx-auto w-full max-w-[23rem] setu-reveal setu-delay-1 sm:max-w-[26rem] lg:max-w-[28rem]">
              <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_18%,rgba(53,159,145,0.30),transparent_40%),radial-gradient(circle_at_50%_70%,rgba(12,127,255,0.18),transparent_42%)] blur-2xl" />
              <div className="relative rounded-[2.1rem] border border-white/70 bg-white/80 p-2 shadow-[0_34px_90px_rgba(6,28,46,0.24)] backdrop-blur">
                <Image src="/marketing/vcard-share-homepage-blurred.png" alt="Setu Flow shareable vCard modal with QR, save contact, share, and wallet actions" width={413} height={896} className="rounded-[1.7rem]" />
              </div>
            </div>
          </div>
        </section>

        <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Why Setu Flow wins" title="Where other CRMs stop, your operation still has work to do." body="Generic CRMs were never built for trade execution. This chart should be one of the strongest conversion assets on the page." light /><div className="mx-auto mt-12 max-w-7xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] shadow-[0_34px_100px_rgba(0,0,0,0.22)] setu-reveal"><div className="overflow-x-auto"><table className="min-w-[880px] w-full text-left text-sm"><thead><tr className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-[0.20em] text-white/45"><th className="px-5 py-5 font-semibold">What you need</th><th className="px-5 py-5 font-semibold">Excel + Email</th><th className="px-5 py-5 font-semibold">HubSpot / Zoho</th><th className="px-5 py-5 font-semibold text-[#7de2d2]">Setu Flow</th></tr></thead><tbody>{comparisonRows.map((row, index) => row[0] === 'section' ? <tr key={`${row[1]}-${index}`} className="border-b border-white/8 bg-white/[0.035]"><td colSpan={4} className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">{row[1]}</td></tr> : <tr key={`${row[0]}-${index}`} className="border-b border-white/8 transition hover:bg-white/[0.04]"><td className="px-5 py-4 font-medium text-white/92">{row[0]}</td><td className="px-5 py-4 text-white/66">{row[1]}</td><td className="px-5 py-4 text-white/66">{row[2]}</td><td className="px-5 py-4 font-semibold text-[#d6fff8]">{row[3]}</td></tr>)}</tbody></table></div></div><div className="mx-auto mt-10 max-w-3xl text-center setu-reveal"><p className="text-lg font-semibold tracking-[-0.02em]">Spreadsheets didn’t break your workflow. CRMs did.</p><a href="#book-demo" className="mt-6 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">See how this works in your workflow →</a></div></section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Proof points" title="Built for real trade operations." body="Use truthful traction-style signals now, then replace them with customer logos and live metrics as the business grows." /><div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-3">{[['15', 'active markets visible in the command center'], ['46', 'sample opportunities flowing through the workspace'], ['$1.05M', 'pipeline value shown in commercial view']].map(([value, label], index) => <div key={label} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-7 text-center shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}><p className="text-4xl font-semibold tracking-[-0.05em] text-[#06263f]">{value}</p><p className="mx-auto mt-3 max-w-[14rem] text-[11px] font-semibold uppercase leading-5 tracking-[0.16em] text-slate-500">{label}</p></div>)}</div></section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Built for" title="Teams that run trade, not just track it." body="Make buyer fit obvious before the pricing section." /><div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">{audiences.map(({ icon, title, body }, index) => <div key={title} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}><IconOrb name={icon} /><h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></div>)}</div></section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div className="setu-reveal"><Eyebrow>Mobile</Eyebrow><h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Run your trade operation anywhere.</h2><p className="mt-5 text-base leading-8 text-slate-600">Keep mobile concise: dashboard, lead queue and capture. Enough to prove field readiness without overwhelming the page.</p></div><div className="grid grid-cols-3 gap-3 sm:gap-5 setu-reveal setu-delay-1">{[['/marketing/mobile-dashboard.png', 'Mobile dashboard'], ['/marketing/mobile-leads.png', 'Mobile leads'], ['/marketing/mobile-quick-lead.png', 'Mobile quick lead capture']].map(([src, alt], index) => <div key={src} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_22px_70px_rgba(6,28,46,0.22)] setu-float-${index + 1}`}><Image src={src} alt={alt} width={390} height={844} className="rounded-[1.2rem]" /></div>)}</div></div></section>

        <section id="integrations" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Connection layer" title="Works with how your team operates today." body="This is not a generic logo wall. It highlights the real handoff points Setu Flow supports today." /><div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">{integrations.map(({ icon, title, body }, index) => <div key={title} className={`flex gap-4 rounded-[1.6rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index % 4}`}><IconOrb name={icon} /><div><h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{body}</p></div></div>)}</div></section>

        <section id="pricing" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><SectionTitle eyebrow="Pricing" title="Start in days. Not months." body="Demo-led, guided setup for serious trade teams. No implementation fee and no consulting dependency." /><div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-3">{pricing.map((plan, index) => <div key={plan.name} className={`relative overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_22px_70px_rgba(31,72,124,0.09)] setu-reveal setu-delay-${index + 1} ${plan.featured ? 'border-[#0c7fff] lg:-translate-y-3' : 'border-[#1F487C]/10'}`}>{plan.featured ? <div className="absolute right-6 top-6 rounded-full bg-[#7de2d2]/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7de2d2]">Most popular</div> : null}<div className={plan.featured ? 'bg-[#061c2e] p-7 text-white' : 'bg-white p-7 text-slate-950'}><h3 className="text-2xl font-semibold tracking-[-0.03em]">{plan.name}</h3><p className={plan.featured ? 'mt-3 min-h-[3.5rem] text-sm leading-7 text-white/68' : 'mt-3 min-h-[3.5rem] text-sm leading-7 text-slate-600'}>{plan.body}</p><div className="mt-7 flex items-end gap-2"><span className="text-5xl font-semibold tracking-[-0.06em]">{plan.price}</span>{plan.price !== 'Custom' ? <span className={plan.featured ? 'pb-2 text-sm text-white/55' : 'pb-2 text-sm text-slate-500'}>/ month</span> : null}</div><p className={plan.featured ? 'mt-2 text-sm font-medium text-white/60' : 'mt-2 text-sm font-medium text-slate-500'}>{plan.users}</p></div><div className="p-7"><ul className="space-y-3.5">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700"><Check /><span>{feature}</span></li>)}</ul><a href="#book-demo" className={plan.featured ? 'mt-8 flex rounded-2xl bg-[linear-gradient(135deg,#0c7fff,#0052cc)] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(12,127,255,0.26)] transition hover:-translate-y-0.5' : 'mt-8 flex rounded-2xl bg-[#eef3f8] px-5 py-3.5 text-center text-sm font-semibold text-[#061c2e] transition hover:-translate-y-0.5 hover:bg-[#e3edf6]'}><span className="mx-auto">{plan.cta} →</span></a></div></div>)}</div><p className="mx-auto mt-8 max-w-3xl text-center text-sm font-medium text-slate-500">All plans include onboarding support and trade workflow setup. Starter supports up to 5 users. Growth supports up to 10 users.</p></section>

        <section id="book-demo" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="setu-reveal">
              <Eyebrow>Contact</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Book a guided Setu Flow walkthrough.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Tell us about your trade workflow and we will map the demo around your lead capture, quote, approval, order, and vCard needs.</p>
              <div className="mt-6 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#eef6fb] p-5 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">Support email</p>
                <a href="mailto:help@setugroups.com" className="mt-1 inline-flex font-semibold text-[#1F487C] underline-offset-4 hover:underline">help@setugroups.com</a>
                <p className="mt-3 text-slate-600">Demo requests are delivered to admin@setugroups.com.</p>
              </div>
            </div>
            <BookDemoForm />
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#061c2e] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-24"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(53,159,145,0.26),transparent_34%),linear-gradient(135deg,#061c2e,#0b2e4a)]" /><div className="relative mx-auto max-w-4xl text-center setu-reveal"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7de2d2]">Ready to move</p><h2 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl">Run your entire trade operation in one flow.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/68">Bring capture, follow-ups, quotes, approvals and execution into the same command layer.</p><div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row"><a href="#book-demo" className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">Book demo</a><Link href="/client-login" className="rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">Enter workspace</Link></div></div></section>
      </main>
    </SiteShell>
  );
}
