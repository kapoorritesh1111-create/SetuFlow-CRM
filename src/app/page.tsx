export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';

const workflow = [
  {
    step: '01',
    title: 'Capture',
    body: 'Capture buyers, suppliers, trade show contacts, vCards and quick leads before they disappear into WhatsApp or notebooks.',
    image: '/marketing/mobile-quick-lead.png'
  },
  {
    step: '02',
    title: 'Qualify',
    body: 'Structure owner, market, product interest, source event, next action and value from the first touch.',
    image: '/marketing/follow-up-queue.png'
  },
  {
    step: '03',
    title: 'Quote',
    body: 'Move from inquiry to governed pricing, terms and quote review without rebuilding context in Excel.',
    image: '/marketing/quote-workflow.png'
  },
  {
    step: '04',
    title: 'Approve',
    body: 'Keep commercial control with approval gates before quotes and deals move too early.',
    image: '/marketing/pipeline-commercial-view.png'
  },
  {
    step: '05',
    title: 'Execute',
    body: 'Carry every accepted quote into orders, documents, blockers, dispatch and payment readiness.',
    image: '/marketing/orders-execution.png'
  }
];

const productFrames = [
  {
    eyebrow: 'Command Center',
    title: 'See everything. Miss nothing.',
    body: 'Pipeline value, market coverage, quotes in motion, blocked revenue and follow-ups surface in one command view.',
    image: '/marketing/dashboard-command-center.png',
    alt: 'Setu Flow command center dashboard with trade KPIs and market map'
  },
  {
    eyebrow: 'Follow-up Queue',
    title: 'Know exactly what needs action next.',
    body: 'Every lead carries urgency, owner, deal value, role and stage context so your team works the right accounts first.',
    image: '/marketing/follow-up-queue.png',
    alt: 'Setu Flow follow-up queue showing overdue leads and actions'
  },
  {
    eyebrow: 'Quote Workflow',
    title: 'Build, price and approve without spreadsheet drift.',
    body: 'Product, pricing, terms, review and send gates turn quoting into a repeatable commercial workflow.',
    image: '/marketing/quote-workflow.png',
    alt: 'Setu Flow quote workflow with pricing step and quote preview'
  },
  {
    eyebrow: 'Execution Desk',
    title: 'Track shipments, documents and blockers after the deal closes.',
    body: 'Orders keep the commercial context alive with execution stages, missing documents, payment state and dispatch blockers.',
    image: '/marketing/orders-execution.png',
    alt: 'Setu Flow order execution desk showing dispatch blockers and document status'
  }
];

const problemCards = [
  ['CRM ≠ execution', 'Most CRMs stop at deal tracking. Trade teams still need quote control, documents, dispatch and payment visibility.'],
  ['Quotes live outside', 'Pricing, terms, freight assumptions and approvals drift across spreadsheets, email threads and chat messages.'],
  ['Blockers appear too late', 'Compliance and document gaps usually surface when the shipment is already at risk.']
];

const audiences = [
  ['Exporters', 'Sell across markets with product, pricing, compliance and shipment complexity.'],
  ['Importers', 'Source from suppliers, compare quotes and keep every follow-up moving.'],
  ['Trading companies', 'Run buyer and supplier pipelines in one role-aware workspace.'],
  ['Sourcing teams', 'Capture, qualify and convert trade show conversations without spreadsheet drift.']
];

