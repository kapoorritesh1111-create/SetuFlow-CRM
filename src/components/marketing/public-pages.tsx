import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

type IconName = 'vcard' | 'event' | 'lead' | 'quote' | 'document' | 'dispatch' | 'mobile' | 'guru' | 'team' | 'global' | 'check' | 'calendar' | 'compare';
type Feature = { icon: IconName; title: string; body: string };

const img = {
  command: '/marketing/dashboard-command-center.png',
  events: '/marketing/trade-events.png',
  follow: '/marketing/follow-up-queue.png',
  quote: '/marketing/quote-workflow.png',
  vcard: '/marketing/ss-vcard.jpg',
  docs: '/marketing/ss-documents.jpg',
  orders: '/marketing/ss-orders.jpg',
  mobileDashboard: '/marketing/mobile-dashboard.png',
  mobileLeads: '/marketing/mobile-leads.png',
  mobileQuickLead: '/marketing/mobile-quick-lead.png',
};

// ─── Client logos ────────────────────────────────────────────────────────────
const clients = [
  { src: '/clients/blue-orbit-international.jpg', name: 'Blue Orbit International', w: 160, h: 36 },
  { src: '/clients/avanti-foods.png', name: 'Avanti Foods', w: 80, h: 52 },
  { src: '/clients/wholesome-food.png', name: 'Wholesome Food', w: 52, h: 52 },
  // Ash & Noir uses CSS invert so it renders white on dark strip
  { src: '/clients/ash-noir.png', name: 'Ash & Noir', w: 52, h: 52, invert: true },
] as { src: string; name: string; w: number; h: number; invert?: boolean }[];

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const path: Record<IconName, ReactNode> = {
    vcard: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7.5 11h.01M11 11h6M11 15h4"/></>,
    event: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></>,
    lead: <><circle cx="9" cy="8" r="4"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><path d="M17 8h4M19 6v4"/></>,
    quote: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14h8M8 18h5"/></>,
    dispatch: <><path d="M3 17h18M6 17 4 10h16l-2 7M8 10V6h8v4"/><path d="M5 20c1.2.8 2.8.8 4 0 1.2.8 2.8.8 4 0 1.2.8 2.8.8 4 0"/></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    guru: <><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="m21 3-8 8"/><path d="M8.5 13.5 11 16l5-6"/></>,
    team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.8"/></>,
    global: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    calendar: <><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    compare: <><path d="M5 6h14M5 12h14M5 18h14"/><path d="M9 4v16M15 4v16"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{path[name]}</svg>;
}

function Page({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white text-slate-950">{children}</main></SiteShell>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${light ? 'text-teal-200' : 'text-teal-700'}`}>{children}</p>;
}

function Button({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'dark' | 'ghost' }) {
  const styles = {
    primary: 'bg-teal-600 text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] hover:bg-teal-700',
    secondary: 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50',
    dark: 'bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,.18)] hover:bg-slate-800',
    ghost: 'border border-white/20 bg-white/10 text-white hover:bg-white/15',
  }[variant];
  return <Link href={href} className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${styles}`}>{children}<span className="ml-2">→</span></Link>;
}

function SectionTitle({ eyebrow, title, body, light = false, left = false }: { eyebrow: string; title: ReactNode; body?: string; light?: boolean; left?: boolean }) {
  return <div className={`${left ? '' : 'mx-auto text-center'} max-w-3xl`}><Eyebrow light={light}>{eyebrow}</Eyebrow><h2 className={`mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>{body && <p className={`mt-4 text-base leading-7 ${light ? 'text-white/65' : 'text-slate-500'}`}>{body}</p>}</div>;
}

function Check({ light = false }: { light?: boolean }) {
  return <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${light ? 'bg-teal-200/20 text-teal-100' : 'bg-teal-50 text-teal-700'}`}>✓</span>;
}

function IconBox({ icon, dark = false }: { icon: IconName; dark?: boolean }) {
  return <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${dark ? 'bg-white/10 text-teal-200' : 'bg-teal-50 text-teal-700'}`}><Icon name={icon} /></span>;
}

/**
 * GuruMark — always uses the real brand avatar from /setu-guru/guru-avatar-128.png
 * Do NOT use a generic SVG icon here; the attached Guru brand assets must be used.
 */
function GuruMark({ dark = false, large = false }: { dark?: boolean; large?: boolean }) {
  const size = large ? 56 : 44;
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/setu-guru/guru-avatar-128.png"
        alt="Setu Guru"
        width={size}
        height={size}
        className="rounded-2xl object-contain"
      />
      <div>
        <p className={`font-semibold tracking-[-0.03em] ${large ? 'text-3xl' : 'text-xl'} ${dark ? 'text-white' : 'text-slate-950'}`}>Setu Guru</p>
        <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-teal-200' : 'text-teal-700'}`}>Native trade AI</p>
      </div>
    </div>
  );
}

function Screenshot({ src, alt, label, className = '' }: { src: string; alt: string; label?: string; className?: string }) {
  return <div className={`overflow-hidden rounded-hero border border-slate-200 bg-white p-2 shadow-[0_22px_70px_rgba(15,23,42,.10)] ${className}`}><Image src={src} alt={alt} width={1600} height={1000} className="h-full w-full rounded-panel object-cover object-top" />{label && <p className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>}</div>;
}

