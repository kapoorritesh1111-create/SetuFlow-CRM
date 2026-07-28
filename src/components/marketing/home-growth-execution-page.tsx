import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  Box,
  Building2,
  Check,
  FileCheck2,
  Globe2,
  PackageCheck,
  Search,
  Shirt,
  Sparkles,
  Target,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { SiteShell } from './site-shell';

const journey = [
  { title: 'Discover', body: 'Find suitable markets and companies.', note: 'Growth Center', icon: Search },
  { title: 'Capture', body: 'Bring enquiries and contacts into one system.', note: 'vCard, QR, Events', icon: Users },
  { title: 'Convert', body: 'Keep relationships and opportunities moving.', note: 'CRM, Pipeline', icon: Target },
  { title: 'Quote', body: 'Prepare controlled commercial offers.', note: 'Products, Pricing, Incoterms', icon: FileCheck2 },
  { title: 'Execute', body: 'Move accepted business toward fulfilment.', note: 'Documents, Orders, Payments', icon: PackageCheck },
  { title: 'Grow', body: 'Learn what is producing results.', note: 'Analytics, Setu Guru', icon: BarChart3 },
];

const industries = [
  { title: 'Apparel', body: 'Manage buyers, styles, samples, quotations, suppliers, production milestones, compliance and shipment readiness.', icon: Shirt },
  { title: 'Packaging', body: 'Manage requirements, substrates, dimensions, print, artwork, costing, samples, approvals and repeat orders.', icon: Box },
  { title: 'Distribution', body: 'Manage brands, suppliers, territories, customers, price lists, product demand and repeat purchases.', icon: Warehouse },
  { title: 'Manufacturing', body: 'Connect capabilities, certifications, products, target markets, customer requirements and fulfilment.', icon: Building2 },
  { title: 'Import & Sourcing', body: 'Research suppliers, request costs, compare terms, verify documents and manage approvals.', icon: Globe2 },
  { title: 'Exporters', body: 'Manage international buyers, quotations, documents, orders and dispatch without losing visibility.', icon: Truck },
];

const painPoints = [
  { title: 'The right buyers are difficult to find.', body: 'Market research, company lists and online searches rarely become a structured pipeline.', icon: Search },
  { title: 'Trade-show leads disappear after the event.', body: 'Capture source, product interest, owner, notes and next action while the opportunity is still warm.', icon: Users },
  { title: 'Pricing, versions and commercial terms drift.', body: 'Keep products, currencies, Incoterms, validity, approvals and quote history in one workflow.', icon: FileCheck2 },
  { title: 'Execution gaps appear after the order is moving.', body: 'Identify missing documents, approval gaps, payment risk and dispatch blockers before fulfilment is delayed.', icon: PackageCheck },
];

const clientLogos = [
  { src: '/clients/blue-orbit-international.jpg', alt: 'Blue Orbit International', width: 160, height: 36 },
  { src: '/clients/avanti-foods.png', alt: 'Avanti Foods', width: 76, height: 52 },
  { src: '/clients/wholesome-food.png', alt: 'Wholesome Food', width: 140, height: 48 },
  { src: '/clients/ash-and-noir.png', alt: 'Ash and Noir', width: 118, height: 42, dark: true },
];

const compareRows = [
  ['Market discovery', 'Manual web research and disconnected lists', 'Usually needs prospecting integrations', 'Growth Center connects ICPs, research, opportunities and CRM intake'],
  ['Buyer and supplier context', 'Separate spreadsheets and notes', 'Standard contact records', 'Trade-fit context across products, markets and commercial profiles'],
  ['Trade events', 'Lists and delayed follow-up', 'Imported contacts or campaigns', 'Event intake, product interest, ownership and next action'],
  ['Quote management', 'Spreadsheet versions and attachments', 'CPQ add-on or custom objects', 'Products, currencies, Incoterms, terms, approvals and history'],
  ['Document readiness', 'Shared folders and email chasing', 'Attachment storage', 'Required, missing, expiring and approved document readiness'],
  ['Order execution', 'Separate operational tracker', 'Often ends at closed-won', 'Quote-to-order handoff, payment visibility and dispatch readiness'],
  ['Industry workflows', 'Individually maintained templates', 'Heavy configuration', 'Apparel, packaging, distribution, manufacturing and sourcing workflows'],
  ['AI support', 'External AI with copied information', 'Generic sales assistant', 'Setu Guru uses market, relationship, quote, document and order context'],
];

