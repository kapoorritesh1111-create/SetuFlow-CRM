'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileCheck2,
  Globe2,
  Handshake,
  House,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Mail,
  MessageCircleMore,
  PackageCheck,
  PanelLeft,
  Presentation,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  WandSparkles,
  X,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

type Screenshot = {
  src: string;
  alt: string;
  position?: string;
  portrait?: boolean;
};

type OverviewPage = {
  slug: string;
  short: string;
  title: string;
  eyebrow: string;
  description: string;
  outcomes: string[];
  icon: LucideIcon;
  layout: 'welcome' | 'journey' | 'workspaces' | 'spotlight' | 'split' | 'portrait' | 'security';
  screenshot?: Screenshot;
  placeholder?: string;
  guru?: string;
  accent?: string;
};

const pages: OverviewPage[] = [
  {
    slug: 'welcome',
    short: 'Welcome',
    title: 'One connected system for the work behind every trade relationship.',
    eyebrow: 'Setu Flow CRM',
    description: 'See how opportunities move from discovery and capture through commercial decisions, execution, and growth—without losing context between teams.',
    outcomes: ['Customer-ready product tour', 'A shared operating view', 'Designed for importer and exporter teams'],
    icon: House,
    layout: 'welcome',
    screenshot: { src: '/internal/product-overview/01-welcome-dashboard.png', alt: 'Setu Flow welcome dashboard' },
  },
  {
    slug: 'business-journey',
    short: 'Business Journey',
    title: 'A clear journey from opportunity to growth.',
    eyebrow: 'End-to-end workflow',
    description: 'Each step has a focused workspace, while the underlying buyer, supplier, product, communication, quote, and order context remains connected.',
    outcomes: ['Discover earlier', 'Move opportunities forward', 'Execute with fewer handoffs'],
    icon: Activity,
    layout: 'journey',
    guru: 'Setu Guru can guide research, next actions, follow-up, and commercial preparation throughout the journey.',
  },
  {
    slug: 'connected-workspaces',
    short: 'Connected Workspaces',
    title: 'Focused workspaces. Shared business context.',
    eyebrow: 'Product architecture',
    description: 'Teams work in the space designed for the task at hand while Setu Flow keeps the complete relationship and execution story together.',
    outcomes: ['Less tool switching', 'Clear ownership', 'Connected records and next actions'],
    icon: Boxes,
    layout: 'workspaces',
    guru: 'Setu Guru is available as an intelligent layer across the platform—not a separate destination that breaks the workflow.',
  },
  {
    slug: 'discover-opportunities',
    short: 'Discover Opportunities',
    title: 'Turn market signals into focused opportunities.',
    eyebrow: 'Growth Center',
    description: 'Bring opportunity discovery, target-market thinking, ICP work, and research into one guided starting point for growth teams.',
    outcomes: ['Focus on the right markets', 'Build better target lists', 'Move research into action'],
    icon: Search,
    layout: 'spotlight',
    screenshot: { src: '/internal/product-overview/04-growth-center.png', alt: 'Setu Flow Growth Center' },
    guru: 'Ask Setu Guru to help frame an ICP, research a market, or prepare the next outreach step.',
  },
  {
    slug: 'capture',
    short: 'Capture',
    title: 'Capture useful lead context while the conversation is fresh.',
    eyebrow: 'Fast lead capture',
    description: 'Create structured records quickly from trade-show conversations, direct introductions, scans, and manual entry—without slowing the team down.',
    outcomes: ['Fast structured entry', 'Trade-event context', 'Clear next step from day one'],
    icon: ScanLine,
    layout: 'split',
    screenshot: { src: '/internal/product-overview/05-capture-lead.png', alt: 'Setu Flow lead capture screen', position: 'center' },
  },
  {
    slug: 'relationship-workspace',
    short: 'Relationship Workspace',
    title: 'See the full buyer relationship, not another disconnected record.',
    eyebrow: 'Buyer lead detail',
    description: 'Bring contact details, activity, follow-ups, commercial context, notes, and the next action into a single relationship command center.',
    outcomes: ['Shared relationship memory', 'Visible follow-up ownership', 'Commercial context in one view'],
    icon: Handshake,
    layout: 'spotlight',
    screenshot: { src: '/internal/product-overview/06-buyer-lead-detail.png', alt: 'Setu Flow buyer lead detail workspace' },
    guru: 'Setu Guru can summarize context and help the team decide what should happen next.',
  },
  {
    slug: 'research-intelligence',
    short: 'Research & Intelligence',
    title: 'Prepare with context before the next conversation.',
    eyebrow: 'Decision support',
    description: 'Organize the company, market, product, and relationship research needed to make outreach and commercial decisions more informed.',
    outcomes: ['Better-prepared outreach', 'Consistent account research', 'Context that stays with the relationship'],
    icon: BookOpenCheck,
    layout: 'split',
    placeholder: 'Research & Intelligence workspace — full desktop screenshot',
    guru: 'Setu Guru helps convert research into concise account context, questions, and recommended next actions.',
  },
  {
    slug: 'communication-hub',
    short: 'Communication Hub',
    title: 'Keep communication and follow-up connected to the relationship.',
    eyebrow: 'Conversations and actions',
    description: 'Coordinate communication history, reminders, tasks, meetings, and follow-up so the team can see what happened and what comes next.',
    outcomes: ['Fewer dropped follow-ups', 'Shared communication context', 'Clear action ownership'],
    icon: MessageCircleMore,
    layout: 'spotlight',
    placeholder: 'Communication Hub — relationship timeline with email, WhatsApp, calls, meetings, and follow-up',
    guru: 'Setu Guru can help prepare follow-up language using the relationship context already in Setu Flow.',
  },
  {
    slug: 'catalog-management',
    short: 'Catalog Management',
    title: 'Keep product information ready for real commercial use.',
    eyebrow: 'Products and categories',
    description: 'Organize products, categories, images, commercial attributes, and supporting information so teams can build and share consistently.',
    outcomes: ['A cleaner product source of truth', 'Faster quote preparation', 'Consistent buyer-facing information'],
    icon: ShoppingBag,
    layout: 'split',
    placeholder: 'Catalog Management — products list and product detail screenshot',
  },
  {
    slug: 'price-lists-buyer-sharing',
    short: 'Price Lists & Sharing',
    title: 'Prepare and share buyer-ready commercial information.',
    eyebrow: 'Price lists and buyer access',
    description: 'Move from internal product and pricing context to a clear buyer-facing sharing experience without exposing internal-only information.',
    outcomes: ['Market-specific commercial views', 'Professional buyer sharing', 'Controlled information access'],
    icon: CircleDollarSign,
    layout: 'spotlight',
    placeholder: 'Price Lists & Buyer Sharing — price list builder and shared buyer view',
  },
  {
    slug: 'digital-business-card',
    short: 'Digital Business Card',
    title: 'A professional identity that travels with every introduction.',
    eyebrow: 'Digital vCard',
    description: 'Give team members a simple, mobile-first way to share contact details, company identity, and useful business links through one branded profile.',
    outcomes: ['Fast contact sharing', 'Mobile-first presentation', 'Company and catalog links in one place'],
    icon: ContactRound,
    layout: 'portrait',
    screenshot: { src: '/internal/product-overview/11-digital-vcard.png', alt: 'Setu Flow digital business card', portrait: true },
  },
  {
    slug: 'commercial-workspace',
    short: 'Commercial Workspace',
    title: 'Build commercial proposals with the relationship and product context already connected.',
    eyebrow: 'Quote Builder',
    description: 'Prepare quotes from structured buyer, product, pricing, and commercial inputs while preserving a clear path to review, sending, and execution.',
    outcomes: ['Faster quote creation', 'Clearer commercial review', 'A connected path from quote to order'],
    icon: BriefcaseBusiness,
    layout: 'spotlight',
    screenshot: { src: '/internal/product-overview/12b-quote-builder.png', alt: 'Setu Flow Quote Builder' },
    guru: 'Setu Guru can help review quote readiness and identify missing commercial inputs before sending.',
  },
  {
    slug: 'supplier-workspace',
    short: 'Supplier Workspace',
    title: 'Manage supplier readiness alongside buyer demand.',
    eyebrow: 'Supply-side relationships',
    description: 'Keep supplier capability, documents, requests, follow-up, and commercial context visible as opportunities move toward execution.',
    outcomes: ['Structured supplier records', 'Clear sourcing follow-up', 'Better buyer-supplier alignment'],
    icon: Building2,
    layout: 'split',
    placeholder: 'Supplier Workspace — supplier list and supplier detail screenshot',
    guru: 'Setu Guru can help summarize supplier context and prepare structured requests for missing information.',
  },
  {
    slug: 'orders-execution',
    short: 'Orders / Execution',
    title: 'Carry accepted business into organized execution.',
    eyebrow: 'Order readiness and delivery',
    description: 'Keep order details, responsibilities, documents, milestones, risks, and next actions visible as the business moves toward delivery.',
    outcomes: ['Clear execution ownership', 'Visible milestones and risks', 'Continuity from commercial work'],
    icon: Truck,
    layout: 'spotlight',
    placeholder: 'Orders / Execution — order list and execution detail screenshot',
  },
  {
    slug: 'analytics-reports',
    short: 'Analytics & Reports',
    title: 'See what is moving, what is stuck, and where attention is needed.',
    eyebrow: 'Performance intelligence',
    description: 'Bring conversion, pipeline, product, activity, and commercial performance into an owner-ready view that supports better decisions.',
    outcomes: ['Understand conversion', 'Spot pipeline movement', 'Turn activity into decisions'],
    icon: BarChart3,
    layout: 'spotlight',
    screenshot: { src: '/internal/product-overview/15-analytics.png', alt: 'Setu Flow analytics workspace' },
    guru: 'Setu Guru can surface patterns and explain what the team should investigate next.',
  },
  {
    slug: 'integrations-access-security',
    short: 'Integrations, Access & Security',
    title: 'Connect access responsibly and keep workspace boundaries clear.',
    eyebrow: 'Administration and governance',
    description: 'Manage users, roles, access, settings, and supported connections from a controlled administrative workspace—without making unsupported compliance claims.',
    outcomes: ['Role-aware workspace access', 'Centralized administration', 'Clearer operational controls'],
    icon: ShieldCheck,
    layout: 'security',
    placeholder: 'Admin & Settings — users, roles, access, and integrations screenshot',
  },
];