function Phone({ src = img.vcard, className = '' }: { src?: string; className?: string }) {
  return <div className={`mx-auto max-w-[17rem] rounded-hero bg-slate-950 p-2 shadow-[0_22px_70px_rgba(15,23,42,.20)] ${className}`}><Image src={src} alt="Setu Flow mobile" width={720} height={1320} className="rounded-panel object-contain" /></div>;
}

function CTA({ title = 'See Setu Flow mapped to your trade workflow.', body = 'A focused walkthrough for your vCard, event capture, quote management, documents, dispatch, integrations and Setu Guru needs.' }: { title?: string; body?: string }) {
  return <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero bg-slate-950 px-7 py-8 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><Eyebrow light>Product walkthrough</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{body}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="ghost">Explore Platform</Button></div></div></div></section>;
}

/**
 * ClientStrip — six real client logos.
 * - BOI, Avanti Foods, Wholesome Food: light-background or transparent — render on light strip.
 * - Avanti Technologies, Ash and Noir: logo extracted from dark bg — render in dark pill.
 */
function ClientStrip() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-8">
          Trusted by trade teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <Image
            src="/clients/blue-orbit-international.jpg"
            alt="Blue Orbit International"
            width={160}
            height={36}
            className="h-9 w-auto object-contain opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition duration-200"
          />
          <Image
            src="/clients/avanti-foods.png"
            alt="Avanti Foods"
            width={68}
            height={48}
            className="h-11 w-auto object-contain opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition duration-200"
          />
          <Image
            src="/clients/wholesome-food.png"
            alt="Wholesome Food"
            width={140}
            height={48}
            className="h-10 w-auto object-contain opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition duration-200"
          />
          <div className="flex h-11 items-center rounded-xl bg-slate-900 px-3 opacity-70 hover:opacity-100 transition duration-200">
            <Image
              src="/clients/avanti-technologies.png"
              alt="Avanti Technologies"
              width={56}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex h-11 items-center rounded-xl bg-slate-900 px-4 opacity-70 hover:opacity-100 transition duration-200">
            <Image
              src="/clients/ash-and-noir.png"
              alt="Ash and Noir"
              width={110}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const nativeWins: Feature[] = [
  { icon: 'vcard', title: 'Digital vCard — native, not bolted on', body: 'Stop sharing contacts that never make it to the CRM. QR sharing, save-contact, and CRM follow-up ownership happen in the same workflow.' },
  { icon: 'event', title: 'Trade events that don\'t leak leads', body: 'Exhibition leads usually live in a badge-scan export. In Setu Flow, event source and ownership are attached from the moment of capture.' },
  { icon: 'quote', title: 'Quotes that don\'t drift across email', body: 'Terms, pricing and approval readiness stay in one controlled workflow — not scattered across email threads and spreadsheet versions.' },
  { icon: 'document', title: 'Document gaps caught before dispatch', body: 'Most teams find missing documents at the worst moment. Setu Flow surfaces what is needed, missing and ready — before operations gets blocked.' },
  { icon: 'dispatch', title: 'Execution continues after the quote', body: 'The deal doesn\'t close when the quote is accepted — it moves into order handoff, shipment readiness and payment. Setu Flow tracks all of it.' },
  { icon: 'guru', title: 'Setu Guru AI — trade context, not generic', body: 'Setu Guru knows your leads, quotes and orders. It drafts follow-ups, reviews quotes before sending, and flags document gaps — your team approves everything.' },
];

const workflow = [
  ['vcard', 'vCard'], ['event', 'Event'], ['lead', 'Lead'], ['quote', 'Quote'], ['document', 'Documents'], ['dispatch', 'Dispatch'],
] as [IconName, string][];