function Button({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className={secondary
        ? 'inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-50'
        : 'inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] transition hover:-translate-y-0.5 hover:bg-teal-700'}
    >
      {children}<ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">{children}</p>;
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-medium leading-[1.12] tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function ClientLogoStrip() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 px-4 py-9 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Trusted by businesses growing across borders</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-8 sm:gap-11 lg:gap-14">
          {clientLogos.map((logo) => (
            logo.dark ? (
              <div key={logo.alt} className="flex h-12 items-center rounded-xl bg-slate-900 px-4 opacity-80 transition hover:opacity-100">
                <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="max-h-8 w-auto object-contain" />
              </div>
            ) : (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="max-h-11 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            )
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-teal-700">
          {['Exporters', 'Importers', 'Apparel', 'Packaging', 'Manufacturing', 'Distribution'].map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </section>
  );
}

export function HomeGrowthExecutionPage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white text-slate-950">
        <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-center">
            <div className="max-w-2xl">
              <Eyebrow>AI-powered Import/Export Growth and Execution CRM</Eyebrow>
              <h1 className="mt-4 text-[2.75rem] font-medium leading-[1.03] tracking-[-0.045em] text-slate-950 sm:text-[3.35rem] lg:text-[3.75rem]">
                <span className="block">Find global opportunities.</span>
                <span className="mt-1 block">Convert buyers.</span>
                <span className="mt-1 block">Execute every order.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-[1.05rem]">
                Setu Flow helps exporters, importers, manufacturers and distributors discover markets, manage buyers and suppliers, prepare quotations, control documents and move every order toward shipment from one connected workspace.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href="/book-demo">Book a Demo</Button>
                <Button href="/platform" secondary>See How It Works</Button>
              </div>
              <div className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {['Growth Center', 'Buyer and supplier CRM', 'Quote and document control', 'Order and dispatch readiness', 'Setu Guru AI'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-medium text-white/80 sm:text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-teal-700"><Check className="h-3.5 w-3.5" /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white p-2 shadow-[0_24px_72px_rgba(15,23,42,.18)] lg:ml-auto lg:max-w-[680px]">
              <Image
                src="/marketing/dashboard-command-center.png"
                alt="Setu Flow Trade Command Center dashboard"
                width={1800}
                height={1050}
                priority
                className="h-auto w-full rounded-[18px] object-cover object-top"
              />
              <p className="px-4 py-3 text-[10px] font-bold uppercase leading-4 tracking-[0.16em] text-slate-400">
                Trade Command Center — pipeline value, market activity, execution readiness and Setu Guru actions
              </p>
            </div>
          </div>
        </section>

        <ClientLogoStrip />

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Where value is lost"
              title="Where international growth and execution break down."
              body="Opportunities are lost when teams target the wrong markets, miss potential buyers, delay follow-ups, lose quote control or discover execution gaps too late."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {painPoints.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-[0_12px_32px_rgba(15,23,42,.04)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><item.icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-lg font-semibold leading-7 tracking-[-0.02em] text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="growth-center" className="bg-[linear-gradient(135deg,#edf8f7_0%,#eef5ff_100%)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <Eyebrow>Setu Flow Growth Center</Eyebrow>
              <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-5xl">Build your pipeline before managing it.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Define your ideal customer, research target markets, identify relevant buyers, suppliers, distributors and partners, then move approved opportunities directly into an active commercial workflow.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  ['Define', 'Build an ICP around products, capabilities, certifications and target countries.'],
                  ['Discover', 'Research companies and markets aligned with your commercial goals.'],
                  ['Understand', 'Review opportunity fit, evidence, product alignment and missing information.'],
                  ['Activate', 'Approve, assign an owner and move the opportunity into CRM follow-up.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7"><Button href="/book-demo">Explore Growth Center</Button></div>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,.12)]">
              <Image src="/marketing/growth-center.png" alt="Setu Flow Growth Center work queue" width={1800} height={900} className="h-auto w-full rounded-[22px] object-cover object-top" />
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Connected workflow" title="One connected journey across international business." body="Setu Flow starts before the first contact and continues after the quote is accepted." />
            <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {journey.map((step, index) => (
                <article key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_12px_34px_rgba(15,23,42,.04)]">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><step.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{step.body}</p>
                  <p className="mt-3 text-[11px] font-bold text-teal-700">{step.note}</p>
                  {index < journey.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-teal-400 lg:block" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Industry workspaces" title="Built for international trade. Configured for your industry." body="One import/export growth and execution foundation, adapted to the terminology, specifications, approvals and handoffs your business uses." />
            <div className="mt-11 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {industries.map((industry) => (
                <article key={industry.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><industry.icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-lg font-semibold">{industry.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{industry.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center"><Button href="/solutions" secondary>Explore Solutions</Button></div>
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,#f8f2ff_0%,#f4fbff_100%)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <Eyebrow>Meet Setu Guru</Eyebrow>
              <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-5xl">AI support from market discovery to final dispatch.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Setu Guru works with the customer, supplier, product, quote, document, order and market context already inside Setu Flow. It recommends the next move while your team remains in control.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Find', 'Markets, companies and opportunities'],
                  ['Understand', 'Requirements, history and risks'],
                  ['Prepare', 'Outreach, follow-ups and briefs'],
                  ['Review', 'Quote, document and order gaps'],
                  ['Prioritize', 'The work that needs attention first'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8"><Button href="/setu-guru-ai">See Setu Guru in Action</Button></div>
            </div>
            <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.10)]">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-teal-600 text-white"><Sparkles className="h-5 w-5" /></span>
                <div><p className="font-semibold">Setu Guru</p><p className="text-xs text-slate-500">Trade growth and execution assistant</p></div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">Which markets should we target for this product?</div>
              <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
                <p className="text-sm font-semibold text-slate-950">Based on your products and ICP, prioritize:</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>1. United Kingdom — strong distributor alignment</li>
                  <li>2. UAE — active buyer and event signals</li>
                  <li>3. Germany — product and certification fit</li>
                </ul>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-400">Nothing is sent or changed without approval.</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-200">Compare</p>
              <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-5xl">Where generic CRMs stop, Setu Flow keeps global trade moving.</h2>
              <p className="mt-5 text-base leading-7 text-white/60">Generic CRMs manage sales activity. Setu Flow connects market discovery, buyers and suppliers, trade events, quotations, products, documents, orders and shipment readiness.</p>
            </div>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead><tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Excel + Email</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-200">Setu Flow</th></tr></thead>
                  <tbody>{compareRows.map((row) => <tr key={row[0]} className="border-b border-white/5"><td className="px-5 py-4 font-semibold text-white">{row[0]}</td><td className="px-5 py-4 text-white/45">{row[1]}</td><td className="px-5 py-4 text-white/45">{row[2]}</td><td className="px-5 py-4 font-semibold text-teal-50">{row[3]}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/compare">View Full Comparison</Button><Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">View Pricing <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[28px] bg-[linear-gradient(135deg,#eaf8f6_0%,#edf4ff_100%)] px-7 py-10 sm:px-10">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Eyebrow>Product walkthrough</Eyebrow>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.035em]">See Setu Flow mapped to your international business workflow.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">We will map how your team finds opportunities, manages buyers and suppliers, captures trade-show contacts, prepares quotations, controls documents and moves orders toward shipment.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" secondary>Explore the Platform</Button></div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
