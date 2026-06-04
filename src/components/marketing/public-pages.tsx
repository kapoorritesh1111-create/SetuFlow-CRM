import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteShell } from './site-shell';
import { BookDemoForm } from './book-demo-form';

// ─── Types ────────────────────────────────────────────────────────────────────
type IconName = 'lead'|'quote'|'approval'|'order'|'document'|'task'|'mobile'
  |'shield'|'globe'|'chart'|'package'|'message'|'calendar'|'search'|'users'
  |'ship'|'ai'|'scan'|'pipeline'|'report'|'vcard'|'compliance'|'catalog'|'events'|'whatsapp';

// ─── Shared primitives ────────────────────────────────────────────────────────
function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const p: Record<IconName, ReactNode> = {
    lead:       <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></>,
    quote:      <><path d="M7 7h10M7 11h10M7 15h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/></>,
    approval:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    order:      <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5M12 22v-9.5"/></>,
    document:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></>,
    task:       <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    mobile:     <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    shield:     <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    globe:      <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></>,
    chart:      <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    package:    <><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="m3.3 7.5 8.7 5 8.7-5M12 22v-9.5"/></>,
    message:    <><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
    calendar:   <><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    search:     <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    users:      <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    ship:       <><path d="M3 17h18M6 17 4 9h16l-2 8M8 9V5h8v4"/></>,
    ai:         <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>,
    scan:       <><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></>,
    pipeline:   <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    report:     <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
    vcard:      <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M8 12h.01M12 12h4M12 16h4"/></>,
    compliance: <><path d="M9 11l3 3 8-8"/><path d="M21 12a9 9 0 1 1-9-9c1.4 0 2.7.3 3.9.8"/></>,
    catalog:    <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z"/><path d="M12 12 4.2 7.6M12 12l7.8-4.4M12 12v9"/></>,
    events:     <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></>,
    whatsapp:   <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 8.46 19.86 19.86 0 0 1 1.77 5.08 2 2 0 0 1 3.73 3H6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17l.92-.08Z"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p[name]}</svg>;
}

function Orb({ icon, size='md', dark=false }: { icon: IconName; size?: 'sm'|'md'|'lg'; dark?: boolean }) {
  const d = size==='lg' ? 'h-14 w-14' : size==='sm' ? 'h-9 w-9' : 'h-11 w-11';
  const i = size==='lg' ? 'h-6 w-6' : size==='sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className={`flex ${d} shrink-0 items-center justify-center rounded-2xl ${dark ? 'border border-[#7de2d2]/20 bg-[#7de2d2]/10 text-[#7de2d2]' : 'border border-[#359F91]/18 bg-[#359F91]/8 text-[#108477]'}`}>
      <Icon name={icon} className={i}/>
    </span>
  );
}

function GuruAvatar({ size=44 }: { size?: number }) {
  return <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={size} height={size} className="rounded-2xl object-cover shrink-0" />;
}

function Eyebrow({ children, light=false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${light ? 'text-[#7de2d2]' : 'text-[#108477]'}`}>{children}</p>;
}

function SectionTitle({ eyebrow, title, body, light=false, center=true }: { eyebrow: string; title: ReactNode; body?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={`mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[2.75rem] ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      {body && <p className={`mt-4 text-base leading-7 ${light ? 'text-white/60' : 'text-slate-500'}`}>{body}</p>}
    </div>
  );
}

function Check({ light=false, size='md' }: { light?: boolean; size?: 'sm'|'md' }) {
  const d = size==='sm' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-[11px]';
  return <span className={`mt-0.5 flex ${d} shrink-0 items-center justify-center rounded-full font-bold ${light ? 'bg-[#7de2d2]/20 text-[#7de2d2]' : 'bg-[#e6faf6] text-[#108477]'}`}>✓</span>;
}