function WorkflowRail() {
  return <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,.06)]"><div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><Eyebrow>Workflow</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">From first share to final dispatch.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Every step stays connected — source context, ownership, terms, compliance and dispatch status move with the deal instead of getting lost between tools.</p></div><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{workflow.map(([icon, title], index) => <div key={title} className="relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-center"><div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><Icon name={icon} className="h-4 w-4" /></div><p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>{index < workflow.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-teal-600 lg:block">→</span>}</div>)}</div></div></div></section>;
}

function FeatureGrid({ items = nativeWins }: { items?: Feature[] }) {
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.title} className="rounded-panel border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={item.icon} /><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>)}</div>;
}

function SplitFeature({ eyebrow, title, body, bullets, image, reverse = false, phone = false, dark = false }: { eyebrow: string; title: string; body: string; bullets: string[]; image: string; reverse?: boolean; phone?: boolean; dark?: boolean }) {
  const text = <div><Eyebrow light={dark}>{eyebrow}</Eyebrow><h2 className={`mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2><p className={`mt-4 max-w-xl text-base leading-7 ${dark ? 'text-white/65' : 'text-slate-500'}`}>{body}</p><div className="mt-6 grid gap-3">{bullets.map((b) => <div key={b} className={`flex items-start gap-3 text-sm font-medium ${dark ? 'text-white/75' : 'text-slate-700'}`}><Check light={dark} />{b}</div>)}</div></div>;
  const visual = phone ? <Phone src={image} /> : <Screenshot src={image} alt={title} />;
  return <section className={`${dark ? 'bg-slate-950' : 'bg-white'} px-4 py-16 sm:px-6 lg:px-8`}><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">{reverse ? <>{visual}{text}</> : <>{text}{visual}</>}</div></section>;
}

function PricingCards() {
  const plans = [
    { name: 'Starter', price: '€150', users: 'Up to 5 users', body: 'Lead capture through quote management.', features: ['Native vCard', 'Trade event capture', 'Lead workspace', 'Follow-up workflow', 'Quote management'] },
    { name: 'Growth', price: '€350', users: 'Up to 10 users', body: 'Document manager, order dispatch and Setu Guru workflow assistance.', features: ['Everything in Starter', 'Document manager', 'Order dispatch', 'Integration readiness', 'Setu Guru assistance'], featured: true },
    { name: 'Enterprise', price: 'Custom', users: 'Custom users', body: 'All features, customization and rollout support.', features: ['Everything in Growth', 'Custom workflows', 'Advanced integrations', 'Role alignment', 'Executive rollout support'] },
  ];
  return <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="Plans built around workflow maturity." body="Every plan includes vCard, event capture and mobile access. Growth adds the operational layer for documents, dispatch and integrations." /><div className="mt-10 grid gap-6 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`rounded-hero border bg-white shadow-[0_18px_56px_rgba(15,23,42,.07)] ${plan.featured ? 'border-teal-500 lg:-translate-y-2' : 'border-slate-200'}`}><div className={`${plan.featured ? 'rounded-t-hero bg-slate-950 text-white' : ''} p-7`}><p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${plan.featured ? 'text-teal-200' : 'text-teal-700'}`}>{plan.name}</p><div className="mt-4 flex items-end gap-2"><span className={`text-5xl font-semibold tracking-[-0.05em] ${plan.featured ? 'text-white' : 'text-slate-950'}`}>{plan.price}</span>{plan.price !== 'Custom' && <span className="pb-2 text-sm font-semibold text-slate-400">/ month</span>}</div><p className={`mt-2 text-sm font-bold ${plan.featured ? 'text-teal-200' : 'text-teal-700'}`}>{plan.users}</p><p className={`mt-4 text-sm leading-6 ${plan.featured ? 'text-white/65' : 'text-slate-500'}`}>{plan.body}</p></div><div className="p-7"><ul className="space-y-3">{plan.features.map((f) => <li key={f} className="flex gap-3 text-sm leading-6 text-slate-700"><Check />{f}</li>)}</ul><div className="mt-7"><Button href="/book-demo" variant={plan.featured ? 'primary' : 'secondary'}>Book walkthrough</Button></div></div></article>)}</div></div></section>;
}

const compareRows = [
  ['Digital vCard', 'Separate business-card or QR tool', 'Usually add-on or custom integration', 'Native QR share card tied to lead ownership'],
  ['Trade events', 'Manual lists after the show', 'Campaign setup or imported leads', 'Dedicated event intake and follow-up routing'],
  ['Lead follow-up', 'Inbox reminders and spreadsheets', 'Task records without trade context', 'Owner, next action and source context in one queue'],
  ['Quote management', 'Spreadsheet formulas and file versions', 'Custom objects or CPQ add-ons', 'Terms, approvals and buyer context in workflow'],
  ['Document manager', 'Folders and email chasing', 'Attachment storage, not readiness', 'Readiness workflow before operations and dispatch'],
  ['Order dispatch', 'Separate operations tracker', 'Deal closes before execution starts', 'Order handoff and dispatch readiness in the CRM'],
  ['AI support', 'External chatbot', 'Generic sales assistant', 'Setu Guru supports trade workflow with operator approval'],
  ['Field mobile', 'Delayed entry after meetings', 'Mobile CRM access only', 'vCard, event capture and follow-up built for the field'],
];

function ComparisonTable() {
  return <div className="overflow-hidden rounded-hero border border-white/10 bg-white/[0.04]"><div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead><tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Excel + Email</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-200">Setu Flow</th></tr></thead><tbody>{compareRows.map((row) => <tr key={row[0]} className="border-b border-white/5"><td className="px-5 py-4 font-semibold text-white">{row[0]}</td><td className="px-5 py-4 text-white/45">{row[1]}</td><td className="px-5 py-4 text-white/45">{row[2]}</td><td className="px-5 py-4 font-semibold text-teal-50">{row[3]}</td></tr>)}</tbody></table></div></div>;
}

