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
  PackageCheck,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { SiteShell } from './site-shell';

const journey = [
  { title: 'Discover', body: 'Find markets and opportunities.', icon: Search },
  { title: 'Capture', body: 'Bring leads and contacts into one system.', icon: ScanLine },
  { title: 'Convert', body: 'Qualify relationships and build commercial fit.', icon: Target },
  { title: 'Quote', body: 'Control products, pricing, terms and versions.', icon: FileCheck2 },
  { title: 'Approve', body: 'Complete internal and buyer approvals.', icon: ShieldCheck },
  { title: 'Execute', body: 'Create orders and manage operations.', icon: PackageCheck },
  { title: 'Dispatch', body: 'Close document, fulfilment and shipping gaps.', icon: Boxes },
  { title: 'Grow', body: 'Learn what wins and improve the next cycle.', icon: BarChart3 },
];

const operatingLayers = [
  { number: '01', title: 'Growth Intelligence', body: 'Find the right markets, companies and opportunities before pipeline work begins.', points: ['ICP Builder', 'Market Intelligence', 'Opportunity Finder'], icon: Target },
  { number: '02', title: 'Trade CRM', body: 'Manage buyers, suppliers and follow-ups with complete trade context.', points: ['Buyer & Supplier 360°', 'Activities & Follow-ups', 'Requirements'], icon: Users },
  { number: '03', title: 'Commercial Operations', body: 'Control quotations, pricing, versions, terms and approvals.', points: ['Product Catalog', 'Price Lists & Currency', 'Quote Versions'], icon: ClipboardCheck },
  { number: '04', title: 'Trade Execution', body: 'Move approved business into orders, documents, fulfilment and dispatch.', points: ['Order Management', 'Documents & Compliance', 'Dispatch Tracking'], icon: PackageCheck },
  { number: '05', title: 'Intelligence & Control', body: 'Use AI and reporting to guide priorities, surface risk and improve performance.', points: ['Setu Guru AI', 'Analytics & Reports', 'Alerts & Audit Trail'], icon: Sparkles },
];

const industries = [
  { title: 'Exporters', image: '/marketing/industries/exporters.svg', body: 'Manage international buyers, quotations, documents, orders, shipping and compliance.' },
  { title: 'Importers & Sourcing', image: '/marketing/industries/importers-sourcing.svg', body: 'Source globally, compare suppliers and manage procurement from enquiry to order.' },
  { title: 'Apparel', image: '/marketing/industries/apparel.svg', body: 'Connect styles, samples, costing, production milestones, compliance and shipment.' },
  { title: 'Packaging', image: '/marketing/industries/packaging.svg', body: 'Manage specifications, pricing, artwork, proofs, production stages and dispatch.' },
  { title: 'Manufacturing', image: '/marketing/industries/manufacturing.svg', body: 'Move enquiries through quotation, operational handoff, production and delivery.' },
  { title: 'Distribution', image: '/marketing/industries/distribution.svg', body: 'Manage accounts, territories, price lists, repeat orders and supplier coordination.' },
];

const clientLogos = [
  { src: '/clients/blue-orbit-international.jpg', alt: 'Blue Orbit International', width: 160, height: 36 },
  { src: '/clients/avanti-foods.png', alt: 'Avanti Foods', width: 76, height: 52 },
  { src: '/clients/wholesome-food.png', alt: 'Wholesome Food', width: 140, height: 48 },
  { src: '/clients/ash-and-noir.png', alt: 'Ash and Noir', width: 118, height: 42, dark: true },
];

const compareRows = [
  ['Opportunity management', 'Sales pipeline', 'Growth Center and pipeline intelligence'],
  ['Buyer and supplier records', 'Contacts and activities', 'Complete relationship, product and trade context'],
  ['Quotations', 'Add-on or basic quoting', 'Products, currencies, Incoterms, versions and approvals'],
  ['Documents', 'Attachments', 'Required, missing, expiring and approved readiness'],
  ['Orders', 'Closed-won handoff', 'Connected quote-to-order execution'],
  ['Operations', 'External system', 'Built into the workflow'],
  ['Production and dispatch', 'Not included', 'Vertical execution workspaces'],
  ['AI and analytics', 'Generic sales assistant', 'Contextual trade intelligence across growth and execution'],
];

