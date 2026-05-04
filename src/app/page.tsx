export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';

const workflow = [
  ['01', 'Capture', 'Trade show scans, vCards, quick leads and mobile forms become clean buyer or supplier records.'],
  ['02', 'Qualify', 'Owner, market, product interest, source event and next action are structured from day one.'],
  ['03', 'Quote', 'Build governed quotes with product, pricing, terms, review and approval steps.'],
  ['04', 'Approve', 'Margin, readiness and commercial gates prevent risky quotes from moving too early.'],
  ['05', 'Execute', 'Orders carry the full context forward into documents, blockers, dispatch and payment readiness.']
];

const productFrames = [
  {
    eyebrow: 'Command center',
    title: 'See the whole trade floor in one glance.',
    body: 'Pipeline value, open opportunities, follow-ups, quotes in market, blocked revenue and market coverage are visible before anyone opens a spreadsheet.',
    image: '/marketing/dashboard-command-center.png'
  },
  {
    eyebrow: 'Follow-up queue',
    title: 'Turn scattered reminders into a revenue action queue.',
    body: 'Every lead carries stage progress, owner, value and urgency so teams move the highest-value work first.',
    image: '/marketing/follow-up-queue.png'
  },
  {
    eyebrow: 'Quote workflow',
    title: 'Build quotes like a process, not a spreadsheet.',
    body: 'Product, pricing, terms, review and send steps keep quotes controlled, repeatable and ready for approval.',
    image: '/marketing/quote-workflow.png'
  },
  {
    eyebrow: 'Execution desk',
    title: 'Where most CRMs stop, Setu Flow keeps running.',
    body: 'Orders carry context forward with execution stages, document checks, commercial locks, payment state and blockers.',
    image: '/marketing/orders-execution.png'
  }
];

const outcomes = [
  ['Faster quote cycles', 'Move from inquiry to governed quote without rebuilding context in Excel.'],
  ['Fewer missed follow-ups', 'Prioritize overdue, blocked and high-value accounts before they go cold.'],
  ['Higher visibility', 'Leadership sees markets, pipeline pressure, blockers and execution status in real time.'],
  ['Less revenue leakage', 'Approval gates and execution checks reduce margin mistakes and delayed handoffs.']
];

const audience = [
  ['Exporters', 'Teams selling across markets with product, pricing and compliance complexity.'],
  ['Importers', 'Teams sourcing from multiple suppliers while tracking follow-ups, quotes and execution.'],
  ['Trading companies', 'Buyer and supplier pipelines in one workspace, with commercial clarity across both sides.'],
  ['Sourcing teams', 'Event capture, supplier qualification and quote handoff without spreadsheet drift.']
];

const comparison = [
  ['Lead capture', 'Manual forms, imports or event sheets', 'Trade event capture, quick lead, vCard and mobile scan'],
  ['Follow-up', 'Generic tasks and reminders', 'Priority queue with value, urgency, owner and stage context'],
  ['Quoting', 'Excel files or generic product rows', 'Guided quote workflow with pricing, terms and approval handoff'],
  ['Execution', 'Deal closed, visibility drops', 'Orders desk with documents, blockers, payment and dispatch readiness'],
  ['Trade context', 'Sales-first pipeline only', 'Buyers, suppliers, markets, products, events and catalog in one flow']
];

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={light ? 'text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]' : 'text-xs font-black uppercase tracking-[0.28em] text-[#359F91]'}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={light ? 'mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl' : 'mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl'}>{title}</h2>
      {body ? <p className={light ? 'mt-5 text-base leading-8 text-white/65' : 'mt-5 text-base leading-8 text-slate-600'}>{body}</p> : null}
    </div>
  );
}