export function HomeMarketingPage() {
  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_100%)] px-4 pt-14 pb-10 sm:px-6 lg:px-8 lg:pt-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <Eyebrow>Trade Execution CRM</Eyebrow>
              <h1 className="mt-4 text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-slate-950 sm:text-[4.25rem]">
                From first contact to final dispatch.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Most import-export teams carry deals across spreadsheets, email threads, and disconnected tools — until something falls between them. Setu Flow keeps the whole workflow connected.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button href="/book-demo">Book a Demo</Button>
                <Button href="/platform" variant="secondary">See how it works</Button>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                {['vCard capture', 'Quote control', 'Document readiness', 'Setu Guru AI'].map((label) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Check />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <Screenshot src={img.command} alt="Setu Flow trade command center" label="Trade Command Center — lead pressure, pipeline value and Guru actions in one view" />
          </div>
        </div>
      </section>

      <ClientStrip />

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <Eyebrow>Product proof</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-4xl">
              The moments where most teams lose deals.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Not from lack of effort — from lack of system. Setu Flow is built around exactly these moments.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="overflow-hidden rounded-panel border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.06)]">
              <div className="overflow-hidden rounded-t-card">
                <Image src={img.events} alt="Trade event lead capture" width={800} height={500} className="w-full object-cover object-top h-44" />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Trade events</p>
                <p className="mt-2 font-semibold text-slate-950">Leads captured at the show, lost after it.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Setu Flow keeps event source, ownership and follow-up in one place — not a CSV export you import a week later.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-panel border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.06)]">
              <div className="overflow-hidden rounded-t-card">
                <Image src={img.quote} alt="Quote workflow" width={800} height={500} className="w-full object-cover object-top h-44" />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Quote control</p>
                <p className="mt-2 font-semibold text-slate-950">Terms drift. Versions multiply. Approvals stall.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Setu Flow keeps pricing, incoterms and approval readiness in one controlled workflow — not scattered across email and spreadsheets.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-panel border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.06)]">
              <div className="overflow-hidden rounded-t-card">
                <Image src={img.docs} alt="Document readiness" width={800} height={500} className="w-full object-cover object-top h-44" />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Document readiness</p>
                <p className="mt-2 font-semibold text-slate-950">Missing documents found at the worst moment.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Setu Flow shows what is needed, missing and ready before operations is blocked — not when the shipment is already at risk.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Button href="/platform" variant="secondary">See the full platform tour</Button>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <Eyebrow light>Compare</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-4xl">
                Where generic CRMs stop. Where Setu Flow continues.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/55">
                HubSpot and Pipedrive are strong for pipelines. Trade teams need the workflow to keep moving after the quote — into documents, order handoff and dispatch.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button href="/compare">Full comparison</Button>
                <Button href="/pricing" variant="ghost">Pricing</Button>
              </div>
              <div className="mt-8 grid gap-3">
                {[
                  { label: 'Starter', price: '€150/mo', note: 'Up to 5 users' },
                  { label: 'Growth', price: '€350/mo', note: 'Up to 10 users · Docs + dispatch' },
                  { label: 'Enterprise', price: 'Custom', note: 'Unlimited users' },
                ].map((p) => (
                  <div key={p.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-white">{p.label}</span>
                      <span className="ml-2 text-xs text-white/40">{p.note}</span>
                    </div>
                    <span className="text-sm font-bold text-teal-200">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <ComparisonTable />
          </div>
        </div>
      </section>

      <CTA />
    </Page>
  );
}

export function PlatformMarketingPage() {
  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_100%)] px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Eyebrow>Platform</Eyebrow>
              <h1 className="mt-4 text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-slate-950 sm:text-[4rem]">
                One operating system for trade execution.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                vCard capture, trade events, lead follow-up, quote control, document readiness, order dispatch and Setu Guru AI — in the sequence trade teams actually work.
              </p>
              <div className="mt-7 flex gap-3">
                <Button href="/book-demo">Book a Demo</Button>
                <Button href="/compare" variant="secondary">Compare</Button>
              </div>
            </div>
            <Screenshot src={img.command} alt="Setu Flow platform" label="Trade Command Center — pipeline, market map and Guru action zone" />
          </div>
        </div>
      </section>
      <WorkflowRail />
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><Eyebrow>Native vCard</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-4xl">Contact sharing that actually enters the CRM.</h2><p className="mt-4 text-base leading-7 text-slate-500">Most vCard tools are separate from the CRM — so contacts get collected but never owned. In Setu Flow, QR scanning, save-contact and follow-up ownership happen in the same workflow.</p><div className="mt-5 grid gap-2">{['QR-led contact capture at events and meetings', 'Lead ownership assigned at the moment of capture', 'vCard shares link back to a live, updatable profile'].map((b) => (<div key={b} className="flex items-start gap-3 text-sm font-medium text-slate-700"><Check />{b}</div>))}</div></div><Phone src={img.vcard} /></div></section>
      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><Screenshot src={img.events} alt="Trade event lead capture" /><div><Eyebrow>Trade events</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-4xl">Exhibition leads that don't leak after the show.</h2><p className="mt-4 text-base leading-7 text-slate-500">The standard process is: scan badges, export a list, import into the CRM a week later, hope someone follows up. Setu Flow replaces that with one event intake that assigns ownership immediately.</p><div className="mt-5 grid gap-2">{['Source context stays attached to every event lead', 'Follow-up ownership assigned at capture', 'Leaders see event-driven pipeline the same day'].map((b) => (<div key={b} className="flex items-start gap-3 text-sm font-medium text-slate-700"><Check />{b}</div>))}</div></div></div></section>
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><Eyebrow>Quote management</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-4xl">Pricing and terms that stay in one controlled place.</h2><p className="mt-4 text-base leading-7 text-slate-500">Trade quotes typically drift across email versions, spreadsheet tabs and messaging threads. Setu Flow keeps pricing, incoterms and approval readiness inside one workflow — versioned, reviewable and buyer-ready.</p><div className="mt-5 grid gap-2">{['Structured quote preparation with buyer context', 'Approval readiness confirmed before sending', 'Versioned history — no lost terms or overwritten prices'].map((b) => (<div key={b} className="flex items-start gap-3 text-sm font-medium text-slate-700"><Check />{b}</div>))}</div></div><Screenshot src={img.quote} alt="Quote workflow" /></div></section>
      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><Screenshot src={img.docs} alt="Document manager" /><div><Eyebrow>Document manager</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-4xl">Gaps found before the shipment is already at risk.</h2><p className="mt-4 text-base leading-7 text-slate-500">Document problems usually surface at the worst moment — when the order is moving and something is missing. Setu Flow surfaces what is needed, incomplete and ready before operations gets blocked.</p><div className="mt-5 grid gap-2">{['Readiness view before operations handoff', 'Missing and expiring documents flagged early', 'Cleaner transition from commercial to execution'].map((b) => (<div key={b} className="flex items-start gap-3 text-sm font-medium text-slate-700"><Check />{b}</div>))}</div></div></div></section>
      <section className="bg-slate-950 px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div><Eyebrow light>Order dispatch + Mobile + Setu Guru</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-4xl">The workflow keeps moving after the quote is accepted.</h2><p className="mt-4 text-base leading-7 text-white/60">Most CRMs close the deal and stop. Setu Flow connects commercial approval to order handoff, dispatch readiness and payment visibility. On mobile and with Setu Guru AI guiding operators every step.</p><div className="mt-6 grid gap-2">{['Order desk connects approved quotes to execution', 'Mobile-ready for events, buyer visits and travel', 'Setu Guru surfaces gaps and drafts follow-ups', 'Operator-approved before anything is sent'].map((b) => (<div key={b} className="flex items-start gap-3 text-sm font-medium text-white/75"><Check light />{b}</div>))}</div><div className="mt-7"><Button href="/book-demo">Book a platform walkthrough</Button></div></div><Phone src={img.mobileDashboard} /></div></div></section>
      <CTA />
    </Page>
  );
}

