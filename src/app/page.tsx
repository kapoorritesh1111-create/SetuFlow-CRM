import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';
import { BookDemoForm } from '@/components/marketing/book-demo-form';

type IconName = 'chart' | 'file' | 'alert' | 'bridge' | 'scan' | 'users' | 'quote' | 'shield' | 'ship' | 'globe' | 'package' | 'repeat' | 'search' | 'message' | 'qr' | 'box' | 'database' | 'ai' | 'task' | 'doc' | 'pipeline' | 'report';
type Card = { icon: IconName; title: string; body: string };
type WorkflowStep = Card & { step: string; image: string };
type Frame = { eyebrow: string; title: string; body: string; image: string; alt: string };

const workflow: WorkflowStep[] = [
  { step: '01', icon: 'scan',     title: 'Capture',  body: 'Turn trade-show conversations, business cards and quick leads into structured records before context disappears.',                   image: '/marketing/mobile-quick-lead.png' },
  { step: '02', icon: 'users',    title: 'Qualify',  body: 'Add owner, role, market, product interest, deal value and next action. Compliance posture surfaces here, not at dispatch.',         image: '/marketing/follow-up-queue.png' },
  { step: '03', icon: 'quote',    title: 'Quote',    body: 'Build governed pricing across the EXW → FOB → CIF → DDP hierarchy. Terms, approval gates, and PDF delivery — all in one flow.',   image: '/marketing/quote-workflow.png' },
  { step: '04', icon: 'shield',   title: 'Approve',  body: 'Commercial control with approval gates before any quote or deal moves forward. Adjustments over 15% trigger mandatory review.',    image: '/marketing/pipeline-commercial-view.png' },
  { step: '05', icon: 'ship',     title: 'Execute',  body: 'Orders carry accepted quotes into documents, dispatch gates, compliance blockers, payment state, and final invoice closeout.',     image: '/marketing/orders-execution.png' },
];

const problemCards: Card[] = [
  { icon: 'chart', title: 'CRM does not equal execution',   body: 'Most CRMs stop at deal tracking. Trade teams still need quote control, documents, dispatch and payment visibility in one place.' },
  { icon: 'file',  title: 'Quotes live outside the system', body: 'Pricing, terms, freight assumptions and approvals drift across spreadsheets, email threads and chat messages — every deal.' },
  { icon: 'alert', title: 'Blockers appear too late',        body: 'Compliance and document gaps surface when the shipment is already at risk. Not when there is still time to act.' },
];

const categoryPoints = [
  { icon: 'scan'     as IconName, text: 'Capture buyer and supplier context' },
  { icon: 'quote'    as IconName, text: 'Govern quote readiness and pricing' },
  { icon: 'shield'   as IconName, text: 'Control approval handoffs' },
  { icon: 'ship'     as IconName, text: 'Execute with blockers visible' },
];

const productFrames: Frame[] = [
  { eyebrow: 'Command Center',   title: 'See everything. Miss nothing.',                                   body: 'Pipeline value, market coverage, quotes in motion, blocked revenue, and follow-ups surface in one command view. Six analytics panels run in parallel.',                              image: '/marketing/dashboard-command-center.png', alt: 'Setu Flow command center dashboard with trade KPIs and market map' },
  { eyebrow: 'Follow-up Queue',  title: 'Know exactly what needs action next.',                            body: 'Every lead carries urgency, owner, value, role and stage context so your team works the right accounts first.',                                                                    image: '/marketing/follow-up-queue.png',           alt: 'Setu Flow follow-up queue showing overdue leads and actions' },
  { eyebrow: 'Quote Workflow',   title: 'Build, price and approve without spreadsheet drift.',             body: 'EXW → FOB → CIF → DDP pricing hierarchy, terms lock before pricing, UOM and MOQ on every line, and admin approval queue for flagged adjustments.',                               image: '/marketing/quote-workflow.png',            alt: 'Setu Flow quote workflow with pricing step and quote preview' },
  { eyebrow: 'Execution Desk',   title: 'Track documents, shipments and blockers after the deal closes.', body: 'Orders keep commercial context alive through dispatch gates, missing documents, compliance blockers, payment state, and automatic PDF generation.',                                image: '/marketing/orders-execution.png',          alt: 'Setu Flow order execution desk showing dispatch blockers and document status' },
  { eyebrow: 'Pipeline Board',   title: 'Every deal, every stage — in one Kanban view.',                  body: 'Stage-move gating prevents premature advancement. Buyer and supplier pipelines in one workspace. Full, Compact, and Micro card density modes for different screen sizes.',          image: '/marketing/pipeline-commercial-view.png',  alt: 'Setu Flow pipeline kanban board with stage gating' },
  { eyebrow: 'Document Control', title: 'Every PDF tracked from generation to delivery.',                  body: 'Quote PDFs, order confirmations, invoices, packing lists — generated, versioned, and delivered. Status tracked from link_created to Mailtrap webhook confirmed.',                    image: '/marketing/dashboard-command-center.png',  alt: 'Setu Flow document control desk' },
];