function LineIcon({ label }: { label: string }) {
  const mark = label.slice(0, 2).toUpperCase();
  return <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7de2d2]/30 bg-[#7de2d2]/10 text-xs font-black tracking-widest text-[#7de2d2] shadow-[0_16px_45px_rgba(53,159,145,0.18)]">{mark}</div>;
}

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white">
        <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#061c2e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(53,159,145,0.34),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(12,127,255,0.22),transparent_30%),linear-gradient(135deg,#061c2e_0%,#0b2e4a_56%,#061c2e_100%)]" />
          <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex rounded-full border border-[#7de2d2]/25 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Trade Execution CRM</div>
              <h1 className="mt-7 text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-7xl lg:text-8xl">The trade execution CRM for modern teams.</h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">Capture, qualify, quote, approve and execute in one operating layer built for import-export workflows.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-8 py-4 text-sm font-black text-[#06263f] shadow-[0_22px_60px_rgba(125,226,210,0.22)] transition hover:-translate-y-1">Book demo</a>
                <a href="#platform" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">Explore platform</a>
              </div>
            </div>
            <div className="relative mx-auto mt-14 max-w-6xl">
              <div className="absolute -inset-8 rounded-[3.5rem] bg-[#359F91]/20 blur-3xl" />
              <div className="relative rounded-[3rem] border border-white/15 bg-white/10 p-3 shadow-[0_50px_150px_rgba(0,0,0,0.48)] backdrop-blur-xl">
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
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Eyebrow>Category creation</Eyebrow>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">Where CRMs stop, trade teams still have work to do.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">A deal is not done when the lead is marked won. Trade teams still need pricing, approvals, documents, supplier handoffs, payment checks and dispatch readiness. Setu Flow keeps the process moving after the CRM would normally go quiet.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {outcomes.map(([title, body]) => (
                <div key={title} className="rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-6 shadow-[0_22px_70px_rgba(31,72,124,0.08)]">
                  <LineIcon label={title} />
                  <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="One trade workflow" title="From capture to execution, every stage has a job." body="A modular homepage should make the product feel simple fast. This five-step motion is the fastest way to understand Setu Flow." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-5">
            {workflow.map(([number, title, body]) => (
              <div key={title} className="group rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_22px_80px_rgba(31,72,124,0.09)] transition hover:-translate-y-1 hover:border-[#359F91]/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06263f] text-sm font-black text-[#7de2d2] shadow-lg">{number}</div>
                <h3 className="mt-6 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-7xl rounded-[2.5rem] border border-[#359F91]/20 bg-[#061c2e] p-8 text-white shadow-[0_30px_90px_rgba(6,28,46,0.22)] lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7de2d2]">Mid-page conversion moment</p>
                <h3 className="mt-3 text-3xl font-black tracking-[-0.045em]">Bridge your business flow, shore to shore.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">Show buyers the business outcome before asking them to study every feature.</p>
              </div>
              <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">Book demo</a>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Built for" title="Clear fit for teams moving real goods across borders." body="The visitor should know immediately whether this is for them." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audience.map(([title, body]) => (
              <div key={title} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_65px_rgba(31,72,124,0.08)]">
                <LineIcon label={title} />
                <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(53,159,145,0.20),transparent_32%),radial-gradient(circle_at_85%_72%,rgba(12,127,255,0.16),transparent_30%)]" />
          <div className="relative mx-auto max-w-7xl">
            <SectionTitle eyebrow="Social proof" title="Built with trade operators, for trade operators." body="Until customer logos are ready, use credibility signals that show maturity without pretending to have logos you do not have yet." light />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                ['15', 'markets visible in the command center'],
                ['46', 'sample opportunities flowing through the workspace'],
                ['$1.05M', 'pipeline value shown in commercial view']
              ].map(([value, label]) => (
                <div key={label} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-center backdrop-blur">
                  <p className="text-5xl font-black tracking-[-0.06em] text-white">{value}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Product showcase" title="Four product billboards, not a documentation wall." body="Each frame explains one outcome and lets the screenshot do the selling." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-2">
            {productFrames.map(({ eyebrow, title, body, image }) => (
              <article key={title} className="rounded-[2.75rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_28px_90px_rgba(31,72,124,0.10)]">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[2.3rem] bg-[#359F91]/10 blur-2xl" />
                  <div className="relative rounded-[2.2rem] border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(31,72,124,0.16)]">
                    <Image src={image} alt={`${eyebrow} screenshot`} width={1628} height={1032} className="rounded-[1.8rem]" />
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

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Eyebrow>Mobile, simplified</Eyebrow>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">Capture and act where trade happens.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Keep this section short. One row of mobile screens is enough to prove field readiness without overwhelming the page.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ['/marketing/mobile-dashboard.png', 'Mobile dashboard'],
                ['/marketing/mobile-leads.png', 'Mobile lead queue'],
                ['/marketing/mobile-quick-lead.png', 'Mobile quick lead']
              ].map(([src, alt]) => (
                <div key={src} className="rounded-[2.5rem] border border-white bg-white/85 p-3 shadow-[0_30px_80px_rgba(31,72,124,0.14)] backdrop-blur">
                  <Image src={src} alt={alt} width={326} height={721} className="w-full rounded-[2rem] border border-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Why Setu Flow wins" title="Not another contact database. A trade execution layer." />
          <div className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_25px_90px_rgba(31,72,124,0.10)]">
            <div className="grid grid-cols-[1.05fr_1fr_1fr] bg-[#06263f] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
              <div>Capability</div><div>Common CRM</div><div className="text-[#7de2d2]">Setu Flow</div>
            </div>
            {comparison.map(([capability, crm, setu]) => (
              <div key={capability} className="grid grid-cols-[1.05fr_1fr_1fr] border-t border-slate-100 px-5 py-4 text-sm">
                <div className="font-black text-slate-950">{capability}</div><div className="text-slate-500">{crm}</div><div className="font-semibold text-[#0b776e]">{setu}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Pricing clarity" title="Simple starting points for serious trade teams." body="Buyers should not have to guess whether the product is for them. These cards can be adjusted later when pricing is finalized." />
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {[
              ['Starter', 'For small teams moving off spreadsheets.', 'Request pricing'],
              ['Growth', 'For active trade teams across markets.', 'Most popular'],
              ['Enterprise', 'For multi-team trade operations.', 'Custom']
            ].map(([plan, body, tag], index) => (
              <div key={plan} className={index === 1 ? 'rounded-[2rem] border border-[#359F91]/35 bg-[#061c2e] p-7 text-white shadow-[0_30px_90px_rgba(6,28,46,0.22)]' : 'rounded-[2rem] border border-[#1F487C]/10 bg-white p-7 shadow-[0_22px_70px_rgba(31,72,124,0.08)]'}>
                <p className={index === 1 ? 'text-xs font-black uppercase tracking-[0.24em] text-[#7de2d2]' : 'text-xs font-black uppercase tracking-[0.24em] text-[#359F91]'}>{tag}</p>
                <h3 className={index === 1 ? 'mt-5 text-3xl font-black tracking-[-0.045em] text-white' : 'mt-5 text-3xl font-black tracking-[-0.045em] text-slate-950'}>{plan}</h3>
                <p className={index === 1 ? 'mt-3 text-sm leading-7 text-white/65' : 'mt-3 text-sm leading-7 text-slate-600'}>{body}</p>
                <a href="mailto:hello@setuflowcrm.com" className={index === 1 ? 'mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#06263f]' : 'mt-7 inline-flex rounded-full bg-[#06263f] px-6 py-3 text-sm font-black text-white'}>Book demo</a>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[3rem] bg-[#061c2e] p-8 text-white shadow-[0_40px_110px_rgba(6,28,46,0.28)] lg:p-14">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#359F91]/25 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#0c7fff]/20 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="inline-flex rounded-full border border-[#7de2d2]/25 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Setu Flow CRM</div>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">Run your entire trade operation in one flow.</h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Premium homepage structure, stronger narrative, shorter mobile story, clearer audience fit, simplified comparison and conversion-ready CTAs.</p>
              </div>
              <div className="flex flex-wrap gap-4 lg:flex-col">
                <a href="mailto:hello@setuflowcrm.com" className="rounded-full bg-white px-8 py-4 text-center text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">Book demo</a>
                <Link href="/client-login" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15">Enter workspace</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
