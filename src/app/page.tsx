export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';

const stats = [
  ['46', 'open opportunities'],
  ['$1.05M', 'pipeline value'],
  ['34', 'follow-ups due'],
  ['15', 'active markets']
];

const flow = ['Capture', 'Lead', 'Quote', 'Approval', 'Order', 'Execution'];

const workflowCards = [
  {
    eyebrow: '01 / Command center',
    title: 'See the whole business before the day starts.',
    body: 'Pipeline value, overdue follow-ups, quote pressure, blocked revenue, and market movement live together in one leadership view.',
    image: '/marketing/dashboard-command-center.png',
    alt: 'Setu Flow dashboard command center screenshot'
  },
  {
    eyebrow: '02 / Follow-up control',
    title: 'Turn scattered reminders into one action queue.',
    body: 'Setu Flow prioritizes overdue leads, deal value, owner, stage progress, and next action so teams know exactly what to move next.',
    image: '/marketing/follow-up-queue.png',
    alt: 'Setu Flow follow-up queue screenshot'
  },
  {
    eyebrow: '03 / Guided quote flow',
    title: 'Build quotes with structure instead of spreadsheet chaos.',
    body: 'Product, pricing, terms, review, and send gates make every quote easier to prepare, approve, and hand off.',
    image: '/marketing/quote-workflow.png',
    alt: 'Setu Flow guided quote workflow screenshot'
  },
  {
    eyebrow: '04 / Execution desk',
    title: 'Keep going after the deal is won.',
    body: 'Track documents, blockers, payment status, dispatch readiness, and delivery progress after sales teams would normally lose visibility.',
    image: '/marketing/orders-execution.png',
    alt: 'Setu Flow orders and execution desk screenshot'
  }
];

const differences = [
  ['Common CRM', 'Tracks contacts and opportunities', 'Usually stops once the deal is marked won'],
  ['Setu Flow', 'Runs the trade flow from first contact to execution', 'Carries quotes, approvals, blockers, orders, markets, and catalog data forward']
];

const capabilities = [
  ['Trade events', 'Capture buyers, suppliers, scanned cards, and event notes directly into the lead flow.', '/marketing/trade-events.png'],
  ['Catalog & pricing', 'Keep products, pricing baselines, variants, and quote readiness aligned before the team sells.', '/marketing/catalog-pricing.png'],
  ['Commercial intelligence', 'Compare stages, countries, value concentration, quote pressure, and live commercial activity.', '/marketing/pipeline-commercial-view.png']
];

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden">
        <section className="relative border-b border-[#1F487C]/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(53,159,145,0.20),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(31,72,124,0.24),transparent_30%),linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit rounded-full border border-[#1F487C]/10 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-[#1F487C] shadow-sm">
                Trade Command Center
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                Bridge the gaps in your business — shore to shore.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Setu Flow CRM connects capture, follow-up, quotes, approvals, orders, and execution in one structured system for modern trade teams.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/client-login" className="rounded-full bg-[#06263f] px-7 py-3.5 text-sm font-bold text-white shadow-[0_18px_38px_rgba(6,38,63,0.25)] transition hover:-translate-y-0.5 hover:bg-[#0b4777]">
                  Enter workspace
                </Link>
                <a href="#product" className="rounded-full border border-[#1F487C]/15 bg-white px-7 py-3.5 text-sm font-bold text-[#06263f] shadow-sm transition hover:-translate-y-0.5 hover:border-[#359F91]">
                  See the flow
                </a>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(([value, label]) => (
                  <div key={label} className="rounded-3xl border border-white bg-white/80 p-4 shadow-[0_16px_42px_rgba(31,72,124,0.08)] backdrop-blur">
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-[linear-gradient(135deg,rgba(31,72,124,0.18),rgba(53,159,145,0.18))] blur-3xl" />
              <div className="relative rounded-[2.25rem] border border-white/80 bg-white/70 p-3 shadow-[0_30px_90px_rgba(31,72,124,0.18)] backdrop-blur">
                <Image src="/marketing/dashboard-command-center.png" alt="Setu Flow command center dashboard" width={1628} height={1032} priority className="rounded-[1.8rem]" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#359F91]">The Setu Flow difference</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">Where common CRM ends, Setu Flow begins.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Common CRMs help teams record sales activity. Setu Flow is built for the messy middle of trade: events, markets, follow-ups, quote gates, pricing, approvals, documents, blockers, and order execution.</p>
            </div>
            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_22px_70px_rgba(31,72,124,0.10)]">
              <div className="grid gap-4 md:grid-cols-2">
                {differences.map(([label, one, two]) => (
                  <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1F487C]">{label}</p>
                    <p className="mt-5 text-xl font-black text-slate-950">{one}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{two}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#06263f] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]">One continuous flow</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">From booth capture to order execution.</h2>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-6">
              {flow.map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <p className="text-xs font-black text-[#7de2d2]">0{index + 1}</p>
                  <p className="mt-3 text-lg font-black">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#359F91]">Product story</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">A homepage that finally shows what Setu Flow can really do.</h2>
          </div>
          <div className="mt-10 space-y-12">
            {workflowCards.map((card, index) => (
              <article key={card.title} className="grid gap-8 rounded-[2.5rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_24px_80px_rgba(31,72,124,0.09)] lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:p-8">
                <div className={index % 2 ? 'lg:order-2' : ''}>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#359F91]">{card.eyebrow}</p>
                  <h3 className="mt-4 text-2xl font-black tracking-[-0.02em] text-slate-950 sm:text-4xl">{card.title}</h3>
                  <p className="mt-4 text-base leading-8 text-slate-600">{card.body}</p>
                </div>
                <Image src={card.image} alt={card.alt} width={1628} height={1032} className="rounded-[2rem] border border-slate-200 shadow-[0_18px_55px_rgba(31,72,124,0.12)]" />
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {capabilities.map(([title, body, image]) => (
              <div key={title} className="rounded-[2.25rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_20px_70px_rgba(31,72,124,0.08)]">
                <Image src={image} alt={`${title} screenshot`} width={1628} height={1032} className="rounded-[1.6rem] border border-slate-200" />
                <div className="p-5">
                  <h3 className="text-xl font-black text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.75rem] bg-[#06263f] p-8 text-white shadow-[0_30px_90px_rgba(6,38,63,0.24)] lg:p-12">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#359F91]/30 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]">Ready for modern trade</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">Run your business shore to shore.</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/75">Replace scattered tools with one connected operating flow for capture, follow-up, quoting, approvals, and execution.</p>
              </div>
              <Link href="/client-login" className="rounded-full bg-white px-8 py-4 text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-0.5">
                Enter workspace
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