const comparisonRows = [
  ['section','Quoting & Pricing'],
  ['EXW / FOB / CIF / DDP pricing hierarchy',       'Manual calculation', 'Custom field only',   '✓ Native pricing calculator'],
  ['Category and org-level pricing defaults',        'Spreadsheet',        'Not present',          '✓ Cascade: org → category → product → quote'],
  ['Quote-only line adjustments with approval gate', 'Email chain',        'Workflow add-on',      '✓ >15% threshold triggers mandatory review'],
  ['Quote versioning with immutable audit trail',    'File versions',      'Workflow add-on',      '✓ Lifecycle states + approval handoff'],
  ['WhatsApp quote delivery from mobile',            'Copy-paste link',    'Not present',          '✓ One-tap tracked send'],
  ['PDF generation — no paid API',                   'Word / email',       'Template tool',        '✓ Native writer + puppeteer, zero cost'],
  ['section','Lead & Pipeline Management'],
  ['Business card OCR → lead in 30s',               'Manual entry',       '3rd-party scan app',   '✓ In-app capture + vCard + QR'],
  ['Trade show batch capture with source context',   'Spreadsheet',        'Campaign tag',         '✓ Event context inherited per entry'],
  ['Stage-move gating with blocker explanations',    'Free-move',          'Not present',          '✓ Blocked moves show required action'],
  ['Buyer + Supplier in one workspace',              'Separate sheets',    'Single pipeline only', '✓ Role-aware dual pipeline view'],
  ['Pipeline board with 3 card density modes',       'Not applicable',     'Desktop list only',    '✓ Full / Compact / Micro on Kanban'],
  ['section','Compliance & Execution'],
  ['Country compliance checklist by destination',    'Manual tracking',    'External tool',        '✓ Driven by product + destination rules'],
  ['Certificate expiry tracking',                    'Calendar reminder',  'Not present',          '✓ Flagged before it blocks shipment'],
  ['Dispatch gate with document blockers',           'Email chain',        'Not present',          '✓ Gate evaluator runs at every stage'],
  ['Document management with PDF version history',   'File folder',        'Attachment only',      '✓ Two-source architecture + signed storage'],
  ['section','AI & Intelligence'],
  ['AI assistant with live org data context',        'Not applicable',     'Bolt-on chatbot',      '✓ Setu Guru — org-aware, read-only safe'],
  ['HSN code research and write-back',               'Manual lookup',      'Not present',          '✓ Guru researches + operator confirms'],
  ['AI-drafted follow-up and quote cover notes',     'ChatGPT tab',        'Email templates',      '✓ Drafts in context, operator approves all'],
  ['Lead priority intelligence and quote risk flags','Gut feel',           'Score add-on',         '✓ Daily insight panel, no action without approval'],
  ['section','Mobile & Field Work'],
  ['Field-ready mobile workspace',                   'Not applicable',     'Desktop shrink',       '✓ Dedicated mobile app routes'],
  ['Swipe-to-complete tasks on phone',               'Not applicable',     'Not present',          '✓ Swipe gesture + offline queue'],
  ['section','Setup & Operations'],
  ['Task workspace with calendar view',              'Spreadsheet',        'Basic reminders',      '✓ List + calendar + entity linking'],
  ['Reports across funnel, quotes, orders, sends',   'Manual export',      'Basic reporting',      '✓ 6 panels + trend charts + CSV export'],
  ['Time to get a 10-person team operational',       'Ongoing chaos',      '2–4 weeks',            '✓ < 5 days · guided setup'],
];

