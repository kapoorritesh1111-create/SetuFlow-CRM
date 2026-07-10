import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  PackageCheck,
  Sparkles,
  Users,
} from 'lucide-react';

type RecommendationSection = {
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  emptyTitle: string;
  emptyDescription: string;
};

const sections: RecommendationSection[] = [
  {
    title: 'Hot Buyer Opportunities',
    description: 'Buyers with strong product fit, recent interest, or an action waiting.',
    icon: Users,
    href: '/leads',
    emptyTitle: 'No hot buyer actions yet',
    emptyDescription: 'Setu Guru will surface buyers when CRM activity shows a clear next step.',
  },
  {
    title: 'Quote Follow-ups',
    description: 'Quotes that need a response, reminder, document, or next commercial action.',
    icon: FileText,
    href: '/quotes',
    emptyTitle: 'No quote follow-ups due',
    emptyDescription: 'Sent quotes and buyer pricing requests will appear here when attention is needed.',
  },
  {
    title: 'Supplier Actions',
    description: 'Supplier document gaps, RFQs, approvals, and sourcing work blocking progress.',
    icon: PackageCheck,
    href: '/suppliers',
    emptyTitle: 'No supplier blockers found',
    emptyDescription: 'Missing compliance documents and RFQ actions will be prioritized here.',
  },
  {
    title: 'Trade Event Actions',
    description: 'Pre-show meeting priorities and post-show leads that are at risk of going cold.',
    icon: CalendarDays,
    href: '/trade-events',
    emptyTitle: 'No trade event actions due',
    emptyDescription: 'Captured event leads will appear when outreach, catalog, meeting, or quote work is due.',
  },
];

function EmptyRecommendationCard({ section }: { section: RecommendationSection }) {
  const Icon = section.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{section.description}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">0 open</span>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-800">{section.emptyTitle}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{section.emptyDescription}</p>
        <Link
          href={section.href}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Open workspace
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function GrowthCenter({ organizationName }: { organizationName?: string | null }) {
  return (
    <main className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          <div className="absolute inset-y-0 right-0 hidden w-80 bg-gradient-to-l from-teal-50 via-cyan-50/40 to-transparent lg:block" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Setu Guru
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0b2341] sm:text-4xl">
              Setu Guru Growth Center
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              AI-powered buyer, supplier, quote, and follow-up engine
            </p>
            <p className="mt-4 text-sm text-slate-500">
              {organizationName ? `${organizationName}: ` : ''}The CRM stores the work. Setu Guru moves the work forward.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-[#0b2341] p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Today&apos;s Recommendations
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Your trade action queue is ready for CRM signals</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Recommendations will explain why an action matters and connect directly to a buyer, supplier, quote, RFQ, follow-up, or trade event action. Nothing is sent without user approval.
            </p>
          </div>
          <div className="grid min-w-[240px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">0</p>
              <p className="mt-1 text-xs text-slate-300">Open actions</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">0</p>
              <p className="mt-1 text-xs text-slate-300">Urgent today</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="growth-center-sections">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="growth-center-sections" className="text-xl font-semibold text-slate-950">Action areas</h2>
            <p className="mt-1 text-sm text-slate-600">Setu Guru keeps buyer and supplier execution in one command center.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:flex">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Org-scoped
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => <EmptyRecommendationCard key={section.title} section={section} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">AI action history</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Generated drafts, completed recommendations, and dismiss reasons will appear here after the recommendation service and activity logging are connected.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function GrowthCenterLoading() {
  return (
    <div className="space-y-5" aria-label="Loading Setu Guru Growth Center">
      <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
