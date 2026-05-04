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

const flow = [
  ['01', 'Capture', 'Trade events, vCards, quick leads and scanned cards.'],
  ['02', 'Qualify', 'Buyer or supplier, owner, market, product and intent.'],
  ['03', 'Quote', 'Guided product, pricing, terms, review and send workflow.'],
  ['04', 'Approve', 'Margin gates, review states and controlled handoffs.'],
  ['05', 'Execute', 'Orders, documents, blockers, dispatch and payment readiness.']
];

const features = [
  ['📡', 'Trade capture that starts on the floor', 'Capture buyers, suppliers, event notes and business cards before the opportunity disappears into WhatsApp or a spreadsheet.', 'Capture'],
  ['⚡', 'Follow-up intelligence', 'Prioritize overdue, blocked, high-value and quote-ready work so the team always knows the next move.', 'Action'],
  ['🧾', 'Structured quote desk', 'Move from product to pricing, terms, review and send with a repeatable workflow instead of messy Excel versions.', 'Quotes'],
  ['🧭', 'Market command map', 'See countries, buyers, suppliers, quote pressure and value concentration as a live commercial map.', 'Markets'],
  ['🚢', 'Execution beyond CRM', 'Track documents, commercial locks, payment state, dispatch readiness and order blockers after the deal is won.', 'Orders'],
  ['📦', 'Catalog and quote-ready pricing', 'Keep products, variants, baselines, pricing gaps and quick quote actions in one commercial source of truth.', 'Catalog']
];

const showcases = [
  ['Command center', 'Leadership sees the whole trade operation in one glance.', 'Pipeline value, open opportunities, follow-ups, quotes in market, blocked revenue and live market coverage are visible before anyone opens a spreadsheet.', '/marketing/dashboard-command-center.png'],
  ['Follow-up queue', 'Turn scattered reminders into a revenue action queue.', 'Every lead has stage progress, next action, owner, value and urgency, so the team can move the highest-value work first.', '/marketing/follow-up-queue.png'],
  ['Quote workflow', 'Build quotes like a process, not a spreadsheet.', 'Guided steps for product, pricing, terms, review and send keep quotes controlled, repeatable and ready for approval.', '/marketing/quote-workflow.png'],
  ['Execution desk', 'Where most CRMs stop, Setu Flow keeps running.', 'Orders carry the context forward with execution stages, document checks, commercial locks, payment state and blockers surfaced clearly.', '/marketing/orders-execution.png']
];

const comparison = [
  ['Lead capture', 'Manual forms, imports or scattered event sheets', 'Trade events, vCard, quick lead, card scan and mobile capture'],
  ['Follow-up', 'Generic tasks and reminders', 'Priority queue with overdue, blocked, value and stage context'],
  ['Quoting', 'Excel files or generic CRM products', 'Guided quote preview with pricing, terms, review and approval handoff'],
  ['Execution', 'Deal closed, visibility drops', 'Orders desk, blockers, documents, payment and dispatch readiness'],
  ['Trade context', 'Sales-first pipeline only', 'Buyers, suppliers, markets, products, events and catalog in one flow']
];

function Badge({ children }: { children: string }) {
  return <span className="inline-flex rounded-full border border-[#7de2d2]/30 bg-[#7de2d2]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#7de2d2]">{children}</span>;
}