function Button({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={secondary ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15' : 'inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(20,184,166,.25)] transition hover:-translate-y-0.5 hover:bg-teal-400'}>{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function LightButton({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-50">{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${light ? 'text-teal-200' : 'text-teal-700'}`}>{children}</p>;
}

function ClientLogoStrip() {
  return <section className="border-y border-slate-100 bg-white px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl text-center"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Trusted by businesses growing across borders</p><div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-11 lg:gap-14">{clientLogos.map((logo) => logo.dark ? <div key={logo.alt} className="flex h-12 items-center rounded-xl bg-slate-900 px-4 opacity-80"><Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="max-h-8 w-auto object-contain" /></div> : <Image key={logo.alt} src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="max-h-11 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />)}</div></div></section>;
}

function OperatingSystemLayers() {
  return <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><Eyebrow light>The Trade Execution OS</Eyebrow><h2 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">Five connected layers. One platform that runs trade.</h2><p className="mt-4 text-base leading-7 text-white/65">From market discovery to dispatch, every workflow sits inside one connected operating system instead of separate tools.</p></div><div className="relative mt-12 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]"><div className="absolute left-[10%] right-[10%] top-[4.2rem] hidden h-px bg-gradient-to-r from-teal-400/20 via-teal-300/80 to-teal-400/20 lg:block" /><div className="grid lg:grid-cols-5">{operatingLayers.map((layer, index) => <article key={layer.title} className={`relative p-6 lg:min-h-[22rem] ${index < operatingLayers.length - 1 ? 'border-b border-white/10 lg:border-b-0 lg:border-r' : ''}`}><div className="relative z-10 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200"><layer.icon className="h-5 w-5" /></span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-300/40 bg-slate-950 text-[11px] font-bold text-teal-200">{layer.number}</span></div><h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">{layer.title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{layer.body}</p><div className="mt-6 flex flex-wrap gap-2">{layer.points.map((point) => <span key={point} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/75">{point}</span>)}</div></article>)}</div></div><div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-teal-300/15 bg-teal-300/[0.07] px-5 py-4 text-center text-sm font-medium text-teal-50"><Check className="h-4 w-4 shrink-0 text-teal-300" />One connected system from opportunity to dispatch — without re-entering the same information across tools.</div></div></section>;
}