const journey = [
  ['Discover', Search],
  ['Capture', ScanLine],
  ['Research', BookOpenCheck],
  ['Communicate', MessageCircleMore],
  ['Quote', BriefcaseBusiness],
  ['Approvals & Sending', Send],
  ['Orders / Execution', Truck],
  ['Grow', BarChart3],
] as const;

const workspaces = [
  ['Home', House], ['Capture', ScanLine], ['Follow-up', ListChecks], ['Quote', BriefcaseBusiness],
  ['Approvals & Sending', Send], ['Orders / Execution', Truck], ['Pipeline / Risks', Activity],
  ['Trade Events', CalendarDays], ['Tasks', ClipboardCheck], ['Catalog', Store], ['Analytics', BarChart3],
  ['Reports', Presentation], ['Admin & Settings', Settings], ['Setu Guru', WandSparkles],
] as const;

function BrandMark() {
  return <Image src="/logos/setu-flow-lockup.svg" alt="Setu Flow CRM" width={176} height={48} className="h-9 w-auto" priority />;
}

function OutcomeList({ outcomes, dark = false }: { outcomes: string[]; dark?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {outcomes.map((outcome) => (
        <div key={outcome} className={`flex items-start gap-2 rounded-2xl px-3.5 py-3 text-sm font-semibold ${dark ? 'bg-white/10 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-cyan-300' : 'text-teal-600'}`} />
          <span>{outcome}</span>
        </div>
      ))}
    </div>
  );
}

