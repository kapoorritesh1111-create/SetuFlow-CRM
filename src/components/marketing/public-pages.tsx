import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

type IconName = 'lead' | 'quote' | 'approval' | 'order' | 'document' | 'task' | 'mobile' | 'shield' | 'globe' | 'chart' | 'package' | 'message' | 'calendar' | 'search' | 'users' | 'ship';
type Feature = { icon: IconName; title: string; body: string; href?: string };
type Shot = { src: string; title: string; body: string; label: string };

const productShots: Shot[] = [
  { src: '/marketing/dashboard-command-center.png', title: 'Command view', label: 'Sample dashboard screenshot', body: 'A client can review lead activity, pipeline health, follow-ups and trade workflow status from one public product view.' },
  { src: '/marketing/follow-up-queue.png', title: 'Follow-up queue', label: 'Sample lead workflow screenshot', body: 'Teams can see what needs action next without relying on spreadsheet reminders or scattered email threads.' },
  { src: '/marketing/quote-workflow.png', title: 'Quote workflow', label: 'Sample quote screenshot', body: 'Pricing, terms, approval readiness and quote delivery are presented as a governed workflow.' },
  { src: '/marketing/orders-execution.png', title: 'Execution desk', label: 'Sample order screenshot', body: 'Accepted quotes can move into orders, document readiness, dispatch checks and execution handoffs.' },
  { src: '/marketing/pipeline-commercial-view.png', title: 'Pipeline board', label: 'Sample pipeline screenshot', body: 'Commercial teams can inspect deals by stage and understand what is ready, blocked or waiting for approval.' },
];

const mobileShots: Shot[] = [
  { src: '/marketing/mobile-dashboard.png', title: 'Mobile overview', label: 'Sample mobile screenshot', body: 'A compact mobile view for trade activity while the team is away from the desk.' },
  { src: '/marketing/mobile-leads.png', title: 'Mobile leads', label: 'Sample mobile screenshot', body: 'A field-ready lead list designed for quick review and follow-up.' },
  { src: '/marketing/mobile-quick-lead.png', title: 'Quick lead capture', label: 'Sample mobile screenshot', body: 'A fast mobile capture flow for trade shows, calls and buyer conversations.' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    lead: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></>,
    quote: <><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></>,
    approval: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    order: <><path d="M21 8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></>,
    task: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    package: <><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M12 22V12"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
    calendar: <><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    ship: <><path d="M3 17h18"/><path d="M6 17 4 9h16l-2 8"/><path d="M8 9V5h8v4"/><path d="M6 21c1 0 1.5-.5 2-1s1-.5 2 0 1.5 1 2.5 1 1.5-.5 2-1 1-.5 2 0 1.5 1 2.5 1"/></>,
  };

  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function GuruIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return <Image src="/logos/setu-guru-icon.svg" alt="Setu Guru" width={96} height={96} className={className} />;
}