export function HomeGrowthExecutionPage() {
  return <SiteShell><main className="overflow-hidden bg-white text-slate-950">
    <section className="relative px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center"><div className="max-w-2xl"><Eyebrow light>AI-powered Trade Execution OS</Eyebrow><h1 className="mt-4 text-[3.15rem] font-medium leading-[.98] tracking-[-0.055em] sm:text-[4.25rem]">The Trade<br />Execution <span className="text-teal-300">OS</span></h1><p className="mt-5 text-lg font-semibold text-teal-200">Find opportunities. Win buyers. Execute every order.</p><p className="mt-5 max-w-xl text-base leading-7 text-white/75">Setu Flow connects market discovery, buyer and supplier relationships, quotations, approvals, documents, orders and dispatch in one operating system built for international trade.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button href="/book-demo">Book a Demo</Button><Button href="/platform" secondary>Explore the Platform</Button></div><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/75">{['One platform', 'One record', 'End-to-end execution', 'AI-supported'].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-300" />{item}</span>)}</div></div><div className="overflow-hidden rounded-[28px] border border-white/20 bg-white p-2 shadow-[0_30px_100px_rgba(0,0,0,.3)]"><Image src="/marketing/dashboard-command-center.png" alt="Setu Flow Trade Execution Command Center" width={1800} height={1050} priority className="h-auto w-full rounded-[22px] object-cover object-top" /><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-slate-600"><p className="text-[10px] font-bold uppercase tracking-[0.16em]">Growth, commercial operations and execution in one command center</p><span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700"><Sparkles className="h-3.5 w-3.5" /> Setu Guru insights</span></div></div></div></section>
    <ClientLogoStrip />
    <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.36fr_0.64fr] lg:items-center"><div><Eyebrow>Built for international trade</Eyebrow><h2 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em]">Your CRM ends at the deal.<br /><span className="text-teal-700">Setu Flow runs the trade.</span></h2><p className="mt-4 text-sm leading-6 text-slate-600">Every record, conversation and document moves forward with the transaction. No re-entry. No disconnected tools. No lost context.</p></div><div><Eyebrow>The trade execution journey</Eyebrow><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{journey.map((step) => <div key={step.title} className="text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-teal-600 text-white shadow-sm"><step.icon className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold">{step.title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{step.body}</p></div>)}</div></div></div></section>
    <OperatingSystemLayers />
    <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><Eyebrow>Industry execution workspaces</Eyebrow><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Built for every trade business.</h2><p className="mt-4 text-slate-600">One Trade Execution OS, configured around the requirements, approvals and handoffs of your industry.</p></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{industries.map((industry) => <article key={industry.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,.05)]"><Image src={industry.image} alt={`${industry.title} workflow illustration`} width={960} height={540} className="aspect-[16/9] w-full object-cover" /><div className="p-5"><h3 className="text-lg font-semibold">{industry.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{industry.body}</p></div></article>)}</div><div className="mt-8 text-center"><LightButton href="/solutions">Explore All Industries</LightButton></div></div></section>
    <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[30px] bg-[linear-gradient(125deg,#061e34_0%,#0b2e4a_55%,#0f8f87_100%)] p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,.18)] lg:grid-cols-[0.85fr_1.15fr] lg:p-10"><div className="flex gap-5"><Image src="/setu-guru/guru-avatar-256.png" alt="Setu Guru" width={112} height={112} className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" /><div><Eyebrow light>Setu Guru</Eyebrow><h2 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em]">AI intelligence across every stage of trade.</h2><p className="mt-4 text-sm leading-6 text-white/70">Setu Guru understands the market, relationship, quote, document and order context already inside Setu Flow and recommends what needs attention next.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{['Smart recommendations', 'Risk and compliance alerts', 'Market and price insights', 'Document checks', 'Drafts and follow-ups', 'Next best actions'].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-4 text-sm font-semibold"><Sparkles className="h-4 w-4 text-teal-200" />{item}</div>)}</div></div></section>
    <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:items-start"><div><Eyebrow light>Compare</Eyebrow><h2 className="mt-3 text-4xl font-medium leading-tight tracking-[-0.045em]">A CRM tracks the deal.<br /><span className="text-teal-300">Setu Flow executes the trade.</span></h2><p className="mt-5 text-white/60">Generic CRMs manage sales activity. Setu Flow carries the same record from market opportunity through operational execution.</p></div><div className="overflow-hidden rounded-2xl border border-white/10"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead><tr className="bg-white/5 text-[11px] uppercase tracking-[.14em] text-white/40"><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Generic CRM</th><th className="px-5 py-4 text-teal-200">Setu Flow — Trade Execution OS</th></tr></thead><tbody>{compareRows.map((row) => <tr key={row[0]} className="border-t border-white/10"><td className="px-5 py-4 font-semibold">{row[0]}</td><td className="px-5 py-4 text-white/45">{row[1]}</td><td className="px-5 py-4 text-teal-50">{row[2]}</td></tr>)}</tbody></table></div></div></div></div></section>
    <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 rounded-[28px] bg-[linear-gradient(135deg,#eaf8f6_0%,#edf4ff_100%)] px-7 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10"><div><Eyebrow>Run your trade on one platform</Eyebrow><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">See Setu Flow mapped to your real workflow.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">We will map how your team finds opportunities, manages buyers and suppliers, prepares quotations, controls documents and moves orders toward dispatch.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/book-demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Book a Demo <ArrowRight className="h-4 w-4" /></Link><LightButton href="/platform">Explore Platform</LightButton></div></div></section>
  </main></SiteShell>;
}
