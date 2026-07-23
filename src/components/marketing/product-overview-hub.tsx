'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileText,
  MessageCircleMore,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UsersRound,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { SiteShell } from '@/components/marketing/site-shell';

type WorkspaceLink = { label: string; href: string; icon: LucideIcon };
type Stage = {
  title: string;
  subtitle: string;
  accent: string;
  icon: LucideIcon;
  items: WorkspaceLink[];
};

const stages: Stage[] = [
  {
    title: 'Discover',
    subtitle: 'Find and capture the right opportunities',
    accent: 'border-teal-300 text-teal-700 bg-teal-50',
    icon: Search,
    items: [
      { label: 'Growth Center', href: '/product-overview?page=discover-opportunities', icon: Search },
      { label: 'Lead Capture', href: '/product-overview?page=capture', icon: ScanLine },
      { label: 'Trade Events', href: '/product-overview?page=research-intelligence', icon: CalendarDays },
      { label: 'Digital Business Card', href: '/product-overview?page=digital-business-card', icon: ContactRound },
    ],
  },
  {
    title: 'Build Relationships',
    subtitle: 'Understand, engage, and build trust',
    accent: 'border-cyan-300 text-cyan-700 bg-cyan-50',
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
    subtitle: 'Create, approve, and share winning offers',
    accent: 'border-violet-300 text-violet-700 bg-violet-50',
    icon: BriefcaseBusiness,
    items: [
      { label: 'Catalog Management', href: '/product-overview?page=catalog-management', icon: ShoppingBag },
      { label: 'Price Lists & Sharing', href: '/product-overview?page=price-lists-buyer-sharing', icon: CircleDollarSign },
      { label: 'Quote Builder', href: '/product-overview?page=commercial-workspace', icon: BriefcaseBusiness },
      { label: 'Approvals & Sending', href: '/product-overview?page=commercial-workspace', icon: Send },
      { label: 'Documents', href: '/product-overview?page=communication-hub', icon: FileText },
    ],
  },
  {
    title: 'Execute & Grow',
    subtitle: 'Deliver, improve, and scale with visibility',
    accent: 'border-orange-300 text-orange-700 bg-orange-50',
    icon: Truck,
    items: [
      { label: 'Orders / Execution', href: '/product-overview?page=orders-execution', icon: Truck },
      { label: 'Pipeline / Risks', href: '/product-overview?page=research-intelligence', icon: Zap },
      { label: 'Analytics & Reports', href: '/product-overview?page=analytics-reports', icon: BarChart3 },
      { label: 'Access & Security', href: '/product-overview?page=integrations-access-security', icon: ShieldCheck },
    ],
  },
];

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  const Icon = stage.icon;
  return (
    <section className="relative min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,.07)]">
      <div className={`absolute -top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white ${stage.accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.03em] text-[#071b3d]">{stage.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{stage.subtitle}</p>
          </div>
          {index < stages.length - 1 ? <ArrowRight className="mt-2 hidden h-5 w-5 text-slate-300 xl:block" /> : null}
        </div>
        <div className="mt-4 space-y-1.5">
          {stage.items.map(({ label, href, icon: ItemIcon }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-teal-700"
            >
              <span className="flex items-center gap-2.5">
                <ItemIcon className="h-4 w-4 text-slate-400 transition group-hover:text-teal-600" />
                {label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductOverviewHub() {
  return (
    <SiteShell>
      <main className="bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fa_100%)] text-slate-950">
        <section className="mx-auto max-w-[1460px] px-4 pb-5 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <div className="grid items-center gap-7 lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[470px_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.22em] text-teal-700">Product Overview</p>
              <h1 className="mt-3 text-[clamp(2.8rem,5vw,5.4rem)] font-black leading-[.88] tracking-[-.075em] text-[#071b3d]">
                One connected trade operating system
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                From discovering opportunities to delivering orders, every team works in the right workspace with shared data, context, and intelligence.
              </p>
              <div className="mt-5 grid gap-2.5 text-sm font-semibold text-slate-700 sm:grid-cols-3 lg:grid-cols-1">
                {['Work together. Stay aligned.', 'One source of truth for every deal.', 'Move faster with confidence.'].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Check className="h-4 w-4" /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
              <Link href="/product-overview?page=business-journey" className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,.10)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/></div>
                  <span className="text-xs font-bold text-slate-500">Real Setu Flow dashboard</span>
                </div>
                <div className="relative aspect-[16/8.6] bg-slate-50">
                  <Image src="/internal/product-overview/01-welcome-dashboard.png" alt="Setu Flow dashboard" fill priority sizes="(max-width: 1024px) 100vw, 800px" className="object-cover object-top transition duration-500 group-hover:scale-[1.015]" />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-bold text-[#071b3d]">See how the full journey works</span>
                  <ArrowRight className="h-4 w-4 text-teal-700 transition group-hover:translate-x-1" />
                </div>
              </Link>
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                {[
                  ['Real-time visibility', 'Across pipeline, quotes, orders, and more', BarChart3, 'border-teal-200 bg-teal-50/70 text-teal-700'],
                  ['Action-driven', 'Know what to do next and never miss follow-up', ClipboardCheck, 'border-violet-200 bg-violet-50/70 text-violet-700'],
                  ['AI guidance', 'Setu Guru helps you prepare and decide', WandSparkles, 'border-orange-200 bg-orange-50/70 text-orange-700'],
                ].map(([title, copy, icon, style]) => {
                  const Icon = icon as LucideIcon;
                  return <div key={title as string} className={`rounded-2xl border p-4 ${style as string}`}><Icon className="h-5 w-5"/><p className="mt-3 text-sm font-black">{title as string}</p><p className="mt-1 text-xs leading-5 text-slate-600">{copy as string}</p></div>;
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white/80">
          <div className="mx-auto max-w-[1460px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.2em] text-teal-700">Explore the connected workspaces</p>
                <h2 className="mt-1 text-3xl font-black tracking-[-.05em] text-[#071b3d]">Click any workspace to see the real product.</h2>
              </div>
              <Link href="/product-overview?page=business-journey" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700">How it works <ArrowRight className="h-4 w-4"/></Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {stages.map((stage, index) => <StageCard key={stage.title} stage={stage} index={index} />)}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Shared business context</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">One record layer connecting everything that matters.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {['Buyer', 'Supplier', 'Product', 'Communication', 'Document', 'Quote', 'Order', 'Activity'].map((item) => <span key={item} className="rounded-full border border-blue-100 bg-white px-3 py-1.5">{item}</span>)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[#071b3d] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={48} height={48} className="h-11 w-11 rounded-full" />
                <div><p className="text-sm font-black">Setu Guru — your AI trade companion</p><p className="text-xs leading-5 text-white/70">Guidance across every stage with insights, next steps, and smart recommendations.</p></div>
              </div>
              <Link href="/setu-guru" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-200">Explore Setu Guru <ArrowRight className="h-4 w-4"/></Link>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1460px] flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div><p className="text-lg font-black text-[#071b3d]">Ready to see it in action?</p><p className="text-sm text-slate-500">Explore pricing or book a personalized demonstration.</p></div>
          <div className="flex gap-3"><Link href="/pricing" className="rounded-xl border border-teal-300 bg-white px-5 py-3 text-sm font-bold text-teal-700">Explore Pricing</Link><Link href="/book-demo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg">Book a Demo <ArrowRight className="h-4 w-4"/></Link></div>
        </section>
      </main>
    </SiteShell>
  );
}
