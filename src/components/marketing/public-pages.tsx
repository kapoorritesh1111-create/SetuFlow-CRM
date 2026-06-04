import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

type IconName =
  | 'lead'
  | 'quote'
  | 'approval'
  | 'order'
  | 'document'
  | 'task'
  | 'mobile'
  | 'shield'
  | 'globe'
  | 'chart'
  | 'package'
  | 'message'
  | 'calendar'
  | 'search'
  | 'users'
  | 'ship'
  | 'scan'
  | 'pipeline'
  | 'report'
  | 'vcard'
  | 'compliance'
  | 'catalog'
  | 'events'
  | 'whatsapp';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const p: Record<IconName, ReactNode> = {
    lead: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></>,
    quote: <><path d="M7 7h10M7 11h10M7 15h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></>,
    approval: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    order: <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5M12 22v-9.5"/></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></>,
    task: <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    package: <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5M12 22v-9.5"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
    calendar: <><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    ship: <><path d="M3 17h18M6 17 4 9h16l-2 8M8 9V5h8v4"/></>,
    scan: <><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></>,
    pipeline: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    report: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    vcard: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M8 12h.01M12 12h4M12 16h4"/></>,
    compliance: <><path d="M9 11l3 3 8-8"/><path d="M21 12a9 9 0 1 1-9-9c1.4 0 2.7.3 3.9.8"/></>,
    catalog: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z"/><path d="M12 12 4.2 7.6M12 12l7.8-4.4M12 12v9"/></>,
    events: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></>,
    whatsapp: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 8.46 19.86 19.86 0 0 1 1.77 5.08 2 2 0 0 1 3.73 3H6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17l.92-.08Z"/></>,
  };

  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p[name]}</svg>;
}

function GuruAvatar({ size = 44 }: { size?: number }) {
  return <Image src="/logos/setu-guru-icon.svg" alt="Setu Guru" width={size} height={size} className="shrink-0 rounded-2xl object-contain" />;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${light ? 'text-[#7de2d2]' : 'text-[#108477]'}`}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false, center = true }: { eyebrow: string; title: ReactNode; body?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={`mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[2.75rem] ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      {body && <p className={`mt-4 text-base leading-7 ${light ? 'text-white/60' : 'text-slate-500'}`}>{body}</p>}
    </div>
  );
}

function Check({ light = false, size = 'md' }: { light?: boolean; size?: 'sm' | 'md' }) {
  const d = size === 'sm' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-[11px]';
  return <span className={`mt-0.5 flex ${d} shrink-0 items-center justify-center rounded-full font-bold ${light ? 'bg-[#7de2d2]/20 text-[#7de2d2]' : 'bg-[#e6faf6] text-[#108477]'}`}>✓</span>;
}

function Orb({ icon, dark = false }: { icon: IconName; dark?: boolean }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${dark ? 'border border-[#7de2d2]/20 bg-[#7de2d2]/10 text-[#7de2d2]' : 'border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]'}`}>
      <Icon name={icon} className="h-5 w-5" />
    </span>
  );
}

function Btn({ href, children, v = 'primary' }: { href: string; children: ReactNode; v?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'white' }) {
  const c = {
    primary: 'bg-[#059f90] text-white shadow-[0_12px_32px_rgba(5,159,144,0.30)] hover:bg-[#07897d]',
    dark: 'bg-[#061c2e] text-white shadow-[0_12px_32px_rgba(6,28,46,0.24)] hover:bg-[#0b2e4a]',
    secondary: 'border border-[#108477]/30 bg-white text-[#108477] hover:bg-[#eef6fb]',
    ghost: 'border border-white/22 bg-white/8 text-white backdrop-blur hover:bg-white/14',
    white: 'bg-white text-[#061c2e] shadow-[0_12px_32px_rgba(255,255,255,0.15)] hover:bg-slate-50',
  }[v];
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${c}`}>{children}<span aria-hidden>→</span></Link>;
}