const audiences: Card[] = [
  { icon: 'globe',    title: 'Exporters',         body: 'Manage markets, buyers, products, pricing and shipment readiness from one place.' },
  { icon: 'package',  title: 'Importers',          body: 'Track sourcing, supplier follow-ups, quotes and operational handoffs without spreadsheet drift.' },
  { icon: 'repeat',   title: 'Trading companies',  body: 'Run buyer and supplier motion in one workspace with role-aware visibility across both pipelines.' },
  { icon: 'search',   title: 'Sourcing teams',     body: 'Capture trade-show conversations, qualify opportunities and move fast on next actions.' },
];

const integrations: Card[] = [
  { icon: 'ai',       title: 'Setu Guru AI',            body: 'Context-aware AI assistant with live org data access. HSN research, pricing suggestions, follow-up drafts — all requiring operator approval.' },
  { icon: 'message',  title: 'WhatsApp handoffs',        body: 'Share quotes and documents where buyers already respond. Mobile-native and desktop-web routing.' },
  { icon: 'qr',       title: 'Smart vCard exchange',     body: 'Smart QR, clean .vcf contact save, Apple and Google Wallet actions, and public reply capture from the same share card.' },
  { icon: 'scan',     title: 'Smart capture',            body: 'Business card OCR via OpenAI Vision for fast lead entry. Offline queue syncs when connectivity returns.' },
  { icon: 'box',      title: 'Product catalog',          body: 'Quote-ready products, variants, MOQ, pricing basis, and market coverage. Bulk CSV import and export.' },
  { icon: 'database', title: 'Secure workspace',         body: 'Tenant-aware workspace with RLS, role-based access, audit trail, and org-scoped data isolation.' },
];

const pricing = [
  { name: 'Starter',    price: '$199',   users: 'Up to 5 users',              body: 'For small trade teams moving from scattered tools into a structured operating flow.',     features: ['Lead + pipeline management', 'Quote workflow foundation', 'vCard, QR and quick capture', 'Mobile-ready workspace', 'Guided onboarding support'],                                                                   cta: 'Book starter demo', featured: false },
  { name: 'Growth',     price: '$499',   users: 'Up to 10 users',             body: 'For teams running higher volume across markets, products, quotes and execution.',         features: ['Everything in Starter', 'Advanced quote and approval flow', 'Orders / execution desk', 'Setu Guru AI assistant', 'Trade events workspace', 'Catalog + pricing readiness', 'Priority setup support'], cta: 'Book growth demo',  featured: true  },
  { name: 'Enterprise', price: 'Custom', users: 'Custom users and workflows',  body: 'For multi-team trade operations with governance, compliance, and custom rollout needs.', features: ['Everything in Growth', 'Custom roles and workflow setup', 'Dedicated onboarding', 'Security and audit support', 'Commercial process mapping'],                                                         cta: 'Contact sales',     featured: false },
];

// ─── Icon system ───────────────────────────────────────────────────────────────

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    chart:    <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/></>,
    file:     <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/></>,
    alert:    <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/></>,
    bridge:   <><path d="M4 17c2.5-4 5.2-6 8-6s5.5 2 8 6"/><path d="M4 17h16"/><path d="M7 17v-4"/><path d="M12 17v-6"/><path d="M17 17v-4"/><path d="M5 7h14"/></>,
    scan:     <><path d="M7 3H5a2 2 0 0 0-2 2v2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></>,
    users:    <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    quote:    <><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></>,
    shield:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    ship:     <><path d="M3 17h18"/><path d="M6 17 4 9h16l-2 8"/><path d="M8 9V5h8v4"/><path d="M6 21c1 0 1.5-.5 2-1s1-1 2-1 1.5.5 2 1 1 1 2 1 1.5-.5 2-1 1-1 2-1 1.5.5 2 1"/></>,
    globe:    <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></>,
    package:  <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5"/><path d="M12 22v-9.5"/></>,
    repeat:   <><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    search:   <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    message:  <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8"/><path d="M8 13h6"/></>,
    qr:       <><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h2"/><path d="M18 14h2v2"/><path d="M14 18h6"/><path d="M14 20h2"/></>,
    box:      <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z"/><path d="M12 12 4.2 7.6"/><path d="M12 12l7.8-4.4"/><path d="M12 12v9"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    ai:       <><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><path d="M7 14h.01M12 14h.01M17 14h.01"/></>,
    task:     <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    doc:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></>,
    pipeline: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    report:   <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function IconOrb({ name, dark = false }: { name: IconName; dark?: boolean }) {
  return (
    <div className={dark
      ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-[#7de2d2]'
      : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]'}>
      <Icon name={name} />
    </div>
  );
}

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p className={light
      ? 'text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]'
      : 'text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]'}>
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center setu-reveal">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={light
        ? 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl'
        : 'mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl'}>
        {title}
      </h2>
      {body && (
        <p className={light
          ? 'mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64'
          : 'mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600'}>
          {body}
        </p>
      )}
    </div>
  );
}