export function SolutionsMarketingPage() {
  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_100%)] px-4 pt-14 pb-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><Eyebrow>Solutions</Eyebrow><h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-slate-950 sm:text-[4rem]">Built for the teams that carry trade from conversation to shipment.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Setu Flow is strongest when commercial and operations teams work from the same system instead of passing spreadsheets and emails back and forth.</p><div className="mt-7 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="secondary">See the platform</Button></div></div></section>
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Who it is built for" title="Every team in the trade chain." body="The product maps to how import-export teams actually divide work — commercial, operations, field and leadership." /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[
        { icon: 'global' as IconName, title: 'Exporters', pain: 'Buyer pipeline, document compliance and dispatch visibility all in one place — not split across a CRM, a folder and a chat thread.', bullets: ['Buyer follow-up and qualification', 'Quote approval and buyer communication', 'Document readiness before handoff'] },
        { icon: 'team' as IconName, title: 'Importers', pain: 'Supplier relationships, inbound quotes and order status connected without chasing updates across email.', bullets: ['Supplier contact and follow-up tracking', 'Inbound quote review and terms management', 'Order and shipment status visibility'] },
        { icon: 'event' as IconName, title: 'Trade event teams', pain: 'Exhibition leads that actually enter the CRM — with source context, ownership and follow-up actions from day one.', bullets: ['Business card and QR scan capture', 'Event source attached to every contact', 'Follow-up queue ready on return'] },
        { icon: 'vcard' as IconName, title: 'vCard-led sellers', pain: 'Every relationship starts with an exchange. Setu Flow makes that exchange the beginning of a structured CRM workflow.', bullets: ['QR share card tied to your profile', 'Contacts captured directly to your pipeline', 'Schedule, quote request and save contact'] },
        { icon: 'quote' as IconName, title: 'Commercial teams', pain: 'Quotes that stop drifting across spreadsheet versions and email chains, with approval posture visible before anything is sent.', bullets: ['Structured quote preparation', 'Approval readiness before sending', 'Buyer communication context on every quote'] },
        { icon: 'dispatch' as IconName, title: 'Operations teams', pain: 'Accepted quotes that actually arrive in operations — with document gaps flagged, not discovered after the order is moving.', bullets: ['Order handoff from commercial approval', 'Document and dispatch readiness tracking', 'Fewer surprises when the shipment moves'] },
      ].map((item) => (<article key={item.title} className="rounded-panel border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={item.icon} /><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.pain}</p><ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">{item.bullets.map((b) => (<li key={b} className="flex items-start gap-2 text-xs font-medium text-slate-600"><Check />{b}</li>))}</ul></article>))}</div></div></section>
      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center"><div><Eyebrow>Markets</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950">Active in India, Ireland, UK, Germany and the US.</h2><p className="mt-4 text-base leading-7 text-slate-500">Setu Flow is operational across trade corridors where teams manage buyers and suppliers across multiple countries and time zones. The platform is built around global trade workflows, not any single market.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[{ flag: '🇮🇳', market: 'India' }, { flag: '🇮🇪', market: 'Ireland' }, { flag: '🇬🇧', market: 'United Kingdom' }, { flag: '🇩🇪', market: 'Germany' }, { flag: '🇺🇸', market: 'United States' }, { flag: '🌐', market: 'Global trade' }].map((m) => (<div key={m.market} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><span className="text-xl">{m.flag}</span>{m.market}</div>))}</div></div></div></section>
      <CTA title="Book a solution-specific walkthrough" body="Tell us which teams and trade corridors matter most. We will map the platform to your exact workflow." />
    </Page>
  );
}

