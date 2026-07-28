import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  Check,
  ClipboardCheck,
  Factory,
  FileCheck2,
  Globe2,
  PackageCheck,
  ScanLine,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Target,
  Users,
  Warehouse,
} from 'lucide-react';
import { SiteShell } from './site-shell';

const layers = [
  {
    number: '01',
    title: 'Growth Intelligence',
    body: 'Find the right markets, companies and opportunities before pipeline work begins.',
    points: ['ICP Builder', 'Market Intelligence', 'Opportunity Finder'],
    icon: Target,
  },
  {
    number: '02',
    title: 'Trade CRM',
    body: 'Manage buyers, suppliers and follow-ups with complete trade context.',
    points: ['Buyer & Supplier 360°', 'Activities & Follow-ups', 'Requirements'],
    icon: Users,
  },
  {
    number: '03',
    title: 'Commercial Operations',
    body: 'Control quotations, pricing, versions, terms and approvals.',
    points: ['Product Catalog', 'Price Lists & Currency', 'Quote Versions'],
    icon: ClipboardCheck,
  },
  {
    number: '04',
    title: 'Trade Execution',
    body: 'Move approved business into orders, documents, fulfilment and dispatch.',
    points: ['Order Management', 'Documents & Compliance', 'Dispatch Tracking'],
    icon: PackageCheck,
  },
  {
    number: '05',
    title: 'Intelligence & Control',
    body: 'Use AI and reporting to guide priorities, surface risk and improve performance.',
    points: ['Setu Guru AI', 'Analytics & Reports', 'Alerts & Audit Trail'],
    icon: Sparkles,
  },
];

const journey = [
  { title: 'Discover', body: 'Markets and opportunities', icon: Search },
  { title: 'Capture', body: 'Leads, vCards and events', icon: ScanLine },
  { title: 'Convert', body: 'Qualification and fit', icon: Target },
  { title: 'Quote', body: 'Products, price and terms', icon: FileCheck2 },
  { title: 'Approve', body: 'Internal and buyer gates', icon: ShieldCheck },
  { title: 'Execute', body: 'Orders and operations', icon: PackageCheck },
  { title: 'Dispatch', body: 'Documents and fulfilment', icon: Boxes },
  { title: 'Grow', body: 'Analytics and learning', icon: BarChart3 },
];

const industries = [
  {
    title: 'Exporters',
    image: '/marketing/industries/exporters.svg',
    body: 'Run buyer development, export quotations, compliance, orders and shipment readiness in one flow.',
    icon: Globe2,
  },
  {
    title: 'Importers & Sourcing',
    image: '/marketing/industries/importers-sourcing.svg',
    body: 'Research suppliers, compare commercial terms, control documents and move sourcing decisions into orders.',
    icon: Search,
  },
  {
    title: 'Apparel',
    image: '/marketing/industries/apparel.svg',
    body: 'Connect styles, samples, costing, production milestones, compliance and shipment readiness.',
    icon: Shirt,
  },
  {
    title: 'Packaging',
    image: '/marketing/industries/packaging.svg',
    body: 'Manage specifications, costing, artwork, proofs, production stages, dispatch and repeat orders.',
    icon: Boxes,
  },
  {
    title: 'Manufacturing',
    image: '/marketing/industries/manufacturing.svg',
    body: 'Move enquiries through quotation, operational handoff, production, quality and delivery.',
    icon: Factory,
  },
  {
    title: 'Distribution',
    image: '/marketing/industries/distribution.svg',
    body: 'Manage accounts, territories, price lists, supplier coordination, fulfilment and repeat business.',
    icon: Warehouse,
  },
];

const compareRows = [
  ['Opportunity management', 'Sales pipeline', 'Growth Center, market research and pipeline intelligence'],
  ['Buyer and supplier context', 'Contacts and activities', 'Complete commercial, product, requirement and relationship context'],
  ['Quotations', 'Basic quoting or add-on CPQ', 'Products, currencies, Incoterms, versions, terms and approvals'],
  ['Documents and compliance', 'Attachments', 'Required, missing, expiring and approved readiness'],
  ['Orders', 'Closed-won handoff', 'Connected quote-to-order execution with the same record'],
  ['Operations', 'External system', 'Built-in operational handoff, tasks and execution workspaces'],
  ['Production and dispatch', 'Not included', 'Industry-specific production, fulfilment and dispatch workflows'],
  ['AI and analytics', 'Generic sales assistant', 'Setu Guru with market, relationship, quote, document and order context'],
];

