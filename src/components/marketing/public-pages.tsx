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
  vcard: '/internal/docs-screenshots/ss-vcard.jpg',
  docs: '/internal/docs-screenshots/ss-documents.jpg',
  orders: '/internal/docs-screenshots/ss-orders.jpg',
  mobileDashboard: '/marketing/mobile-dashboard.png',
  mobileLeads: '/marketing/mobile-leads.png',
  mobileQuickLead: '/marketing/mobile-quick-lead.png',
};

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

function GuruMark({ dark = false, large = false }: { dark?: boolean; large?: boolean }) {
  return <div className="flex items-center gap-3"><Image src="/logos/setu-guru-icon.svg" alt="Setu Guru" width={large ? 64 : 46} height={large ? 64 : 46} className="rounded-2xl object-contain" /><div><p className={`font-semibold tracking-[-0.03em] ${large ? 'text-3xl' : 'text-xl'} ${dark ? 'text-white' : 'text-slate-950'}`}>Setu Guru</p><p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-teal-200' : 'text-teal-700'}`}>Native trade AI</p></div></div>;
}

function Screenshot({ src, alt, label, className = '' }: { src: string; alt: string; label?: string; className?: string }) {
  return <div className={`overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-[0_22px_70px_rgba(15,23,42,.10)] ${className}`}><Image src={src} alt={alt} width={1600} height={1000} className="h-full w-full rounded-[1.35rem] object-cover object-top" />{label && <p className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>}</div>;
}

function Phone({ src = img.vcard, className = '' }: { src?: string; className?: string }) {
  return <div className={`mx-auto max-w-[17rem] rounded-[2rem] bg-slate-950 p-2 shadow-[0_22px_70px_rgba(15,23,42,.20)] ${className}`}><Image src={src} alt="Setu Flow mobile product view" width={720} height={1320} className="rounded-[1.55rem] object-contain" /></div>;
}

function CTA({ title = 'See Setu Flow mapped to your trade workflow.', body = 'A focused walkthrough for your vCard, event capture, quote management, documents, dispatch, integrations and Setu Guru needs.' }: { title?: string; body?: string }) {
  return <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-950 px-7 py-8 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><Eyebrow light>Product walkthrough</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{body}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="ghost">Explore Platform</Button></div></div></div></section>;
}

const nativeWins: Feature[] = [
  { icon: 'vcard', title: 'Native vCard + QR capture', body: 'Digital contact sharing is connected to lead ownership instead of living in a separate tool.' },
  { icon: 'event', title: 'Trade event workflow', body: 'Exhibition and buyer-meeting leads carry source context into follow-up and qualification.' },
  { icon: 'quote', title: 'Quote management', body: 'Pricing, terms and approval readiness stay in one controlled commercial workflow.' },
  { icon: 'document', title: 'Document manager', body: 'Document readiness is visible before operations and dispatch get blocked.' },
  { icon: 'dispatch', title: 'Order dispatch', body: 'Accepted quotes continue into handoff, documents and shipment readiness.' },
  { icon: 'guru', title: 'Setu Guru AI', body: 'AI supports event leads, quote readiness, document gaps and dispatch blockers with operator approval.' },
];

const workflow = [
  ['vcard', 'vCard'], ['event', 'Event'], ['lead', 'Lead'], ['quote', 'Quote'], ['document', 'Documents'], ['dispatch', 'Dispatch'],
] as [IconName, string][];

function WorkflowRail() {
  return <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,.06)]"><div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><Eyebrow>Workflow</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">From first share to final dispatch.</h2><p className="mt-2 text-sm leading-6 text-slate-500">A connected operating sequence, not a generic sales pipeline.</p></div><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{workflow.map(([icon, title], index) => <div key={title} className="relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-center"><div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><Icon name={icon} className="h-4 w-4" /></div><p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>{index < workflow.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-teal-600 lg:block">→</span>}</div>)}</div></div></div></section>;
}

function FeatureGrid({ items = nativeWins }: { items?: Feature[] }) {
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={item.icon} /><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>)}</div>;
}