export function SetuGuruMarketingPage() {
  return (
    <Page>
      <section className="bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center"><div><Image src="/setu-guru/guru-logo-navbar.png" alt="Setu Guru" width={220} height={73} className="mb-6 object-contain" /><h1 className="text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-white sm:text-[4rem]">AI that knows your trade workflow.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-white/65">Setu Guru is not a generic chatbot. It works inside the context of your actual contacts, quotes, documents and orders — and always waits for operator approval before anything happens.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">See Guru in a walkthrough</Button><Button href="/platform" variant="ghost">Explore platform</Button></div></div><div className="rounded-hero border border-white/10 bg-white/[0.05] p-6"><div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4"><GuruMark dark /><span className="rounded-full bg-teal-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200">Operator-approved</span></div><div className="grid gap-2">{[
        { q: 'Prioritize event leads that need follow-up today.', a: 'Found 4 contacts from Gulfood — 2 overdue. Opening the follow-up queue...' },
        { q: "What is blocking this order's dispatch readiness?", a: 'Certificate of Origin and Packing List not uploaded. Flagged for operations.' },
        { q: 'Draft a quote follow-up for Kenya Family Grocers.', a: 'Draft ready — referencing Q-0294 (AUD 3,650). Awaiting your review before sending.' },
      ].map((item, i) => (<div key={i} className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><p className="text-xs font-semibold text-teal-200/80 mb-1">You</p><p className="text-sm text-white/80 mb-2">{item.q}</p><div className="flex items-start gap-2"><Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={20} height={20} className="rounded-full mt-0.5 flex-shrink-0" /><p className="text-xs leading-5 text-white/55">{item.a}</p></div></div>))}</div></div></div></div></section>
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Where Guru helps" title="A trade intelligence layer across every stage." body="Guru works where the work is — in leads, quotes, documents and dispatch — not in a separate chat window disconnected from your data." /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[
        { icon: 'event' as IconName, title: 'Event lead context', body: 'After a trade show, Guru summarizes each contact — what was discussed, what product they asked about, and what the right next step is.' },
        { icon: 'lead' as IconName, title: 'Follow-up drafting', body: 'Guru drafts buyer and supplier follow-up messages using contact history, pipeline stage and prior interactions. You review and send.' },
        { icon: 'quote' as IconName, title: 'Quote readiness review', body: 'Before you send, Guru checks the quote for pricing consistency, missing incoterms, stale approval status and buyer context gaps.' },
        { icon: 'document' as IconName, title: 'Document gap identification', body: 'Guru flags what is missing, incomplete or approaching expiry before operations is blocked — not after the shipment is already moving.' },
        { icon: 'dispatch' as IconName, title: 'Dispatch blockers', body: 'For each order moving toward handoff, Guru surfaces what still needs to happen — across documents, approvals and shipment readiness.' },
        { icon: 'compare' as IconName, title: 'Prioritization', body: 'Guru identifies which accounts, quotes and leads need attention first — based on overdue follow-ups, expiring validity and commercial pressure.' },
      ].map((item) => (<article key={item.title} className="rounded-panel border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={item.icon} /><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>))}</div></div></section>
      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero border border-slate-200 bg-white p-8"><div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start"><div><Eyebrow>How Guru works</Eyebrow><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">Guru suggests. Your team approves. Nothing is sent automatically.</h2><p className="mt-4 text-sm leading-7 text-slate-500">Every Guru output — a follow-up draft, a gap flag, a prioritization call — is a suggestion that requires a human decision before it becomes an action. This is intentional. Trade relationships and commercial commitments need human judgement, not automation.</p></div><div className="grid gap-3">{[
        { label: 'Guru reads', detail: 'Your actual contacts, quotes, documents and order status in real time' },
        { label: 'Guru suggests', detail: 'A draft, a flag, a priority — specific to that contact or quote' },
        { label: 'You review', detail: 'Edit, reject or approve the suggestion before it becomes an action' },
        { label: 'Nothing leaves without approval', detail: 'No emails sent, no records changed without your explicit confirmation' },
      ].map((item) => (<div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><Check /><div><p className="text-sm font-semibold text-slate-950">{item.label}</p><p className="text-xs leading-5 text-slate-500">{item.detail}</p></div></div>))}</div></div></div></section>
      <CTA title="Experience Setu Guru in your workflow" body="A 30-minute walkthrough covering how Guru handles your event leads, quote review, document gaps and dispatch prioritization." />
    </Page>
  );
}

export function MobileMarketingPage() {
  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_100%)] px-4 pt-14 pb-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"><div><Eyebrow>Field Mobile</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-slate-950 sm:text-[4rem]">The full CRM in your pocket. Not a viewer.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">Trade teams spend days at exhibitions, buyer offices and market visits. Setu Flow mobile is built for those moments — not a simplified read-only version, but the complete workflow on your phone.</p><div className="mt-7 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="secondary">See full platform</Button></div></div><div className="grid grid-cols-3 gap-4">{[[img.mobileDashboard, 'Command center'], [img.mobileLeads, 'Lead queue'], [img.mobileQuickLead, 'Quick capture']].map(([src, label]) => (<div key={src} className="rounded-hero bg-slate-950 p-2 shadow-[0_22px_70px_rgba(15,23,42,.18)]"><Image src={src} alt={label} width={425} height={907} className="rounded-card" /><p className="py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200/75">{label}</p></div>))}</div></div></div></section>
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Mobile capabilities" title="Built for how field trade teams actually work." body="Every mobile feature was designed around the context of a trade show floor, a buyer's office or a 6am flight." /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[
        { icon: 'vcard' as IconName, title: 'vCard share and capture', body: 'Share your profile via QR or link. Scan contacts directly into your CRM pipeline without typing.' },
        { icon: 'event' as IconName, title: 'Trade show quick capture', body: 'Dedicated event intake flow — source tag, lead type and follow-up ownership in under 30 seconds.' },
        { icon: 'lead' as IconName, title: 'Role-aware lead queue', body: 'Your lead queue filtered to exactly your responsibilities — buyer, supplier or both. Nothing irrelevant.' },
        { icon: 'quote' as IconName, title: 'Quotes on mobile', body: 'View quote status, check approval state and open new quote requests without switching to desktop.' },
        { icon: 'calendar' as IconName, title: 'Task command center', body: 'Overdue tasks, due today and mine — a clear priority view so you know what needs to happen before the day is over.' },
        { icon: 'guru' as IconName, title: 'Setu Guru on mobile', body: 'Ask Guru to summarize a contact before a meeting or draft a follow-up while you are still at the event.' },
      ].map((item) => (<article key={item.title} className="rounded-panel border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={item.icon} /><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>))}</div></div></section>
      <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero border border-slate-200 bg-white p-7"><div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center"><div><Eyebrow>Real-time sync</Eyebrow><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">What you capture in the field is live on desktop immediately.</h2><p className="mt-3 text-sm leading-7 text-slate-500">There is no batch sync or overnight update. Leads captured at 10am at Gulfood are in the pipeline for your manager by 10:01am. Quotes approved on desktop show updated status on your phone before the next meeting.</p></div><div className="grid gap-3">{['iOS and Android — included on all plans at no extra cost', 'Full data parity with the web platform', 'No separate login or app account needed', 'Available on the App Store and Google Play'].map((b) => (<div key={b} className="flex items-center gap-3 text-sm font-medium text-slate-700"><Check />{b}</div>))}</div></div></div></section>
      <CTA title="See Setu Flow mobile in a walkthrough" body="We will cover vCard capture, trade show intake, the lead queue and Setu Guru on mobile — matched to your team's field workflow." />
    </Page>
  );
}