function BrowserFrame({ screenshot, onZoom }: { screenshot: Screenshot; onZoom: () => void }) {
  return (
    <div className="group overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,.16)]">
      <div className="flex h-10 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="mx-auto hidden h-5 w-52 rounded-full border border-slate-200 bg-white sm:block" />
        <button type="button" onClick={onZoom} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
          <ZoomIn className="h-3.5 w-3.5" /> Zoom
        </button>
      </div>
      <button type="button" onClick={onZoom} className="relative block w-full overflow-hidden bg-slate-100 text-left">
        <div className="relative aspect-[16/8.55] w-full sm:aspect-[16/8.2]">
          <Image src={screenshot.src} alt={screenshot.alt} fill sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover object-top transition duration-500 group-hover:scale-[1.012]" priority />
        </div>
      </button>
    </div>
  );
}

function PlaceholderFrame({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.4rem] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#eef6f5)] ${compact ? 'min-h-[310px]' : 'min-h-[430px]'}`}>
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(15,118,110,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,.06)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative flex min-h-[inherit] flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-white text-teal-700 shadow-sm"><PanelLeft className="h-6 w-6" /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-teal-700">Product screenshot coming soon</p>
        <p className="mt-3 max-w-lg text-base font-bold text-slate-800">{label}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Replace this frame with the exact real CRM screenshot while preserving this crop and visual weight.</p>
      </div>
    </div>
  );
}