function Check({ light = false }: { light?: boolean }) {
  return (
    <span className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
      light ? 'bg-[#359F91]/20 text-[#7de2d2]' : 'bg-[#359F91]/12 text-[#108477]'
    }`}>✓</span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const targetMarkets = [
  { flag: '\u{1F1EE}\u{1F1F3}', name: 'India'          },
  { flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland'        },
  { flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
  { flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany'        },
  { flag: '\u{1F1FA}\u{1F1F8}', name: 'United States'  },
];

export default function HomePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white" style={{ fontFamily: "'Plus Jakarta Sans', var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, sans-serif" }}>

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-[#061c2e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_0%_0%,rgba(53,159,145,0.38),transparent_55%),radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(12,127,255,0.30),transparent_50%),linear-gradient(175deg,#061c2e_0%,#082740_48%,#061c2e_100%)]" />
          <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:52px_52px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/40 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-0 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-12">

              {/* LEFT */}
              <div className="pb-10 pt-12 sm:pt-14 lg:py-28 setu-reveal">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">
                  <Icon name="bridge" className="h-3.5 w-3.5" />
                  Trade Execution CRM
                </div>
                <h1 className="mt-5 text-[2.75rem] font-bold leading-[0.96] tracking-[-0.045em] sm:text-[3.6rem] lg:text-[4.8rem] lg:tracking-[-0.055em]">
                  Bridge the gap<br className="hidden sm:block" />{' '}
                  in your business.<br />
                  Shore to shore.
                </h1>
                <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/68 sm:mt-6 sm:text-base sm:leading-8 lg:text-[17px]">
                  From first contact to final shipment, Setu Flow runs your entire trade operation in one calm, connected system — with an AI assistant that knows your pipeline.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <a href="#book-demo" className="flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#061c2e] shadow-[0_16px_48px_rgba(125,226,210,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(125,226,210,0.30)]">
                    Book a demo
                  </a>
                  <a href="#platform" className="flex items-center justify-center rounded-full border border-white/22 bg-white/8 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/14 hover:border-white/30">
                    Explore platform
                  </a>
                </div>
                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                  {['Built for import-export teams', 'Setu Guru AI included', 'Operational in days'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-[13px] font-medium text-white/60">
                      <Check light /><span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-white/10 pt-7">
                  <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Active in</span>
                  {targetMarkets.map((m, i) => (
                    <span key={m.name} className="flex items-center gap-1.5 text-[12px]">
                      <span role="img" aria-label={m.name} className="text-[15px] leading-none">{m.flag}</span>
                      <span className="font-medium text-white/52">{m.name}</span>
                      {i < targetMarkets.length - 1 && <span className="mx-0.5 text-white/20">·</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT: Dashboard visual */}
              <div className="relative pb-10 lg:py-16 setu-float setu-reveal setu-delay-1">
                <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(ellipse_at_50%_40%,rgba(53,159,145,0.22),transparent_60%),radial-gradient(ellipse_at_80%_10%,rgba(12,127,255,0.18),transparent_50%)] blur-2xl" />
                <div className="relative rounded-[2.2rem] border border-white/16 bg-white/8 p-2.5 shadow-[0_40px_120px_rgba(0,0,0,0.50),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-sm lg:rotate-[-0.8deg]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#e8f4f8] p-1.5">
                    <Image src="/marketing/dashboard-command-center.png" alt="Setu Flow command center" width={1628} height={1032} priority sizes="(max-width: 640px) 95vw, (max-width: 1024px) 90vw, 55vw" className="rounded-[1.35rem]" />
                  </div>
                  <div className="absolute -left-5 bottom-10 hidden rounded-2xl border border-white/16 bg-[#061c2e]/92 px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.50)] backdrop-blur-sm md:block">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">Live pipeline</p>
                    <p className="mt-1.5 text-[2.1rem] font-bold leading-none tracking-[-0.05em]">$1.05M</p>
                    <p className="mt-1.5 text-[11px] font-medium text-white/50">weighted commercial view</p>
                  </div>
                  {/* Setu Guru badge */}
                  <div className="absolute -right-4 top-8 hidden rounded-2xl border border-[#7de2d2]/28 bg-[#062840]/92 px-4 py-3.5 shadow-[0_16px_42px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:block">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7de2d2]/15 text-[#7de2d2]">
                        <Icon name="ai" className="h-4 w-4" />
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">Setu Guru</p>
                    </div>
                    <p className="mt-1.5 text-[15px] font-bold">AI is ready</p>
                    <p className="mt-0.5 text-[11px] text-white/50">Org-aware assistant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat bar */}
          <div className="relative border-t border-white/[0.07]">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-5 sm:px-6 sm:justify-start lg:px-8">
              {[
                ['< 5 days', 'avg. time to go live'],
                ['$0',       'implementation fee'],
                ['15+',      'trade market corridors'],
                ['11',       'Guru AI capabilities'],
              ].map(([val, lbl]) => (
                <div key={lbl} className="flex items-baseline gap-2.5">
                  <span className="text-lg font-bold tracking-tight text-[#7de2d2]">{val}</span>
                  <span className="text-[12px] font-medium text-white/40">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PROBLEM ═════════════════════════════════════════════ */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="The problem" title="Your trade operation isn't broken. Your tools are." body="Buyers don't lose confidence because your team lacks effort. They lose confidence when the system can't carry a deal from conversation to shipment." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
            {problemCards.map(({ icon, title, body }, index) => (
              <div key={title} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}>
                <IconOrb name={icon} />
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ CATEGORY ════════════════════════════════════════════ */}
        <section id="platform" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>The difference</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">This isn&apos;t a CRM. It&apos;s a Trade Execution System.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">Generic CRMs were built for pipelines. Trade teams need execution: quotes, approvals, compliance, orders and commercial handoffs — with an AI assistant that knows your actual data.</p>
              <div className="mt-8 rounded-[1.6rem] border border-[#359F91]/18 bg-white p-5 shadow-[0_18px_55px_rgba(31,72,124,0.08)]">
                <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Spreadsheets didn&apos;t break your workflow. CRMs did.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Generic CRMs were never designed for FOB pricing, FX exposure, country compliance, and multi-party approval chains.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 setu-reveal setu-delay-1">
              {categoryPoints.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-4 rounded-[1.45rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_18px_55px_rgba(31,72,124,0.07)]">
                  <IconOrb name={icon} />
                  <p className="text-base font-semibold tracking-[-0.015em] text-slate-950">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SETU GURU AI ════════════════════════════════════════ */}
        <section className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="setu-reveal">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">
                <Icon name="ai" className="h-3.5 w-3.5" />
                Setu Guru AI
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">Your trade operation — with an AI co-pilot that knows every deal.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">Setu Guru is context-aware. It reads your live pipeline, quotes, orders and compliance state — then suggests actions, drafts communications, researches HSN codes, and flags risk. Everything requires operator approval. Nothing happens autonomously.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ['Live org context', 'Reads your leads, quotes, and orders — not generic advice'],
                  ['HSN code research', 'Looks up codes and writes back only after you confirm'],
                  ['Draft follow-ups', 'Writes emails and cover notes in your context — you approve'],
                  ['Pricing suggestions', 'Reads category defaults and suggests pricing on request'],
                  ['Quote risk flags', 'Flags stale quotes, missing compliance, approaching expiry'],
                  ['Read-only safe', 'Cannot send, approve, or modify anything without operator action'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7de2d2]/15 text-[#7de2d2] text-[10px]">✓</span>
                      {title}
                    </p>
                    <p className="mt-1 pl-7 text-xs leading-5 text-white/50">{desc}</p>
                  </div>
                ))}
              </div>
              <a href="#book-demo" className="mt-8 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#061c2e] shadow-xl transition hover:-translate-y-0.5">See Setu Guru in the demo →</a>
            </div>
            <div className="relative setu-reveal setu-delay-1">
              <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_50%,rgba(125,226,210,0.18),transparent_55%)] blur-2xl" />
              <div className="relative rounded-[2rem] border border-white/14 bg-white/[0.06] p-6 backdrop-blur">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7de2d2]/15 text-[#7de2d2]"><Icon name="ai" className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold">Setu Guru</p>
                    <div className="mt-0.5 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="text-[11px] text-white/50">Online</span></div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { q: 'Which leads need follow-up today?', a: '4 leads are overdue. Atlas Natural Grocers (3 days), Amazonia Trade Foods (5 days), Andes Premium Foods (1 day), and one more. Want me to draft a follow-up for the oldest?' },
                    { q: 'What\'s the HSN code for organic turmeric powder?', a: 'HSN 0910.30 covers turmeric (whether or not ground). For organic certified variants, additional export documentation may be required. Shall I apply this to the Atlas catalog entry?' },
                  ].map(({ q, a }) => (
                    <div key={q} className="rounded-2xl bg-white/[0.04] p-4">
                      <p className="text-[12px] font-semibold text-white/40 uppercase tracking-[0.14em]">Operator</p>
                      <p className="mt-1 text-sm text-white/80">{q}</p>
                      <p className="mt-3 text-[12px] font-semibold text-[#7de2d2] uppercase tracking-[0.14em]">Guru</p>
                      <p className="mt-1 text-sm leading-6 text-white/70">{a}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] text-white/30 italic">All suggestions require operator approval before any action is taken.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="How it works" title="From chaos to execution — in one flow." body="Five steps that any trade team can follow: Capture → Qualify → Quote → Approve → Execute. Every stage connected, every handoff tracked." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 lg:grid-cols-5">
            {workflow.map(({ step, icon, title, body, image }, index) => (
              <div key={title} className={`group rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_18px_60px_rgba(31,72,124,0.075)] transition hover:-translate-y-0.5 hover:border-[#359F91]/35 setu-reveal setu-delay-${(index % 4) + 1}`}>
                <div className="flex items-center justify-between gap-3">
                  <IconOrb name={icon} />
                  <span className="rounded-full bg-[#061c2e] px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#7de2d2]">{step}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
                <p className="mt-3 min-h-[6.2rem] text-sm leading-6 text-slate-600">{body}</p>
                <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-slate-200 bg-[#eef6fb]">
                  <Image src={image} alt={`${title} workflow view`} width={420} height={280} className="h-32 w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ MID-PAGE CTA ════════════════════════════════════════ */}
        <section className="bg-[#061c2e] px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur setu-reveal">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7de2d2]">See it in action</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">See how Setu Flow fits your workflow.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">Map your current lead, quote and execution process into Setu Flow. A 30-minute demo built around your business. Pick a time slot and get a calendar invite from help@setugroups.com.</p>
              </div>
              <a href="#book-demo" className="rounded-full bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">Book demo →</a>
            </div>
          </div>
        </section>

        {/* ══ PRODUCT FRAMES ══════════════════════════════════════ */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Platform highlights" title="One platform. Every stage of the trade." body="Built for the real workflow of import-export teams — from the first lead to the final shipment." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-2">
            {productFrames.map(({ eyebrow, title, body, image, alt }, index) => (
              <article key={title} className={`rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_24px_70px_rgba(31,72,124,0.085)] setu-reveal setu-delay-${(index % 4) + 1}`}>
                <div className="relative">
                  <div className="absolute -inset-3 rounded-[1.8rem] bg-[#359F91]/9 blur-2xl" />
                  <div className="relative rounded-[1.6rem] border border-slate-200 bg-white p-2 shadow-[0_15px_45px_rgba(31,72,124,0.12)]">
                    <Image src={image} alt={alt} width={1628} height={1032} className="rounded-[1.25rem]" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">{eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ══ vCARD ═══════════════════════════════════════════════ */}
        <section className="overflow-hidden bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>Contact Exchange</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Turn every meeting into a saved contact and a next action.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">Setu Flow&apos;s shareable vCard is more than a business card. Prospects scan, save, request a quote, or send their details back into your CRM — from the same share card.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {['Smart QR opens the public card', 'Save contact as a clean vCard', 'Apple and Google Wallet actions', 'Lead capture and follow-through'].map(text => (
                  <div key={text} className="flex items-center gap-3 rounded-2xl border border-[#1F487C]/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_38px_rgba(31,72,124,0.06)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8fbf7] text-[#108477]">✓</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <a href="#book-demo" className="mt-8 inline-flex rounded-full bg-[#061c2e] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(6,28,46,0.18)] transition hover:-translate-y-0.5">See contact exchange in the demo →</a>
            </div>
            <div className="relative mx-auto w-full max-w-[23rem] setu-reveal setu-delay-1 sm:max-w-[26rem] lg:max-w-[28rem]">
              <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_18%,rgba(53,159,145,0.30),transparent_40%),radial-gradient(circle_at_50%_70%,rgba(12,127,255,0.18),transparent_42%)] blur-2xl" />
              <div className="relative rounded-[2.1rem] border border-white/70 bg-white/80 p-2 shadow-[0_34px_90px_rgba(6,28,46,0.24)] backdrop-blur">
                <Image src="/marketing/vcard-share-homepage-blurred.png" alt="Setu Flow shareable vCard modal with QR, save contact, share, and wallet actions" width={413} height={896} className="rounded-[1.7rem]" />
              </div>
            </div>
          </div>
        </section>

        {/* ══ COMPARISON ══════════════════════════════════════════ */}
        <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Why Setu Flow wins" title="Where other CRMs stop, your operation still has work to do." body="From FOB pricing to AI research to compliance dispatch gates — see exactly where Setu Flow covers the full execution gap." light />
          <div className="mx-auto mt-12 max-w-7xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] shadow-[0_34px_100px_rgba(0,0,0,0.22)] setu-reveal">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-[0.20em] text-white/45">
                    <th className="px-5 py-5 font-semibold">What you need</th>
                    <th className="px-5 py-5 font-semibold">Excel + Email</th>
                    <th className="px-5 py-5 font-semibold">HubSpot / Zoho</th>
                    <th className="px-5 py-5 font-semibold text-[#7de2d2]">Setu Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) =>
                    row[0] === 'section'
                      ? <tr key={`s-${index}`} className="border-b border-white/8 bg-white/[0.035]"><td colSpan={4} className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">{row[1]}</td></tr>
                      : <tr key={`r-${index}`} className="border-b border-white/8 transition hover:bg-white/[0.04]">
                          <td className="px-5 py-4 font-medium text-white/92">{row[0]}</td>
                          <td className="px-5 py-4 text-white/55">{row[1]}</td>
                          <td className="px-5 py-4 text-white/55">{row[2]}</td>
                          <td className="px-5 py-4 font-semibold text-[#d6fff8]">{row[3]}</td>
                        </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-3xl text-center setu-reveal">
            <p className="text-lg font-semibold tracking-[-0.02em]">Spreadsheets didn&apos;t break your workflow. CRMs did.</p>
            <a href="#book-demo" className="mt-6 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">See how this works in your workflow →</a>
          </div>
        </section>

        {/* ══ STATS ═══════════════════════════════════════════════ */}
        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Built to perform" title="Designed for serious trade operations." body="Every number reflects a real capability inside the platform." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ['< 5 days', 'Average time from onboarding to a team-ready, live workspace'],
              ['$0',       'Implementation fee — no consultants, no dependency, no contracts required'],
              ['15+',      'Trade market corridors active across buyer and supplier flows'],
            ].map(([value, label], index) => (
              <div key={label} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-7 text-center shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}>
                <p className="text-4xl font-semibold tracking-[-0.05em] text-[#06263f]">{value}</p>
                <p className="mx-auto mt-3 max-w-[16rem] text-[11px] font-semibold uppercase leading-5 tracking-[0.16em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ AUDIENCES ═══════════════════════════════════════════ */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Who it's for" title="Teams that run trade, not just track it." body="Whether you are moving goods across borders or managing a sourcing desk, Setu Flow fits the way trade teams actually work." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audiences.map(({ icon, title, body }, index) => (
              <div key={title} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index + 1}`}>
                <IconOrb name={icon} />
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ MOBILE ══════════════════════════════════════════════ */}
        <section className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="setu-reveal">
              <Eyebrow>Field ready</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Run your trade operation anywhere.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Your team doesn&apos;t work at a desk. Setu Flow&apos;s mobile workspace gives sales reps, sourcing managers and field staff the same command view — lead queue, quick capture, pipeline, and Setu Guru AI — wherever trade happens.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-5 setu-reveal setu-delay-1">
              {[
                ['/marketing/mobile-dashboard.png', 'Mobile dashboard view showing trade KPIs'],
                ['/marketing/mobile-leads.png',     'Mobile leads queue with urgency and stage context'],
                ['/marketing/mobile-quick-lead.png','Mobile quick lead capture form'],
              ].map(([src, alt], index) => (
                <div key={src} className={`rounded-[1.6rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_22px_70px_rgba(6,28,46,0.22)] setu-float-${index + 1}`}>
                  <Image src={src} alt={alt} width={390} height={844} className="rounded-[1.2rem]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ INTEGRATIONS ════════════════════════════════════════ */}
        <section id="integrations" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Works with your stack" title="Fits how your team already operates." body="Setu Flow connects to the tools and channels your buyers already use — no re-training, no new habits, no integration overhead." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(({ icon, title, body }, index) => (
              <div key={title} className={`flex gap-4 rounded-[1.6rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_55px_rgba(31,72,124,0.075)] setu-reveal setu-delay-${index % 4}`}>
                <IconOrb name={icon} />
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ PRICING ═════════════════════════════════════════════ */}
        <section id="pricing" className="bg-[#eef6fb] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionTitle eyebrow="Pricing" title="Start in days. Not months." body="Demo-led, guided setup for serious trade teams. No implementation fee and no consulting dependency." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-3">
            {pricing.map((plan, index) => (
              <div key={plan.name} className={`relative overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_22px_70px_rgba(31,72,124,0.09)] setu-reveal setu-delay-${index + 1} ${plan.featured ? 'border-[#0c7fff] lg:-translate-y-3' : 'border-[#1F487C]/10'}`}>
                {plan.featured && <div className="absolute right-6 top-6 rounded-full bg-[#7de2d2]/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#108477]">Most popular</div>}
                <div className={plan.featured ? 'bg-[#061c2e] p-7 text-white' : 'bg-white p-7 text-slate-950'}>
                  <h3 className="text-2xl font-semibold tracking-[-0.03em]">{plan.name}</h3>
                  <p className={plan.featured ? 'mt-3 min-h-[3.5rem] text-sm leading-7 text-white/68' : 'mt-3 min-h-[3.5rem] text-sm leading-7 text-slate-600'}>{plan.body}</p>
                  <div className="mt-7 flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.06em]">{plan.price}</span>
                    {plan.price !== 'Custom' && <span className={plan.featured ? 'pb-2 text-sm text-white/55' : 'pb-2 text-sm text-slate-500'}>/ month</span>}
                  </div>
                  <p className={plan.featured ? 'mt-2 text-sm font-medium text-white/60' : 'mt-2 text-sm font-medium text-slate-500'}>{plan.users}</p>
                </div>
                <div className="p-7">
                  <ul className="space-y-3.5">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700">
                        <Check /><span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#book-demo" className={plan.featured
                    ? 'mt-8 flex rounded-2xl bg-[linear-gradient(135deg,#0c7fff,#0052cc)] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(12,127,255,0.26)] transition hover:-translate-y-0.5'
                    : 'mt-8 flex rounded-2xl bg-[#eef3f8] px-5 py-3.5 text-center text-sm font-semibold text-[#061c2e] transition hover:-translate-y-0.5 hover:bg-[#e3edf6]'}>
                    <span className="mx-auto">{plan.cta} →</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm font-medium text-slate-500">All plans include onboarding support and trade workflow setup. Setu Guru AI is included in Growth and Enterprise plans.</p>
        </section>

        {/* ══ BOOK DEMO ═══════════════════════════════════════════ */}
        <section id="book-demo" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="setu-reveal">
              <Eyebrow>Get in touch</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">Book a guided Setu Flow walkthrough.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Pick a time slot and tell us about your trade workflow. We will map the demo around your lead capture, quote, approval, order, and AI assistant needs.</p>
              <div className="mt-6 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#eef6fb] p-5 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">Calendar invite sent from</p>
                <p className="mt-1 font-semibold text-[#1F487C]">help@setugroups.com</p>
                <p className="mt-3 text-slate-500">Select a time slot in the form, complete your details, and we confirm within one business day.</p>
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#eef6fb] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">What we cover</p>
                <ul className="mt-3 space-y-2">
                  {['Your current lead and quote workflow', 'Capture and trade-show use case', 'Pricing calculator and approval flow', 'Setu Guru AI in your pipeline context', 'Setup timeline and onboarding plan'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <Check />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <BookDemoForm />
          </div>
        </section>

        {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-[#061c2e] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(53,159,145,0.28),transparent_40%),linear-gradient(175deg,#061c2e,#0b2e4a)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/30 to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center setu-reveal">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7de2d2]">Ready to move</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl">Run your entire trade operation in one flow.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/68">Capture, qualify, quote, approve, execute — and let Setu Guru AI handle the context so your team focuses on the deal.</p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <a href="#book-demo" className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#06263f] shadow-xl transition hover:-translate-y-0.5">Book demo</a>
              <Link href="/client-login" className="rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">Enter workspace</Link>
            </div>
          </div>
        </section>

      </main>
    </SiteShell>
  );
}