export function PricingMarketingPage() {
  const faqs = [
    { q: 'What is included in every plan?', a: 'Every plan includes digital vCard + QR code, trade event capture, iOS and Android mobile app, product catalog, lead and contact workspace, and a dedicated onboarding specialist. No features are locked behind a paywall for the core commercial workflow.' },
    { q: 'What does Growth add over Starter?', a: 'Growth adds the document manager, order dispatch desk, quote approval workflow, FX multi-currency pricing, Setu Guru quote and document insights, and integration readiness. It is designed for teams where commercial and operations both work in the platform.' },
    { q: 'How quickly can we be operational?', a: 'Most teams are live within 3–5 business days of activation. Your onboarding specialist guides the complete setup — pipeline configuration, catalog import, team invitations and a first quote walkthrough.' },
    { q: 'Can we start on Starter and move to Growth?', a: 'Yes. Plan upgrades take effect within one business day. Your data, contacts and history carry forward. Write to help@setugroups.com to upgrade.' },
    { q: 'Is the mobile app included?', a: 'Yes. iOS and Android apps are included on every plan at no extra cost. The mobile app gives full access to leads, capture, quotes, orders, tasks, vCard and Setu Guru — synced in real time.' },
    { q: 'What happens to our data if we cancel?', a: 'You receive a 30-day export window during which you can export all contacts, quotes, orders and documents as CSV or PDF. After 30 days the data is permanently deleted.' },
  ];

  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_100%)] px-4 pt-14 pb-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl text-center"><Eyebrow>Pricing</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[1.0] tracking-[-0.06em] text-slate-950 sm:text-[4rem]">From €150/month. Operational in days.</h1><p className="mt-5 text-lg leading-8 text-slate-600">Three plans built around workflow maturity and team size. Every plan includes vCard, mobile, trade events and a dedicated onboarding specialist.</p></div></section>
      <PricingCards />
      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><SectionTitle eyebrow="What is included" title="Plan comparison." /><div className="mt-8 overflow-hidden rounded-panel border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-b border-slate-100"><th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Feature</th><th className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">Starter</th><th className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Growth</th><th className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">Enterprise</th></tr></thead><tbody>{[
        ['Digital vCard + QR', true, true, true],
        ['Mobile app (iOS + Android)', true, true, true],
        ['Trade event capture', true, true, true],
        ['Lead and contact workspace', true, true, true],
        ['Product catalog + USD pricing', true, true, true],
        ['Quote management', true, true, true],
        ['Setu Guru follow-up + Q&A', true, true, true],
        ['FX pricing and multi-currency', false, true, true],
        ['Quote approval workflow', false, true, true],
        ['Document manager', false, true, true],
        ['Order execution and dispatch', false, true, true],
        ['Setu Guru quote and document insights', false, true, true],
        ['Custom workflows', false, false, true],
        ['Executive rollout support', false, false, true],
      ].map(([feature, starter, growth, ent]) => (<tr key={String(feature)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"><td className="px-5 py-3.5 font-medium text-slate-700">{feature}</td>{[starter, growth, ent].map((val, i) => (<td key={i} className="px-5 py-3.5 text-center">{val ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-bold">✓</span> : <span className="text-slate-300 text-sm">—</span>}</td>))}</tr>))}</tbody></table></div></div></div></section>
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><SectionTitle eyebrow="FAQ" title="Common questions about pricing." /><div className="mt-8 divide-y divide-slate-200">{faqs.map(({ q, a }) => (<details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-950 marker:hidden">{q}<svg className="h-4 w-4 flex-shrink-0 text-slate-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary><p className="mt-3 text-sm leading-6 text-slate-500">{a}</p></details>))}</div></div></section>
      <CTA title="Book a pricing walkthrough" body="We will map the right plan to your team size, quote workflow, document manager needs and integrations — in 30 minutes." />
    </Page>
  );
}