function Btn({ href, children, v='primary' }: { href: string; children: ReactNode; v?: 'primary'|'secondary'|'dark'|'ghost'|'white' }) {
  const c = {
    primary:   'bg-[#059f90] text-white shadow-[0_12px_32px_rgba(5,159,144,0.30)] hover:bg-[#07897d]',
    dark:      'bg-[#061c2e] text-white shadow-[0_12px_32px_rgba(6,28,46,0.24)] hover:bg-[#0b2e4a]',
    secondary: 'border border-[#108477]/30 bg-white text-[#108477] hover:bg-[#eef6fb]',
    ghost:     'border border-white/22 bg-white/8 text-white backdrop-blur hover:bg-white/14',
    white:     'bg-white text-[#061c2e] shadow-[0_12px_32px_rgba(255,255,255,0.15)] hover:bg-slate-50',
  }[v];
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${c}`}>{children}<span aria-hidden>→</span></Link>;
}

function ScreenShot({ src, title, label, body, aspect='wide', dim=false }: { src: string; title: string; label: string; body: string; aspect?: 'wide'|'tall'|'phone'; dim?: boolean }) {
  const h = aspect==='phone' ? 'h-[28rem]' : aspect==='tall' ? 'h-72' : 'h-52 sm:h-60';
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

function PageShell({ children }: { children: ReactNode }) {
  return <SiteShell><main className="overflow-hidden bg-white">{children}</main></SiteShell>;
}

function CTA({ title='Ready to see Setu Flow in action?', body='30-minute walkthrough built around your trade workflow. Calendar invite from help@setugroups.com.' }: { title?: string; body?: string }) {
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

// ─── COMPARISON DATA (shared between home + compare page) ─────────────────────
const USPs = [
  { icon: 'quote'      as IconName, label: 'EXW → FOB → CIF → DDP pricing hierarchy',           detail: 'Full 6-level cascade from ex-works to retail. Per variant, per category, per org. No other CRM has this.' },
  { icon: 'approval'   as IconName, label: 'Commercial approval gate — org-configurable threshold', detail: 'The org sets the adjustment threshold. Anything above it freezes the quote until a named admin approves.' },
  { icon: 'document'   as IconName, label: 'Full document management system',                     detail: 'PDF generation, versioning, signed storage, delivery tracking — from quote to packing list to final invoice.' },
  { icon: 'compliance' as IconName, label: 'Country-specific compliance engine',                  detail: 'Compliance items auto-built from product × destination rules. Evidence upload, waive, defer — all tracked.' },
  { icon: 'scan'       as IconName, label: 'Business card OCR → structured lead in 30s',          detail: 'OpenAI Vision parses business card photos into full lead records. Offline queue for connectivity gaps.' },
  { icon: 'events'     as IconName, label: 'Trade show management — capture, qualify, close',     detail: 'Event pipeline with active events, intake queue, batch capture, buyer/supplier split and lead attribution.' },
  { icon: 'ai'         as IconName, label: 'Setu Guru AI — org-aware, every plan',                detail: 'Reads your live pipeline. Drafts comms, researches HSN codes, flags risk. Always learning. All plans.' },
  { icon: 'vcard'      as IconName, label: 'Smart vCard — QR, Wallet, lead capture from share',   detail: 'Public /card page, Smart QR, .vcf download, Apple/Google Wallet, and contact submissions become leads.' },
  { icon: 'ship'       as IconName, label: 'Dispatch gate — docs required before shipment',       detail: 'Packing list, freight request and compliance all gated. Nothing ships until everything is cleared.' },
  { icon: 'pipeline'   as IconName, label: 'Buyer + Supplier in one Kanban workspace',            detail: 'Role-aware dual pipeline with stage-move gating, Full/Compact/Micro card density.' },
];

const compRows: [string, string, string, string][] = [
  ['section:Quoting & Pricing','','',''],
  ['EXW → FOB → CIF → DDP pricing calculator',        'Manual spreadsheet',     'Custom field only',     '✦ Native 6-level hierarchy'],
  ['Category & org-level pricing defaults',            'Copy-paste each time',   'Not present',           '✦ Org → Category → Product → Quote'],
  ['Org-configurable approval gate on adjustments',    'Email chain',            'Workflow add-on',       '✦ Threshold set by org admin'],
  ['Quote versioning — immutable audit trail',         'File saves',             'Version add-on',        '✦ Lifecycle states + approval chain'],
  ['WhatsApp quote delivery from mobile',              'Copy-paste link',        'Not present',           '✦ One-tap tracked send'],
  ['section:Document Management','','',''],
  ['PDF generation — zero external cost',              'Word / email',           'Template tool',         '✦ Native writer + puppeteer, $0'],
  ['Document management — versions, storage, delivery','File folder',            'Attachment only',       '✦ Two-source versioned architecture'],
  ['Dispatch gate — docs required before shipment',    'Email chain',            'Not present',           '✦ Packing list + freight + compliance'],
  ['section:Lead & Pipeline','','',''],
  ['Business card OCR → lead in 30 seconds',           'Manual entry',           'Third-party scan app',  '✦ Built-in capture + vCard + QR'],
  ['Trade show management with event pipeline',        'Spreadsheet',            'Campaign tag only',     '✦ Full event workspace + batch capture'],
  ['Stage-move gating with blocker explanation',       'Free-move',              'Not present',           '✦ Blocked until requirements met'],
  ['Buyer + Supplier in one pipeline',                 'Separate sheets',        'Single pipeline only',  '✦ Role-aware dual-mode Kanban'],
  ['Smart vCard with Wallet actions + QR',             'Not applicable',         'Not present',           '✦ Smart QR, .vcf, Wallet, lead capture'],
  ['section:Compliance & Execution','','',''],
  ['Country compliance checklist by destination',      'Manual tracking',        'External tool',         '✦ Auto-built from product × destination'],
  ['Certificate expiry tracking',                      'Calendar reminder',      'Not present',           '✦ Flagged in pipeline before it blocks'],
  ['section:AI & Intelligence','','',''],
  ['AI assistant with live org data context',          'Not applicable',         'Bolt-on chatbot',       '✦ Setu Guru — reads your pipeline, all plans'],
  ['HSN code research + controlled write-back',        'Manual lookup',          'Not present',           '✦ Web search + operator confirms before write'],
  ['AI-drafted follow-ups and quote cover notes',      'ChatGPT in another tab', 'Email templates',       '✦ In context, operator approves all'],
  ['section:Mobile & Field','','',''],
  ['Dedicated mobile workspace',                       'Not applicable',         'Desktop shrink',        '✦ Mobile-native web app — all key routes'],
  ['Trade show capture on phone',                      'Notes app',              'Not present',           '✦ Scan, dictate, quick entry + offline sync'],
  ['section:Setup','','',''],
  ['Time to operational — 10-person team',             'Ongoing chaos',          '2–4 weeks',             '✦ Under 5 days · guided setup'],
];

// ─── PRICING DATA (shared) ────────────────────────────────────────────────────
const pricingPlans = [
  {
    name: 'Starter', tagline: 'For teams moving beyond spreadsheets',
    price: '$199', period: '/month', users: 'Up to 5 users',
    badge: null, featured: false,
    features: [
      'Lead capture — business card scan, quick entry, vCard QR',
      'Pipeline board — Buyer & Supplier (Kanban + Compact view)',
      'Quote builder — EXW → DDP pricing, terms, approval gate',
      'WhatsApp & email quote delivery with tracked links',
      'Task workspace with calendar view and overdue grouping',
      'Mobile workspace — lead queue, capture, tasks, pipeline',
      'Setu Guru AI — live org context, follow-up drafts, HSN research',
      'Guided onboarding · live within 5 business days',
    ],
    notIncluded: ['Document management system','Order execution & dispatch gates','Trade event workspace','Compliance checklist engine','Reports & analytics'],
    cta: 'Start with Starter',
  },
  {
    name: 'Growth', tagline: 'For teams running full trade execution',
    price: '$499', period: '/month', users: 'Up to 10 users',
    badge: 'Most popular', featured: true,
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
  },
  {
    name: 'Enterprise', tagline: 'For multi-team trade operations',
    price: 'Custom', period: '', users: 'Unlimited users',
    badge: null, featured: false,
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
  },
];

// ─── COMPARISON SECTION ───────────────────────────────────────────────────────
function ComparisonSection() {
  return (
    <section id="compare" className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">

        <SectionTitle light eyebrow="Only in Setu Flow"
          title={<>Features you won&apos;t find<br className="hidden sm:block"/> in any other CRM.</>}
          body="Built from the ground up for import-export — every capability here is exclusive to Setu Flow." />

        {/* USP grid */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {USPs.map(({ icon, label, detail }) => (
            <div key={label} className="rounded-[1.4rem] border border-white/8 bg-white/[0.04] p-4 transition hover:border-[#7de2d2]/35 hover:bg-white/[0.07]">
              <Orb icon={icon} size="sm" dark />
              <p className="mt-3 text-[13px] font-semibold leading-5 text-white">{label}</p>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-white/38">{detail}</p>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="mt-14 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.20em]">
                  <th className="px-5 py-4 text-white/35">Capability</th>
                  <th className="px-5 py-4 text-white/35">Excel + Email</th>
                  <th className="px-5 py-4 text-white/35">HubSpot / Zoho</th>
                  <th className="bg-[#7de2d2]/[0.06] px-5 py-4 text-[#7de2d2]">Setu Flow</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row, i) =>
                  row[0].startsWith('section:') ? (
                    <tr key={i} className="border-b border-white/8 bg-white/[0.025]">
                      <td colSpan={4} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/28">{row[0].replace('section:','')}</td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-b border-white/[0.06] transition hover:bg-white/[0.04]">
                      <td className="px-5 py-3.5 font-medium text-white/82">{row[0]}</td>
                      <td className="px-5 py-3.5 text-white/40">{row[1]}</td>
                      <td className="px-5 py-3.5 text-white/40">{row[2]}</td>
                      <td className="bg-[#7de2d2]/[0.04] px-5 py-3.5 font-semibold text-[#b8f5ef]">{row[3]}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-5 text-center">
          <p className="text-lg font-semibold tracking-[-0.02em] text-white">Spreadsheets didn&apos;t break your workflow. Generic CRMs did.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Btn href="/book-demo" v="primary">See this in your workflow →</Btn>
            <Btn href="/compare" v="ghost">Full comparison page</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PRICING SECTION ─────────────────────────────────────────────────────────
function PricingSection() {
  return (
    <section id="pricing" className="bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionTitle eyebrow="Pricing" title="Start in days. Not months."
        body="Three tiers built around real trade team stages. No implementation fee. No contracts required." />

      <div className="mx-auto mt-6 max-w-xl rounded-[1.25rem] border border-[#1F487C]/10 bg-white px-6 py-3.5 shadow-[0_12px_36px_rgba(31,72,124,0.06)]">
        <p className="text-center text-[13px] font-semibold text-slate-600">
          <span className="text-[#108477]">Setu Guru AI</span> is included in all plans.{' '}
          <span className="text-[#108477]">Document management</span> unlocks from Growth.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-3">
        {pricingPlans.map((plan) => (
          <div key={plan.name} className={`relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_20px_60px_rgba(31,72,124,0.09)] ${plan.featured ? 'border-[#059f90] lg:-translate-y-3' : 'border-[#1F487C]/10'}`}>
            {plan.badge && <div className="absolute right-5 top-5 rounded-full bg-[#059f90]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#059f90]">{plan.badge}</div>}
            <div className={`p-7 ${plan.featured ? 'bg-[#061c2e] text-white' : ''}`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.20em] ${plan.featured ? 'text-[#7de2d2]' : 'text-[#108477]'}`}>{plan.name}</p>
              <p className={`mt-1 text-sm ${plan.featured ? 'text-white/50' : 'text-slate-400'}`}>{plan.tagline}</p>
              <div className="mt-5 flex items-end gap-1.5">
                <span className={`text-5xl font-semibold tracking-[-0.06em] ${plan.featured ? 'text-white' : 'text-slate-950'}`}>{plan.price}</span>
                {plan.period && <span className={`pb-1.5 text-sm ${plan.featured ? 'text-white/40' : 'text-slate-400'}`}>{plan.period}</span>}
              </div>
              <p className={`mt-1 text-sm ${plan.featured ? 'text-white/45' : 'text-slate-400'}`}>{plan.users}</p>
            </div>
            <div className="flex flex-1 flex-col p-7 pt-5">
              <ul className="space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-[13px] leading-5 text-slate-700"><Check size="sm" />{f}</li>
                ))}
              </ul>
              {plan.notIncluded.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Not in this plan</p>
                  {plan.notIncluded.map(f => <p key={f} className="flex items-center gap-2 py-0.5 text-xs text-slate-300"><span className="text-slate-200 text-[10px]">—</span>{f}</p>)}
                </div>
              )}
              <div className="mt-auto pt-6">
                <Link href="/book-demo" className={`flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 ${plan.featured ? 'bg-[#059f90] text-white shadow-[0_12px_32px_rgba(5,159,144,0.28)] hover:bg-[#07897d]' : 'bg-[#f0f6fa] text-[#061c2e] hover:bg-[#e3edf6]'}`}>
                  {plan.cta} →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-slate-400">All plans include guided onboarding. Setu Guru AI on every tier. Document management and order execution from Growth.</p>
    </section>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export function HomeMarketingPage() {
  // 5 hero feature pills that summarise the "why us"
  const heroFeatures = [
    { icon: 'quote'      as IconName, title: 'Governed quoting',     body: 'EXW → DDP pricing hierarchy with org-configurable approval gates.' },
    { icon: 'document'   as IconName, title: 'Document management',  body: 'From quote PDF to packing list — versioned, stored, delivered.' },
    { icon: 'compliance' as IconName, title: 'Compliance engine',    body: 'Auto-built checklists by product × destination. Gated before dispatch.' },
    { icon: 'ai'         as IconName, title: 'Setu Guru AI',         body: 'Org-aware AI on every plan. Drafts, researches, flags risk — you approve.' },
    { icon: 'events'     as IconName, title: 'Trade show capture',   body: 'Event pipeline, batch card scan, intake queue. Leads attributed instantly.' },
  ];

  return (
    <PageShell>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#061c2e] px-4 pt-14 pb-0 text-white sm:px-6 lg:px-8 lg:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(53,159,145,0.28),transparent_50%),radial-gradient(ellipse_50%_50%_at_100%_0%,rgba(12,127,255,0.20),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/35 to-transparent" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:gap-14">

            {/* Left */}
            <div className="pb-12 pt-4 lg:pb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/25 bg-[#7de2d2]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">
                Trade Execution CRM
              </div>
              <h1 className="mt-5 text-[2.5rem] font-semibold leading-[0.96] tracking-[-0.05em] sm:text-[3.2rem] lg:text-[4.2rem]">
                Bridge the gap<br className="hidden sm:block" /> in your trade operation.{' '}
                <span className="text-[#7de2d2]">Shore to shore.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/60 sm:text-base">
                From first contact to final shipment — lead capture, governed quotes, compliance, dispatch and Setu Guru AI in one connected system for import-export teams.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Btn href="/book-demo" v="primary">Book a Demo</Btn>
                <Btn href="/platform" v="ghost">Explore Platform</Btn>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {['Built for import-export','Setu Guru AI included','Live in under 5 days'].map(t => (
                  <span key={t} className="flex items-center gap-2 text-[13px] font-medium text-white/50"><Check light size="sm"/>{t}</span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-white/10 pt-5">
                <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">Active in</span>
                {[['🇮🇳','India'],['🇮🇪','Ireland'],['🇬🇧','UK'],['🇩🇪','Germany'],['🇺🇸','US']].map(([f,n]) => (
                  <span key={n} className="flex items-center gap-1 text-[12px] font-medium text-white/45">
                    <span className="text-[14px]">{f}</span>{n}<span className="mx-1 text-white/15">·</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right — screenshot pinned to bottom */}
            <div className="relative lg:self-end">
              <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_55%_40%,rgba(53,159,145,0.14),transparent_55%)] blur-2xl pointer-events-none" />
              <div className="relative rounded-t-[2rem] border border-b-0 border-white/12 bg-white/5 p-2.5 shadow-[0_-16px_60px_rgba(0,0,0,0.28)]">
                <div className="overflow-hidden rounded-t-[1.6rem] border border-b-0 border-white/8 bg-[#d8eaf5]">
                  <Image src="/marketing/ss-dashboard.jpg" alt="Setu Flow command center" width={1600} height={700} priority className="w-full object-cover object-top" />
                </div>
                <div className="absolute -left-5 top-8 hidden rounded-2xl border border-white/12 bg-[#061c2e]/92 px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.38)] backdrop-blur-sm md:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7de2d2]">Live pipeline</p>
                  <p className="mt-1 text-[1.8rem] font-bold leading-none tracking-[-0.05em]">$1.05M</p>
                  <p className="mt-0.5 text-[11px] text-white/40">weighted commercial view</p>
                </div>
                <div className="absolute -right-4 top-10 hidden rounded-2xl border border-[#7de2d2]/22 bg-[#062840]/90 px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-sm lg:block">
                  <div className="flex items-center gap-2">
                    <GuruAvatar size={26} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7de2d2]">Setu Guru</p>
                  </div>
                  <p className="mt-1 text-[13px] font-bold">AI is ready</p>
                  <p className="text-[11px] text-white/38">Org-aware · all plans</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="border-t border-white/[0.07]">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-4 sm:justify-start">
              {[['< 5 days','avg. time to go live'],['$0','implementation fee'],['15+','trade market corridors'],['11','Guru AI capabilities']].map(([v,l]) => (
                <div key={l} className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-[#7de2d2]">{v}</span>
                  <span className="text-[12px] text-white/35">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHY US — 5 KEY FEATURES ═══════════════════════════════════════════ */}
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <Eyebrow>Why Setu Flow</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.6rem]">
              Built for trade execution.<br className="hidden sm:block"/> Not adapted from something else.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {heroFeatures.map(({ icon, title, body }) => (
              <div key={title} className="rounded-[1.5rem] border border-[#1F487C]/10 bg-gradient-to-b from-white to-[#f8fbff] p-5 shadow-[0_14px_44px_rgba(31,72,124,0.07)] transition hover:-translate-y-0.5">
                <Orb icon={icon} />
                <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex justify-center">
            <Btn href="/compare" v="secondary">See full feature comparison</Btn>
          </div>
        </div>
      </section>

      {/* ══ WORKFLOW — 5 STEPS ════════════════════════════════════════════════ */}
      <section className="bg-[#f4f9fc] px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="How it works" title="One flow. Every stage of the trade." body="Five connected steps — no gaps, no spreadsheets, no scattered threads." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-3 md:grid-cols-5">
          {[
            { step:'01', icon:'scan'     as IconName, t:'Capture',  d:'Card scan, quick entry or vCard — lead in 30s.',       img:'/marketing/ss-capture.jpg' },
            { step:'02', icon:'users'    as IconName, t:'Qualify',  d:'Owner, role, market, product, value, compliance.',    img:'/marketing/ss-leads-cmd.jpg' },
            { step:'03', icon:'quote'    as IconName, t:'Quote',    d:'EXW → DDP pricing, terms lock, UOM, approval gate.',  img:'/marketing/ss-quotebuilder.jpg' },
            { step:'04', icon:'approval' as IconName, t:'Approve',  d:'Org-configurable gate. Nothing sends without sign-off.',img:'/marketing/ss-quotes.jpg' },
            { step:'05', icon:'ship'     as IconName, t:'Execute',  d:'Dispatch gates, docs, compliance, payment closeout.', img:'/marketing/ss-orders.jpg' },
          ].map(({ step, icon, t, d, img }) => (
            <div key={t} className="group rounded-[1.5rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_14px_44px_rgba(31,72,124,0.07)] transition hover:-translate-y-0.5 hover:border-[#359F91]/30">
              <div className="flex items-center justify-between">
                <Orb icon={icon} />
                <span className="rounded-full bg-[#061c2e] px-2.5 py-1 text-[11px] font-bold tracking-[0.10em] text-[#7de2d2]">{step}</span>
              </div>
              <h3 className="mt-4 text-sm font-bold tracking-[-0.01em] text-slate-950">{t}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">{d}</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-[#eef6fb]">
                <Image src={img} alt={t} width={400} height={260} className="h-24 w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PRODUCT SCREENSHOTS — 2+3 grid ═══════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Platform in action" title="Every screen is an outcome, not a demo." />
        <div className="mx-auto mt-10 max-w-7xl space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <ScreenShot src="/marketing/ss-dashboard.jpg"    label="Command Center"    title="Pipeline at a glance"        body="Live pipeline value, overdue follow-ups, blocked revenue — one view." />
            <ScreenShot src="/marketing/ss-trade-events.jpg" label="Trade Events"      title="Capture. Qualify. Close."    body="Active events, intake queue, batch capture with full lead attribution." />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <ScreenShot src="/marketing/ss-quotebuilder.jpg" label="Quote Builder"     title="Price it right. Every time." body="EXW → DDP hierarchy, UOM, MOQ, inline approval gates." />
            <ScreenShot src="/marketing/ss-orders.jpg"       label="Execution Desk"    title="Execution lives here"        body="Dispatch gates, document readiness, compliance, payment state." />
            <ScreenShot src="/marketing/ss-documents.jpg"    label="Document Control"  title="Every PDF tracked to delivery" body="Generated, versioned, signed, stored and delivery-confirmed." />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <ScreenShot src="/marketing/ss-pipeline.jpg"     label="Pipeline Board"    title="Every deal. Every stage."     body="Stage-gated Kanban, Full/Compact/Micro density, buyer + supplier." />
            <ScreenShot src="/marketing/ss-analytics.jpg"    label="Analytics"         title="The numbers tell the truth"   body="Commercial funnel, quote performance, order execution, send rates." />
            <ScreenShot src="/marketing/ss-catalog.jpg"      label="Product Catalog"   title="Quote-ready products"         body="Variants, MOQ, pricing basis, HS codes. Bulk CSV import." />
          </div>
        </div>
        <div className="mt-8 text-center">
          <Btn href="/platform" v="secondary">See full platform walkthrough</Btn>
        </div>
      </section>

      {/* ══ SETU GURU AI ══════════════════════════════════════════════════════ */}
      <section className="bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-[1fr_0.95fr] lg:items-start">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-[#7de2d2]/20 bg-[#7de2d2]/8 px-4 py-2.5">
              <GuruAvatar size={32} />
              <Image src="/setu-guru/guru-logo-navbar.png" alt="Setu Guru" width={180} height={60} className="h-6 w-auto" />
            </div>
            <h2 className="text-3xl font-semibold leading-[1.07] tracking-[-0.04em] sm:text-5xl">
              Your AI trade co-pilot.<br /><span className="text-[#7de2d2]">Built into every plan.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/58">
              Setu Guru is an always-learning, suggestive AI that reads your live pipeline. It knows your leads, quotes, orders and compliance state — and gets smarter with every interaction. It suggests next actions, drafts communications and researches HS codes. Operator approval required on every output. Nothing happens autonomously.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ['Live org context', 'Reads your actual leads, quotes and orders — not generic advice'],
                ['Always learning', 'Improves from your feedback — thumbs up/down trains the next response'],
                ['HSN code research', 'Web-search lookups, write-back only after you confirm'],
                ['Draft follow-ups', 'Drafted in your pipeline context — you review and approve'],
                ['Quote risk flags', 'Stale quotes, expiry, missing compliance — surfaced proactively'],
                ['Read-only safe', 'Cannot send, approve or modify anything without operator action'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><Check light size="sm" />{t}</p>
                  <p className="mt-1 pl-6 text-[11px] leading-5 text-white/38">{d}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7de2d2]/50">All plans · Document management from Growth</p>
            <div className="mt-5"><Btn href="/setu-guru-ai" v="primary">See Setu Guru AI in full</Btn></div>
          </div>

          {/* Chat mock */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <GuruAvatar size={40} />
                <div>
                  <p className="text-sm font-bold">Setu Guru</p>
                  <div className="flex items-center gap-1.5 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="text-[11px] text-white/40">Online · always learning</span></div>
                </div>
              </div>
              <span className="rounded-full bg-[#7de2d2]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7de2d2]">Suggestive AI</span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">You</p>
                <p className="mt-1 text-sm text-white/72">Which quotes are at risk this week?</p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7de2d2]">Guru</p>
                <p className="mt-1 text-sm leading-6 text-white/62">2 quotes approaching expiry in 3 days. SF-Q-202606-017 has had no buyer response in 26 days — I can draft a follow-up for your review. SF-Q-202606-004 is blocked by a pending approval. Want me to flag it to the admin queue?</p>
                {/* Action buttons — like the example */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="flex items-center gap-1.5 rounded-full border border-[#7de2d2]/30 bg-[#7de2d2]/10 px-3 py-1.5 text-[11px] font-bold text-[#7de2d2] transition hover:bg-[#7de2d2]/18">
                    <Icon name="whatsapp" className="h-3.5 w-3.5" /> Send follow-up via WhatsApp
                  </button>
                  <button className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/50 transition hover:bg-white/[0.10]">
                    Flag to admin queue
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">You</p>
                <p className="mt-1 text-sm text-white/72">What&apos;s the HSN code for organic turmeric powder?</p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7de2d2]">Guru</p>
                <p className="mt-1 text-sm leading-6 text-white/62">HSN 0910.30 covers turmeric, whether or not ground. For organic certified variants, FSSAI documentation may be required for export. Shall I apply this to the Atlas catalog entry?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-full border border-[#7de2d2]/30 bg-[#7de2d2]/10 px-3 py-1.5 text-[11px] font-bold text-[#7de2d2] transition hover:bg-[#7de2d2]/18">
                    Apply to Atlas catalog
                  </button>
                  <button className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/50 transition hover:bg-white/[0.10]">
                    Not now
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5 text-[11px] italic text-white/25">All suggestions require operator approval. Guru learns from your responses.</div>
          </div>
        </div>
      </section>

      {/* ══ VCARD ══════════════════════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-[#f4f9fc] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.6fr] lg:items-center">
          <div>
            <Eyebrow>Contact Exchange</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.07] tracking-[-0.04em] text-slate-950 sm:text-5xl">Turn every meeting into a lead and a next action.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-500">Buyers scan, save, request a quote or send their details back — all from the same share link. Every submission becomes a lead in your pipeline instantly.</p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {['Smart QR opens your public card','Clean .vcf for iOS & Android','Apple and Google Wallet actions','Contact submissions become leads'].map(t => (
                <div key={t} className="flex items-center gap-3 rounded-2xl border border-[#1F487C]/10 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 shadow-[0_10px_28px_rgba(31,72,124,0.05)]"><Check />{t}</div>
              ))}
            </div>
            <div className="mt-6"><Btn href="/book-demo" v="dark">See contact exchange in the demo</Btn></div>
          </div>
          <div className="mx-auto w-full max-w-[16rem]">
            <div className="relative rounded-[2rem] border border-[#1F487C]/10 bg-white p-2 shadow-[0_28px_70px_rgba(6,28,46,0.14)]">
              <div className="absolute -inset-5 bg-[radial-gradient(circle_at_50%_40%,rgba(53,159,145,0.16),transparent_55%)] blur-xl pointer-events-none" />
              <Image src="/marketing/ss-vcard.jpg" alt="Setu Flow Smart vCard" width={365} height={782} className="relative rounded-[1.6rem] w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ MOBILE ════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>Mobile-Native Web App</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.07] tracking-[-0.04em] text-slate-950 sm:text-5xl">Trade runs in the field. So does Setu Flow.</h2>
            <p className="mt-5 text-base leading-7 text-slate-500">Not a shrunken desktop. A purpose-built mobile web app with its own routes, navigation and gestures — optimised for phones at trade shows and on the road.</p>
            <div className="mt-6 space-y-2">
              {['Lead queue, pipeline and quote access on phone','Business card scan → lead in 30 seconds','Swipe-to-complete tasks at trade shows','Offline queue syncs when connectivity returns','Setu Guru AI accessible from mobile bottom bar'].map(t => (
                <div key={t} className="flex items-center gap-3 text-[13px] font-medium text-slate-600"><Check size="sm" />{t}</div>
              ))}
            </div>
            <div className="mt-6"><Btn href="/field-mobile" v="secondary">View mobile experience</Btn></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { src: '/marketing/ss-mobile-leads.jpg',   alt: 'Mobile leads queue' },
              { src: '/marketing/ss-mobile-capture.jpg', alt: 'Mobile capture lead' },
              { src: '/marketing/ss-tasks-mobile.jpg',   alt: 'Mobile task swipe' },
            ].map(({ src, alt }) => (
              <div key={src} className="rounded-[1.5rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_18px_55px_rgba(6,28,46,0.18)]">
                <Image src={src} alt={alt} width={425} height={907} className="w-full rounded-[1.1rem]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ═══════════════════════════════════════════════════════ */}
      <ComparisonSection />

      {/* ══ PRICING ══════════════════════════════════════════════════════════ */}
      <PricingSection />

      {/* ══ FINAL CTA ════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#061c2e] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(53,159,145,0.20),transparent_45%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/25 to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#7de2d2]">Ready to move</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">Run your entire trade operation in one flow.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-white/55">Capture, qualify, quote, approve, execute — and let Setu Guru handle context so your team focuses on the deal.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Btn href="/book-demo" v="white">Book a Demo</Btn>
            <Btn href="/client-login" v="ghost">Enter Workspace</Btn>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

// ─── PLATFORM PAGE ────────────────────────────────────────────────────────────
export function PlatformMarketingPage() {
  const allShots = [
    { src:'/marketing/ss-dashboard.jpg',    label:'Command Center',    t:'Pipeline at a glance',          b:'Live pipeline, overdue follow-ups, blocked revenue — one view.' },
    { src:'/marketing/ss-trade-events.jpg', label:'Trade Events',      t:'Capture. Qualify. Close.',      b:'Event pipeline, intake queue, batch card scan with lead attribution.' },
    { src:'/marketing/ss-leads-cmd.jpg',    label:'Follow-up Queue',   t:'Know what needs action next',   b:'Urgency-sorted lead cards with owner, value, role and compliance posture.' },
    { src:'/marketing/ss-quotebuilder.jpg', label:'Quote Builder',     t:'Price it right. Every time.',   b:'EXW → DDP hierarchy, UOM, MOQ, terms lock, approval gate.' },
    { src:'/marketing/ss-pipeline.jpg',     label:'Pipeline Board',    t:'Every deal. Every stage.',      b:'Stage-gated Kanban with Full/Compact/Micro density. Buyer + Supplier.' },
    { src:'/marketing/ss-orders.jpg',       label:'Execution Desk',    t:'Execution lives here',          b:'Dispatch gates, document readiness, compliance, payment closeout.' },
    { src:'/marketing/ss-documents.jpg',    label:'Document Control',  t:'Every PDF tracked to delivery', b:'Generated, versioned, signed, stored and delivery-confirmed.' },
    { src:'/marketing/ss-analytics.jpg',    label:'Analytics',         t:'The numbers tell the truth',    b:'Commercial funnel, quote performance, order execution — trend charts.' },
    { src:'/marketing/ss-tasks.jpg',        label:'Task Manager',      t:'Nothing slips through',         b:'Entity-linked tasks, calendar view, overdue grouping, swipe on mobile.' },
    { src:'/marketing/ss-catalog.jpg',      label:'Product Catalog',   t:'Quote-ready products',          b:'Variants, MOQ, pricing basis, HS codes, bulk CSV import.' },
  ];
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Platform</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">One platform.<br/>Every stage of the trade.</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">From first lead to final invoice — pipeline, quotes, compliance, orders, documents and Setu Guru AI, all connected and all tracked.</p>
            <div className="mt-7 flex gap-3"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/compare" v="secondary">Compare features</Btn></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['/marketing/ss-dashboard.jpg','/marketing/ss-trade-events.jpg','/marketing/ss-quotebuilder.jpg','/marketing/ss-orders.jpg'].map((src,i) => (
              <div key={src} className="overflow-hidden rounded-[1.5rem] border border-[#1F487C]/10 bg-white shadow-[0_12px_36px_rgba(31,72,124,0.08)]">
                <Image src={src} alt={`Platform screenshot ${i+1}`} width={800} height={500} className="h-36 w-full object-cover object-top" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="All modules" title="Every workspace, built for execution." />
        <div className="mx-auto mt-10 max-w-7xl grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {allShots.map(s => <ScreenShot key={s.src} src={s.src} label={s.label} title={s.t} body={s.b} />)}
        </div>
      </section>
      <PricingSection />
      <CTA />
    </PageShell>
  );
}

// ─── SOLUTIONS PAGE ───────────────────────────────────────────────────────────
export function SolutionsMarketingPage() {
  const solutions = [
    { icon:'globe'      as IconName, title:'Exporters',         body:'Manage markets, buyers, pricing, compliance and shipment readiness from one connected desk.' },
    { icon:'package'    as IconName, title:'Importers',          body:'Track sourcing, supplier follow-ups, quotes and operational handoffs without spreadsheet drift.' },
    { icon:'ship'       as IconName, title:'Trading companies',  body:'Run buyer and supplier motion in one workspace with role-aware pipeline visibility on both sides.' },
    { icon:'search'     as IconName, title:'Sourcing teams',     body:'Capture trade-show leads, qualify fast and move to governed quotes with full source attribution.' },
    { icon:'quote'      as IconName, title:'Commercial teams',   body:'Governed pricing from EXW to retail, approval gates and version history on every quote sent.' },
    { icon:'document'   as IconName, title:'Operations teams',   body:'Document tracking, dispatch gates and compliance clearance tied to every order in execution.' },
  ];
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Solutions</Eyebrow>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Built for real trade teams, not generic pipelines.</h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">Whether you export, import, source or trade across borders — Setu Flow fits the way your team actually operates.</p>
          <div className="mt-8 flex gap-3"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/pricing" v="secondary">See pricing</Btn></div>
        </div>
      </section>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map(({ icon, title, body }) => (
            <article key={title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_16px_50px_rgba(31,72,124,0.07)]">
              <Orb icon={icon} size="lg" />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
              <Link href="/book-demo" className="mt-5 inline-flex text-sm font-bold text-[#108477]">See a demo →</Link>
            </article>
          ))}
        </div>
      </section>
      {/* Trade show spotlight */}
      <section className="bg-[#f4f9fc] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>Trade Show Management</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.07] tracking-[-0.04em] text-slate-950 sm:text-4xl">Capture every lead at IndusFood, Gulfood, Anuga and beyond.</h2>
            <p className="mt-5 text-base leading-7 text-slate-500">Active event pipeline, intake queue, scan card, dictate note, review queue. Every booth entry attributed to the right event, buyer or supplier — instantly.</p>
            <div className="mt-6 space-y-2">
              {['Active events with Capture and Review actions','Batch card scan → lead with event attribution','Today\u2019s focus: need review, follow-ups due, high priority','Intake queue for real-time booth processing'].map(t => (
                <div key={t} className="flex items-center gap-3 text-[13px] font-medium text-slate-600"><Check size="sm" />{t}</div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#1F487C]/10 bg-white shadow-[0_20px_60px_rgba(31,72,124,0.10)]">
            <Image src="/marketing/ss-trade-events.jpg" alt="Setu Flow Trade Events workspace" width={1600} height={722} className="w-full object-cover object-top" />
          </div>
        </div>
      </section>
      <CTA title="Book a solution-specific demo" />
    </PageShell>
  );
}

// ─── SETU GURU AI PAGE ────────────────────────────────────────────────────────
export function SetuGuruMarketingPage() {
  const caps = [
    { icon:'message'    as IconName, title:'Follow-up drafting',   body:'Draft context-aware follow-ups for operator review. Direct send to WhatsApp or email with one click after you approve.' },
    { icon:'quote'      as IconName, title:'Quote intelligence',   body:'Flags stale quotes, risk signals and approval blocks in your live pipeline. Suggests next action per quote.' },
    { icon:'search'     as IconName, title:'HSN code research',    body:'Web-search-backed HS code lookups with controlled write-back — only after operator confirms.' },
    { icon:'shield'     as IconName, title:'Risk flags',           body:'Surfaces compliance gaps, missing documents and payment risks before they block dispatch.' },
    { icon:'document'   as IconName, title:'Document insights',    body:'Summarises document completeness from current order context. Identifies what is missing and what needs review.' },
    { icon:'chart'      as IconName, title:'Deal prioritisation',  body:'Ranks leads by urgency, value and activity recency. Helps your team work the right accounts first.' },
  ];
  return (
    <PageShell>
      {/* Hero — single, clean, no duplicate logo */}
      <section className="relative overflow-hidden bg-[#061c2e] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_10%_0%,rgba(53,159,145,0.24),transparent_48%)]" />
        <div className="relative mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            {/* One clean logo badge — no duplicates */}
            <div className="mb-6 flex items-center gap-3">
              <GuruAvatar size={48} />
              <div>
                <Image src="/setu-guru/guru-logo-navbar.png" alt="Setu Guru" width={200} height={67} className="h-7 w-auto" />
                <p className="mt-0.5 text-[11px] font-medium text-white/38">Suggestive AI · Always learning · Every plan</p>
              </div>
            </div>
            <h1 className="text-5xl font-semibold leading-[0.97] tracking-[-0.055em] sm:text-6xl">Your AI trade co-pilot,<br/><span className="text-[#7de2d2]">built into every plan.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-white/58">Setu Guru reads your live pipeline and gets smarter with every interaction. It drafts communications, researches HS codes, flags risk and suggests next actions — with operator approval required on every output.</p>
            <div className="mt-8 flex gap-3"><Btn href="/book-demo" v="primary">See Guru in a demo</Btn><Btn href="/platform" v="ghost">Explore platform</Btn></div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center gap-3 pb-4 border-b border-white/8">
              <GuruAvatar size={40} />
              <div>
                <p className="font-bold text-sm">Setu Guru</p>
                <div className="flex items-center gap-1.5 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/><span className="text-[11px] text-white/38">Online · always learning</span></div>
              </div>
              <span className="ml-auto rounded-full bg-[#7de2d2]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7de2d2]">Suggestive AI</span>
            </div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/30 font-bold uppercase tracking-wider mb-1.5">You</p>
              <p className="text-sm text-white/72">Which quotes are at risk this week?</p>
              <p className="mt-2.5 text-xs text-[#7de2d2] font-bold uppercase tracking-wider mb-1.5">Guru</p>
              <p className="text-sm leading-6 text-white/60">2 quotes approaching expiry in 3 days. SF-Q-202606-017 has had no buyer response in 26 days — I can draft a follow-up for your review. SF-Q-202606-004 is blocked by a pending approval. Want me to flag it?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="flex items-center gap-1.5 rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/8 px-3 py-1.5 text-[11px] font-bold text-[#7de2d2]">
                  <Icon name="whatsapp" className="h-3.5 w-3.5"/> Send follow-up via WhatsApp
                </button>
                <button className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/45">Flag to admin queue</button>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2 text-[11px] italic text-white/22">All suggestions require operator approval. Guru learns from every interaction.</div>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Capabilities" title="11 ways Guru helps your trade team." body="Context-aware assistance across every stage — from first lead to final invoice." />
        <div className="mx-auto mt-10 max-w-7xl grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {caps.map(({ icon, title, body }) => (
            <article key={title} className="rounded-[1.7rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_16px_50px_rgba(31,72,124,0.07)]">
              <Orb icon={icon} size="lg" />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <CTA title="Experience Setu Guru AI in your workflow" body="See how Guru reads your live pipeline in a 30-minute guided demo." />
    </PageShell>
  );
}

// ─── MOBILE PAGE ─────────────────────────────────────────────────────────────
export function MobileMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Mobile-Native Web App</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Trade runs in the field.<br/><span className="text-[#108477]">So does Setu Flow.</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-slate-500">Not a shrunken desktop. A purpose-built mobile web app with dedicated routes, phone-native navigation and offline support for trade shows and on the road.</p>
            <div className="mt-6 space-y-2.5">
              {['Lead queue, pipeline, capture and quote — all on phone','Business card OCR → structured lead in 30 seconds','Swipe right to complete a task — instant visual feedback','Task manager with list view, overdue grouping, entity linking','Offline queue syncs when connectivity returns','Setu Guru AI accessible from mobile bottom navigation bar'].map(t => (
                <div key={t} className="flex items-center gap-3 text-[13px] font-medium text-slate-600"><Check size="sm" />{t}</div>
              ))}
            </div>
            <div className="mt-7"><Btn href="/book-demo" v="primary">Book a Demo</Btn></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { src:'/marketing/ss-mobile-leads.jpg',   alt:'Mobile leads queue', cap:'Lead queue' },
              { src:'/marketing/ss-mobile-capture.jpg', alt:'Mobile capture',     cap:'Card scan' },
              { src:'/marketing/ss-tasks-mobile.jpg',   alt:'Mobile tasks',       cap:'Task swipe' },
            ].map(({ src, alt, cap }) => (
              <div key={src} className="rounded-[1.5rem] border border-[#1F487C]/10 bg-[#061c2e] p-1.5 shadow-[0_16px_50px_rgba(6,28,46,0.16)]">
                <Image src={src} alt={alt} width={425} height={907} className="w-full rounded-[1.1rem]" />
                <p className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#7de2d2]/60">{cap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </PageShell>
  );
}

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────
export function PricingMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Start in days.<br/>Not months.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-slate-500">Three tiers built around real trade team stages. No implementation fee. No consultants required.</p>
        </div>
      </section>
      <PricingSection />
      <CTA title="Book a pricing walkthrough" body="We'll show you which tier fits your team size and trade workflow in under 30 minutes." />
    </PageShell>
  );
}

// ─── COMPARE PAGE ─────────────────────────────────────────────────────────────
export function CompareMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Compare</Eyebrow>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.97] tracking-[-0.055em] text-slate-950 sm:text-6xl">Where CRMs stop, your operation has work to do.</h1>
            <p className="mt-5 text-lg leading-7 text-slate-500">Setu Flow was built from scratch for import-export — not adapted from a generic pipeline tool. See what that means in practice.</p>
            <div className="mt-8 flex gap-3"><Btn href="/book-demo" v="primary">Book a Demo</Btn><Btn href="/pricing" v="secondary">See pricing</Btn></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {USPs.slice(0,4).map(({ icon, label }) => (
              <div key={label} className="rounded-[1.4rem] border border-[#1F487C]/10 bg-white p-4 shadow-[0_12px_36px_rgba(31,72,124,0.07)]">
                <Orb icon={icon} />
                <p className="mt-3 text-[13px] font-semibold leading-5 text-slate-800">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ComparisonSection />
      <CTA />
    </PageShell>
  );
}

// ─── BOOK DEMO PAGE ───────────────────────────────────────────────────────────
export function BookDemoMarketingPage() {
  return (
    <PageShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1F487C]/10 bg-white shadow-[0_28px_80px_rgba(31,72,124,0.10)] lg:grid lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="border-b border-[#1F487C]/10 bg-[#f4f9fc] p-8 lg:border-b-0 lg:border-r">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#108477] text-white">
              <Icon name="calendar" className="h-7 w-7" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Setu Flow Walkthrough</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">30 minutes · Web conferencing</p>
            <p className="mt-5 text-sm leading-7 text-slate-500">We map the demo around your trade workflow — lead capture, quoting, approvals, execution and Setu Guru AI.</p>
            <ul className="mt-5 space-y-2.5">
              {['Your current workflow and key challenges','Live screenshot tour of each stage','Setu Guru AI in your pipeline context','Setup timeline and pricing for your team'].map(t => (
                <li key={t} className="flex items-start gap-3 text-sm text-slate-600"><Check size="sm" />{t}</li>
              ))}
            </ul>
            <div className="mt-7 rounded-[1.2rem] border border-[#1F487C]/10 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Calendar invite from</p>
              <p className="mt-1 text-sm font-bold text-[#108477]">help@setugroups.com</p>
              <p className="mt-1.5 text-xs text-slate-400">Select a slot, complete your details, confirmed within one business day.</p>
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