function SplitFeature({ eyebrow, title, body, bullets, image, reverse = false, phone = false, dark = false }: { eyebrow: string; title: string; body: string; bullets: string[]; image: string; reverse?: boolean; phone?: boolean; dark?: boolean }) {
  const text = <div><Eyebrow light={dark}>{eyebrow}</Eyebrow><h2 className={`mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2><p className={`mt-4 max-w-xl text-base leading-7 ${dark ? 'text-white/65' : 'text-slate-500'}`}>{body}</p><div className="mt-6 grid gap-3">{bullets.map((b) => <div key={b} className={`flex items-start gap-3 text-sm font-medium ${dark ? 'text-white/75' : 'text-slate-700'}`}><Check light={dark} />{b}</div>)}</div></div>;
  const visual = phone ? <Phone src={image} /> : <Screenshot src={image} alt={title} />;
  return <section className={`${dark ? 'bg-slate-950' : 'bg-white'} px-4 py-16 sm:px-6 lg:px-8`}><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">{reverse ? <>{visual}{text}</> : <>{text}{visual}</>}</div></section>;
}

function PricingCards() {
  const plans = [
    { name: 'Starter', price: '$199', users: 'Up to 5 users', body: 'Lead capture through quote management.', features: ['Native vCard', 'Trade event capture', 'Lead workspace', 'Follow-up workflow', 'Quote management'] },
    { name: 'Growth', price: '$499', users: 'Up to 10 users', body: 'Document manager, order dispatch and integration readiness.', features: ['Everything in Starter', 'Document manager', 'Order dispatch', 'Integration readiness', 'Setu Guru assistance'], featured: true },
    { name: 'Enterprise', price: 'Custom', users: 'Custom users', body: 'All features, customization and rollout support.', features: ['Everything in Growth', 'Custom workflows', 'Advanced integrations', 'Role alignment', 'Executive rollout support'] },
  ];
  return <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="Plans built around workflow maturity." body="Every plan includes vCard, event capture and mobile access. Growth adds the operational layer for documents, dispatch and integrations." /><div className="mt-10 grid gap-6 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`rounded-[1.75rem] border bg-white shadow-[0_18px_56px_rgba(15,23,42,.07)] ${plan.featured ? 'border-teal-500 lg:-translate-y-2' : 'border-slate-200'}`}><div className={`${plan.featured ? 'rounded-t-[1.75rem] bg-slate-950 text-white' : ''} p-7`}><p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${plan.featured ? 'text-teal-200' : 'text-teal-700'}`}>{plan.name}</p><div className="mt-4 flex items-end gap-2"><span className={`text-5xl font-semibold tracking-[-0.05em] ${plan.featured ? 'text-white' : 'text-slate-950'}`}>{plan.price}</span>{plan.price !== 'Custom' && <span className="pb-2 text-sm font-semibold text-slate-400">/ month</span>}</div><p className={`mt-2 text-sm font-bold ${plan.featured ? 'text-teal-200' : 'text-teal-700'}`}>{plan.users}</p><p className={`mt-4 text-sm leading-6 ${plan.featured ? 'text-white/65' : 'text-slate-500'}`}>{plan.body}</p></div><div className="p-7"><ul className="space-y-3">{plan.features.map((f) => <li key={f} className="flex gap-3 text-sm leading-6 text-slate-700"><Check />{f}</li>)}</ul><div className="mt-7"><Button href="/book-demo" variant={plan.featured ? 'primary' : 'secondary'}>Book walkthrough</Button></div></div></article>)}</div></div></section>;
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
  return <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"><div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead><tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Excel + Email</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-200">Setu Flow</th></tr></thead><tbody>{compareRows.map((row) => <tr key={row[0]} className="border-b border-white/5"><td className="px-5 py-4 font-semibold text-white">{row[0]}</td><td className="px-5 py-4 text-white/45">{row[1]}</td><td className="px-5 py-4 text-white/45">{row[2]}</td><td className="px-5 py-4 font-semibold text-teal-50">{row[3]}</td></tr>)}</tbody></table></div></div>;
}