function SectionTitle({ eyebrow, title, body, dark = false }: { eyebrow: string; title: string; body?: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={dark ? 'text-xs font-black uppercase tracking-[0.28em] text-[#7de2d2]' : 'text-xs font-black uppercase tracking-[0.28em] text-[#359F91]'}>{eyebrow}</p>
      <h2 className={dark ? 'mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl' : 'mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl'}>{title}</h2>
      {body ? <p className={dark ? 'mt-5 text-base leading-8 text-white/65' : 'mt-5 text-base leading-8 text-slate-600'}>{body}</p> : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden">
        <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#061c2e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(53,159,145,0.32),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(12,127,255,0.26),transparent_32%),linear-gradient(135deg,#061c2e_0%,#0b2e4a_58%,#061c2e_100%)]" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <Badge>Trade Command Center</Badge>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Bridge your business flow, shore to shore.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">Setu Flow is the trade execution CRM for teams that need more than contacts and deals: capture, follow-up, quotes, approvals, orders and execution in one premium operating layer.</p>
              <div className="mt-9 flex flex-wrap gap-4"><Link href="/client-login" className="rounded-full bg-white px-7 py-4 text-sm font-black text-[#06263f] shadow-[0_20px_50px_rgba(125,226,210,0.18)] transition hover:-translate-y-1">Enter workspace</Link><a href="#product" className="rounded-full border border-white/20 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">See the platform</a></div>
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(([value, label]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur"><p className="text-2xl font-black tracking-[-0.04em] text-white">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</p></div>)}</div>
            </div>
            <div className="relative flex items-center">
              <div className="absolute -inset-8 rounded-[3rem] bg-[#359F91]/20 blur-3xl" />
              <div className="relative w-full rounded-[2.5rem] border border-white/15 bg-white/10 p-3 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="rounded-[2rem] border border-white/15 bg-[#eef6fb] p-2"><Image src="/marketing/dashboard-command-center.png" alt="Setu Flow live command center" width={1628} height={1032} priority className="rounded-[1.6rem]" /></div>
                <div className="absolute -bottom-7 -left-5 hidden rounded-3xl border border-white/15 bg-[#061c2e]/90 p-5 shadow-2xl backdrop-blur md:block"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Blocked revenue</p><p className="mt-2 text-3xl font-black">0</p><p className="mt-1 text-xs text-white/55">Clear to progress</p></div>
                <div className="absolute -right-4 -top-6 hidden rounded-3xl border border-[#7de2d2]/30 bg-[#06263f]/90 p-5 shadow-2xl backdrop-blur lg:block"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7de2d2]">Next action</p><p className="mt-2 text-lg font-black">Review overdue follow-ups</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Not just CRM" title="A futuristic operating system for trade teams." body="Common CRMs were built for generic sales teams. Setu Flow is designed around the real motion of import-export work: events, buyers, suppliers, products, prices, documents, quotes and orders." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-5">{flow.map(([number, title, body]) => <div key={title} className="group rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f5fbff_100%)] p-6 shadow-[0_20px_70px_rgba(31,72,124,0.08)] transition hover:-translate-y-1 hover:border-[#359F91]/40"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#06263f] text-sm font-black text-[#7de2d2] shadow-lg">{number}</div><h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p></div>)}</div>
        </section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[0.28em] text-[#359F91]">Why Setu Flow wins</p><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">Where other CRMs stop, your operation still has work to do.</h2><p className="mt-5 text-base leading-8 text-slate-600">This section makes buyers understand that Setu Flow is not competing on contact storage. It is competing on execution control.</p></div><div className="overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_25px_90px_rgba(31,72,124,0.10)]"><div className="grid grid-cols-[1.05fr_1fr_1fr] bg-[#06263f] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/55"><div>Capability</div><div>Common CRM</div><div className="text-[#7de2d2]">Setu Flow</div></div>{comparison.map(([capability, crm, setu]) => <div key={capability} className="grid grid-cols-[1.05fr_1fr_1fr] border-t border-slate-100 px-5 py-4 text-sm"><div className="font-black text-slate-950">{capability}</div><div className="text-slate-500">{crm}</div><div className="font-semibold text-[#0b776e]">{setu}</div></div>)}</div></div></div>
        </section>

        <section className="relative bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(53,159,145,0.18),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(12,127,255,0.14),transparent_28%)]" />
          <div className="relative mx-auto max-w-7xl"><SectionTitle eyebrow="Platform capabilities" title="Every feature fills a gap your CRM ignores." body="The design feels like a command system: icons, signals, stages and operational clarity, not a flat marketing brochure." dark /><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([icon, title, body, tag]) => <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.09]"><div className="flex items-center justify-between gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[0_18px_40px_rgba(0,0,0,0.20)]">{icon}</div><span className="rounded-full border border-[#7de2d2]/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7de2d2]">{tag}</span></div><h3 className="mt-6 text-xl font-black tracking-[-0.03em]">{title}</h3><p className="mt-3 text-sm leading-7 text-white/62">{body}</p></div>)}</div></div>
        </section>

        <section id="product" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Product showcase" title="Raw product power, presented like a premium SaaS platform." body="Use the real screenshots, but frame them with depth, glow, captions and context so the page feels investor and enterprise ready." />
          <div className="mx-auto mt-12 max-w-7xl space-y-12">{showcases.map(([eyebrow, title, body, image], index) => <article key={title} className="grid gap-8 rounded-[2.75rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_28px_90px_rgba(31,72,124,0.10)] lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:p-8"><div className={index % 2 ? 'lg:order-2' : ''}><p className="text-xs font-black uppercase tracking-[0.26em] text-[#359F91]">{eyebrow}</p><h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">{title}</h3><p className="mt-4 text-base leading-8 text-slate-600">{body}</p></div><div className="relative"><div className="absolute -inset-4 rounded-[2.3rem] bg-[#359F91]/10 blur-2xl" /><div className="relative rounded-[2.2rem] border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(31,72,124,0.16)]"><Image src={image} alt={`${eyebrow} screenshot`} width={1628} height={1032} className="rounded-[1.8rem]" /></div></div></article>)}</div>
        </section>

        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionTitle eyebrow="Mobile first" title="A trade CRM that works where trade actually happens." body="The mobile screens prove Setu Flow is not just a desktop admin system. It is built for trade shows, follow-ups and field capture." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">{[['/marketing/mobile-dashboard.png','Mobile dashboard'],['/marketing/mobile-leads.png','Mobile lead queue'],['/marketing/mobile-vcard.png','Mobile vCard share'],['/marketing/mobile-quick-lead.png','Mobile quick add lead']].map(([src, alt]) => <div key={src} className="rounded-[2.5rem] border border-white bg-white/80 p-3 shadow-[0_30px_80px_rgba(31,72,124,0.14)] backdrop-blur"><Image src={src} alt={alt} width={326} height={721} className="w-full rounded-[2rem] border border-slate-200" /></div>)}</div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">{[['Trade events','Capture. Qualify. Follow up. Close.','/marketing/trade-events.png'],['Catalog and pricing','Keep products quote-ready across markets.','/marketing/catalog-pricing.png'],['Commercial intelligence','Know value, movement and risk by country.','/marketing/pipeline-commercial-view.png']].map(([title, body, image]) => <div key={title} className="rounded-[2.5rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_22px_75px_rgba(31,72,124,0.09)]"><Image src={image} alt={`${title} screenshot`} width={1628} height={1032} className="rounded-[2rem] border border-slate-200" /><div className="p-5"><h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></div></div>)}</div></section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[3rem] bg-[#061c2e] p-8 text-white shadow-[0_40px_110px_rgba(6,28,46,0.28)] lg:p-14"><div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#359F91]/25 blur-3xl" /><div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#0c7fff]/20 blur-3xl" /><div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><Badge>Setu Flow CRM</Badge><h2 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">Run your entire trade operation in one flow.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Same brand colors, upgraded into a serious SaaS experience: premium typography, futuristic depth, real product visuals and clear differentiation.</p></div><div className="flex flex-wrap gap-4 lg:flex-col"><Link href="/client-login" className="rounded-full bg-white px-8 py-4 text-center text-sm font-black text-[#06263f] shadow-xl transition hover:-translate-y-1">Enter workspace</Link><a href="mailto:hello@setuflowcrm.com" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15">Book demo</a></div></div></div></section>
      </main>
    </SiteShell>
  );
}