function Page({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white text-slate-950">{children}</main></SiteShell>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${light ? 'text-teal-200' : 'text-teal-700'}`}>{children}</p>;
}

function Button({ href, children, secondary = false, dark = false }: { href: string; children: ReactNode; secondary?: boolean; dark?: boolean }) {
  const styles = dark
    ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
    : secondary
      ? 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
      : 'bg-teal-600 text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] hover:bg-teal-700';
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${styles}`}>{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function SectionHeading({ eyebrow, title, body, light = false, left = false }: { eyebrow: string; title: ReactNode; body: string; light?: boolean; left?: boolean }) {
  return (
    <div className={`${left ? '' : 'mx-auto text-center'} max-w-3xl`}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={`mt-3 text-3xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      <p className={`mt-4 text-base leading-7 ${light ? 'text-white/65' : 'text-slate-600'}`}>{body}</p>
    </div>
  );
}

function Hero({ eyebrow, title, accent, body, children }: { eyebrow: string; title: string; accent?: string; body: string; children?: ReactNode }) {
  return (
    <section className="relative px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div>
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[.98] tracking-[-0.055em] sm:text-[4rem]">{title} {accent && <span className="text-teal-300">{accent}</span>}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">{body}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/compare" dark>Compare Setu Flow</Button></div>
        </div>
        {children}
      </div>
    </section>
  );
}

