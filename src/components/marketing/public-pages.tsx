import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

// ─── Types ────────────────────────────────────────────────────────────────────
type IconName = 'lead' | 'quote' | 'approval' | 'order' | 'document' | 'task'
  | 'mobile' | 'shield' | 'globe' | 'chart' | 'package' | 'message'
  | 'calendar' | 'search' | 'users' | 'ship' | 'ai' | 'scan' | 'pipeline'
  | 'report' | 'vcard' | 'compliance' | 'catalog';
type Feature = { icon: IconName; title: string; body: string; href?: string };
type Shot = { src: string; title: string; body: string; label: string };

// ─── Screenshot data (new shots from live product) ────────────────────────────
const productShots: Shot[] = [
  { src: '/marketing/ss-dashboard.jpg',    label: 'Command Center',     title: 'Pipeline at a glance',         body: 'Live pipeline value, market coverage, overdue follow-ups and blocked revenue — one view, zero spreadsheets.' },
  { src: '/marketing/ss-leads-cmd.jpg',    label: 'Follow-up Queue',    title: 'Know what needs action next',  body: 'Every lead carries urgency, owner, deal value, role and stage context. Your team works the right accounts first.' },
  { src: '/marketing/ss-quotebuilder.jpg', label: 'Quote Builder',      title: 'Price it right. Every time.',  body: 'EXW → FOB → CIF → DDP pricing hierarchy with UOM, MOQ, incoterm meanings and inline approval gates.' },
  { src: '/marketing/ss-orders.jpg',       label: 'Execution Desk',     title: 'Execution lives here',         body: 'Dispatch gates, document readiness, compliance blockers, payment state — all tied to the accepted quote.' },
  { src: '/marketing/ss-pipeline.jpg',     label: 'Pipeline Board',     title: 'Every deal. Every stage.',     body: 'Stage-gated Kanban with Full, Compact and Micro card density. Buyer and supplier pipelines in one workspace.' },
  { src: '/marketing/ss-documents.jpg',    label: 'Document Control',   title: 'Every PDF tracked to delivery',body: 'Quote PDFs, order confirmations, invoices and packing lists — generated, versioned, signed, and sent.' },
  { src: '/marketing/ss-reports.jpg',      label: 'Reports & Analytics',title: 'The numbers tell the truth',   body: 'Commercial funnel, quote performance, order execution, send effectiveness — trend charts and CSV export.' },
  { src: '/marketing/ss-catalog.jpg',      label: 'Product Catalog',    title: 'Quote-ready products',         body: 'Variants, MOQ, pack size, pricing basis and HS codes. Bulk CSV import. Category defaults for instant quoting.' },
  { src: '/marketing/ss-tasks.jpg',        label: 'Task Manager',       title: 'Nothing slips through',        body: 'Entity-linked tasks with calendar view, overdue grouping and swipe-to-complete on mobile.' },
];

const mobileShots: Shot[] = [
  { src: '/marketing/ss-mobile-leads.jpg',   label: 'Mobile leads',   title: 'Leads on the go',       body: 'Urgency-sorted lead list for field sales. Same data, phone-native layout.' },
  { src: '/marketing/ss-mobile-capture.jpg', label: 'Field capture',  title: 'Capture in 30 seconds', body: 'Business card scan → structured lead. Offline queue syncs when signal returns.' },
  { src: '/marketing/ss-tasks-mobile.jpg',   label: 'Mobile tasks',   title: 'Swipe to complete',     body: 'Swipe right to complete a task. Trade shows run on phones — so does Setu Flow.' },
];

// ─── Icon system ──────────────────────────────────────────────────────────────
function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    lead:       <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></>,
    quote:      <><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></>,
    approval:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    order:      <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5"/><path d="M12 22v-9.5"/></>,
    document:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></>,
    task:       <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    mobile:     <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    shield:     <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    globe:      <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/></>,
    chart:      <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    package:    <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5"/><path d="M12 22v-9.5"/></>,
    message:    <><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
    calendar:   <><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    search:     <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    users:      <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    ship:       <><path d="M3 17h18"/><path d="M6 17 4 9h16l-2 8"/><path d="M8 9V5h8v4"/></>,
    ai:         <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>,
    scan:       <><path d="M7 3H5a2 2 0 0 0-2 2v2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>,
    pipeline:   <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    report:     <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    vcard:      <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M8 12h.01"/><path d="M12 12h4"/><path d="M12 16h4"/></>,
    compliance: <><path d="M9 11l3 3 8-8"/><path d="M21 12a9 9 0 1 1-9-9c1.4 0 2.7.3 3.9.8"/></>,
    catalog:    <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z"/><path d="M12 12 4.2 7.6"/><path d="M12 12l7.8-4.4"/><path d="M12 12v9"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Orb({ icon, size = 'md' }: { icon: IconName; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const ico = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return <span className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]`}><Icon name={icon} className={ico}/></span>;
}

function GuruAvatar({ size = 44 }: { size?: number }) {
  return <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={size} height={size} className="rounded-2xl object-cover" />;
}

function GuruLogoNavbar({ className = 'h-9 w-auto' }: { className?: string }) {
  return <Image src="/setu-guru/guru-logo-navbar.png" alt="Setu Guru" width={300} height={100} className={className} />;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={light ? 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#7de2d2]' : 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#108477]'}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: ReactNode; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={light ? 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl' : 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl'}>{title}</h2>
      {body && <p className={light ? 'mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64' : 'mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600'}>{body}</p>}
    </div>
  );
}