const comparisonRows = [
  ['section', 'Quoting'],
  ['FOB/CIF/Ex-Factory pricing basis', 'Manual calc', 'Custom field only', 'Native — auto-calc per basis'],
  ['Live FX + locked rate quoting', 'Manual lookup', 'Not present', 'FX locked at quote time, auto-applied'],
  ['Freight estimate per port/container', 'Separate sheet', 'Not present', 'Port freight profiles, auto-populated'],
  ['Quote versioning with approval gate', 'File versions', 'Workflow add-on', 'Lifecycle states + approval handoff'],
  ['WhatsApp quote delivery', 'Copy-paste link', 'Not present', 'One-tap send from mobile'],
  ['section', 'Lead management'],
  ['Business card OCR → lead in 30s', 'Manual entry', '3rd-party scan app', 'In-app OCR + vCard + QR, mobile-native'],
  ['Trade show batch capture with source context', 'Spreadsheet', 'Campaign tag', 'Event name + date inherited per entry'],
  ['Stage move readiness', 'Free-move', 'Not present', 'Blocks move until conditions are met'],
  ['Buyer + Supplier in one workspace', 'Separate sheets', 'Single pipeline', 'Role-aware dual view, one workspace'],
  ['section', 'Compliance + execution'],
  ['Country compliance checklist by destination', 'Manual tracking', 'External tool', 'Driven by product + destination'],
  ['Certificate expiry tracking', 'Calendar reminder', 'Not present', 'Flagged before it blocks shipment'],
  ['Mobile app', 'Not applicable', 'Desktop shrink', 'Native mobile workflow, field-ready'],
  ['Time to get a 10-person team operational', 'Ongoing chaos', '2–4 weeks', '<5 days · guided setup · no consulting cycle']
];

const integrations = [
  ['WhatsApp', 'Quote sharing and follow-up handoff where buyers already respond.'],
  ['vCard + QR', 'Digital card sharing, save-contact flows and public capture paths.'],
  ['Smart scan', 'Business card, document and PDF capture for fast lead entry.'],
  ['Product catalog', 'Quote-ready products, variants, MOQ, pricing and market coverage.'],
  ['Export views', 'Operational lists and commercial views ready for team review.'],
  ['Supabase workspace', 'Secure tenant-aware workspace foundation for client operations.']
];

const pricing = [
  {
    name: 'Starter',
    price: '$199',
    users: 'Up to 5 users',
    body: 'For small trade teams moving off spreadsheets into a structured operating flow.',
    features: ['Lead + pipeline management', 'Quote workflow foundation', 'vCard, QR and quick capture', 'Mobile-ready workspace', 'Guided onboarding support'],
    cta: 'Book starter demo',
    featured: false
  },
  {
    name: 'Growth',
    price: '$499',
    users: 'Up to 10 users',
    body: 'For teams running higher volume across markets, products, quotes and execution.',
    features: ['Everything in Starter', 'Advanced quote and approval flow', 'Orders / execution desk', 'Trade events workspace', 'Catalog and pricing readiness', 'Priority setup support'],
    cta: 'Book growth demo',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    users: 'Custom users and workflows',
    body: 'For multi-team trade operations with advanced governance and custom rollout needs.',
    features: ['Everything in Growth', 'Custom roles and workflow setup', 'Dedicated onboarding', 'Security and audit support', 'Custom commercial process mapping'],
    cta: 'Contact sales',
    featured: false
  }
];

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={light ? 'text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]' : 'text-xs font-black uppercase tracking-[0.28em] text-[#359F91]'}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center setu-reveal">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={light ? 'mt-4 text-3xl font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-5xl' : 'mt-4 text-3xl font-black leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-5xl'}>{title}</h2>
      {body ? <p className={light ? 'mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65' : 'mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600'}>{body}</p> : null}
    </div>
  );
}

