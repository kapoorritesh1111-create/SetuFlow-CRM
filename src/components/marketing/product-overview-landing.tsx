'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileText,
  Layers3,
  MessageCircleMore,
  PackageCheck,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { SiteShell } from '@/components/marketing/site-shell';

type WorkspaceLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type JourneyStage = {
  title: string;
  subtitle: string;
  tone: 'teal' | 'cyan' | 'violet' | 'orange';
  icon: LucideIcon;
  items: WorkspaceLink[];
};

const stages: JourneyStage[] = [
  {
    title: 'Discover',
    subtitle: 'Find the right opportunities',
    tone: 'teal',
    icon: Search,
    items: [
      { label: 'Dashboard', href: '/product-overview?page=welcome', icon: BarChart3 },
      { label: 'Growth Center', href: '/product-overview?page=discover-opportunities', icon: Search },
      { label: 'Lead Capture', href: '/product-overview?page=capture', icon: ScanLine },
      { label: 'Trade Events', href: '/product-overview?page=research-intelligence', icon: CalendarDays },
      { label: 'Mobile Capture', href: '/product-overview?page=capture', icon: ContactRound },
      { label: 'Digital Business Card', href: '/product-overview?page=digital-business-card', icon: ContactRound },
    ],
  },
  {
    title: 'Build Relationships',
    subtitle: 'Understand, engage, and build trust',
    tone: 'cyan',
    icon: UsersRound,
    items: [
      { label: 'Buyer Workspace', href: '/product-overview?page=relationship-workspace', icon: Building2 },
      { label: 'Supplier Workspace', href: '/product-overview?page=supplier-workspace', icon: Store },
      { label: 'Research & Intelligence', href: '/product-overview?page=research-intelligence', icon: BookOpenCheck },
      { label: 'Communication Hub', href: '/product-overview?page=communication-hub', icon: MessageCircleMore },
      { label: 'Tasks & Follow-up', href: '/product-overview?page=communication-hub', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Convert',
    subtitle: 'Create winning offers and get approvals',
    tone: 'violet',
    icon: FileText,
    items: [
      { label: 'Catalog Management', href: '/product-overview?page=catalog-management', icon: ShoppingBag },
      { label: 'Price Lists & Sharing', href: '/product-overview?page=price-lists-buyer-sharing', icon: CircleDollarSign },
      { label: 'Quote Builder', href: '/product-overview?page=commercial-workspace', icon: BriefcaseBusiness },
      { label: 'Approvals & Sending', href: '/product-overview?page=commercial-workspace', icon: Send },
      { label: 'Document Management', href: '/product-overview?page=communication-hub', icon: FileText },
    ],
  },
  {
    title: 'Execute & Grow',
    subtitle: 'Fulfill orders and accelerate growth',
    tone: 'orange',
    icon: Truck,
    items: [
      { label: 'Orders / Execution', href: '/product-overview?page=orders-execution', icon: PackageCheck },
      { label: 'Execution & Dispatch', href: '/product-overview?page=orders-execution', icon: Truck },
      { label: 'Pipeline / Risks', href: '/product-overview?page=research-intelligence', icon: Activity },
      { label: 'Analytics & Reports', href: '/product-overview?page=analytics-reports', icon: BarChart3 },
      { label: 'Integrations & Access', href: '/product-overview?page=integrations-access-security', icon: ShieldCheck },
    ],
  },
];

const toneClasses = {
  teal: {
    border: 'border-teal-200',
    ring: 'bg-teal-600 shadow-teal-900/20',
    label: 'text-teal-700',
    soft: 'bg-teal-50',
    arrow: 'text-teal-600',
  },
  cyan: {
    border: 'border-cyan-200',
    ring: 'bg-cyan-600 shadow-cyan-900/20',
    label: 'text-cyan-700',
    soft: 'bg-cyan-50',
    arrow: 'text-cyan-600',
  },
  violet: {
    border: 'border-violet-200',
    ring: 'bg-violet-600 shadow-violet-900/20',
    label: 'text-violet-700',
    soft: 'bg-violet-50',
    arrow: 'text-violet-600',
  },
  orange: {
    border: 'border-orange-200',
    ring: 'bg-orange-500 shadow-orange-900/20',
    label: 'text-orange-600',
    soft: 'bg-orange-50',
    arrow: 'text-orange-500',
  },
} as const;

function WorkspaceStage({ stage, isLast }: { stage: JourneyStage; isLast: boolean }) {
  const tone = toneClasses[stage.tone];
  const StageIcon = stage.icon;

  return (
    <div className="relative min-w-0">
      <div className={`absolute -top-6 left-5 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-white shadow-lg ${tone.ring}`}>
        <StageIcon className="h-5 w-5" />
      </div>

      {!isLast ? (
        <div className={`absolute -right-7 top-12 z-20 hidden items-center xl:flex ${tone.arrow}`}>
          <span className="h-0.5 w-8 bg-current" />
          <ArrowRight className="-ml-1 h-5 w-5" />
        </div>
      ) : null}

      <section className={`h-full overflow-hidden rounded-2xl border bg-white shadow-[0_16px_45px_rgba(15,23,42,.07)] ${tone.border}`}>
        <header className={`border-b px-5 pb-4 pt-8 ${tone.border} ${tone.soft}`}>
          <h3 className={`text-sm font-black uppercase tracking-[.18em] ${tone.label}`}>{stage.title}</h3>
          <p className="mt-1 text-xs font-medium text-slate-600">{stage.subtitle}</p>
        </header>
        <div className="space-y-1 p-3">
          {stage.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={`${stage.title}-${item.label}`}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#071b3d]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition group-hover:border-teal-200 group-hover:text-teal-700">
                  <ItemIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
        <div className="flex justify-center pb-3">
          <span className={`h-2 w-2 rounded-full ${tone.ring.split(' ')[0]}`} />
        </div>
      </section>
    </div>
  );
}

export function ProductOverviewLanding() {
  return (
    <SiteShell>
      <main className="bg-white text-slate-950">
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_82%_5%,rgba(45,212,191,.11),transparent_25%),linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]">
          <div className="mx-auto grid max-w-[1460px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center lg:px-10 lg:py-16">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">Product Overview</p>
              <h1 className="mt-4 max-w-xl text-[clamp(2.8rem,5.6vw,5.4rem)] font-black leading-[.9] tracking-[-.075em] text-[#071b3d]">
                One connected trade operating system
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                From discovering opportunities to delivering orders, every team works in the right workspace with shared data, context, and intelligence.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  ['Work together. Stay aligned.', UsersRound],
                  ['One source of truth for every deal.', Layers3],
                  ['Move faster with confidence.', Zap],
                ].map(([label, Icon]) => {
                  const FeatureIcon = Icon as LucideIcon;
                  return (
                    <div key={label as string} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <FeatureIcon className="h-4 w-4" />
                      </span>
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_210px]">
              <div className="overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,.14)]">
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">All Workspaces</span>
                </div>
                <Link href="/product-overview?page=welcome" className="group relative block aspect-[16/9] bg-slate-100">
                  <Image
                    src="/internal/product-overview/01-welcome-dashboard.png"
                    alt="Setu Flow dashboard"
                    fill
                    priority
                    sizes="(max-width: 1280px) 100vw, 800px"
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.01]"
                  />
                  <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-[#071b3d] px-4 py-2 text-xs font-bold text-white shadow-lg">
                    Explore dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  ['Real-time visibility', 'Across pipeline, quotes, orders and more', Activity, 'border-teal-200 bg-teal-50 text-teal-700'],
                  ['Action-driven', 'Know what to do next and never miss a follow-up', ClipboardCheck, 'border-violet-200 bg-violet-50 text-violet-700'],
                  ['AI guidance', 'Setu Guru helps you prepare and decide', WandSparkles, 'border-orange-200 bg-orange-50 text-orange-700'],
                ].map(([title, copy, Icon, classes]) => {
                  const CardIcon = Icon as LucideIcon;
                  return (
                    <div key={title as string} className={`rounded-2xl border p-4 ${classes as string}`}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
                          <CardIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-black">{title as string}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{copy as string}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#fcfdff]">
          <div className="mx-auto max-w-[1460px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-.045em] text-[#071b3d] sm:text-4xl">Explore every connected workspace</h2>
                <p className="mt-2 text-base text-slate-600">Click any workspace to see exactly how it works.</p>
              </div>
              <Link
                href="/product-overview?page=business-journey"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
              >
                <Sparkles className="h-4 w-4" />
                How it works
              </Link>
            </div>

            <div className="relative mt-12">
              <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4 xl:gap-12">
                {stages.map((stage, index) => (
                  <WorkspaceStage key={stage.title} stage={stage} isLast={index === stages.length - 1} />
                ))}
              </div>

              <div className="relative mt-7 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-cyan-50/70 px-5 py-5 shadow-[0_12px_35px_rgba(37,99,235,.07)]">
                <div className="absolute -top-6 left-0 right-0 hidden justify-around xl:flex">
                  {stages.map((stage) => (
                    <div key={stage.title} className="flex flex-col items-center">
                      <span className="h-6 w-px bg-blue-200" />
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-blue-800">Shared business context</p>
                    <p className="mt-1 text-sm text-slate-600">One record layer connecting everything that matters.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Buyer', 'Supplier', 'Product', 'Communication', 'Document', 'Quote', 'Order', 'Activity'].map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                        <Check className="h-3 w-3 text-teal-600" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[#071b3d] px-5 py-4 text-white shadow-[0_20px_50px_rgba(7,27,61,.2)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={52} height={52} className="h-12 w-12 rounded-full ring-2 ring-cyan-300/30" />
                  <div>
                    <p className="text-sm font-black">Setu Guru — Your AI Trade Companion</p>
                    <p className="mt-1 text-xs leading-5 text-white/70">Guiding your team across every stage with insights, next steps, and smart recommendations.</p>
                  </div>
                </div>
                <Link href="/growth-agent" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/20">
                  Ask Setu Guru <Sparkles className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,.12),transparent_50%)]">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-6 px-5 py-10 text-center sm:px-8 lg:flex-row lg:text-left">
            <div>
              <h2 className="text-2xl font-black tracking-[-.04em] text-[#071b3d]">Ready to see it in action?</h2>
              <p className="mt-1 text-sm text-slate-600">Book a personalized demo with our team or explore the plans.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-white px-5 py-3 text-sm font-bold text-teal-700 transition hover:bg-teal-50">
                Explore Pricing
              </Link>
              <Link href="/book-demo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-teal-700">
                Book a Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
