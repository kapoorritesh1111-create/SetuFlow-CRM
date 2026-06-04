import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

type IconName = 'vcard' | 'events' | 'lead' | 'quote' | 'document' | 'ship' | 'mobile' | 'guru' | 'users' | 'globe' | 'calendar' | 'chart';
type Feature = { icon: IconName; title: string; body: string };

const shot = {
  command: '/marketing/dashboard-command-center.png',
  events: '/marketing/trade-events.png',
  quote: '/marketing/quote-workflow.png',
  vcard: '/internal/docs-screenshots/ss-vcard.jpg',
  docs: '/internal/docs-screenshots/ss-documents.jpg',
  orders: '/internal/docs-screenshots/ss-orders.jpg',
  mobileDashboard: '/marketing/mobile-dashboard.png',
  mobileLeads: '/marketing/mobile-leads.png',
  mobileQuickLead: '/marketing/mobile-quick-lead.png',
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    vcard: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7.5 11h.01M11 11h6M11 15h4"/></>,
    events: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></>,
    lead: <><circle cx="9" cy="8" r="4"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><path d="M17 8h4M19 6v4"/></>,
    quote: <><path d="M6 7h12M6 11h12M6 15h7"/><rect x="3" y="4" width="18" height="16" rx="3"/></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14h8M8 18h5"/></>,
    ship: <><path d="M3 17h18M6 17 4 10h16l-2 7M8 10V6h8v4"/><path d="M5 20c1.2.8 2.8.8 4 0 1.2.8 2.8.8 4 0 1.2.8 2.8.8 4 0"/></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    guru: <><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="m21 3-8 8"/><path d="M8.5 13.5 11 16l5-6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.8"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>,
    calendar: <><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 8-5 6-4-4-3 5"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Page({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white text-slate-950">{children}</main></SiteShell>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-xs font-black uppercase tracking-widest ${light ? 'text-teal-300' : 'text-teal-700'}`}>{children}</p>;
}

function Button({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'dark' | 'ghost' }) {
  const styles = {
    primary: 'bg-teal-600 text-white shadow-xl hover:bg-teal-700',
    secondary: 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50',
    dark: 'bg-slate-950 text-white shadow-xl hover:bg-slate-800',
    ghost: 'border border-white/20 bg-white/10 text-white hover:bg-white/15',
  }[variant];
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${styles}`}>{children}<span>→</span></Link>;
}

function SectionTitle({ eyebrow, title, body, light = false, left = false }: { eyebrow: string; title: ReactNode; body?: string; light?: boolean; left?: boolean }) {
  return <div className={`${left ? '' : 'mx-auto text-center'} max-w-3xl`}><Eyebrow light={light}>{eyebrow}</Eyebrow><h2 className={`mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>{body && <p className={`mt-4 text-base leading-7 ${light ? 'text-white/65' : 'text-slate-500'}`}>{body}</p>}</div>;
}

function Check({ light = false }: { light?: boolean }) {
  return <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-black ${light ? 'bg-teal-300/20 text-teal-200' : 'bg-teal-50 text-teal-700'}`}>✓</span>;
}

function IconBox({ icon, dark = false }: { icon: IconName; dark?: boolean }) {
  return <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${dark ? 'bg-white/10 text-teal-300' : 'bg-teal-50 text-teal-700'}`}><Icon name={icon} /></span>;
}

function GuruLogo({ dark = false }: { dark?: boolean }) {
  return <div className="flex items-center gap-3"><Image src="/logos/setu-guru-icon.svg" alt="Setu Guru" width={54} height={54} className="rounded-2xl object-contain" /><div><p className={`text-2xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>Setu Guru</p><p className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-teal-300' : 'text-teal-700'}`}>Native trade AI</p></div></div>;
}

function Screenshot({ src, alt, label }: { src: string; alt: string; label?: string }) {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/70"><Image src={src} alt={alt} width={1600} height={1000} className="h-full w-full rounded-2xl object-cover object-top" />{label && <p className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>}</div>;
}

function Phone({ src = shot.vcard }: { src?: string }) {
  return <div className="mx-auto max-w-xs rounded-3xl bg-slate-950 p-2 shadow-2xl shadow-slate-300"><Image src={src} alt="Setu Flow mobile product view" width={720} height={1320} className="rounded-2xl object-contain" /></div>;
}