export function CompareMarketingPage() {
  const alternatives = [
    { name: 'HubSpot', position: 'Excellent broad CRM and RevOps platform', note: 'HubSpot is strong for contacts, campaigns, sales automation, service and its app ecosystem. Where it requires add-ons or custom objects for trade teams: digital vCard capture tied to lead ownership, dedicated trade event intake, quote management with approval readiness, document readiness before dispatch, and post-quote order execution. Setu Flow covers that chain natively.' },
    { name: 'Zoho CRM', position: 'Powerful, configurable CRM suite', note: 'Zoho is strong for customization, automation and the broader Zoho app ecosystem. Trade teams often need to configure custom modules for quotes, documents and dispatch — work that takes time and maintenance. Setu Flow delivers those workflows pre-built for import-export operations without heavy custom setup.' },
    { name: 'Pipedrive', position: 'Clean visual sales pipeline CRM', note: 'Pipedrive is strong for deal visibility and pipeline activity. It is designed around the sales stage. Trade teams need the workflow to continue after the quote is accepted — into document readiness, order handoff and dispatch preparation. Setu Flow picks up exactly where Pipedrive stops.' },
    { name: 'Event capture tools', position: 'Badge scanning and lead export apps', note: 'Standalone event capture tools export a CSV and leave teams to import, classify and follow up manually. Setu Flow makes vCard exchange, QR-led capture, event source context and follow-up ownership part of the same CRM workflow — so no leads fall between tools after the show.' },
  ];
  return (
    <Page>
      <section className="bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center"><div><Eyebrow>Compare</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.25rem]">Native trade execution versus stitched-together tools.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Broad CRMs are powerful for sales activity. Trade teams also need vCard capture, events, quote control, document readiness, dispatch and Setu Guru AI support in one operating flow — not across five tools.</p><div className="mt-8 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/pricing" variant="secondary">Pricing</Button></div></div><div className="grid gap-4 sm:grid-cols-2">{[
        { icon: 'vcard' as IconName, title: 'Native vCard + events', body: 'Not a separate capture tool — wired directly to lead ownership.' },
        { icon: 'document' as IconName, title: 'Document manager', body: 'Readiness tracking, not attachment storage.' },
        { icon: 'dispatch' as IconName, title: 'Order dispatch', body: 'Execution continues after quote approval.' },
        { icon: 'guru' as IconName, title: 'Setu Guru AI', body: 'Trade workflow intelligence, not a generic assistant.' },
      ].map((c) => (<div key={c.title} className="rounded-panel border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={c.icon} /><p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{c.title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{c.body}</p></div>))}</div></div></section>
      <section className="bg-white px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero border border-slate-200 bg-slate-50 p-6"><div className="grid gap-5 md:grid-cols-3"><div><p className="text-sm font-semibold text-slate-950">Sales CRMs are good at</p><p className="mt-2 text-sm leading-6 text-slate-500">Contacts, pipeline tracking, activity logging, campaigns and sales reporting. Strong foundations.</p></div><div><p className="text-sm font-semibold text-slate-950">Where trade teams need more</p><p className="mt-2 text-sm leading-6 text-slate-500">The work continues into document compliance, operations handoff, dispatch preparation and payment tracking.</p></div><div><p className="text-sm font-semibold text-slate-950">What Setu Flow adds</p><p className="mt-2 text-sm leading-6 text-slate-500">Connects the commercial and execution chain — vCard to dispatch — in one trade-specific operating flow.</p></div></div></div></section>
      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><Eyebrow>Alternatives</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl">Not weaker tools — different jobs.</h2><p className="mt-4 text-base leading-7 text-slate-500">HubSpot, Zoho and Pipedrive are excellent CRM platforms. Setu Flow is built for the trade execution work those systems require add-ons, custom objects or external processes to cover.</p></div><div className="mt-10 grid gap-5 md:grid-cols-2">{alternatives.map((alt) => (<article key={alt.name} className="rounded-panel border border-slate-200 bg-white p-7 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Compared with</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{alt.name}</h3><p className="mt-1 text-sm font-semibold text-teal-700">{alt.position}</p><p className="mt-4 text-sm leading-6 text-slate-500">{alt.note}</p></article>))}</div></div></section>
      <section className="bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle light eyebrow="Detailed comparison" title="Where Setu Flow is native." body="Generic CRMs can be strong. Trade execution requires a different chain: acquisition, commercial control, document readiness, operations handoff and dispatch." /><div className="mt-10"><ComparisonTable /></div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-hero bg-slate-950 px-7 py-8 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><Eyebrow light>Best-fit walkthrough</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">See where Setu Flow fits against your current CRM stack.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">We can map what should stay in your existing CRM, what currently sits in spreadsheets, and where Setu Flow becomes the execution layer — in a 30-minute focused walkthrough.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/pricing" variant="ghost">Pricing</Button></div></div></div></section>
    </Page>
  );
}

export function BookDemoMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-hero border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.10)] lg:grid-cols-[0.78fr_1.22fr]"><aside className="bg-slate-950 p-8 text-white"><Eyebrow light>30 minute walkthrough</Eyebrow><h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">Map Setu Flow to your trade workflow.</h1><p className="mt-4 text-sm leading-7 text-white/62">We will cover vCard, trade events, quote management, documents, dispatch, mobile, Setu Guru and pricing fit.</p><div className="mt-7 grid gap-3">{['Your current lead-to-dispatch workflow', 'Best plan fit: Starter, Growth or Enterprise', 'Product visuals tied to your use case', 'Setu Guru operator approval model'].map((item) => <div key={item} className="flex gap-3 text-sm text-white/75"><Check light />{item}</div>)}</div><div className="mt-8"><Phone /></div></aside><div className="p-6 sm:p-8"><BookDemoForm /></div></div></section></Page>;
}