function GuruStrip({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cyan-200/70 bg-[linear-gradient(135deg,#effcfc,#f5f8ff)] p-4 sm:p-5">
      <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={48} height={48} className="h-11 w-11 shrink-0 rounded-full shadow-sm" />
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Setu Guru guidance</p><p className="mt-1 text-sm leading-6 text-slate-700">{children}</p></div>
    </div>
  );
}

function JourneyVisual() {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-[#071b3d] p-5 text-white shadow-[0_30px_80px_rgba(7,27,61,.28)] sm:p-8">
      <div className="flex items-center justify-between gap-5"><BrandMark /><span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100 sm:block">Connected trade journey</span></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {journey.map(([label, Icon], index) => (
          <div key={label} className="group relative rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
            <div className="flex items-center justify-between"><span className="text-xs font-black text-cyan-300">{String(index + 1).padStart(2, '0')}</span><Icon className="h-5 w-5 text-white/75" /></div>
            <p className="mt-5 text-base font-bold leading-tight">{label}</p>
            {index < journey.length - 1 ? <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-cyan-300 xl:block" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-full bg-[linear-gradient(90deg,#2dd4bf,#60a5fa,#2dd4bf)]" /></div>
    </div>
  );
}

function WorkspacesVisual() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,.1)] sm:p-8">
      <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full bg-teal-100/70 blur-3xl" />
      <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><BrandMark /><div className="rounded-full bg-[#071b3d] px-4 py-2 text-xs font-bold text-white">One platform · shared context</div></div>
      <div className="relative mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {workspaces.map(([label, Icon], index) => (
          <div key={label} className={`rounded-2xl border p-4 ${index === workspaces.length - 1 ? 'border-cyan-300 bg-[#071b3d] text-white' : 'border-slate-200 bg-slate-50/80 text-slate-800'}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${index === workspaces.length - 1 ? 'bg-white/10 text-cyan-300' : 'bg-white text-teal-700 shadow-sm'}`}><Icon className="h-4.5 w-4.5" /></div>
            <p className="mt-3 text-sm font-bold leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualComposition({ page, onZoom }: { page: OverviewPage; onZoom: (screenshot: Screenshot) => void }) {
  if (page.layout === 'journey') return <JourneyVisual />;
  if (page.layout === 'workspaces') return <WorkspacesVisual />;

  if (page.layout === 'welcome' && page.screenshot) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] bg-[#071b3d] p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(45,212,191,.22),transparent_32%)]" />
        <div className="relative grid items-center gap-7 xl:grid-cols-[.65fr_1.35fr]">
          <div className="px-2 py-5 text-white sm:px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Trade execution CRM</p>
            <h3 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-4xl">From the first signal to the next business outcome.</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">Setu Flow gives teams a structured place to manage the relationship, commercial work, and execution that sit between a lead and delivered business.</p>
          </div>
          <BrowserFrame screenshot={page.screenshot} onZoom={() => onZoom(page.screenshot!)} />
        </div>
      </div>
    );
  }

  if (page.layout === 'portrait' && page.screenshot) {
    return (
      <div className="grid items-center gap-8 rounded-[2rem] bg-[linear-gradient(135deg,#071b3d,#0b3d5d)] p-6 text-white lg:grid-cols-[.9fr_1.1fr] lg:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Made for the moment of introduction</p>
          <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">One tap. One scan. One professional profile.</h3>
          <div className="mt-6"><OutcomeList outcomes={page.outcomes} dark /></div>
        </div>
        <div className="relative mx-auto w-full max-w-[330px]">
          <div className="absolute inset-8 rounded-full bg-cyan-300/30 blur-3xl" />
          <button type="button" onClick={() => onZoom(page.screenshot!)} className="relative block w-full overflow-hidden rounded-[2.4rem] border-[8px] border-slate-950 bg-slate-950 shadow-2xl">
            <div className="relative aspect-[412/900]"><Image src={page.screenshot.src} alt={page.screenshot.alt} fill sizes="330px" className="object-cover" /></div>
          </button>
        </div>
      </div>
    );
  }

  if (page.layout === 'security') {
    return (
      <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
        <div className="rounded-[2rem] bg-[#071b3d] p-6 text-white sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-300"><LockKeyhole className="h-7 w-7" /></div>
          <h3 className="mt-7 text-3xl font-black tracking-[-0.04em]">Access that follows the way teams work.</h3>
          <div className="mt-6 space-y-3">
            {[['Users and roles', UsersRound], ['Workspace access', KeyRound], ['Administrative controls', Settings], ['Operational boundaries', ShieldCheck]].map(([label, Icon]) => {
              const I = Icon as LucideIcon;
              return <div key={label as string} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-3"><I className="h-4 w-4 text-cyan-300" /><span className="text-sm font-semibold">{label as string}</span></div>;
            })}
          </div>
        </div>
        <PlaceholderFrame label={page.placeholder!} />
      </div>
    );
  }

  if (page.layout === 'split') {
    return (
      <div className="grid items-stretch gap-5 lg:grid-cols-[.78fr_1.22fr]">
        <div className="flex flex-col justify-between rounded-[2rem] bg-[linear-gradient(145deg,#eef8f7,#f7faff)] p-6 sm:p-8">
          <div>
            <page.icon className="h-7 w-7 text-teal-700" />
            <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-teal-700">Designed outcome</p>
            <p className="mt-3 text-2xl font-black tracking-[-0.035em] text-[#071b3d]">Make the important context easier to capture, understand, and act on.</p>
          </div>
          <div className="mt-8"><OutcomeList outcomes={page.outcomes} /></div>
        </div>
        {page.screenshot ? <BrowserFrame screenshot={page.screenshot} onZoom={() => onZoom(page.screenshot!)} /> : <PlaceholderFrame label={page.placeholder!} compact />}
      </div>
    );
  }

  return page.screenshot ? <BrowserFrame screenshot={page.screenshot} onZoom={() => onZoom(page.screenshot!)} /> : <PlaceholderFrame label={page.placeholder!} />;
}

