import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ClipboardCheck,
  FileCheck2,
  Layers3,
  PackageCheck,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { SiteShell } from './site-shell';

const layerLinks = [
  { href: '#growth-intelligence', label: 'Growth Intelligence', icon: Target },
  { href: '#trade-crm', label: 'Trade CRM', icon: Users },
  { href: '#commercial-operations', label: 'Commercial Operations', icon: ClipboardCheck },
  { href: '#trade-execution', label: 'Trade Execution', icon: PackageCheck },
  { href: '#intelligence-control', label: 'Intelligence & Control', icon: Sparkles },
];

const systemMap = [
  { number: '01', title: 'Discover and qualify', note: 'Markets, ICPs and opportunities', icon: Search },
  { number: '02', title: 'Build the relationship', note: 'Buyers, suppliers and follow-ups', icon: Users },
  { number: '03', title: 'Control the commercial offer', note: 'Products, pricing, quotes and approvals', icon: FileCheck2 },
  { number: '04', title: 'Execute the order', note: 'Documents, fulfilment and dispatch', icon: Boxes },
  { number: '05', title: 'Learn and improve', note: 'Setu Guru, analytics and audit', icon: BarChart3 },
];

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${light ? 'text-teal-200' : 'text-teal-700'}`}>{children}</p>;
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] transition hover:-translate-y-0.5 hover:bg-teal-700">{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50">{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function ProductFrame({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_72px_rgba(15,23,42,.10)]">
      <Image src={src} alt={alt} width={1800} height={1050} className="h-auto w-full rounded-[22px] object-cover object-top" />
      <p className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return <li className="flex items-start gap-3 text-sm leading-6 text-slate-700"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Check className="h-3.5 w-3.5" /></span>{children}</li>;
}

function TourSection({ id, eyebrow, title, body, bullets, image, label, reverse = false }: { id: string; eyebrow: string; title: string; body: string; bullets: string[]; image: string; label: string; reverse?: boolean }) {
  const copy = (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em] text-slate-950">{title}</h2>
      <p className="mt-5 text-base leading-7 text-slate-600">{body}</p>
      <ul className="mt-7 space-y-3">{bullets.map((bullet) => <Bullet key={bullet}>{bullet}</Bullet>)}</ul>
    </div>
  );
  const visual = <ProductFrame src={image} alt={title} label={label} />;

  return (
    <section id={id} className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        {reverse ? <>{visual}{copy}</> : <>{copy}{visual}</>}
      </div>
    </section>
  );
}

export function TradeExecutionPlatformTourPage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white text-slate-950">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_80%_10%,rgba(45,212,191,.14),transparent_30%),linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <Eyebrow>Product tour</Eyebrow>
              <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[.98] tracking-[-0.055em] text-slate-950 sm:text-[4rem]">
                See how Setu Flow moves work from opportunity to dispatch.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                The homepage explains why Setu Flow is a Trade Execution OS. This page shows how the product is organized, where each team works and how one record moves through the complete operating flow.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><PrimaryButton href="/book-demo">Book a Product Tour</PrimaryButton><SecondaryButton href="#growth-intelligence">Start the Tour</SecondaryButton></div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['One record', 'Context carries forward'],
                  ['Five layers', 'Clear operating ownership'],
                  ['Eight stages', 'Opportunity through dispatch'],
                ].map(([value, note]) => <div key={value} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"><p className="font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>)}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,.22)] sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200">Platform map</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">One operating model</h2></div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-200"><Layers3 className="h-6 w-6" /></span>
              </div>
              <div className="mt-5 space-y-3">
                {systemMap.map((item, index) => (
                  <div key={item.title} className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200"><item.icon className="h-4.5 w-4.5" /></span>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[10px] font-bold tracking-[0.14em] text-white/35">{item.number}</span><p className="font-semibold text-white">{item.title}</p></div><p className="mt-1 text-xs text-white/50">{item.note}</p></div>
                    {index < systemMap.length - 1 && <span className="absolute -bottom-3 left-9 z-10 text-teal-300">↓</span>}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-teal-300/20 bg-teal-300/10 px-5 py-4 text-sm font-medium text-teal-50">The customer, product, price, document and order context stays connected throughout.</div>
            </div>
          </div>
        </section>

        <nav className="sticky top-[73px] z-20 border-y border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,.05)] backdrop-blur-xl sm:px-6 lg:px-8" aria-label="Platform tour navigation">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
            {layerLinks.map((item) => <Link key={item.href} href={item.href} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"><item.icon className="h-4 w-4" />{item.label}</Link>)}
          </div>
        </nav>

        <TourSection
          id="growth-intelligence"
          eyebrow="1. Growth Intelligence"
          title="Build the pipeline before you manage it."
          body="Growth Center turns ICP definition, target-market research, CRM matching and source-backed external discovery into a structured commercial work queue."
          bullets={['Define ideal customers around products, capabilities, countries and commercial priorities.', 'Separate existing CRM matches from new external prospects.', 'Approve the opportunity and move it into an owned follow-up workflow without re-entering the research.']}
          image="/marketing/growth-center.png"
          label="Growth Center — ICP, CRM matches, external discovery and revenue actions"
        />

        <div className="bg-slate-50">
          <TourSection
            id="trade-crm"
            eyebrow="2. Trade CRM"
            title="Turn every buyer and supplier into a working relationship."
            body="The relationship workspace combines qualification, follow-up, communication history, requirements and quote progress so the team works from the next action rather than a static contact record."
            bullets={['Buyer and supplier context can be viewed without creating separate systems.', 'Follow-ups, tasks, notes and communications remain attached to the relationship.', 'Leadership can see stalled work, overdue actions and active commercial value.']}
            image="/marketing/follow-up-queue.png"
            label="Relationship workspace — qualification, ownership, next action and quote progress"
            reverse
          />
        </div>

        <TourSection
          id="commercial-operations"
          eyebrow="3. Commercial Operations"
          title="Control pricing, terms and approvals before anything leaves the business."
          body="Setu Flow keeps product selection, price lists, currencies, Incoterms, quote versions, validity and approval posture inside one controlled commercial workflow."
          bullets={['Start from governed product and pricing sources.', 'Keep buyer requirements, quotation versions and negotiation history connected.', 'Move to sending only after the configured approval gates are satisfied.']}
          image="/marketing/quote-workflow.png"
          label="Commercial workspace — products, terms, pricing, versions and approvals"
        />

        <section id="trade-execution" className="scroll-mt-28 bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.38fr_0.62fr] lg:items-start">
              <div>
                <Eyebrow light>4. Trade Execution</Eyebrow>
                <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em]">The workflow continues after the quote is accepted.</h2>
                <p className="mt-5 text-base leading-7 text-white/65">Documents, orders, fulfilment status, payment visibility and dispatch readiness remain connected to the accepted commercial record.</p>
                <ul className="mt-7 space-y-3">
                  {['Required and missing documents surface before they block the order.', 'Approved quotations become execution records without rebuilding the commercial details.', 'Operations and leadership see the same blockers, evidence and next actions.'].map((bullet) => <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-white/75"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-teal-200"><Check className="h-3.5 w-3.5" /></span>{bullet}</li>)}
                </ul>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white p-2"><Image src="/marketing/ss-documents.jpg" alt="Setu Flow document readiness workspace" width={1200} height={800} className="h-full w-full rounded-[18px] object-cover object-top" /><p className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Document readiness</p></div>
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white p-2"><Image src="/marketing/ss-orders.jpg" alt="Setu Flow order execution workspace" width={1200} height={800} className="h-full w-full rounded-[18px] object-cover object-top" /><p className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Order execution</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="intelligence-control" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#061e34_0%,#0b2e4a_58%,#0f8f87_100%)] p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,.16)]">
              <div className="flex items-center gap-4"><Image src="/setu-guru/guru-avatar-256.png" alt="Setu Guru" width={88} height={88} className="h-20 w-20 object-contain" /><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200">Setu Guru</p><h3 className="mt-1 text-2xl font-medium">Contextual intelligence, inside the workflow.</h3></div></div>
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/80">What needs attention before this order can move?</div>
              <div className="mt-3 rounded-2xl border border-teal-300/20 bg-teal-300/10 p-5 text-sm text-white/75"><p className="font-semibold text-white">Three blockers found</p><ul className="mt-3 space-y-2"><li>• Packing List has not been uploaded.</li><li>• Payment request has not been recorded.</li><li>• Dispatch readiness still needs operations review.</li></ul></div>
            </div>
            <div>
              <Eyebrow>5. Intelligence & Control</Eyebrow>
              <h2 className="mt-3 text-4xl font-medium leading-[1.08] tracking-[-0.04em]">Know what is happening, why it matters and what should happen next.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">Setu Guru, analytics, reports, alerts and audit history turn the operating record into guidance for users and visibility for leadership.</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  ['Setu Guru', 'Drafts, explains, recommends and flags risk with operator approval.'],
                  ['Analytics', 'Conversion, cycle time, market and execution performance.'],
                  ['Alerts', 'Overdue follow-ups, approval blockers, document gaps and order risk.'],
                  ['Audit history', 'Actions, decisions and evidence remain explainable.'],
                ].map(([title, body]) => <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="font-semibold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-7 rounded-[28px] bg-[linear-gradient(135deg,#eaf8f6_0%,#edf4ff_100%)] px-7 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div><Eyebrow>Product walkthrough</Eyebrow><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">See the platform mapped to your actual trade workflow.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Bring your current process from opportunity through dispatch. We will show where Setu Flow replaces re-entry, disconnected tools and unclear ownership.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row"><PrimaryButton href="/book-demo">Book a Product Tour</PrimaryButton><SecondaryButton href="/solutions">Explore Industries</SecondaryButton></div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