function JourneyRail() {
  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="The commercial spine" title="One record. Nothing re-entered between stages." body="Customer, product, pricing, document and communication context moves forward with the transaction." />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {journey.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_10px_28px_rgba(15,23,42,.04)]">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-teal-600 text-white"><step.icon className="h-4.5 w-4.5" /></span>
              <p className="mt-3 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{step.body}</p>
              {index < journey.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-teal-500 lg:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LayersArchitecture() {
  return (
    <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading light eyebrow="The Trade Execution OS" title="Five connected layers. One platform that runs trade." body="From market discovery to dispatch, every workflow sits inside one connected operating system instead of separate tools." />
        <div className="relative mt-12 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
          <div className="absolute left-[10%] right-[10%] top-[3.9rem] hidden h-px bg-gradient-to-r from-teal-400/20 via-teal-300/80 to-teal-400/20 lg:block" />
          <div className="grid lg:grid-cols-5">
            {layers.map((layer, index) => (
              <article key={layer.title} className={`relative p-6 lg:min-h-[23rem] ${index < layers.length - 1 ? 'border-b border-white/10 lg:border-b-0 lg:border-r' : ''}`}>
                <div className="relative z-10 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200"><layer.icon className="h-5 w-5" /></span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-300/40 bg-slate-950 text-[11px] font-bold text-teal-200">{layer.number}</span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">{layer.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{layer.body}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {layer.points.map((point) => <span key={point} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/75">{point}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-teal-300/15 bg-teal-300/[0.07] px-5 py-4 text-center text-sm font-medium text-teal-50"><Check className="h-4 w-4 shrink-0 text-teal-300" />One connected system from opportunity to dispatch — without re-entering the same information across tools.</div>
      </div>
    </section>
  );
}

function FinalCTA({ title = 'Ready to run your trade workflow on one platform?', body = 'See Setu Flow mapped to your buyers, suppliers, quotations, documents, orders and execution process.' }: { title?: string; body?: string }) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-7 rounded-[28px] bg-[linear-gradient(135deg,#eaf8f6_0%,#edf4ff_100%)] px-7 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div><Eyebrow>Product walkthrough</Eyebrow><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">{title}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{body}</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" secondary>Explore Platform</Button></div>
      </div>
    </section>
  );
}

export function TradeExecutionPlatformPage() {
  return (
    <Page>
      <Hero eyebrow="Platform" title="One operating system for" accent="trade execution." body="Setu Flow connects growth intelligence, buyer and supplier CRM, commercial operations, documents, orders and dispatch in the sequence international trade teams actually work.">
        <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white p-2 shadow-[0_30px_100px_rgba(0,0,0,.3)]"><Image src="/marketing/dashboard-command-center.png" alt="Setu Flow Trade Execution OS command center" width={1800} height={1050} priority className="h-auto w-full rounded-[22px] object-cover object-top" /></div>
      </Hero>
      <JourneyRail />
      <LayersArchitecture />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Connected operations" title="The system keeps moving after the quote is accepted." body="The same customer, product, pricing and approval context carries into documents, orders, fulfilment and dispatch readiness." />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              { icon: ClipboardCheck, title: 'Commercial control', body: 'Products, currencies, Incoterms, quote versions, buyer requirements and approvals stay connected.' },
              { icon: PackageCheck, title: 'Operational execution', body: 'Approved quotes become orders with documents, tasks, fulfilment milestones and dispatch readiness.' },
              { icon: Sparkles, title: 'Intelligence across the record', body: 'Setu Guru and analytics surface what needs attention across growth, commercial work and execution.' },
            ].map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><item.icon className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p></article>)}
          </div>
        </div>
      </section>
      <FinalCTA />
    </Page>
  );
}

export function TradeExecutionSolutionsPage() {
  return (
    <Page>
      <Hero eyebrow="Industry execution workspaces" title="One Trade Execution OS." accent="Configured for your industry." body="Setu Flow provides one connected international trade foundation while adapting specifications, approvals, production stages and handoffs to how each business operates.">
        <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur sm:grid-cols-3">
          {industries.map((industry) => <div key={industry.title} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center"><industry.icon className="mx-auto h-6 w-6 text-teal-200" /><p className="mt-2 text-xs font-semibold text-white">{industry.title}</p></div>)}
        </div>
      </Hero>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Built for every trade business" title="Shared platform. Purpose-built execution workflows." body="Every industry receives the same connected growth, CRM, commercial and execution foundation — with the workflow details that make the business unique." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => <article key={industry.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.05)]"><Image src={industry.image} alt={`${industry.title} Trade Execution OS`} width={960} height={540} className="aspect-[16/9] w-full object-cover" /><div className="p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><industry.icon className="h-4.5 w-4.5" /></span><h3 className="text-xl font-semibold">{industry.title}</h3></div><p className="mt-4 text-sm leading-6 text-slate-600">{industry.body}</p></div></article>)}
          </div>
        </div>
      </section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
          <div><Eyebrow>One platform, not six products</Eyebrow><h2 className="mt-3 text-4xl font-medium leading-tight tracking-[-0.04em]">Industry depth without creating disconnected systems.</h2><p className="mt-5 text-base leading-7 text-slate-600">Buyer, supplier, product, quote, document and order records remain on the same platform. Each vertical adds surfaces and workflow logic rather than creating a separate database or operating model.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">{['Shared customer and supplier records', 'Shared product, quote and order foundation', 'Vertical specifications and approvals', 'Industry production and fulfilment stages'].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{item}</div>)}</div>
        </div>
      </section>
      <FinalCTA title="See Setu Flow configured around your industry." body="We will map your current commercial and operational workflow and show where Setu Flow replaces disconnected tools and handoffs." />
    </Page>
  );
}

export function TradeExecutionGuruPage() {
  return (
    <Page>
      <Hero eyebrow="The intelligence layer of the Trade Execution OS" title="Setu Guru understands" accent="what should happen next." body="Setu Guru works across markets, buyers, suppliers, quotations, documents and orders. It explains priorities, prepares work and surfaces risk while keeping people in control.">
        <div className="rounded-[28px] border border-white/15 bg-white/[0.07] p-6 backdrop-blur">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5"><Image src="/setu-guru/guru-avatar-256.png" alt="Setu Guru" width={84} height={84} className="h-20 w-20 object-contain" /><div><p className="text-2xl font-semibold">Setu Guru</p><p className="mt-1 text-sm text-teal-200">Trade intelligence with operator approval</p></div></div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/80">What needs my attention today?</div>
          <div className="mt-3 rounded-2xl border border-teal-300/20 bg-teal-300/10 p-5"><p className="font-semibold text-white">Three priorities found</p><ul className="mt-3 space-y-2 text-sm text-white/70"><li>• Two quotes are waiting for buyer follow-up.</li><li>• One order is missing required documents.</li><li>• A target-market opportunity matches your current ICP.</li></ul></div>
        </div>
      </Hero>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="One intelligence layer" title="Support across growth, commercial work and execution." body="Setu Guru uses the context already inside Setu Flow instead of asking users to copy information into a separate chatbot." />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              { icon: Search, title: 'Growth intelligence', body: 'Research markets, assess opportunity fit, summarize companies and prioritize target accounts.', prompts: ['Which markets fit this product?', 'Why is this company relevant?', 'Which opportunity should we research first?'] },
              { icon: ClipboardCheck, title: 'Commercial intelligence', body: 'Prepare outreach, summarize relationships, review quotations and identify missing commercial information.', prompts: ['Draft the next buyer follow-up.', 'What is missing before we quote?', 'Summarize this account before my meeting.'] },
              { icon: PackageCheck, title: 'Execution intelligence', body: 'Surface document gaps, overdue actions, order risk, fulfilment blockers and dispatch priorities.', prompts: ['What is blocking this order?', 'Which documents are missing?', 'What should operations prioritize today?'] },
            ].map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><item.icon className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p><div className="mt-5 space-y-2">{item.prompts.map((prompt) => <div key={prompt} className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">“{prompt}”</div>)}</div></article>)}
          </div>
        </div>
      </section>
      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:items-center">
          <div><Eyebrow light>Human control</Eyebrow><h2 className="mt-3 text-4xl font-medium tracking-[-0.04em]">Setu Guru recommends. Your team decides.</h2><p className="mt-5 text-base leading-7 text-white/65">Setu Guru can draft, summarize, flag and recommend. It does not send customer messages, approve commercial terms or move operational stages without a person reviewing the action.</p></div>
          <div className="grid gap-3">{['Drafts remain drafts until approved', 'Recommendations include business context', 'Risk alerts point to the underlying record', 'Actions and approvals remain auditable'].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-medium text-white/80"><ShieldCheck className="h-5 w-5 shrink-0 text-teal-300" />{item}</div>)}</div>
        </div>
      </section>
      <FinalCTA title="See Setu Guru work inside your trade workflow." body="Bring a real buyer, supplier, quote or order scenario and see how Setu Guru supports the next decision without taking control away from your team." />
    </Page>
  );
}

export function TradeExecutionComparePage() {
  return (
    <Page>
      <Hero eyebrow="Compare" title="A CRM tracks the deal." accent="Setu Flow executes the trade." body="Generic CRMs are designed around sales activity. Setu Flow carries the same record from market discovery through commercial approval, documents, orders, fulfilment and dispatch.">
        <div className="rounded-[28px] border border-white/15 bg-white/[0.07] p-6 backdrop-blur"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200">The difference</p><div className="mt-5 space-y-4">{['CRM: manage the relationship', 'Setu Flow: manage the relationship and the work required to complete the trade', 'Result: fewer handoffs, less re-entry and more execution visibility'].map((item, index) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-xs font-bold text-teal-200">{index + 1}</span><p className="text-sm leading-6 text-white/75">{item}</p></div>)}</div></div>
      </Hero>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Capability comparison" title="The difference appears after the sales activity begins." body="Setu Flow combines CRM capabilities with the commercial and operational workflow required to move international business forward." />
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_56px_rgba(15,23,42,.06)]"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead><tr className="bg-slate-950 text-[11px] uppercase tracking-[.14em] text-white/50"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-200">Setu Flow — Trade Execution OS</th></tr></thead><tbody>{compareRows.map((row) => <tr key={row[0]} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold text-slate-950">{row[0]}</td><td className="px-5 py-4 text-slate-500">{row[1]}</td><td className="px-5 py-4 font-medium text-teal-800">{row[2]}</td></tr>)}</tbody></table></div></div>
        </div>
      </section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Why teams change" title="Replace the gaps between sales and operations." body="The biggest cost is often not the CRM itself. It is the spreadsheets, inboxes, folders and manual status chasing required after the CRM stops." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[
            { icon: ClipboardCheck, title: 'Less re-entry', body: 'Commercial context moves into execution without rebuilding the record.' },
            { icon: BellRing, title: 'Earlier risk visibility', body: 'Missing documents, overdue actions and blocked orders appear before they become emergencies.' },
            { icon: Users, title: 'Shared accountability', body: 'Commercial, operations and leadership teams work from the same status and history.' },
            { icon: BarChart3, title: 'End-to-end intelligence', body: 'Analytics show which markets, activities, quotes and execution stages create results.' },
          ].map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><item.icon className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p></article>)}</div>
        </div>
      </section>
      <FinalCTA title="Compare Setu Flow against your current stack." body="Show us how your team currently uses CRM, spreadsheets, email, folders and operational trackers. We will map where one connected Trade Execution OS replaces the handoffs." />
    </Page>
  );
}