function Check({ light = false, size = 'md' }: { light?: boolean; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-[11px]';
  return <span className={`mt-[2px] flex ${dim} shrink-0 items-center justify-center rounded-full font-bold ${light ? 'bg-[#7de2d2]/20 text-[#7de2d2]' : 'bg-[#e6faf6] text-[#108477]'}`}>✓</span>;
}

function ButtonLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'dark' | 'ghost' }) {
  const cls = {
    primary:   'bg-[#059f90] text-white shadow-[0_14px_36px_rgba(5,159,144,0.28)] hover:bg-[#07897d]',
    dark:      'bg-[#061c2e] text-white shadow-[0_14px_36px_rgba(6,28,46,0.22)] hover:bg-[#0b2e4a]',
    secondary: 'border border-[#108477]/30 bg-white text-[#108477] hover:bg-[#eef6fb]',
    ghost:     'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/18',
  }[variant];
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${cls}`}>{children} <span aria-hidden>→</span></Link>;
}

function ScreenshotFrame({ shot, large = false }: { shot: Shot; large?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_22px_70px_rgba(31,72,124,0.10)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(31,72,124,0.16)]">
      <div className="overflow-hidden rounded-t-[1.75rem] border-b border-slate-100 bg-[#f0f6fb]">
        <Image src={shot.src} alt={shot.title} width={1600} height={900} className={`w-full object-cover object-top transition duration-700 group-hover:scale-[1.02] ${large ? 'h-auto max-h-72' : 'h-52 sm:h-64'}`} />
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#108477]">{shot.label}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-slate-950">{shot.title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{shot.body}</p>
      </div>
    </article>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white">{children}</main></SiteShell>;
}

function CTA({ title = 'Ready to see Setu Flow in action?', body = 'Book a 30-minute walkthrough around your actual trade workflow. Calendar invite from help@setugroups.com.' }: { title?: string; body?: string }) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#061c2e] shadow-[0_30px_80px_rgba(6,28,46,0.20)]">
        <div className="relative px-8 py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(53,159,145,0.22),transparent_55%),radial-gradient(ellipse_at_100%_0%,rgba(12,127,255,0.18),transparent_50%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#7de2d2]/15">
                <Icon name="calendar" className="h-8 w-8 text-[#7de2d2]" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-7 text-white/60">{body}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book-demo">Book a Demo</ButtonLink>
              <ButtonLink href="/platform" variant="ghost">Explore Platform</ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export function HomeMarketingPage() {
  return (
    <PageShell>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#061c2e] px-4 pt-16 pb-0 text-white sm:px-6 lg:px-8 lg:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(53,159,145,0.32),transparent_55%),radial-gradient(ellipse_55%_50%_at_100%_0%,rgba(12,127,255,0.24),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/40 to-transparent" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.12fr] lg:items-end lg:gap-16">

            {/* Left copy */}
            <div className="pb-14 pt-4 lg:pb-20">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">
                Trade Execution CRM
              </div>
              <h1 className="mt-5 text-[2.6rem] font-semibold leading-[0.96] tracking-[-0.05em] sm:text-[3.4rem] lg:text-[4.4rem]">
                Bridge the gap in your trade operation.<br />
                <span className="text-[#7de2d2]">Shore to shore.</span>
              </h1>
              <p className="mt-6 max-w-lg text-[15px] leading-7 text-white/65 sm:text-base sm:leading-8">
                From first contact to final shipment — lead capture, governed quotes, compliance, dispatch and AI assistance in one connected system built for import-export teams.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/book-demo">Book a Demo</ButtonLink>
                <ButtonLink href="/platform" variant="ghost">Explore Platform</ButtonLink>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                {['Built for import-export teams', 'Setu Guru AI on every plan', 'Live in under 5 days'].map(t => (
                  <span key={t} className="flex items-center gap-2 text-[13px] font-medium text-white/55">
                    <Check light size="sm" />{t}
                  </span>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-white/10 pt-6">
                <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/28">Active in</span>
                {[['🇮🇳','India'],['🇮🇪','Ireland'],['🇬🇧','UK'],['🇩🇪','Germany'],['🇺🇸','US']].map(([flag, name]) => (
                  <span key={name} className="flex items-center gap-1.5 text-[12px] font-medium text-white/50">
                    <span className="text-[15px]">{flag}</span>{name}<span className="mx-1 text-white/18">·</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Dashboard screenshot pinned to bottom */}
            <div className="relative lg:self-end">
              <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_50%_40%,rgba(53,159,145,0.18),transparent_55%)] blur-2xl" />
              <div className="relative rounded-t-[2rem] border border-b-0 border-white/14 bg-white/6 p-2.5 pt-2.5 shadow-[0_-20px_60px_rgba(0,0,0,0.30)] backdrop-blur-sm">
                <div className="rounded-t-[1.6rem] overflow-hidden border border-b-0 border-white/10 bg-[#daeaf5]">
                  <Image src="/marketing/ss-dashboard.jpg" alt="Setu Flow command center dashboard" width={1600} height={700} priority className="w-full object-cover object-top" />
                </div>
                {/* Floating stat badges */}
                <div className="absolute -left-5 top-10 hidden rounded-2xl border border-white/14 bg-[#061c2e]/94 px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.40)] backdrop-blur-sm md:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#7de2d2]">Live pipeline</p>
                  <p className="mt-1 text-[1.9rem] font-bold leading-none tracking-[-0.05em]">$1.05M</p>
                  <p className="mt-1 text-[11px] text-white/45">weighted commercial view</p>
                </div>
                <div className="absolute -right-4 top-12 hidden rounded-2xl border border-[#7de2d2]/25 bg-[#062840]/92 px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.38)] backdrop-blur-sm lg:block">
                  <div className="flex items-center gap-2">
                    <GuruAvatar size={28} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-[#7de2d2]">Setu Guru</p>
                  </div>
                  <p className="mt-1.5 text-[14px] font-bold">AI is ready</p>
                  <p className="text-[11px] text-white/45">Org-aware assistant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="relative border-t border-white/[0.08] mt-0">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-5 sm:justify-start">
              {[['< 5 days','avg. time to go live'],['$0','implementation fee'],['15+','trade market corridors'],['11','Guru AI capabilities']].map(([v,l]) => (
                <div key={l} className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-[#7de2d2]">{v}</span>
                  <span className="text-[12px] text-white/38">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROBLEM ══════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionTitle eyebrow="The problem" title={<>Your trade operation isn&apos;t broken.<br className="hidden sm:block"/> Your tools are.</>} body="Buyers don't lose confidence because your team lacks effort. They lose confidence when the system can't carry a deal from first contact to final shipment." />
        <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            { icon: 'chart' as IconName, title: 'CRM stops at the deal', body: 'Most CRMs stop at tracking. Trade teams still need quote control, compliance checks, dispatch documents and payment visibility — all tied together.' },
            { icon: 'document' as IconName, title: 'Quotes live outside the system', body: 'Pricing, freight assumptions, terms and approval chains drift across spreadsheets, email threads and chat. Every deal is rebuilt from scratch.' },
            { icon: 'compliance' as IconName, title: 'Blockers appear too late', body: 'Compliance gaps and missing documents usually surface when the shipment is already at risk. Not when there is still time to clear them.' },
          ].map(({ icon, title, body }, i) => (
            <div key={title} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-gradient-to-b from-white to-[#f8fbff] p-6 shadow-[0_18px_55px_rgba(31,72,124,0.07)]`}>
              <Orb icon={icon} size="lg" />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WORKFLOW STRIP ═══════════════════════════════════════════════════ */}
      <section className="bg-[#f4f9fc] px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="How it works" title="One flow. Every stage of the trade." body="Five steps any trade team can follow — connected, gated and tracked. No stage left unaccounted." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-3 md:grid-cols-5">
          {[
            { step:'01', icon:'scan' as IconName, title:'Capture', body:'Business card scan, quick entry or vCard — lead in under 30s.', img:'/marketing/ss-capture.jpg' },
            { step:'02', icon:'users' as IconName, title:'Qualify', body:'Owner, role, market, product interest, value and compliance posture.', img:'/marketing/ss-leads-cmd.jpg' },
            { step:'03', icon:'quote' as IconName, title:'Quote', body:'EXW → DDP pricing, terms lock, UOM, MOQ and approval gate.', img:'/marketing/ss-quotebuilder.jpg' },
            { step:'04', icon:'approval' as IconName, title:'Approve', body:'Admin gate on every adjustment over 15%. Nothing sends without sign-off.', img:'/marketing/ss-quotes.jpg' },
            { step:'05', icon:'ship' as IconName, title:'Execute', body:'Dispatch gates, document readiness, compliance, payment closeout.', img:'/marketing/ss-orders.jpg' },
          ].map(({ step, icon, title, body, img }) => (
            <div key={title} className="group rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_16px_50px_rgba(31,72,124,0.07)] transition hover:-translate-y-0.5 hover:border-[#359F91]/35">
              <div className="flex items-center justify-between">
                <Orb icon={icon} />
                <span className="rounded-full bg-[#061c2e] px-3 py-1 text-[11px] font-bold tracking-[0.10em] text-[#7de2d2]">{step}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-[#eef6fb]">
                <Image src={img} alt={title} width={400} height={260} className="h-28 w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PRODUCT SCREENSHOTS GRID ═════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionTitle eyebrow="Platform highlights" title="One platform. Every stage of the trade." body="Built for real import-export workflows — every screen is an operational outcome, not a dashboard for show." />
        <div className="mx-auto mt-12 max-w-7xl">
          {/* Hero shot row */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ScreenshotFrame shot={productShots[0]} large />
            <ScreenshotFrame shot={productShots[4]} large />
          </div>
          {/* 3-col row */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {productShots.slice(2, 5).map(s => <ScreenshotFrame key={s.src} shot={s} />)}
          </div>
          {/* Bottom row */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {productShots.slice(5, 8).map(s => <ScreenshotFrame key={s.src} shot={s} />)}
          </div>
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/platform" variant="secondary">See full platform walkthrough</ButtonLink>
        </div>
      </section>

      {/* ══ SETU GURU AI SECTION ════════════════════════════════════════════ */}
      <section className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-[#7de2d2]/22 bg-[#7de2d2]/8 px-4 py-2">
                <GuruAvatar size={36} />
                <GuruLogoNavbar className="h-7 w-auto" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold leading-[1.07] tracking-[-0.04em] sm:text-5xl">
                Your AI trade co-pilot.<br /><span className="text-[#7de2d2]">Built into every plan.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
                Setu Guru reads your live pipeline, quotes, orders and compliance state. It suggests actions, drafts communications, researches HSN codes and flags risk — with operator approval required on every action. Nothing happens autonomously.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ['Live org context', 'Reads your actual leads, quotes and orders — not generic industry advice'],
                  ['HSN code research', 'Looks up codes via web search and only writes back after you confirm'],
                  ['Draft follow-ups', 'Writes emails and cover notes in your pipeline context — you approve'],
                  ['Pricing suggestions', 'Reads category defaults and suggests pricing on request'],
                  ['Quote risk flags', 'Flags stale quotes, missing compliance items and approaching validity'],
                  ['Read-only safe', 'Cannot send, approve or modify anything without explicit operator action'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Check light size="sm" />{t}
                    </p>
                    <p className="mt-1 pl-6 text-xs leading-5 text-white/45">{d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7de2d2]/60">Included in all plans · Document management from Growth</p>
              <div className="mt-5">
                <ButtonLink href="/setu-guru-ai">See Setu Guru AI in full</ButtonLink>
              </div>
            </div>

            {/* Right: chat mock */}
            <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <GuruAvatar size={40} />
                  <div>
                    <p className="text-sm font-bold">Setu Guru</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-white/45">Online · org-aware</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-[#7de2d2]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7de2d2]">AI co-pilot</span>
              </div>
              <div className="mt-4 space-y-4">
                {[
                  { q: 'Which leads need follow-up today?', a: '4 leads are overdue. Atlas Natural Grocers (3 days), Amazonia Trade Foods (5 days), Andes Premium Foods (1 day) and one more. Want me to draft follow-ups for the oldest two?' },
                  { q: "What's the HSN code for organic turmeric powder?", a: 'HSN 0910.30 covers turmeric, whether or not ground. For organic certified variants, additional export documentation may be required under FSSAI. Shall I apply this to the Atlas catalog entry?' },
                  { q: 'Summarise quote risk for this week.', a: '2 quotes are approaching validity expiry within 3 days. SF-Q-202606-017 was sent 26 days ago with no response — suggest a follow-up nudge. SF-Q-202606-004 has a pending approval blocking send.' },
                ].map(({ q, a }) => (
                  <div key={q} className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-white/35">You</p>
                    <p className="mt-1 text-sm text-white/75">{q}</p>
                    <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#7de2d2]">Guru</p>
                    <p className="mt-1 text-sm leading-6 text-white/65">{a}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[11px] italic text-white/28">All suggestions require operator approval. Nothing is sent or modified automatically.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VCARD SECTION ═══════════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.65fr] lg:items-center">
          <div>
            <Eyebrow>Contact Exchange</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Turn every meeting into a lead and a next action.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Setu Flow's shareable vCard is more than a digital business card. Buyers scan, save, request a quote or send their details straight into your CRM — from the same share link.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {['Smart QR opens your public card', 'Clean .vcf download for iOS & Android', 'Apple and Google Wallet actions', 'Contact submissions become leads instantly'].map(t => (
                <div key={t} className="flex items-center gap-3 rounded-2xl border border-[#1F487C]/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_32px_rgba(31,72,124,0.06)]">
                  <Check />{t}
                </div>
              ))}
            </div>
            <div className="mt-7">
              <ButtonLink href="/book-demo" variant="dark">See contact exchange in the demo</ButtonLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[18rem]">
            <div className="relative rounded-[2rem] border border-[#1F487C]/12 bg-white p-2 shadow-[0_30px_80px_rgba(6,28,46,0.18)]">
              <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(53,159,145,0.20),transparent_55%)] blur-2xl" />
              <Image src="/marketing/ss-vcard.jpg" alt="Setu Flow Smart vCard with QR code" width={365} height={782} className="relative rounded-[1.6rem] w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ MOBILE SECTION ══════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <Eyebrow>Field Ready</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Run trade from wherever trade happens.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Your team doesn't work at a desk. Setu Flow's mobile workspace gives field reps the same lead queue, quick capture, pipeline, tasks and Setu Guru AI — optimised for a phone.
            </p>
            <div className="mt-6 space-y-2">
              {['Business card scan → lead in 30 seconds', 'Swipe-to-complete tasks at trade shows', 'Full pipeline and quote access on mobile', 'Offline queue syncs when connectivity returns'].map(t => (
                <div key={t} className="flex items-center gap-3 text-sm font-medium text-slate-700"><Check />{t}</div>
              ))}
            </div>
            <div className="mt-7">
              <ButtonLink href="/field-mobile" variant="secondary">View mobile experience</ButtonLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {mobileShots.map((shot, i) => (
              <div key={shot.src} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_20px_60px_rgba(6,28,46,0.20)]`}>
                <Image src={shot.src} alt={shot.title} width={425} height={907} className="w-full rounded-[1.15rem]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ════════════════════════════════════════════════ */}
      <ComparisonSection />

      {/* ══ PRICING ═════════════════════════════════════════════════════════ */}
      <PricingSection />

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#061c2e] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(53,159,145,0.25),transparent_45%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/30 to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#7de2d2]">Ready to move</p>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
            Run your entire trade operation in one flow.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
            Capture, qualify, quote, approve, execute — and let Setu Guru handle context so your team stays focused on the deal.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink href="/book-demo">Book a Demo</ButtonLink>
            <ButtonLink href="/client-login" variant="ghost">Enter Workspace</ButtonLink>
          </div>
        </div>
      </section>

    </PageShell>
  );
}

// ─── COMPARISON SECTION (standalone, used on home + compare page) ─────────────
function ComparisonSection() {
  const uniqueFeatures = [
    { icon: 'quote' as IconName,      label: 'EXW → FOB → CIF → DDP pricing hierarchy',         detail: 'Full 6-level cascade from ex-works to retail, per variant and per category. No other CRM has this.' },
    { icon: 'approval' as IconName,   label: '15% threshold approval gate on every quote',        detail: 'Adjustments above 15% freeze the quote and require named admin approval before send is enabled.' },
    { icon: 'compliance' as IconName, label: 'Country-specific compliance checklist by destination',detail: 'Compliance items auto-built from product × destination rules. Gaps surface before they block shipment.' },
    { icon: 'document' as IconName,   label: 'PDF generation with no paid API',                   detail: 'Order confirmations via native PDF writer. Quotes via puppeteer-core. Zero external PDF cost.' },
    { icon: 'scan' as IconName,       label: 'Business card OCR → structured lead in 30s',        detail: 'OpenAI Vision parses business card photos into full lead records. Offline queue for connectivity gaps.' },
    { icon: 'catalog' as IconName,    label: 'Quote-ready product catalog with variant pricing',   detail: 'SKU, pack size, UOM, MOQ, pricing basis and HS codes per variant. Bulk CSV import included.' },
    { icon: 'ai' as IconName,         label: 'Setu Guru AI — org-aware, on every plan',           detail: 'Reads your live pipeline, drafts comms, researches HSN codes. Read-only safe. Included from Starter.' },
    { icon: 'vcard' as IconName,      label: 'Smart vCard with Smart QR + Wallet actions',        detail: 'Public /card page with OG metadata, .vcf download, Apple/Google Wallet, and lead capture from share link.' },
    { icon: 'ship' as IconName,       label: 'Dispatch gate — document readiness before shipment', detail: 'Packing list, freight request and compliance clearance all gated before dispatch is enabled.' },
    { icon: 'pipeline' as IconName,   label: 'Buyer + Supplier in one Kanban workspace',          detail: 'Dual pipeline with role-aware views, Full/Compact/Micro card density and stage-move gating.' },
  ];

  const compRows: [string, string, string, string][] = [
    // [feature, Excel+Email, HubSpot/Zoho, Setu Flow]
    ['section:Quoting & Pricing', '', '', ''],
    ['EXW → FOB → CIF → DDP pricing calculator',     'Manual spreadsheet',   'Custom field only',        '✦ Native 6-level cascade'],
    ['Category & org-level pricing defaults',         'Copy-paste values',    'Not present',              '✦ Org → Category → Product → Quote'],
    ['Quote-only line adjustments with approval gate','Email thread',         'Workflow add-on',          '✦ >15% triggers named admin review'],
    ['Quote versioning — immutable audit trail',      'File saves',           'Version add-on',           '✦ Lifecycle states + approval chain'],
    ['Quote PDF via puppeteer — zero API cost',       'Word / email',         'Template tool',            '✦ Native writer + puppeteer, $0'],
    ['WhatsApp quote delivery from mobile',           'Copy-paste link',      'Not present',              '✦ One-tap tracked send'],
    ['section:Lead & Pipeline', '', '', ''],
    ['Business card OCR → lead in 30 seconds',        'Manual entry',         'Third-party scan app',     '✦ Built-in capture + vCard + QR'],
    ['Trade show batch capture with source context',  'Spreadsheet',          'Campaign tag only',        '✦ Event context on every entry'],
    ['Stage-move gating with blocker explanation',    'Free-move',            'Not present',              '✦ Blocked until requirements met'],
    ['Buyer + Supplier in one pipeline',              'Separate sheets',      'Single pipeline only',     '✦ Role-aware dual-mode Kanban'],
    ['Smart vCard with Wallet actions + QR',          'Not applicable',       'Not present',              '✦ Smart QR, .vcf, Wallet, lead capture'],
    ['section:Compliance & Execution', '', '', ''],
    ['Country compliance checklist by destination',   'Manual tracking',      'External tool',            '✦ Auto-built from product × destination'],
    ['Certificate expiry tracking',                   'Calendar reminder',    'Not present',              '✦ Flagged in pipeline before it blocks'],
    ['Dispatch gate — docs required before shipment', 'Email chain',          'Not present',              '✦ Packing list + freight + compliance'],
    ['Document management with version history',      'File folder',          'Attachment only',          '✦ Two-source architecture + storage'],
    ['section:AI & Intelligence', '', '', ''],
    ['AI assistant with live org data context',       'Not applicable',       'Bolt-on chatbot',          '✦ Setu Guru — reads your data, all plans'],
    ['HSN code research + controlled write-back',     'Manual lookup',        'Not present',              '✦ Web search + operator confirms before write'],
    ['AI-drafted follow-ups & quote cover notes',     'ChatGPT in another tab','Email templates',         '✦ Drafted in context, operator approves all'],
    ['Quote risk flags & lead priority intelligence', 'Gut feel',             'Score add-on only',        '✦ Daily insight panel, all plans'],
    ['section:Mobile & Field', '', '', ''],
    ['Dedicated mobile workspace',                    'Not applicable',       'Desktop shrink',           '✦ Native mobile routes optimised for field'],
    ['Swipe-to-complete tasks at trade shows',        'Not applicable',       'Not present',              '✦ Swipe gesture + offline sync queue'],
    ['section:Setup & Operations', '', '', ''],
    ['Reports — funnel, quotes, orders, sends',       'Manual export',        'Basic reporting',          '✦ 6 panels + trend charts + CSV export'],
    ['Time to operational for a 10-person team',      'Ongoing chaos',        '2–4 weeks',                '✦ Under 5 days · guided setup'],
  ];

  return (
    <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <SectionTitle
          light
          eyebrow="Only in Setu Flow"
          title={<>Features you won&apos;t find anywhere else.</>}
          body="Built from the ground up for import-export — not a generic CRM with trade fields bolted on."
        />

        {/* Unique feature pills */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {uniqueFeatures.map(({ icon, label, detail }) => (
            <div key={label} className="group relative rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#7de2d2]/40 hover:bg-white/[0.07]">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#7de2d2]/20 bg-[#7de2d2]/10 text-[#7de2d2]">
                <Icon name={icon} className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[13px] font-semibold leading-5 text-white">{label}</p>
              <p className="mt-2 text-[11px] leading-5 text-white/40">{detail}</p>
            </div>
          ))}
        </div>

        {/* Full comparison table */}
        <div className="mt-16">
          <h3 className="mb-6 text-center text-xl font-semibold tracking-[-0.025em] text-white">Full feature comparison</h3>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Capability</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Excel + Email</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">HubSpot / Zoho</th>
                    <th className="bg-[#7de2d2]/[0.06] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">Setu Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {compRows.map((row, i) => {
                    if (row[0].startsWith('section:')) {
                      return (
                        <tr key={i} className="border-b border-white/8 bg-white/[0.025]">
                          <td colSpan={4} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">{row[0].replace('section:','')}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i} className="border-b border-white/[0.06] transition hover:bg-white/[0.04]">
                        <td className="px-5 py-3.5 font-medium text-white/85">{row[0]}</td>
                        <td className="px-5 py-3.5 text-white/45">{row[1]}</td>
                        <td className="px-5 py-3.5 text-white/45">{row[2]}</td>
                        <td className="bg-[#7de2d2]/[0.04] px-5 py-3.5 font-semibold text-[#b8f5ef]">{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-lg font-semibold tracking-[-0.02em] text-white">Spreadsheets didn&apos;t break your workflow. Generic CRMs did.</p>
            <p className="mt-2 text-sm text-white/45">Setu Flow was designed specifically for import-export execution from day one.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ButtonLink href="/book-demo">See how this works in your workflow →</ButtonLink>
              <ButtonLink href="/compare" variant="ghost">Full comparison page</ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PRICING SECTION ──────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      tagline: 'For teams moving beyond spreadsheets',
      price: '$149',
      period: '/month',
      users: 'Up to 3 users',
      badge: null,
      featured: false,
      features: [
        'Lead capture — business card scan, quick entry, vCard QR',
        'Pipeline board — buyer & supplier (Kanban + Compact view)',
        'Quote builder — EXW → DDP pricing, terms, approval gate',
        'WhatsApp & email quote delivery with tracked links',
        'Task workspace with calendar view and overdue grouping',
        'Setu Guru AI — live org context, follow-up drafts, HSN research',
        'Mobile workspace — lead queue, capture, tasks',
        'Guided onboarding within 5 business days',
      ],
      notIncluded: ['Document management system', 'Order execution & dispatch gates', 'Trade event workspace', 'Compliance checklist engine', 'Reports & analytics'],
      cta: 'Start with Starter',
      color: 'border-[#1F487C]/10',
    },
    {
      name: 'Growth',
      tagline: 'For teams running full trade execution',
      price: '$349',
      period: '/month',
      users: 'Up to 8 users',
      badge: 'Most popular',
      featured: true,
      features: [
        'Everything in Starter',
        'Order execution desk — dispatch gates, payment state, closeout',
        'Document management — PDF generation, versioning, signed storage',
        'Compliance engine — country checklist, evidence upload, waive/defer',
        'Trade events workspace — batch capture with source attribution',
        'Product catalog — variants, CSV import/export, pricing gaps screen',
        'Reports & analytics — 6 panels, trend charts, CSV export',
        'Setu Guru AI — document insights, compliance summaries, deal prioritisation',
        'Priority setup support',
      ],
      notIncluded: [],
      cta: 'Start with Growth',
      color: 'border-[#059f90]',
    },
    {
      name: 'Enterprise',
      tagline: 'For multi-team trade operations',
      price: 'Custom',
      period: '',
      users: 'Unlimited users',
      badge: null,
      featured: false,
      features: [
        'Everything in Growth',
        'Unlimited users and workspace seats',
        'Custom role definitions and permission sets',
        'Dedicated onboarding and workflow mapping',
        'Commercial process customisation',
        'Security review and audit trail access',
        'Custom SLA and priority support',
        'Multi-org or white-label options on request',
      ],
      notIncluded: [],
      cta: 'Talk to us',
      color: 'border-[#1F487C]/10',
    },
  ];

  return (
    <section id="pricing" className="bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionTitle eyebrow="Pricing" title="Start in days. Not months." body="Three tiers built around real trade team stages. No implementation fee. No consultants. No contracts required." />

      {/* Tier differentiator callout */}
      <div className="mx-auto mt-8 max-w-2xl rounded-[1.5rem] border border-[#1F487C]/10 bg-white px-6 py-4 shadow-[0_14px_40px_rgba(31,72,124,0.07)]">
        <p className="text-center text-sm font-semibold text-slate-700">
          <span className="text-[#108477]">Setu Guru AI</span> is included in all plans.{' '}
          <span className="text-[#108477]">Document management</span> unlocks from Growth.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_22px_70px_rgba(31,72,124,0.09)] ${plan.color} ${plan.featured ? 'lg:-translate-y-3' : ''}`}>
            {plan.badge && (
              <div className="absolute right-6 top-6 rounded-full bg-[#059f90]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#059f90]">{plan.badge}</div>
            )}

            {/* Header */}
            <div className={`p-7 ${plan.featured ? 'bg-[#061c2e] text-white' : ''}`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.20em] ${plan.featured ? 'text-[#7de2d2]' : 'text-[#108477]'}`}>{plan.name}</p>
              <p className={`mt-1 text-sm font-medium ${plan.featured ? 'text-white/55' : 'text-slate-500'}`}>{plan.tagline}</p>
              <div className="mt-5 flex items-end gap-1.5">
                <span className={`text-5xl font-semibold tracking-[-0.06em] ${plan.featured ? 'text-white' : 'text-slate-950'}`}>{plan.price}</span>
                {plan.period && <span className={`pb-1.5 text-sm ${plan.featured ? 'text-white/45' : 'text-slate-400'}`}>{plan.period}</span>}
              </div>
              <p className={`mt-1.5 text-sm font-medium ${plan.featured ? 'text-white/50' : 'text-slate-400'}`}>{plan.users}</p>
            </div>

            {/* Features */}
            <div className="flex flex-1 flex-col p-7 pt-6">
              <ul className="space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <Check size="sm" />{f}
                  </li>
                ))}
              </ul>
              {plan.notIncluded.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Not included</p>
                  {plan.notIncluded.map(f => (
                    <p key={f} className="flex items-center gap-2 py-1 text-xs text-slate-300">
                      <span className="h-3.5 w-3.5 shrink-0 text-center text-[10px] text-slate-200">—</span>{f}
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-7">
                <Link
                  href="/book-demo"
                  className={`flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 ${
                    plan.featured
                      ? 'bg-[#059f90] text-white shadow-[0_14px_36px_rgba(5,159,144,0.28)] hover:bg-[#07897d]'
                      : 'bg-[#f0f6fa] text-[#061c2e] hover:bg-[#e3edf6]'
                  }`}
                >
                  {plan.cta} →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-slate-400">
        All plans include guided setup. Setu Guru AI is included across all tiers. Document management and order execution unlock from Growth.
      </p>
    </section>
  );
}

// ─── OTHER PAGE EXPORTS (Platform, Solutions, etc.) ───────────────────────────
function WorkflowStrip() {
  return (
    <section className="bg-[#f4f9fc] px-4 py-14 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="Workflow" title="Five stages. Zero gaps." />
      <div className="mx-auto mt-10 grid max-w-7xl gap-3 md:grid-cols-5">
        {(['Capture','Qualify','Quote','Approve','Execute'] as const).map((s,i) => (
          <div key={s} className="rounded-2xl border border-[#1F487C]/10 bg-white p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#108477] text-xs font-bold text-white">{i+1}</span>
            <h3 className="mt-4 font-bold text-slate-950">{s}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{['Capture buyer context.','Review lead fit.','Prepare governed quote.','Check approval readiness.','Move to order execution.'][i]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCards({ items }: { items: Feature[] }) {
  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
      {items.map(item => (
        <article key={item.title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_18px_55px_rgba(31,72,124,0.07)]">
          <Orb icon={item.icon} />
          <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
          <Link href={item.href || '/platform'} className="mt-5 inline-flex text-sm font-bold text-[#108477]">Learn more →</Link>
        </article>
      ))}
    </div>
  );
}

export function PlatformMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Platform</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">One platform for every stage of the trade.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">From first lead to final invoice — pipeline, quotes, compliance, orders, documents and Setu Guru AI, all connected.</p>
          <div className="mt-8 flex gap-3"><ButtonLink href="/book-demo">Book a Demo</ButtonLink><ButtonLink href="/compare" variant="secondary">Compare features</ButtonLink></div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          {productShots.map(shot => <ScreenshotFrame key={shot.src} shot={shot} />)}
        </div>
      </section>
      <WorkflowStrip />
      <PricingSection />
      <CTA />
    </PageShell>
  );
}

export function SolutionsMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Solutions</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Built for real trade teams, not generic pipelines.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Whether you export, import, source or trade across borders — Setu Flow fits the way your team actually operates.</p>
          <div className="mt-8"><ButtonLink href="/book-demo">Book a Demo</ButtonLink></div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <FeatureCards items={[
          {icon:'globe',    title:'Exporters',         body:'Manage markets, buyers, pricing, compliance and shipment readiness from one desk.'},
          {icon:'package',  title:'Importers',          body:'Track sourcing, supplier follow-ups, quotes and operational handoffs without spreadsheet drift.'},
          {icon:'ship',     title:'Trading companies',  body:'Run buyer and supplier motion in one workspace with role-aware pipeline visibility.'},
          {icon:'search',   title:'Sourcing teams',     body:'Capture trade-show leads, qualify fast and move to quotes with full attribution.'},
          {icon:'quote',    title:'Commercial teams',   body:'Governed pricing from EXW to retail, with approval gates and version history on every quote.'},
          {icon:'document', title:'Operations teams',   body:'Document tracking, dispatch gates and compliance clearance tied to every order.'},
        ]}/>
      </section>
      <CTA title="Book a solution-specific demo" />
    </PageShell>
  );
}

export function SetuGuruMarketingPage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_10%_0%,rgba(53,159,145,0.28),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-[#7de2d2]/22 bg-[#7de2d2]/8 px-4 py-2 mb-6">
              <GuruAvatar size={36} />
              <GuruLogoNavbar className="h-7 w-auto" />
            </div>
            <h1 className="text-5xl font-semibold leading-[0.97] tracking-[-0.055em] sm:text-6xl">Your AI trade co-pilot,<br/><span className="text-[#7de2d2]">built into every plan.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">Setu Guru knows your live pipeline. It drafts communications, researches HS codes, flags risk and suggests next actions — with operator approval on every output.</p>
            <div className="mt-8 flex gap-3"><ButtonLink href="/book-demo">See Guru in a demo</ButtonLink><ButtonLink href="/platform" variant="ghost">Explore platform</ButtonLink></div>
          </div>
          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <GuruAvatar size={44} />
              <div>
                <p className="font-bold text-sm">Setu Guru</p>
                <div className="flex items-center gap-1.5 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/><span className="text-[11px] text-white/40">Online · org-aware</span></div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-wider mb-2">You</p>
              <p className="text-sm text-white/75">Which quotes are at risk this week?</p>
              <p className="mt-3 text-xs text-[#7de2d2] font-semibold uppercase tracking-wider mb-2">Guru</p>
              <p className="text-sm leading-6 text-white/65">2 quotes approaching expiry in 3 days. SF-Q-202606-017 has had no buyer response in 26 days — I can draft a follow-up for your review. SF-Q-202606-004 is blocked by a pending approval. Want me to flag it to the admin queue?</p>
            </div>
            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[11px] italic text-white/28">All suggestions require operator approval before any action.</div>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Capabilities" title="11 ways Guru helps your trade team." />
        <FeatureCards items={[
          {icon:'message',   title:'Follow-up drafting',     body:'Draft context-aware follow-ups for operator review. Never sends automatically.', href:'/setu-guru-ai'},
          {icon:'quote',     title:'Quote intelligence',     body:'Flags stale quotes, risk signals and approval blocks in your live pipeline.', href:'/setu-guru-ai'},
          {icon:'search',    title:'HSN code research',      body:'Web-search-backed HS code lookups with operator-confirmed write-back.', href:'/setu-guru-ai'},
          {icon:'shield',    title:'Risk flags',             body:'Surfaces compliance gaps, missing documents and payment risks for review.', href:'/setu-guru-ai'},
          {icon:'document',  title:'Document insights',      body:'Summarises document completeness state from the current order context.', href:'/setu-guru-ai'},
          {icon:'chart',     title:'Deal prioritisation',    body:'Ranks leads by urgency, value and activity recency — helping your team work the right accounts first.', href:'/setu-guru-ai'},
        ]}/>
      </section>
      <CTA title="Experience Setu Guru AI in your workflow" />
    </PageShell>
  );
}

export function MobileMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Field Ready</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Trade runs in the field. So does Setu Flow.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Lead queue, quick capture, pipeline, tasks and Setu Guru AI — all optimised for a phone screen and offline-ready for trade shows.</p>
          <div className="mt-8"><ButtonLink href="/book-demo">Book a Demo</ButtonLink></div>
        </div>
      </section>
      <section className="bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {mobileShots.map(shot => <ScreenshotFrame key={shot.src} shot={shot} />)}
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
        <div className="mx-auto max-w-7xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Start in days. Not months.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Three tiers built around real trade team stages. No implementation fee. No consultants required.</p>
        </div>
      </section>
      <PricingSection />
      <CTA title="Book a pricing walkthrough" body="We'll walk through which tier fits your team size and trade workflow in under 30 minutes." />
    </PageShell>
  );
}

export function CompareMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Compare</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Where CRMs stop, your operation has work to do.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Setu Flow was built from scratch for import-export — not adapted from a generic pipeline tool. See what that means in practice.</p>
          <div className="mt-8 flex gap-3"><ButtonLink href="/book-demo">Book a Demo</ButtonLink><ButtonLink href="/pricing" variant="secondary">See pricing</ButtonLink></div>
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
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_30px_90px_rgba(31,72,124,0.10)] lg:grid lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="border-b border-[#1F487C]/10 bg-[#f4f9fc] p-8 lg:border-b-0 lg:border-r">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#108477] text-white">
              <Icon name="calendar" className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Setu Flow Walkthrough</h2>
            <p className="mt-1.5 text-sm font-semibold text-slate-400">30 minutes · Web conferencing</p>
            <p className="mt-5 text-sm leading-7 text-slate-600">We map the demo around your actual trade workflow — lead capture, quoting, approvals, execution and Setu Guru AI.</p>
            <ul className="mt-6 space-y-2.5">
              {['Your current workflow and key challenges', 'Live screenshot tour of each stage', 'Setu Guru AI in your pipeline context', 'Setup timeline and pricing for your team size'].map(t => (
                <li key={t} className="flex items-start gap-3 text-sm text-slate-600"><Check size="sm" />{t}</li>
              ))}
            </ul>
            <div className="mt-8 rounded-[1.2rem] border border-[#1F487C]/10 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Calendar invite from</p>
              <p className="mt-1 text-sm font-bold text-[#108477]">help@setugroups.com</p>
              <p className="mt-2 text-xs text-slate-400">Select a slot, complete your details, and we confirm within one business day.</p>
            </div>
          </aside>
          <div className="p-6 sm:p-8">
            <BookDemoForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