export function HomeMarketingPage() {
  return <Page><section className="bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-18"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"><div><Eyebrow>Setu Flow Home</Eyebrow><h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.5rem]">Trade execution CRM for import-export teams.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Capture relationships, control quotes, manage documents, prepare dispatch, and use Setu Guru AI without stitching together separate tools.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="secondary">Explore Platform</Button></div></div><div className="relative grid gap-5 lg:grid-cols-[0.62fr_1fr] lg:items-center"><Phone /><Screenshot src={img.command} alt="Setu Flow command center" label="Representative command center" /><div className="absolute -bottom-5 right-6 hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl lg:block"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Native workflow</p><p className="mt-1 text-sm font-semibold text-slate-800">vCard → Quote → Documents → Dispatch</p></div></div></div></section><section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Why Setu Flow" title="Built for trade execution, not just deal tracking." body="A buyer should see immediately why this is different from a normal sales CRM." /><div className="mt-10"><FeatureGrid items={nativeWins.slice(0, 6)} /></div></div></section><WorkflowRail /><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"><Screenshot src={img.docs} alt="Setu Flow document manager" /><div><Eyebrow>Proof</Eyebrow><h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">The work does not stop when the quote is accepted.</h2><p className="mt-4 text-base leading-7 text-slate-500">Most tools are strongest before the deal closes. Setu Flow keeps the work moving through documents, operations and dispatch readiness.</p><div className="mt-6 grid gap-3">{['Document manager is part of the workflow', 'Order dispatch is visible after commercial approval', 'Setu Guru helps operators find gaps before they become blockers'].map((item) => <div key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700"><Check />{item}</div>)}</div></div></div></section><section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div><GuruMark dark large /><h2 className="mt-6 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">Setu Guru is the trade intelligence layer.</h2><p className="mt-4 text-base leading-7 text-white/65">It helps summarize event leads, review quote readiness, surface document gaps and prepare dispatch-focused next actions — always operator-approved.</p><div className="mt-7"><Button href="/setu-guru-ai">Explore Setu Guru</Button></div></div><div className="grid gap-3 sm:grid-cols-2">{['Which event leads need follow-up?', 'What blocks dispatch readiness?', 'Draft an update from this quote.', 'Summarize document gaps.'].map((q) => <div key={q} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 text-sm font-medium leading-6 text-white/78">{q}</div>)}</div></div></section><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><SectionTitle left eyebrow="Compare" title="Where normal CRMs stop, Setu Flow continues." body="The detailed comparison explains what is native in Setu Flow versus stitched together elsewhere." /><div className="grid gap-3 sm:grid-cols-3">{['vCard + events', 'Documents + dispatch', 'Setu Guru AI'].map((x) => <div key={x} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-900">{x}</div>)}</div></div><div className="mt-8 text-center"><Button href="/compare" variant="secondary">Open comparison</Button></div></section><CTA /></Page>;
}

export function PlatformMarketingPage() {
  return <Page><section className="bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-18"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"><div><Eyebrow>Platform</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.25rem]">One operating system for trade execution.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A product tour built around the actual sequence: vCard, events, leads, quotes, documents, dispatch, mobile and Setu Guru.</p><div className="mt-8 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/compare" variant="secondary">Compare</Button></div></div><Screenshot src={img.command} alt="Setu Flow platform command center" /></div></section><WorkflowRail /><SplitFeature eyebrow="Native vCard" title="Contact sharing becomes lead capture." body="The share-card experience is not a side asset. It turns QR scans, save-contact actions and shared links into structured follow-up." bullets={['Built for trade shows and buyer visits', 'QR-led contact capture', 'Lead ownership after the conversation']} image={img.vcard} phone /><SplitFeature eyebrow="Trade events" title="Events become pipeline, not loose notes." body="Dedicated event workflows help teams capture source context, assign ownership and follow up quickly." bullets={['Event source stays attached', 'Owners work from one queue', 'Leaders see event-driven pipeline']} image={img.events} reverse /><SplitFeature eyebrow="Quote management" title="Control the commercial moment." body="Setu Flow keeps terms, pricing context and approval readiness inside the quote workflow." bullets={['Structured quote preparation', 'Approval readiness before sending', 'Buyer communication context']} image={img.quote} /><SplitFeature eyebrow="Document manager" title="Documents are execution readiness." body="Instead of storing attachments, Setu Flow helps teams see what is missing, ready or blocking handoff." bullets={['Readiness view before operations', 'Gaps visible before dispatch', 'Cleaner commercial-to-operations handoff']} image={img.docs} reverse /><SplitFeature eyebrow="Order dispatch" title="Accepted quotes continue into execution." body="Order dispatch connects commercial approvals with operations, document readiness and shipment preparation." bullets={['Execution desk after approval', 'Order handoff and dispatch readiness', 'Fewer disconnected trackers']} image={img.orders} /><SplitFeature eyebrow="Mobile + Setu Guru" title="Field work and AI stay connected." body="Mobile screens support events and buyer meetings while Setu Guru helps operators summarize, draft and flag gaps." bullets={['Mobile-ready event and lead capture', 'Setu Guru workflow assistance', 'Operator-approved next actions']} image={img.mobileDashboard} phone dark /><CTA /></Page>;
}