export function ProductOverviewExperience() {
  const [activeSlug, setActiveSlug] = useState('welcome');
  const [zoomed, setZoomed] = useState<Screenshot | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const readLocation = () => {
      const slug = new URLSearchParams(window.location.search).get('page');
      if (slug && pages.some((page) => page.slug === slug)) setActiveSlug(slug);
    };
    readLocation();
    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, []);

  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setZoomed(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [zoomed]);

  const activeIndex = Math.max(0, pages.findIndex((page) => page.slug === activeSlug));
  const activePage = pages[activeIndex];
  const previous = pages[(activeIndex - 1 + pages.length) % pages.length];
  const next = pages[(activeIndex + 1) % pages.length];
  const progress = useMemo(() => ((activeIndex + 1) / pages.length) * 100, [activeIndex]);

  function selectPage(slug: string) {
    setActiveSlug(slug);
    setMobileMenuOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('page', slug);
    window.history.pushState({}, '', url.toString());
    document.getElementById('product-overview-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <SiteShell>
      <main className="min-h-screen bg-[#f4f7fa] text-slate-950">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4"><BrandMark /><div className="hidden h-7 w-px bg-slate-200 sm:block" /><div className="hidden sm:block"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">Guided product tour</p><p className="text-sm font-bold text-[#071b3d]">Product Overview</p></div></div>
            <div className="flex items-center gap-2"><Link href="/book-demo" className="hidden rounded-full bg-[#071b3d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0d2d61] sm:inline-flex">Request a demo</Link><button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 lg:hidden"><span>{String(activeIndex + 1).padStart(2, '0')} · {activePage.short}</span><ChevronDown className={`h-4 w-4 transition ${mobileMenuOpen ? 'rotate-180' : ''}`} /></button></div>
          </div>
          <div className="h-1 bg-slate-100"><div className="h-full bg-[linear-gradient(90deg,#0f766e,#2563eb)] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          {mobileMenuOpen ? <div className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-2xl lg:hidden">{pages.map((page, index) => <button key={page.slug} type="button" onClick={() => selectPage(page.slug)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${page.slug === activeSlug ? 'bg-[#071b3d] text-white' : 'text-slate-700 hover:bg-slate-50'}`}><span className="text-xs font-black opacity-60">{String(index + 1).padStart(2, '0')}</span><span className="text-sm font-bold">{page.short}</span></button>)}</div> : null}
        </div>

        <div className="mx-auto grid max-w-[1560px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,.07)]">
              <div className="px-3 pb-2 pt-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">16 guided pages</p></div>
              {pages.map((page, index) => {
                const Icon = page.icon;
                const active = page.slug === activeSlug;
                return <button key={page.slug} type="button" onClick={() => selectPage(page.slug)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-[#071b3d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/10 text-cyan-300' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[10px] font-black opacity-55">{String(index + 1).padStart(2, '0')}</span><span className="block truncate text-[12.5px] font-bold">{page.short}</span></span></button>;
              })}
            </div>
          </aside>

          <section id="product-overview-content" className="min-w-0 scroll-mt-24">
            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,.08)]">
              <header className="relative overflow-hidden border-b border-slate-100 px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
                <div className="absolute right-[-70px] top-[-90px] h-64 w-64 rounded-full bg-teal-100/60 blur-3xl" />
                <div className="relative max-w-5xl">
                  <div className="flex items-center gap-3"><span className="rounded-full bg-[#071b3d] px-3 py-1.5 text-xs font-black text-white">{String(activeIndex + 1).padStart(2, '0')}</span><span className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{activePage.eyebrow}</span></div>
                  <h1 className="mt-5 max-w-5xl text-3xl font-black leading-[1.04] tracking-[-0.05em] text-[#071b3d] sm:text-5xl lg:text-[3.5rem]">{activePage.title}</h1>
                  <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{activePage.description}</p>
                </div>
              </header>

              <div className="space-y-6 p-4 sm:p-7 lg:p-9">
                <VisualComposition page={activePage} onZoom={setZoomed} />
                {activePage.layout !== 'welcome' && activePage.layout !== 'portrait' && activePage.layout !== 'split' ? <OutcomeList outcomes={activePage.outcomes} /> : null}
                {activePage.guru ? <GuruStrip>{activePage.guru}</GuruStrip> : null}
              </div>
            </article>

            <nav className="mt-5 grid grid-cols-2 gap-3" aria-label="Product overview pagination">
              <button type="button" onClick={() => selectPage(previous.slug)} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"><ArrowLeft className="h-5 w-5 shrink-0 text-teal-700 transition group-hover:-translate-x-1" /><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Previous</span><span className="block truncate text-sm font-bold text-slate-800">{previous.short}</span></span></button>
              <button type="button" onClick={() => selectPage(next.slug)} className="group flex min-h-16 items-center justify-end gap-3 rounded-2xl bg-[#071b3d] px-4 py-3 text-right text-white shadow-sm transition hover:bg-[#0d2d61] hover:shadow-md"><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Next</span><span className="block truncate text-sm font-bold">{next.short}</span></span><ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" /></button>
            </nav>
          </section>
        </div>
      </main>

      {zoomed ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={zoomed.alt}><button type="button" onClick={() => setZoomed(null)} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg"><X className="h-5 w-5" /></button><div className={`relative max-h-[92vh] max-w-[96vw] overflow-auto rounded-2xl bg-white p-2 shadow-2xl ${zoomed.portrait ? 'w-auto' : 'w-full'}`}><Image src={zoomed.src} alt={zoomed.alt} width={zoomed.portrait ? 824 : 1892} height={zoomed.portrait ? 1800 : 987} className={`h-auto ${zoomed.portrait ? 'max-h-[88vh] w-auto' : 'w-full min-w-[900px]'}`} /></div></div> : null}
    </SiteShell>
  );
}