function MiniIcon({ label }: { label: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7de2d2]/30 bg-[#7de2d2]/10 text-xs font-black tracking-widest text-[#359F91] shadow-[0_16px_45px_rgba(53,159,145,0.16)]">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Check() {
  return <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#359F91]/12 text-xs font-black text-[#108477]">✓</span>;
}

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white">
        <section className="relative overflow-hidden bg-[#061c2e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(53,159,145,0.34),transparent_28%),radial-gradient(circle_at_90%_4%,rgba(12,127,255,0.22),transparent_32%),linear-gradient(135deg,#061c2e_0%,#0b2e4a_58%,#061c2e_100%)]" />
          <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
            <div className="setu-reveal">
              <div className="inline-flex items-center rounded-full border border-[#7de2d2]/25 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">
                Trade Execution CRM
              </div>
              <h1 className="mt-7 text-5xl font-black leading-[0.93] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                Bridge the gap in your business. Shore to shore.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/72 sm:text-xl">
                From first contact to final shipment — Setu Flow runs your entire trade operation in one system.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-8 py-4 text-center text-sm font-black text-[#06263f] shadow-[0_22px_60px_rgba(125,226,210,0.22)] transition hover:-translate-y-1 hover:shadow-[0_32px_80px_rgba(125,226,210,0.26)]">Book demo</a>
                <a href="#platform" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-center text-sm font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">Explore platform</a>
              </div>
              <div className="mt-8 flex flex-col gap-3 text-sm font-semibold text-white/60 sm:flex-row sm:flex-wrap sm:gap-5">
                <span>✓ Built for import-export teams</span>
                <span>✓ No implementation cycles</span>
                <span>✓ Operational in days</span>
              </div>
            </div>

            <div className="relative setu-float setu-reveal setu-delay-1">
              <div className="absolute -inset-8 rounded-[3.5rem] bg-[#359F91]/20 blur-3xl" />
              <div className="relative rounded-[3rem] border border-white/15 bg-white/10 p-3 shadow-[0_50px_150px_rgba(0,0,0,0.48)] backdrop-blur-xl lg:rotate-[-1.5deg]">
                <div className="rounded-[2.4rem] border border-white/10 bg-[#eef6fb] p-2">
                  <Image src="/marketing/dashboard-command-center.png" alt="Setu Flow command center dashboard" width={1628} height={1032} priority className="rounded-[2rem]" />
                </div>
                <div className="absolute -left-4 bottom-8 hidden rounded-3xl border border-white/15 bg-[#061c2e]/92 p-5 shadow-2xl backdrop-blur md:block">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Live pipeline</p>
                  <p className="mt-2 text-3xl font-black">$1.05M</p>
                  <p className="mt-1 text-xs text-white/55">weighted commercial view</p>
                </div>
                <div className="absolute -right-5 top-8 hidden rounded-3xl border border-[#7de2d2]/25 bg-[#06263f]/92 p-5 shadow-2xl backdrop-blur lg:block">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Next best action</p>
                  <p className="mt-2 text-lg font-black">34 follow-ups due</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="The problem" title="Your trade operation isn’t broken. Your tools are." body="Buyers do not lose confidence because your team lacks effort. They lose confidence when the system can’t carry a deal from conversation to shipment." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
            {problemCards.map(([title, body], index) => (
              <div key={title} className={`rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-7 shadow-[0_22px_70px_rgba(31,72,124,0.08)] setu-reveal setu-delay-${index + 1}`}>
                <MiniIcon label={title} />
                <h3 className="mt-6 text-2xl font-black tracking-[-0.045em] text-slate-950">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>Category creation</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-5xl">This isn’t a CRM. It’s a Trade Execution System.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">Generic CRMs were built for pipelines. Trade teams need execution — quotes, approvals, compliance, orders and commercial handoffs in one flow.</p>
              <div className="mt-8 rounded-[2rem] border border-[#359F91]/20 bg-white p-6 shadow-[0_20px_70px_rgba(31,72,124,0.10)]">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#359F91]">Conversion insight</p>
                <p className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950">Spreadsheets didn’t break your workflow. CRMs did.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 setu-reveal setu-delay-1">
              {['Capture buyer/supplier context', 'Govern quote readiness', 'Control approval handoffs', 'Execute with blockers visible'].map((item) => (
                <div key={item} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_22px_70px_rgba(31,72,124,0.08)]">
                  <Check />
                  <p className="mt-5 text-lg font-black tracking-[-0.035em] text-slate-950">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="How it works" title="From chaos to execution — in one flow." body="A simple workflow makes the platform understandable in seconds: Capture → Qualify → Quote → Approve → Execute." />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 lg:grid-cols-5">
            {workflow.map(({ step, title, body, image }, index) => (
              <div key={title} className={`group rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_22px_80px_rgba(31,72,124,0.09)] transition hover:-translate-y-1 hover:border-[#359F91]/40 setu-reveal setu-delay-${(index % 4) + 1}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06263f] text-sm font-black text-[#7de2d2] shadow-lg">{step}</div>
                <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-[#eef6fb]">
                  <Image src={image} alt={`${title} workflow view`} width={420} height={280} className="h-36 w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.22)] backdrop-blur lg:p-10 setu-reveal">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7de2d2]">Mid-page CTA</p>
                <h3 className="mt-3 text-3xl font-black tracking-[-0.045em]">See how Setu Flow fits your workflow.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">Use the demo to map your current lead, quote and execution process into Setu Flow.</p>
              </div>
              <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">Book demo</a>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Product showcase" title="Premium product proof, not a documentation wall." body="Four focused product billboards show the operational outcomes buyers care about most." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-2">
            {productFrames.map(({ eyebrow, title, body, image, alt }, index) => (
              <article key={title} className={`rounded-[2.75rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_28px_90px_rgba(31,72,124,0.10)] setu-reveal setu-delay-${(index % 4) + 1}`}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[2.3rem] bg-[#359F91]/10 blur-2xl" />
                  <div className="relative rounded-[2.2rem] border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(31,72,124,0.16)]">
                    <Image src={image} alt={alt} width={1628} height={1032} className="rounded-[1.8rem]" />
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#359F91]">{eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Why Setu Flow wins" title="Where other CRMs stop, your operation still has work to do." body="The comparison chart is a conversion asset. It should be bold, high-contrast and easy to scan." light />
          <div className="mx-auto mt-12 max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_40px_120px_rgba(0,0,0,0.24)] setu-reveal">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-[0.22em] text-white/45">
                    <th className="px-5 py-5 font-black">What you need</th>
                    <th className="px-5 py-5 font-black">Excel + Email</th>
                    <th className="px-5 py-5 font-black">HubSpot / Zoho</th>
                    <th className="px-5 py-5 font-black text-[#7de2d2]">Setu Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => row[0] === 'section' ? (
                    <tr key={`${row[1]}-${index}`} className="border-b border-white/8 bg-white/[0.035]">
                      <td colSpan={4} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white/30">{row[1]}</td>
                    </tr>
                  ) : (
                    <tr key={`${row[0]}-${index}`} className="border-b border-white/8 transition hover:bg-white/[0.04]">
                      <td className="px-5 py-4 font-semibold text-white/92">{row[0]}</td>
                      <td className="px-5 py-4 text-white/68">{row[1]}</td>
                      <td className="px-5 py-4 text-white/68">{row[2]}</td>
                      <td className="px-5 py-4 font-black text-[#d6fff8]">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-3xl text-center setu-reveal">
            <p className="text-lg font-black tracking-[-0.02em]">Generic CRMs were never built for trade execution.</p>
            <a href="mailto:hello@setuflowcrm.com" className="mt-6 inline-flex rounded-full bg-white px-8 py-4 text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">See how this works in your workflow →</a>
          </div>
        </section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Proof points" title="Built for real trade operations." body="Use truthful traction-style signals now, then replace them with customer logos and live metrics as the business grows." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ['15', 'active markets visible in the command center'],
              ['46', 'sample opportunities flowing through the workspace'],
              ['$1.05M', 'pipeline value shown in commercial view']
            ].map(([value, label], index) => (
              <div key={label} className={`rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 text-center shadow-[0_22px_70px_rgba(31,72,124,0.08)] setu-reveal setu-delay-${index + 1}`}>
                <p className="text-5xl font-black tracking-[-0.06em] text-[#06263f]">{value}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Built for" title="Teams that run trade, not just track it." body="Make buyer fit obvious before the pricing section." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audiences.map(([title, body], index) => (
              <div key={title} className={`rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_65px_rgba(31,72,124,0.08)] setu-reveal setu-delay-${index + 1}`}>
                <MiniIcon label={title} />
                <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>Mobile</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-5xl">Run your trade operation anywhere.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Keep mobile concise: dashboard, lead queue and capture. Enough to prove field readiness without overwhelming the page.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-5 setu-reveal setu-delay-1">
              {[
                ['/marketing/mobile-dashboard.png', 'Mobile dashboard'],
                ['/marketing/mobile-leads.png', 'Mobile leads'],
                ['/marketing/mobile-quick-lead.png', 'Mobile quick lead capture']
              ].map(([src, alt], index) => (
                <div key={src} className={`rounded-[2rem] border border-[#1F487C]/10 bg-[#061c2e] p-2 shadow-[0_25px_80px_rgba(6,28,46,0.24)] setu-float-${index + 1}`}>
                  <Image src={src} alt={alt} width={390} height={844} className="rounded-[1.55rem]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="integrations" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Connection layer" title="Works with how your team operates today." body="This is not a generic logo wall. It highlights the real handoff points Setu Flow supports today." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(([title, body], index) => (
              <div key={title} className={`rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_65px_rgba(31,72,124,0.08)] setu-reveal setu-delay-${index % 4}`}>
                <MiniIcon label={title} />
                <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Pricing" title="Start in days. Not months." body="Demo-led, guided setup for serious trade teams. No implementation fee and no consulting dependency." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-3">
            {pricing.map((plan, index) => (
              <div key={plan.name} className={`relative overflow-hidden rounded-[2rem] border bg-white shadow-[0_25px_80px_rgba(31,72,124,0.10)] setu-reveal setu-delay-${index + 1} ${plan.featured ? 'border-[#0c7fff] lg:-translate-y-4' : 'border-[#1F487C]/10'}`}>
                {plan.featured ? <div className="absolute right-6 top-6 rounded-full bg-[#7de2d2]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#7de2d2]">Most popular</div> : null}
                <div className={plan.featured ? 'bg-[#061c2e] p-7 text-white' : 'bg-white p-7 text-slate-950'}>
                  <h3 className="text-2xl font-black tracking-[-0.04em]">{plan.name}</h3>
                  <p className={plan.featured ? 'mt-3 min-h-[3.5rem] text-sm leading-7 text-white/68' : 'mt-3 min-h-[3.5rem] text-sm leading-7 text-slate-600'}>{plan.body}</p>
                  <div className="mt-7 flex items-end gap-2">
                    <span className="text-5xl font-black tracking-[-0.07em]">{plan.price}</span>
                    {plan.price !== 'Custom' ? <span className={plan.featured ? 'pb-2 text-sm text-white/55' : 'pb-2 text-sm text-slate-500'}>/ month</span> : null}
                  </div>
                  <p className={plan.featured ? 'mt-2 text-sm font-bold text-white/60' : 'mt-2 text-sm font-bold text-slate-500'}>{plan.users}</p>
                </div>
                <div className="p-7">
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm font-semibold text-slate-700"><Check />{feature}</li>
                    ))}
                  </ul>
                  <a href="mailto:hello@setuflowcrm.com" className={plan.featured ? 'mt-8 flex rounded-2xl bg-[linear-gradient(135deg,#0c7fff,#0052cc)] px-5 py-4 text-center text-sm font-black text-white shadow-[0_16px_40px_rgba(12,127,255,0.28)] transition hover:-translate-y-1' : 'mt-8 flex rounded-2xl bg-[#eef3f8] px-5 py-4 text-center text-sm font-black text-[#061c2e] transition hover:-translate-y-1 hover:bg-[#e3edf6]'}>
                    <span className="mx-auto">{plan.cta} →</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm font-semibold text-slate-500">All plans include onboarding support and trade workflow setup. Starter supports up to 5 users. Growth supports up to 10 users.</p>
        </section>

        <section className="relative overflow-hidden bg-[#061c2e] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(53,159,145,0.28),transparent_34%),linear-gradient(135deg,#061c2e,#0b2e4a)]" />
          <div className="relative mx-auto max-w-4xl text-center setu-reveal">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]">Ready to move</p>
            <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.06em] sm:text-6xl">Run your entire trade operation in one flow.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/68">Bring capture, follow-ups, quotes, approvals and execution into the same command layer.</p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-8 py-4 text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">Book demo</a>
              <Link href="/client-login" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">Enter workspace</Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