function PageShell({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white">{children}</main></SiteShell>;
}

function ScreenShot({ src, title, label, body, aspect = 'wide' }: { src: string; title: string; label: string; body: string; aspect?: 'wide' | 'phone' }) {
  const h = aspect === 'phone' ? 'h-[32rem]' : 'h-56 sm:h-64';
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[#1F487C]/10 bg-white shadow-[0_16px_50px_rgba(31,72,124,0.09)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(31,72,124,0.16)]">
      <div className="overflow-hidden border-b border-slate-100 bg-[#eef6fb]">
        <Image src={src} alt={title} width={1600} height={900} className={`w-full object-cover object-top transition duration-700 group-hover:scale-[1.025] ${h}`} />
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#108477]">{label}</p>
        <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-slate-500">{body}</p>
      </div>
    </article>
  );
}

function CTA({ title = 'See how Setu Flow maps to your trade workflow.', body = 'A guided walkthrough built around your team, markets, quote process, approvals and execution handoffs.' }: { title?: string; body?: string }) {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#061c2e] shadow-[0_28px_70px_rgba(6,28,46,0.18)]">
        <div className="relative px-8 py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(53,159,145,0.20),transparent_55%),radial-gradient(ellipse_at_100%_0%,rgba(12,127,255,0.15),transparent_50%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#7de2d2]/12">
                <Icon name="calendar" className="h-7 w-7 text-[#7de2d2]" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">{body}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Btn href="/book-demo" v="primary">Book a Demo</Btn>
              <Btn href="/platform" v="ghost">Explore Platform</Btn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const proofScreens = [
  {
    src: '/marketing/dashboard-command-center.png',
    label: 'Representative command center view',
    title: 'Command Center',
    body: 'Commercial leaders see lead, quote and follow-up visibility in one place so they can spot where momentum needs attention.',
  },
  {
    src: '/marketing/follow-up-queue.png',
    label: 'Product walkthrough view',
    title: 'Follow-up Queue',
    body: 'Sales owners see next actions, aging conversations and ownership cues before promising buyers the next step.',
  },
  {
    src: '/marketing/quote-workflow.png',
    label: 'Trade workflow view',
    title: 'Quote Workflow',
    body: 'Commercial teams review quote readiness, approval posture and buyer terms before sending anything forward.',
  },
  {
    src: '/marketing/orders-execution.png',
    label: 'Execution desk preview',
    title: 'Execution Desk',
    body: 'Operations teams see order handoff, document readiness and dispatch preparation without chasing scattered threads.',
  },
];

const compRows: [string, string, string, string][] = [
  ['Lead capture and qualification', 'Manual entry and scattered notes', 'Captured as generic contacts', 'Structured trade opportunity from the first conversation'],
  ['Follow-up ownership', 'Email reminders and personal memory', 'Task records disconnected from trade context', 'Owner, next action and buyer context in one queue'],
  ['Quote preparation', 'Spreadsheet formulas and file versions', 'Custom objects or add-ons', 'Quote workflow built around products, terms and approvals'],
  ['Approval control', 'Email chains and verbal confirmation', 'Workflow rules that need configuration', 'Operator-ready approval posture tied to the quote'],
  ['Order execution', 'Separate shipment tracker', 'Deal marked closed while operations continue elsewhere', 'Execution desk for documents, handoff and dispatch readiness'],
  ['Mobile field work', 'Photos, notes and delayed entry', 'Desktop CRM squeezed onto phone', 'Mobile-ready lead capture and follow-up workflow'],
  ['AI assistance', 'Separate chatbot tab', 'Generic assistant or add-on', 'Setu Guru suggestions in trade workflow context, operator-approved'],
];

const pricingPlans = [
  {
    name: 'Starter',
    tagline: 'Best for small trade teams moving beyond spreadsheets',
    focus: 'Lead capture, follow-up discipline and quote workflow foundations.',
    features: ['Lead and account workspace', 'Follow-up queue and task ownership', 'Quote workflow preview', 'Mobile-ready lead capture', 'Setu Guru follow-up assistance'],
  },
  {
    name: 'Growth',
    tagline: 'Best for growing teams managing quotes and execution together',
    focus: 'Connected commercial and operations workflow with stronger controls.',
    features: ['Everything in Starter', 'Quote review and approval readiness', 'Order execution desk', 'Document readiness workflow', 'Setu Guru quote and document insights'],
    featured: true,
  },
  {
    name: 'Enterprise',
    tagline: 'Best for multi-team trade operations',
    focus: 'Workflow mapping, permissions and rollout support for larger teams.',
    features: ['Everything in Growth', 'Multi-team workflow design', 'Role and permission alignment', 'Executive review cadence', 'Priority implementation support'],
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionTitle eyebrow="Pricing" title="Choose the rollout path that fits your team." body="Starter, Growth and Enterprise are structured around team maturity, workflow complexity and rollout support." />
      <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-3">
        {pricingPlans.map((plan) => (
          <div key={plan.name} className={`relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_20px_60px_rgba(31,72,124,0.09)] ${plan.featured ? 'border-[#059f90] lg:-translate-y-3' : 'border-[#1F487C]/10'}`}>
            {plan.featured && <div className="absolute right-5 top-5 rounded-full bg-[#059f90]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#059f90]">Most common path</div>}
            <div className={`p-7 ${plan.featured ? 'bg-[#061c2e] text-white' : ''}`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.20em] ${plan.featured ? 'text-[#7de2d2]' : 'text-[#108477]'}`}>{plan.name}</p>
              <h3 className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${plan.featured ? 'text-white' : 'text-slate-950'}`}>{plan.tagline}</h3>
              <p className={`mt-3 text-sm leading-6 ${plan.featured ? 'text-white/55' : 'text-slate-500'}`}>{plan.focus}</p>
            </div>
            <div className="flex flex-1 flex-col p-7 pt-5">
              <ul className="space-y-2.5">
                {plan.features.map((f) => <li key={f} className="flex items-start gap-3 text-[13px] leading-5 text-slate-700"><Check size="sm" />{f}</li>)}
              </ul>
              <div className="mt-auto pt-6">
                <Link href="/book-demo" className={`flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 ${plan.featured ? 'bg-[#059f90] text-white shadow-[0_12px_32px_rgba(5,159,144,0.28)] hover:bg-[#07897d]' : 'bg-[#f0f6fa] text-[#061c2e] hover:bg-[#e3edf6]'}`}>
                  Book a pricing walkthrough →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-slate-400">Pricing is finalized through a guided workflow review so your team sees the right plan, rollout path and support model.</p>
    </section>
  );
}

function ComparisonSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionTitle light eyebrow="Compare" title={compact ? 'Generic CRMs track deals. Setu Flow runs trade execution.' : 'Where generic CRMs stop, trade execution still has work to do.'} body={compact ? 'See why import-export teams need more than a basic pipeline.' : 'Setu Flow connects the operational steps that usually sit outside the CRM: quote control, documents, order handoff and shipment readiness.'} />
        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.20em]">
                  <th className="px-5 py-4 text-white/35">Capability</th>
                  <th className="px-5 py-4 text-white/35">Excel + Email</th>
                  <th className="px-5 py-4 text-white/35">Generic CRM</th>
                  <th className="bg-[#7de2d2]/[0.06] px-5 py-4 text-[#7de2d2]">Setu Flow</th>
                </tr>
              </thead>
              <tbody>
                {(compact ? compRows.slice(0, 4) : compRows).map((row) => (
                  <tr key={row[0]} className="border-b border-white/[0.06] transition hover:bg-white/[0.04]">
                    <td className="px-5 py-3.5 font-medium text-white/82">{row[0]}</td>
                    <td className="px-5 py-3.5 text-white/40">{row[1]}</td>
                    <td className="px-5 py-3.5 text-white/40">{row[2]}</td>
                    <td className="bg-[#7de2d2]/[0.04] px-5 py-3.5 font-semibold text-[#b8f5ef]">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center">
          <Btn href="/book-demo" v="primary">Book a Demo</Btn>
          {compact && <Btn href="/compare" v="ghost">Open full comparison</Btn>}
        </div>
      </div>
    </section>
  );
}

export function HomeMarketingPage() {
  const outcomes = [
    { icon: 'lead' as IconName, title: 'Capture every opportunity', body: 'Bring trade-show, referral and inbound leads into a clean commercial workflow from the first touch.' },
    { icon: 'quote' as IconName, title: 'Control every quote', body: 'Keep pricing, terms, approval readiness and buyer communication aligned before a quote goes out.' },
    { icon: 'order' as IconName, title: 'Execute every order', body: 'Move from accepted quote to documents, handoff and shipment readiness without losing context.' },
  ];

  return (
    <PageShell>
      <section className="relative overflow-hidden bg-[#061c2e] px-4 pt-14 pb-10 text-white sm:px-6 lg:px-8 lg:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(53,159,145,0.28),transparent_50%),radial-gradient(ellipse_50%_50%_at_100%_0%,rgba(12,127,255,0.20),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/25 bg-[#7de2d2]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">Trade Execution CRM</div>
              <h1 className="mt-5 text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[3.35rem] lg:text-[4.35rem]">Run your import-export workflow from first contact to final shipment.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/64">Setu Flow brings lead capture, quote control, approvals, documents, orders, and shipment readiness into one connected trade execution CRM.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Btn href="/book-demo" v="primary">Book a Demo</Btn>
                <Btn href="/platform" v="ghost">Explore Platform</Btn>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_55%_40%,rgba(53,159,145,0.14),transparent_55%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/5 p-2.5 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
                <Image src="/marketing/dashboard-command-center.png" alt="Setu Flow command center" width={1600} height={900} priority className="w-full rounded-[1.55rem] object-cover object-top" />
                <div className="absolute bottom-5 left-5 rounded-full border border-white/15 bg-[#061c2e]/82 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7de2d2] backdrop-blur">Representative command center view</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {outcomes.map(({ icon, title, body }) => (
            <article key={title} className="rounded-[1.5rem] border border-[#1F487C]/10 bg-gradient-to-b from-white to-[#f8fbff] p-6 shadow-[0_14px_44px_rgba(31,72,124,0.07)]">
              <Orb icon={icon} />
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f4f9fc] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_16px_50px_rgba(31,72,124,0.07)]">
          <div className="grid gap-3 text-center md:grid-cols-5">
            {['Capture', 'Qualify', 'Quote', 'Approve', 'Execute'].map((step, index) => (
              <div key={step} className="rounded-2xl bg-[#f4f9fc] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#108477]">0{index + 1}</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Product proof" title="A clearer operating rhythm for trade teams." body="The homepage stays focused on the views executives and operators need to understand the platform quickly." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2">
          {proofScreens.map((s) => <ScreenShot key={s.src} src={s.src} label={s.label} title={s.title} body={s.body} />)}
        </div>
        <div className="mt-8 text-center"><Btn href="/platform" v="secondary">See full platform tour</Btn></div>
      </section>

      <ComparisonSection compact />

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-[#1F487C]/10 bg-[#f4f9fc] p-8 shadow-[0_18px_55px_rgba(31,72,124,0.08)] lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div className="flex items-center gap-4">
            <GuruAvatar size={72} />
            <div>
              <Eyebrow>Setu Guru AI</Eyebrow>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Operator-approved AI for trade workflows.</h2>
            </div>
          </div>
          <div>
            <p className="text-base leading-7 text-slate-600">Setu Guru helps teams summarize quote status, identify document gaps, draft follow-ups, and review trade workflows — always operator-approved.</p>
            <div className="mt-5"><Btn href="/setu-guru-ai" v="dark">Explore Setu Guru</Btn></div>
          </div>
        </div>
      </section>

      <CTA />
    </PageShell>
  );
}

export function PlatformMarketingPage() {
  const modules = [
    { src: '/marketing/dashboard-command-center.png', label: 'Command Center', title: 'Executive visibility across trade work', body: 'A representative product view for leaders tracking leads, quotes, ownership and follow-up pressure.' },
    { src: '/marketing/follow-up-queue.png', label: 'Follow-up Queue', title: 'Next actions stay visible', body: 'Commercial owners see who needs attention and what should happen next.' },
    { src: '/marketing/quote-workflow.png', label: 'Quote Workflow', title: 'Quotes move through controlled review', body: 'Prepare quotes with the right context, terms and approval posture.' },
    { src: '/marketing/orders-execution.png', label: 'Order Execution', title: 'Accepted quotes become operational work', body: 'Execution teams track handoff, documents and dispatch readiness.' },
    { src: '/marketing/pipeline-commercial-view.png', label: 'Commercial Pipeline', title: 'Pipeline work by stage and ownership', body: 'A visual workflow for buyer and supplier opportunities across the commercial team.' },
    { src: '/marketing/mobile-dashboard.png', label: 'Mobile Workflow', title: 'Field-ready access', body: 'Mobile-ready views keep trade-show and travel work moving.' },
  ];

  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Platform</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">One platform. Every stage of the trade.</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">A visual product tour of lead capture, follow-up queues, quote workflow, approval readiness, order execution, mobile work and Setu Guru AI.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/compare" v="secondary">Compare features</Btn></div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white p-2 shadow-[0_22px_70px_rgba(31,72,124,0.12)]">
            <Image src="/marketing/dashboard-command-center.png" alt="Setu Flow platform command center" width={1600} height={900} className="w-full rounded-[1.55rem] object-cover object-top" />
          </div>
        </div>
      </section>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Product tour" title="Built around the real sequence of trade execution." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((s) => <ScreenShot key={s.src} src={s.src} label={s.label} title={s.title} body={s.body} />)}
        </div>
      </section>
      <CTA />
    </PageShell>
  );
}

export function SolutionsMarketingPage() {
  const solutions = [
    { icon: 'globe' as IconName, title: 'Exporters', body: 'Control market follow-ups, buyer qualification, pricing, documentation and shipment readiness from one connected workflow.' },
    { icon: 'package' as IconName, title: 'Importers', body: 'Track suppliers, quotes, handoffs and operational tasks without losing context across inboxes and spreadsheets.' },
    { icon: 'ship' as IconName, title: 'Trading companies', body: 'Run buyer and supplier motion together, with clear ownership across commercial and operations teams.' },
    { icon: 'search' as IconName, title: 'Sourcing teams', body: 'Capture trade-show contacts quickly, prioritize follow-ups and move qualified opportunities into quote workflow.' },
    { icon: 'quote' as IconName, title: 'Commercial teams', body: 'Bring quote preparation, approvals, buyer communication and follow-up discipline into one rhythm.' },
    { icon: 'document' as IconName, title: 'Operations teams', body: 'See the handoff from accepted quote to documents, order readiness and dispatch preparation.' },
  ];

  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Solutions</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Built for trade teams that need execution, not just activity tracking.</h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">Setu Flow supports exporters, importers, trading companies, sourcing teams, commercial teams and operations teams with one connected platform.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/platform" v="secondary">Explore platform</Btn></div>
        </div>
      </section>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map(({ icon, title, body }) => (
            <article key={title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_16px_50px_rgba(31,72,124,0.07)]">
              <Orb icon={icon} />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
              <Link href="/book-demo" className="mt-5 inline-flex text-sm font-bold text-[#108477]">See this workflow →</Link>
            </article>
          ))}
        </div>
      </section>
      <CTA title="Book a solution-specific walkthrough" />
    </PageShell>
  );
}

export function SetuGuruMarketingPage() {
  const caps = [
    { icon: 'message' as IconName, title: 'Follow-up drafting', body: 'Draft buyer or supplier follow-ups for operator review before any message is sent.' },
    { icon: 'quote' as IconName, title: 'Quote intelligence', body: 'Summarize quote status, stale activity, approval posture and next suggested action.' },
    { icon: 'search' as IconName, title: 'HSN research', body: 'Research product classification context and prepare suggestions for operator confirmation.' },
    { icon: 'shield' as IconName, title: 'Risk flags', body: 'Surface gaps in documents, buyer communication or order readiness before they slow the team.' },
    { icon: 'document' as IconName, title: 'Document insights', body: 'Review what appears complete, missing or ready for operational follow-up.' },
    { icon: 'chart' as IconName, title: 'Deal prioritization', body: 'Help teams focus on the accounts and quotes that need attention first.' },
  ];

  return (
    <PageShell>
      <section className="relative overflow-hidden bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_10%_0%,rgba(53,159,145,0.24),transparent_48%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-6 flex items-center gap-3"><GuruAvatar size={56} /><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">Setu Guru AI</p></div>
            <h1 className="text-5xl font-semibold leading-[0.97] tracking-[-0.055em] sm:text-6xl">AI assistance for trade execution, always operator-approved.</h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-white/58">Setu Guru helps teams summarize quote status, identify document gaps, draft follow-ups and review trade workflows. It suggests; your team approves.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Btn href="/book-demo" v="primary">See Guru in a walkthrough</Btn><Btn href="/platform" v="ghost">Explore platform</Btn></div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center gap-3 border-b border-white/8 pb-4"><GuruAvatar size={44} /><div><p className="text-sm font-bold">Setu Guru</p><p className="mt-0.5 text-[11px] text-white/38">Suggestive AI · Operator-approved</p></div></div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/30">You</p>
              <p className="mt-1 text-sm text-white/72">Which quotes need attention this week?</p>
              <p className="mt-2.5 text-xs font-bold uppercase tracking-wider text-[#7de2d2]">Guru</p>
              <p className="mt-1 text-sm leading-6 text-white/60">I can summarize quote status, identify aging follow-ups and prepare a buyer-ready note for your review before it is sent.</p>
              <div className="mt-3 flex flex-wrap gap-2"><button className="rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/8 px-3 py-1.5 text-[11px] font-bold text-[#7de2d2]">Draft follow-up</button><button className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/45">Review quote status</button></div>
            </div>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Capabilities" title="Practical AI where trade teams already work." body="Focused assistance across follow-ups, quotes, HSN research, risk signals, documents and prioritization." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {caps.map(({ icon, title, body }) => <article key={title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_16px_50px_rgba(31,72,124,0.07)]"><Orb icon={icon} /><h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{body}</p></article>)}
        </div>
      </section>
      <CTA title="Experience Setu Guru in your trade workflow" />
    </PageShell>
  );
}

export function MobileMarketingPage() {
  const shots = [
    { src: '/marketing/mobile-dashboard.png', alt: 'Mobile dashboard', cap: 'Dashboard' },
    { src: '/marketing/mobile-leads.png', alt: 'Mobile leads', cap: 'Leads' },
    { src: '/marketing/mobile-quick-lead.png', alt: 'Mobile quick lead', cap: 'Quick lead' },
  ];

  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Field Mobile</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Mobile-ready trade workflows for teams in the field.</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">Capture leads, review next actions and keep momentum moving from trade shows, buyer meetings and travel days.</p>
            <div className="mt-6 space-y-2.5">
              {['Mobile dashboard for priority work', 'Lead views designed for field follow-up', 'Quick lead capture when conversations happen', 'Setu Guru support from the trade workflow'].map((t) => <div key={t} className="flex items-center gap-3 text-[13px] font-medium text-slate-600"><Check size="sm" />{t}</div>)}
            </div>
            <div className="mt-7"><Btn href="/book-demo" v="primary">Book a Demo</Btn></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {shots.map(({ src, alt, cap }) => <div key={src} className="rounded-[1.5rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_16px_50px_rgba(6,28,46,0.16)]"><Image src={src} alt={alt} width={425} height={907} className="w-full rounded-[1.1rem]" /><p className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#7de2d2]/60">{cap}</p></div>)}
          </div>
        </div>
      </section>
      <CTA />
    </PageShell>
  );
}

export function PricingMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Pricing starts with the workflow you need to run.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-slate-500">Choose from Starter, Growth and Enterprise paths. The right fit depends on team size, quote complexity, execution workflow and rollout support.</p>
        </div>
      </section>
      <PricingSection />
      <CTA title="Book a pricing walkthrough" body="We will map the plan to your trade workflow, team structure and rollout priorities." />
    </PageShell>
  );
}

export function CompareMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Compare</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Generic CRMs track deals. Setu Flow runs trade execution.</h1>
            <p className="mt-5 text-lg leading-7 text-slate-500">See how Setu Flow compares to Excel, email and generic CRM workflows when quotes, approvals, documents and execution matter.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/pricing" v="secondary">Pricing walkthrough</Btn></div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white p-2 shadow-[0_22px_70px_rgba(31,72,124,0.12)]"><Image src="/marketing/quote-workflow.png" alt="Setu Flow quote workflow" width={1600} height={900} className="w-full rounded-[1.55rem] object-cover object-top" /></div>
        </div>
      </section>
      <ComparisonSection />
      <CTA />
    </PageShell>
  );
}

export function BookDemoMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_28px_80px_rgba(31,72,124,0.10)] lg:grid lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="border-b border-[#1F487C]/10 bg-[#f4f9fc] p-8 lg:border-b-0 lg:border-r">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#108477] text-white"><Icon name="calendar" className="h-7 w-7" /></span>
            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Setu Flow Product Walkthrough</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">30 minutes · Web conferencing</p>
            <p className="mt-5 text-sm leading-7 text-slate-500">We map the walkthrough around your trade workflow — lead capture, quote control, approvals, execution, mobile work and Setu Guru AI.</p>
            <ul className="mt-5 space-y-2.5">
              {['Your current workflow and key friction points', 'Visual product tour of each major stage', 'Setu Guru AI and operator approval model', 'Rollout path and pricing fit for your team'].map((t) => <li key={t} className="flex items-start gap-3 text-sm text-slate-600"><Check size="sm" />{t}</li>)}
            </ul>
            <div className="mt-7 overflow-hidden rounded-[1.2rem] border border-[#1F487C]/10 bg-white"><Image src="/marketing/dashboard-command-center.png" alt="Setu Flow product walkthrough" width={900} height={520} className="h-40 w-full object-cover object-top" /><div className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Walkthrough promise</p><p className="mt-1.5 text-xs leading-5 text-slate-500">A focused product preview tied to your team’s trade workflow.</p></div></div>
          </aside>
          <div className="p-6 sm:p-8"><BookDemoForm /></div>
        </div>
      </section>
    </PageShell>
  );
}