export function SolutionsMarketingPage() {
  const items: Feature[] = [
    { icon: 'global', title: 'Exporters', body: 'Buyer qualification, quote control, documents and dispatch readiness in one workflow.' },
    { icon: 'team', title: 'Importers', body: 'Supplier follow-ups, quotes and handoffs stay connected from the first discussion.' },
    { icon: 'event', title: 'Trade event teams', body: 'Capture exhibition and buyer-meeting leads with source context and ownership.' },
    { icon: 'vcard', title: 'vCard-led sellers', body: 'Turn QR sharing and contact exchange into CRM-ready opportunities.' },
    { icon: 'quote', title: 'Commercial teams', body: 'Prepare quotes, manage approvals and keep buyer follow-up visible.' },
    { icon: 'dispatch', title: 'Operations teams', body: 'Move accepted quotes into documents, handoff and dispatch readiness.' },
  ];
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle left eyebrow="Solutions" title="Built for the teams that carry trade from conversation to shipment." body="The product is strongest when commercial and operations work together instead of passing spreadsheets back and forth." /><div className="mt-10"><FeatureGrid items={items} /></div></div></section><CTA title="Book a solution-specific walkthrough" /></Page>;
}

export function SetuGuruMarketingPage() {
  return <Page><section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><GuruMark dark large /><h1 className="mt-8 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-[4.25rem]">AI assistance made for trade execution.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/65">Setu Guru is not a generic chatbot. It supports lead context, quote readiness, document gaps, dispatch blockers and follow-up drafting. It suggests; your team approves.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">See Guru in a walkthrough</Button><Button href="/platform" variant="ghost">Explore platform</Button></div></div><div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 pb-5"><GuruMark dark /><span className="rounded-full bg-teal-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200">Operator-approved</span></div><div className="mt-5 grid gap-3">{['Prioritize event leads that need follow-up today.', 'Summarize quote readiness and buyer context.', 'Find document gaps before the order handoff.', 'Prepare a dispatch-ready status update.'].map((q) => <div key={q} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 text-sm font-medium leading-6 text-white/78">{q}</div>)}</div></div></div></section><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Where Guru helps" title="A trade intelligence layer across the workflow." /><div className="mt-10"><FeatureGrid items={[{ icon: 'event', title: 'Event lead context', body: 'Summarize what happened and what should happen next.' }, { icon: 'quote', title: 'Quote readiness', body: 'Review quote status, stale activity, terms and approval posture.' }, { icon: 'document', title: 'Document gaps', body: 'Surface missing items before operations gets blocked.' }, { icon: 'dispatch', title: 'Dispatch readiness', body: 'Help operators see what still blocks order handoff.' }, { icon: 'guru', title: 'Follow-up drafting', body: 'Draft messages for operator review before sending.' }, { icon: 'compare', title: 'Prioritization', body: 'Focus teams on accounts and quotes that need attention first.' }]} /></div></div></section><CTA title="Experience Setu Guru in your workflow" /></Page>;
}