function CTA({ title = 'See how Setu Flow maps to your trade workflow.', body = 'A focused walkthrough for your vCard, events, quotes, documents, dispatch, integrations and Setu Guru needs.' }: { title?: string; body?: string }) {
  return <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-3xl bg-slate-950 p-8 text-white shadow-2xl"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><Eyebrow light>Product walkthrough</Eyebrow><h2 className="mt-2 text-3xl font-black tracking-tight">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{body}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="ghost">Explore Platform</Button></div></div></div></section>;
}

const workflow = [
  ['vcard', 'vCard'], ['events', 'Event'], ['lead', 'Lead'], ['quote', 'Quote'], ['document', 'Documents'], ['ship', 'Dispatch'],
] as [IconName, string][];

function Workflow() {
  return <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"><div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><Eyebrow>Workflow</Eyebrow><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">From first share to final dispatch.</h2><p className="mt-3 text-sm leading-6 text-slate-500">A connected sequence for import-export teams, not a generic sales pipeline.</p></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{workflow.map(([icon, title], index) => <div key={title} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><Icon name={icon} /></div><p className="mt-2 text-sm font-black text-slate-950">{title}</p>{index < workflow.length - 1 && <span className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-teal-600 lg:block">→</span>}</div>)}</div></div></div></section>;
}

function Capabilities({ items }: { items: Feature[] }) {
  return <div className="grid gap-5 md:grid-cols-3">{items.map((item) => <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100"><IconBox icon={item.icon} /><h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>)}</div>;
}

function FeatureBand({ eyebrow, title, body, bullets, image, reverse = false, phone = false, dark = false }: { eyebrow: string; title: string; body: string; bullets: string[]; image: string; reverse?: boolean; phone?: boolean; dark?: boolean }) {
  const text = <div><Eyebrow light={dark}>{eyebrow}</Eyebrow><h2 className={`mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2><p className={`mt-4 max-w-xl text-base leading-7 ${dark ? 'text-white/65' : 'text-slate-500'}`}>{body}</p><div className="mt-6 grid gap-3">{bullets.map((b) => <div key={b} className={`flex items-start gap-3 text-sm font-semibold ${dark ? 'text-white/75' : 'text-slate-700'}`}><Check light={dark} />{b}</div>)}</div></div>;
  const visual = phone ? <Phone src={image} /> : <Screenshot src={image} alt={title} />;
  return <section className={`${dark ? 'bg-slate-950' : 'bg-white'} px-4 py-16 sm:px-6 lg:px-8`}><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">{reverse ? <>{visual}{text}</> : <>{text}{visual}</>}</div></section>;
}

function PricingCards() {
  const plans = [
    ['Starter', '$199', 'Up to 5 users', 'Lead capture through quote management.', ['Native vCard', 'Trade event capture', 'Lead workspace', 'Follow-up workflow', 'Quote management']],
    ['Growth', '$499', 'Up to 10 users', 'Document manager, order dispatch and integration readiness.', ['Everything in Starter', 'Document manager', 'Order dispatch', 'Integration readiness', 'Setu Guru assistance']],
    ['Enterprise', 'Custom', 'Custom users', 'All features, customization and rollout support.', ['Everything in Growth', 'Custom workflows', 'Advanced integrations', 'Role alignment', 'Executive rollout support']],
  ];
  return <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="Simple pricing for the workflow you need to run." body="Every plan includes vCard, event capture and mobile access. Growth adds the operational layer." /><div className="mt-10 grid gap-6 lg:grid-cols-3">{plans.map(([name, price, users, body, features], idx) => <article key={name as string} className={`rounded-3xl border bg-white shadow-2xl shadow-slate-200/60 ${idx === 1 ? 'border-teal-500 lg:-translate-y-3' : 'border-slate-200'}`}><div className={`${idx === 1 ? 'rounded-t-3xl bg-slate-950 text-white' : ''} p-7`}><p className={`text-xs font-black uppercase tracking-widest ${idx === 1 ? 'text-teal-300' : 'text-teal-700'}`}>{name}</p><div className="mt-4 flex items-end gap-2"><span className={`text-5xl font-black tracking-tight ${idx === 1 ? 'text-white' : 'text-slate-950'}`}>{price}</span>{price !== 'Custom' && <span className="pb-2 text-sm font-bold text-slate-400">/ month</span>}</div><p className={`mt-2 text-sm font-black ${idx === 1 ? 'text-teal-300' : 'text-teal-700'}`}>{users}</p><p className={`mt-4 text-sm leading-6 ${idx === 1 ? 'text-white/65' : 'text-slate-500'}`}>{body}</p></div><div className="p-7"><ul className="space-y-3">{(features as string[]).map((f) => <li key={f} className="flex gap-3 text-sm leading-6 text-slate-700"><Check />{f}</li>)}</ul><div className="mt-7"><Button href="/book-demo" variant={idx === 1 ? 'primary' : 'secondary'}>Book walkthrough</Button></div></div></article>)}</div></div></section>;
}

function CompareTable({ compact = false }: { compact?: boolean }) {
  const rows = [
    ['Digital vCard', 'Separate tool', 'Add-on', 'Native QR share card tied to lead ownership'],
    ['Trade events', 'Manual lists', 'Campaign setup', 'Dedicated event intake and follow-up routing'],
    ['Quote management', 'Spreadsheets', 'Custom objects', 'Terms and approval readiness in the workflow'],
    ['Document manager', 'Folder chasing', 'Attachments only', 'Readiness workflow before dispatch'],
    ['Order dispatch', 'Separate tracker', 'Ops works elsewhere', 'Execution desk for handoff and dispatch readiness'],
    ['Setu Guru AI', 'Separate chatbot', 'Generic assistant', 'Workflow assistance, operator-approved'],
  ];
  return <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"><div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead><tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-white/35"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Excel + Email</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-300">Setu Flow</th></tr></thead><tbody>{(compact ? rows.slice(0, 4) : rows).map((row) => <tr key={row[0]} className="border-b border-white/5"><td className="px-5 py-4 font-bold text-white">{row[0]}</td><td className="px-5 py-4 text-white/45">{row[1]}</td><td className="px-5 py-4 text-white/45">{row[2]}</td><td className="px-5 py-4 font-bold text-teal-100">{row[3]}</td></tr>)}</tbody></table></div></div>;
}

export function HomeMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><Eyebrow>Trade Execution CRM</Eyebrow><h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-7xl">Run trade work from first share to final dispatch.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Setu Flow connects vCard, events, leads, quotes, documents, order dispatch and Setu Guru AI in one workflow for import-export teams.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" variant="secondary">Explore Platform</Button></div></div><div className="grid gap-5 lg:grid-cols-[0.65fr_1fr] lg:items-center"><Phone /><Screenshot src={shot.command} alt="Setu Flow command center" label="Command center view" /></div></div></section><section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Why Setu Flow" title="Native trade capabilities, not add-ons stitched together." body="A premium trade CRM should prove how it captures relationships, controls commercial work and keeps execution moving." /><div className="mt-10"><Capabilities items={[{ icon: 'vcard', title: 'vCard and event capture', body: 'QR-led sharing and trade event intake feed directly into lead ownership.' }, { icon: 'quote', title: 'Quote control', body: 'Terms, pricing and approval readiness stay visible before a quote goes out.' }, { icon: 'document', title: 'Document manager', body: 'Documents move from afterthought to readiness workflow before dispatch.' }, { icon: 'ship', title: 'Order dispatch', body: 'Accepted quotes keep moving into order execution and dispatch readiness.' }, { icon: 'guru', title: 'Setu Guru AI', body: 'AI helps summarize, draft, flag gaps and prioritize work while operators approve.' }, { icon: 'mobile', title: 'Field mobile', body: 'Mobile screens keep events, buyer visits and travel days connected to the CRM.' }]} /></div></div></section><Workflow /><FeatureBand eyebrow="Product proof" title="Use fewer visuals, make each one count." body="The homepage now stays tighter while using vCard, documents and dispatch as proof of real product depth." bullets={['Native vCard proof for relationship-led selling', 'Document manager and dispatch readiness are visible', 'Setu Guru is positioned as a workflow layer']} image={shot.docs} reverse /><section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><GuruLogo dark /><h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Setu Guru supports trade execution end to end.</h2><p className="mt-4 text-base leading-7 text-white/65">From event lead context to quote readiness, document gaps and dispatch blockers, Guru works where the operator already is.</p><div className="mt-7"><Button href="/setu-guru-ai">Explore Setu Guru</Button></div></div><div className="grid gap-3 sm:grid-cols-2">{['Which event leads need a follow-up?', 'What is missing before dispatch?', 'Draft an update from this quote.', 'Summarize document gaps.'].map((q) => <div key={q} className="rounded-2xl border border-white/10 bg-white/10 p-5 text-sm font-bold text-white/80">{q}</div>)}</div></div></section><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center"><SectionTitle left eyebrow="Compare" title="Generic CRMs track deals. Setu Flow runs trade execution." body="The full comparison shows where Setu Flow is native instead of needing add-ons." /><div className="grid gap-4 md:grid-cols-3">{['Native vCard + events', 'Documents + dispatch', 'Setu Guru AI'].map((x) => <div key={x} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-black text-slate-900">{x}</div>)}</div></div><div className="mt-8 text-center"><Button href="/compare" variant="secondary">Open comparison</Button></div></section><CTA /></Page>;
}

export function PlatformMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><Eyebrow>Platform</Eyebrow><h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-7xl">A product tour built like a workflow, not a gallery.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Setu Flow brings vCard, events, quotes, documents, dispatch, mobile and Setu Guru into one connected trade execution platform.</p><div className="mt-8 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/compare" variant="secondary">Compare</Button></div></div><Screenshot src={shot.command} alt="Setu Flow platform command center" /></div></section><Workflow /><FeatureBand eyebrow="Native vCard" title="Turn contact sharing into lead capture." body="The vCard experience is not a side tool. QR sharing, save contact, email and share actions connect relationship-led selling back to the CRM." bullets={['Built for trade shows and buyer visits', 'QR-led sharing and contact capture', 'Lead ownership after the interaction']} image={shot.vcard} phone /><FeatureBand eyebrow="Trade events" title="Capture context while the meeting is fresh." body="Trade event pages turn exhibitions, buyer meetings and field conversations into owned opportunities." bullets={['Event source stays attached', 'Owners can follow up from one queue', 'Leaders see event-driven pipeline']} image={shot.events} reverse /><FeatureBand eyebrow="Quote management" title="Control the commercial moment." body="Setu Flow keeps terms, price context and approval readiness inside the quote workflow." bullets={['Structured quote workflow', 'Approval readiness', 'Buyer communication context']} image={shot.quote} /><FeatureBand eyebrow="Document manager" title="Documents are part of execution." body="The document manager gives operations a clear view of what is ready, missing or blocking handoff." bullets={['Document readiness view', 'Gaps visible before dispatch', 'Cleaner commercial-to-operations handoff']} image={shot.docs} reverse /><FeatureBand eyebrow="Order dispatch" title="Accepted quotes keep moving." body="Order dispatch connects commercial context with operations, documents and shipment readiness." bullets={['Execution desk after approval', 'Order handoff and dispatch readiness', 'Fewer disconnected trackers']} image={shot.orders} /><FeatureBand eyebrow="Mobile + Setu Guru" title="Field work and AI assistance stay connected." body="Mobile screens support events and buyer meetings while Setu Guru helps operators summarize, draft and flag gaps." bullets={['Mobile-ready event and lead capture', 'Setu Guru workflow assistance', 'Operator-approved next actions']} image={shot.mobileDashboard} phone dark /><CTA /></Page>;
}

export function SolutionsMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto max-w-7xl"><SectionTitle left eyebrow="Solutions" title="Built for trade teams that need execution, not activity tracking." body="Setu Flow supports commercial and operations teams across export, import, events, vCard-led selling and dispatch." /><div className="mt-10"><Capabilities items={[{ icon: 'globe', title: 'Exporters', body: 'Buyer qualification, quote control, documents and dispatch readiness.' }, { icon: 'users', title: 'Importers', body: 'Supplier follow-ups, quotes and handoffs stay connected.' }, { icon: 'events', title: 'Trade event teams', body: 'Capture event leads with source context and ownership.' }, { icon: 'vcard', title: 'vCard-led sellers', body: 'Turn QR sharing into CRM-ready opportunities.' }, { icon: 'quote', title: 'Commercial teams', body: 'Prepare quotes, manage approvals and keep follow-up visible.' }, { icon: 'ship', title: 'Operations teams', body: 'Move accepted quotes into documents and dispatch readiness.' }]} /></div></div></section><CTA title="Book a solution-specific walkthrough" /></Page>;
}

export function SetuGuruMarketingPage() {
  return <Page><section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><GuruLogo dark /><h1 className="mt-8 text-5xl font-black leading-none tracking-tight sm:text-7xl">AI assistance made for trade execution.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/65">Setu Guru supports lead context, quote readiness, document gaps, dispatch blockers and follow-up drafting. It suggests; your team approves.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">See Guru in a walkthrough</Button><Button href="/platform" variant="ghost">Explore platform</Button></div></div><div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 pb-5"><GuruLogo dark /><span className="rounded-full bg-teal-300/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-teal-300">Operator-approved</span></div><div className="mt-5 grid gap-3">{['Prioritize event leads that need follow-up today.', 'Summarize quote readiness and buyer context.', 'Find document gaps before the order handoff.', 'Prepare a dispatch-ready status update.'].map((q) => <div key={q} className="rounded-2xl border border-white/10 bg-white/10 p-5 text-sm font-semibold leading-6 text-white/75">{q}</div>)}</div></div></div></section><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Where Guru helps" title="AI support across the whole trade workflow." /><div className="mt-10"><Capabilities items={[{ icon: 'events', title: 'Event lead context', body: 'Summarize what happened and what should happen next.' }, { icon: 'quote', title: 'Quote readiness', body: 'Review status, activity, terms and approval posture.' }, { icon: 'document', title: 'Document gaps', body: 'Surface missing items before operations gets blocked.' }, { icon: 'ship', title: 'Dispatch readiness', body: 'Help operators see what still blocks order handoff.' }, { icon: 'guru', title: 'Follow-up drafting', body: 'Draft messages for operator review before sending.' }, { icon: 'chart', title: 'Prioritization', body: 'Focus teams on accounts and quotes that need attention first.' }]} /></div></div></section><CTA title="Experience Setu Guru in your workflow" /></Page>;
}

export function MobileMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><Eyebrow>Field Mobile</Eyebrow><h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-7xl">Mobile-ready trade workflows for the field.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Capture leads, share vCards, review next actions and keep momentum moving from trade shows, buyer meetings and travel days.</p><div className="mt-8"><Button href="/book-demo">Book a Demo</Button></div></div><div className="grid grid-cols-3 gap-4">{[[shot.mobileDashboard, 'Dashboard'], [shot.mobileLeads, 'Leads'], [shot.mobileQuickLead, 'Quick lead']].map(([src, label]) => <div key={src} className="rounded-3xl bg-slate-950 p-2 shadow-2xl"><Image src={src} alt={label} width={425} height={907} className="rounded-2xl" /><p className="py-3 text-center text-xs font-black uppercase tracking-widest text-teal-300/75">{label}</p></div>)}</div></div></section><CTA /></Page>;
}

export function PricingMarketingPage() {
  return <Page><PricingCards /><CTA title="Book a pricing walkthrough" body="We will map the plan to your users, quote workflow, document manager, dispatch needs and integrations." /></Page>;
}

export function CompareMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><Eyebrow>Compare</Eyebrow><h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-7xl">What Setu Flow does natively that most tools add later.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Setu Flow is built around trade execution: vCard, events, quote control, documents, dispatch and native AI.</p><div className="mt-8 flex gap-3"><Button href="/book-demo">Book a Demo</Button><Button href="/pricing" variant="secondary">Pricing</Button></div></div><div className="grid gap-5 sm:grid-cols-2">{[{ icon: 'vcard' as IconName, title: 'Native vCard + events' }, { icon: 'document' as IconName, title: 'Document manager' }, { icon: 'ship' as IconName, title: 'Order dispatch' }, { icon: 'guru' as IconName, title: 'Setu Guru AI' }].map((c) => <div key={c.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100"><IconBox icon={c.icon} /><p className="mt-5 text-xl font-black tracking-tight text-slate-950">{c.title}</p></div>)}</div></div></section><section className="bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle light eyebrow="Comparison" title="Generic CRMs track activity. Setu Flow runs the trade workflow." body="The table is proof, not the entire story." /><div className="mt-10"><CompareTable /></div></div></section><CTA /></Page>;
}

export function BookDemoMarketingPage() {
  return <Page><section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[0.75fr_1.25fr]"><aside className="bg-slate-950 p-8 text-white"><Eyebrow light>30 minute walkthrough</Eyebrow><h1 className="mt-4 text-4xl font-black tracking-tight">Map Setu Flow to your trade workflow.</h1><p className="mt-4 text-sm leading-7 text-white/60">We will cover vCard, trade events, quote management, documents, dispatch, mobile, Setu Guru and pricing fit.</p><div className="mt-7 grid gap-3">{['Your current lead-to-dispatch workflow', 'Best plan fit: Starter, Growth or Enterprise', 'Product visuals tied to your use case', 'Setu Guru operator approval model'].map((item) => <div key={item} className="flex gap-3 text-sm text-white/75"><Check light />{item}</div>)}</div><div className="mt-8"><Phone /></div></aside><div className="p-6 sm:p-8"><BookDemoForm /></div></div></section></Page>;
}