function PageShell({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white">{children}</main></SiteShell>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={light ? 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#7de2d2]' : 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#108477]'}>{children}</p>;
}

function ButtonLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'dark' }) {
  const cls = variant === 'primary' ? 'bg-[#059f90] text-white shadow-[0_16px_42px_rgba(5,159,144,0.22)] hover:bg-[#07897d]' : variant === 'dark' ? 'bg-[#061c2e] text-white shadow-[0_16px_42px_rgba(6,28,46,0.18)] hover:bg-[#0b2e4a]' : 'border border-[#108477]/35 bg-white text-[#108477] hover:bg-[#eef6fb]';
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${cls}`}>{children}<span aria-hidden>→</span></Link>;
}

function Orb({ icon }: { icon: IconName }) {
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]"><Icon name={icon} /></span>;
}

function CheckLine({ children }: { children: ReactNode }) {
  return <li className="flex gap-3 text-sm leading-6 text-slate-600"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e6faf6] text-[11px] text-[#108477]">✓</span><span>{children}</span></li>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return <div className="mx-auto max-w-3xl text-center"><Eyebrow light={light}>{eyebrow}</Eyebrow><h2 className={light ? 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl' : 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl'}>{title}</h2>{body && <p className={light ? 'mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64' : 'mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600'}>{body}</p>}</div>;
}

function Hero({ eyebrow, title, body, visual = 'dashboard' }: { eyebrow?: string; title: ReactNode; body: string; visual?: 'dashboard' | 'guru' | 'booking' }) {
  return <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20"><div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_80%_20%,rgba(125,226,210,0.18),transparent_50%),linear-gradient(115deg,transparent,rgba(12,127,255,0.06))]"/><div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div>{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">{title}</h1><p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">{body}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink href="/book-demo">Book a Demo</ButtonLink><ButtonLink href="/platform" variant="secondary">Explore Platform</ButtonLink></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">All product visuals are example screenshots, not live workspace data.</p></div>{visual === 'guru' ? <GuruPanel/> : visual === 'booking' ? <BookingVisual/> : <ScreenshotFrame shot={productShots[0]} large/>}</div></section>;
}

function ScreenshotFrame({ shot, large = false }: { shot: Shot; large?: boolean }) {
  return <article className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-3 shadow-[0_28px_90px_rgba(31,72,124,0.12)]"><div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#eef6fb]"><Image src={shot.src} alt={`${shot.title} example screenshot`} width={1600} height={1000} className={large ? 'h-auto w-full object-cover object-top' : 'h-56 w-full object-cover object-top sm:h-72'} /></div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#108477]">{shot.label}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-950">{shot.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{shot.body}</p></div></article>;
}

function FeatureCards({ items }: { items: Feature[] }) {
  return <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">{items.map(item => <article key={item.title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_18px_55px_rgba(31,72,124,0.07)]"><Orb icon={item.icon}/><h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p><Link href={item.href || '/platform'} className="mt-5 inline-flex text-sm font-bold text-[#108477]">Learn more →</Link></article>)}</div>;
}

function GuruPanel() {
  return <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_28px_90px_rgba(31,72,124,0.12)]"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><GuruIcon/><div><p className="text-base font-bold text-slate-950">Setu Guru</p><p className="text-xs font-semibold text-[#108477]">Branded operator-approved AI assistant</p></div></div><div className="mt-5 rounded-2xl bg-[#eef6fb] p-4 text-sm font-semibold text-slate-700">Example question: Which quotes need follow-up and what should my team review first?</div><div className="mt-4 rounded-2xl border border-slate-100 p-4"><p className="text-sm font-bold text-slate-950">Sample response preview</p><p className="mt-2 text-sm leading-6 text-slate-600">Setu Guru can summarize quote status, surface document gaps and draft a follow-up for operator review. Nothing is sent or approved automatically.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#e6faf6] px-3 py-1 text-xs font-bold text-[#108477]">Review required</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Sample workflow</span></div></div></div>;
}

function BookingVisual() {
  return <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_28px_90px_rgba(31,72,124,0.12)]"><p className="text-sm font-bold text-slate-950">Select a date & time</p><div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">{Array.from({length:35},(_,i)=>i+1).map(d=><span key={d} className={`rounded-full py-2 ${[8,14,21,28,30].includes(d)?'bg-[#e6faf6] font-bold text-[#108477]':'text-slate-500'} ${d===21?'!bg-[#108477] !text-white':''}`}>{d}</span>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-2">{['10:00 AM','11:00 AM','1:00 PM','2:00 PM'].map((t,i)=><span key={t} className={`rounded-2xl border px-4 py-3 text-center text-sm font-bold ${i===0?'border-[#108477] text-[#108477]':'border-slate-200 text-slate-500'}`}>{t}</span>)}</div></div>;
}

function WorkflowStrip() {
  return <section className="bg-[#f8fbff] px-4 py-14 sm:px-6 lg:px-8"><SectionTitle eyebrow="Workflow" title="A sample trade workflow clients can understand quickly."/><div className="mx-auto mt-10 grid max-w-7xl gap-3 md:grid-cols-5">{['Capture','Qualify','Quote','Approve','Execute'].map((s,i)=><div key={s} className="rounded-2xl border border-[#1F487C]/10 bg-white p-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#108477] text-xs font-bold text-white">{i+1}</span><h3 className="mt-4 font-bold text-slate-950">{s}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{['Capture buyer context.','Review lead fit.','Prepare governed quote.','Check approval readiness.','Move to order execution.'][i]}</p></div>)}</div></section>;
}

function CTA({ title = 'Ready to see Setu Flow in action?', body = 'Book a guided walkthrough using sample workflows and screenshots that match your trade operation.' }: { title?: string; body?: string }) {
  return <section className="bg-white px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[2rem] bg-[#061c2e] p-7 text-white shadow-[0_30px_80px_rgba(6,28,46,0.18)]"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div className="flex items-start gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#7de2d2]/15 text-[#7de2d2]"><Icon name="calendar" className="h-8 w-8"/></span><div><h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">{body}</p></div></div><div className="flex flex-col gap-3 sm:flex-row"><ButtonLink href="/book-demo">Book a Demo</ButtonLink><ButtonLink href="/platform" variant="secondary">Explore Platform</ButtonLink></div></div></div></section>;
}

export function HomeMarketingPage() {
  return <PageShell><Hero title={<>Trade execution software for import-export teams<span className="text-[#108477]">.</span></>} body="Capture leads, manage quotes, approvals, orders and shipment readiness in one connected system built for the way trade teams operate."/><section className="px-4 py-16 sm:px-6 lg:px-8"><SectionTitle eyebrow="Why Setu Flow" title="A premium public website, powered by product screenshots." body="The homepage now uses screenshot-led product storytelling instead of live-style revenue cards or internal workspace metrics."/><FeatureCards items={[{icon:'chart',title:'Pipeline visibility',body:'Show prospects how a client can track leads and commercial stages from screenshot examples.'},{icon:'quote',title:'Quote control',body:'Demonstrate pricing, terms and approvals using product-screen snippets rather than live data.'},{icon:'package',title:'Execution readiness',body:'Explain how orders, documents and handoffs stay visible after a quote is accepted.'}]}/></section><section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">{productShots.slice(1,5).map(shot=><ScreenshotFrame key={shot.src} shot={shot}/>)}</div></section><section className="grid gap-6 bg-white px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8"><div className="rounded-[2rem] border border-[#1F487C]/10 p-6"><div className="flex items-center gap-3"><GuruIcon/><div><Eyebrow>Setu Guru AI</Eyebrow><h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Branded, operator-approved intelligence.</h3></div></div><p className="mt-4 text-sm leading-7 text-slate-600">Setu Guru is shown with the real branded icon. All AI examples are sample workflows for review, not autonomous actions.</p><Link href="/setu-guru-ai" className="mt-5 inline-flex text-sm font-bold text-[#108477]">See Setu Guru AI →</Link></div><div className="rounded-[2rem] border border-[#1F487C]/10 p-6"><div className="flex items-center gap-3"><Orb icon="mobile"/><div><Eyebrow>Mobile</Eyebrow><h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Responsive on phones and tablets.</h3></div></div><p className="mt-4 text-sm leading-7 text-slate-600">The public site uses responsive layouts while the internal mobile workspace route remains untouched.</p><Link href="/field-mobile" className="mt-5 inline-flex text-sm font-bold text-[#108477]">View mobile site concept →</Link></div></section><CTA/></PageShell>;
}

export function PlatformMarketingPage() {
  return <PageShell><Hero eyebrow="Platform" title={<>One platform for the trade execution workflow<span className="text-[#108477]">.</span></>} body="Use screenshot-led sections to show how clients can track pipeline, quotes, documents and order execution without exposing live org data."/><section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">{productShots.map(shot=><ScreenshotFrame key={shot.src} shot={shot}/>)}</div></section><WorkflowStrip/><CTA/></PageShell>;
}

export function SolutionsMarketingPage() {
  return <PageShell><Hero eyebrow="Solutions" title={<>Solutions built for real trade teams<span className="text-[#108477]">.</span></>} body="Exporters, importers, trading companies and sourcing teams can understand Setu Flow through sample screenshot stories."/><section className="px-4 py-16 sm:px-6 lg:px-8"><FeatureCards items={[{icon:'globe',title:'Exporters',body:'Use quote, document and execution screenshots to explain export workflows.'},{icon:'package',title:'Importers',body:'Show supplier follow-ups, sourcing visibility and handoff control.'},{icon:'ship',title:'Trading companies',body:'Explain buyer and supplier motion without showing internal workspace data.'},{icon:'search',title:'Sourcing teams',body:'Demonstrate trade-show capture and follow-up discipline.'},{icon:'quote',title:'Commercial teams',body:'Show quote review, approval readiness and governed pricing.'},{icon:'document',title:'Operations teams',body:'Show document tracking and dispatch readiness using product examples.'}]}/></section><CTA title="Book a solution-specific demo"/></PageShell>;
}

export function SetuGuruMarketingPage() {
  return <PageShell><Hero eyebrow="Setu Guru AI" title={<>Meet Setu Guru AI<span className="text-[#6d5dfc]">.</span></>} body="Context-aware assistance for trade operations, presented as sample operator-approved workflows only." visual="guru"/><section className="px-4 py-16 sm:px-6 lg:px-8"><SectionTitle eyebrow="Use cases" title="AI examples without autonomous action."/><FeatureCards items={[{icon:'message',title:'Follow-up drafting',body:'Draft sample follow-ups for operator review.'},{icon:'quote',title:'Quote intelligence',body:'Explain quote readiness and risk signals from screenshots.'},{icon:'search',title:'HSN research',body:'Show research guidance as a reviewed assistant response.'},{icon:'shield',title:'Risk flags',body:'Surface sample document or payment risks for review.'},{icon:'document',title:'Document insights',body:'Summarize document completeness as a workflow example.'},{icon:'chart',title:'Deal prioritization',body:'Help teams decide what to review next without live data.'}]}/></section><CTA title="Experience Setu Guru AI in action"/></PageShell>;
}

export function MobileMarketingPage() {
  return <PageShell><Hero eyebrow="Mobile" title={<>A premium mobile website experience<span className="text-[#108477]">.</span></>} body="The public website works on desktop and mobile, while the internal /mobile workspace remains protected and unchanged."/><section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">{mobileShots.map(shot=><ScreenshotFrame key={shot.src} shot={shot}/>)}</div></section><CTA/></PageShell>;
}

export function PricingMarketingPage() {
  const plans = [{name:'Starter',price:'Demo-led',features:['Lead and quote workflow overview','Sample screenshot walkthrough','Guided setup discussion']},{name:'Growth',price:'Best fit',features:['Advanced quote and approval workflow','Setu Guru AI walkthrough','Order execution overview']},{name:'Enterprise',price:'Custom',features:['Role and governance review','Workflow mapping','Dedicated rollout planning']}];
  return <PageShell><Hero eyebrow="Pricing" title={<>Simple pricing conversations for serious trade teams<span className="text-[#108477]">.</span></>} body="Pricing is presented as a guided demo conversation, not a live org metrics page."/><section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">{plans.map((plan,i)=><article key={plan.name} className={`rounded-[2rem] border bg-white p-7 shadow-[0_24px_80px_rgba(31,72,124,0.08)] ${i===1?'border-[#108477] lg:-translate-y-4':'border-[#1F487C]/10'}`}><Orb icon={i===2?'globe':'chart'}/><h3 className="mt-5 text-2xl font-semibold text-slate-950">{plan.name}</h3><p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{plan.price}</p><ul className="mt-6 space-y-2">{plan.features.map(f=><CheckLine key={f}>{f}</CheckLine>)}</ul><div className="mt-7"><ButtonLink href="/book-demo" variant={i===1?'primary':'secondary'}>Book plan demo</ButtonLink></div></article>)}</div></section><CTA title="Book a pricing walkthrough"/></PageShell>;
}

export function CompareMarketingPage() {
  const rows = ['Lead capture','Quote control','Approvals','Documents','Shipment readiness','AI assistance','Mobile workflow'];
  return <PageShell><Hero eyebrow="Compare" title={<>Why trade teams choose Setu Flow over generic CRMs<span className="text-[#108477]">.</span></>} body="A screenshot-led comparison of trade workflows, not a live-data report."/><section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto overflow-x-auto rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_24px_80px_rgba(31,72,124,0.08)]"><div className="grid min-w-[850px] grid-cols-[1.2fr_1fr_1fr_1.1fr] border-b border-slate-100 text-sm font-bold text-slate-950"><div className="p-5">Capability</div><div className="p-5">Excel + Email</div><div className="p-5">Generic CRM</div><div className="bg-[#f3fffb] p-5 text-[#108477]">Setu Flow</div></div>{rows.map(row=><div key={row} className="grid min-w-[850px] grid-cols-[1.2fr_1fr_1fr_1.1fr] border-b border-slate-100 text-sm"><div className="p-5 font-bold text-slate-900">{row}</div><div className="p-5 text-slate-500">Manual or scattered</div><div className="p-5 text-slate-500">Limited trade context</div><div className="bg-[#f3fffb] p-5 font-bold text-[#108477]">Trade workflow example</div></div>)}</div></section><CTA title="See the screenshot-led comparison"/></PageShell>;
}

export function BookDemoMarketingPage() {
  return <PageShell><Hero eyebrow="Book a demo" title={<>Book your Setu Flow walkthrough<span className="text-[#108477]">.</span></>} body="A cleaner scheduling-style demo flow for prospects on desktop and mobile." visual="booking"/><section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_30px_90px_rgba(31,72,124,0.10)] lg:grid-cols-[0.7fr_1.3fr]"><aside className="border-b border-[#1F487C]/10 bg-[#f8fbff] p-8 lg:border-b-0 lg:border-r"><span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#108477] text-white"><Icon name="calendar" className="h-8 w-8"/></span><h2 className="mt-6 text-2xl font-semibold text-slate-950">Setu Flow Walkthrough</h2><p className="mt-2 text-sm font-semibold text-slate-500">45 minutes · Web conferencing</p><p className="mt-6 text-sm leading-7 text-slate-600">We will use product screenshots and sample workflows to map Setu Flow to your operation.</p><ul className="mt-6 space-y-2"><CheckLine>Your current workflow and key challenges</CheckLine><CheckLine>Platform screenshot tour</CheckLine><CheckLine>Setu Guru AI with operator approval</CheckLine><CheckLine>Setup timeline and next steps</CheckLine></ul></aside><div className="p-6 sm:p-8"><BookDemoForm /></div></div></section></PageShell>;
}