export function MobileMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><Eyebrow>Field Mobile</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.25rem]">Mobile-ready trade workflows for the field.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Capture leads, share vCards, review next actions and keep momentum moving from trade shows, buyer meetings and travel days.</p><div className="mt-8"><Button href="/book-demo">Book a Demo</Button></div></div><div className="grid grid-cols-3 gap-4">{[[img.mobileDashboard, 'Dashboard'], [img.mobileLeads, 'Leads'], [img.mobileQuickLead, 'Quick lead']].map(([src, label]) => <div key={src} className="rounded-[1.75rem] bg-slate-950 p-2 shadow-[0_22px_70px_rgba(15,23,42,.18)]"><Image src={src} alt={label} width={425} height={907} className="rounded-[1.3rem]" /><p className="py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200/75">{label}</p></div>)}</div></div></section><CTA /></Page>;
}

export function PricingMarketingPage() {
  return <Page><PricingCards /><CTA title="Book a pricing walkthrough" body="We will map the plan to your users, quote workflow, document manager, dispatch needs and integrations." /></Page>;
}

export function CompareMarketingPage() {
  return <Page><section className="bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center"><div><Eyebrow>Compare</Eyebrow><h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.25rem]">Native trade execution versus stitched-together tools.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Broad CRMs are powerful for sales activity. Trade teams also need vCard capture, events, quote control, document readiness, dispatch and AI support in one operating flow.</p><div className="mt-8 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/pricing" variant="secondary">Pricing</Button></div></div><div className="grid gap-4 sm:grid-cols-2">{[{ icon: 'vcard' as IconName, title: 'Native vCard + events', body: 'Not separate capture tools.' }, { icon: 'document' as IconName, title: 'Document manager', body: 'Readiness, not just attachments.' }, { icon: 'dispatch' as IconName, title: 'Order dispatch', body: 'Execution after quote approval.' }, { icon: 'guru' as IconName, title: 'Setu Guru AI', body: 'Trade workflow assistance.' }].map((c) => <div key={c.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]"><IconBox icon={c.icon} /><p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{c.title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{c.body}</p></div>)}</div></div></section><section className="bg-white px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6"><div className="grid gap-5 md:grid-cols-3"><div><p className="text-sm font-semibold text-slate-950">Sales CRMs</p><p className="mt-2 text-sm leading-6 text-slate-500">Excellent for contacts, pipelines, automation and sales reporting.</p></div><div><p className="text-sm font-semibold text-slate-950">Trade teams</p><p className="mt-2 text-sm leading-6 text-slate-500">Need work to continue into documents, operations, handoff and dispatch.</p></div><div><p className="text-sm font-semibold text-slate-950">Setu Flow</p><p className="mt-2 text-sm leading-6 text-slate-500">Connects the commercial and execution chain in one trade-specific workflow.</p></div></div></div></section><section className="bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle light eyebrow="Detailed comparison" title="Where Setu Flow is native." body="This is the comparison clients should understand: generic tools can be strong, but trade execution often requires more than activity tracking." /><div className="mt-10"><ComparisonTable /></div></div></section><CTA /></Page>;
}

export function BookDemoMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.10)] lg:grid-cols-[0.78fr_1.22fr]"><aside className="bg-slate-950 p-8 text-white"><Eyebrow light>30 minute walkthrough</Eyebrow><h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">Map Setu Flow to your trade workflow.</h1><p className="mt-4 text-sm leading-7 text-white/62">We will cover vCard, trade events, quote management, documents, dispatch, mobile, Setu Guru and pricing fit.</p><div className="mt-7 grid gap-3">{['Your current lead-to-dispatch workflow', 'Best plan fit: Starter, Growth or Enterprise', 'Product visuals tied to your use case', 'Setu Guru operator approval model'].map((item) => <div key={item} className="flex gap-3 text-sm text-white/75"><Check light />{item}</div>)}</div><div className="mt-8"><Phone /></div></aside><div className="p-6 sm:p-8"><BookDemoForm /></div></div></section></Page>;
}
