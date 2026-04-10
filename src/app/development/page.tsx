import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentChecklist } from '@/components/planning/development-checklist';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { readinessSummary, sprintFocus } from '@/components/planning/development-status';
import { StatusBadge } from '@/components/ui/status-badge';

const pinned = [
  {
    title: 'Master plan',
    href: '/development/master-plan',
    body: 'The single source of truth for the locked Sprint 1 path, no-drift rules, and minimal repo baseline.',
  },
  {
    title: 'Readiness',
    href: '/development/readiness',
    body: 'Live Sprint 1 status, cleanup state, blockers, and the only remaining validation gate.',
  },
  {
    title: 'Locked screen specs',
    href: '/development/screens/leads-capture',
    body: 'Desktop, tablet, and mobile blueprints for the Leads and Capture implementation pass.',
  },
  {
    title: 'Active workspace previews',
    href: '/workspace/leads',
    body: 'The current Leads, Capture, and Quote surfaces that stay aligned to Capture → Lead → Quote → Order.',
  },
];

export default function DevelopmentPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Development workplace</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">One locked Sprint 1 workplace and one clean repo baseline for Setu Flow.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">This page is the operating surface for the locked Sprint 1 build. The repo has been stripped down to active code, the four source-of-truth pages, and only the essential docs so the next step can happen from a clean base.</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current focus</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">{sprintFocus.sprint} · implementation complete, clean baseline ready, awaiting full-environment validation</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Flow remains locked to {sprintFocus.flow}. No product-structure redesigns, no sprint drift, no extra planning clutter in-repo.</p>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge label={`Build · ${readinessSummary.buildStatus}`} tone="info" />
            <StatusBadge label={`Drift risk · ${readinessSummary.driftRisk}`} tone="warning" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/development/master-plan" className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Open master plan</Link>
            <Link href="/development/readiness" className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open readiness</Link>
            <Link href="/development/screens/leads-capture" className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open locked screen specs</Link>
          </div>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-4">
          {pinned.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)] transition hover:-translate-y-0.5 hover:border-[#1F487C]/20 hover:shadow-[0_24px_70px_rgba(31,72,124,0.12)]">
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Master checklist</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Visible by default inside the HTML workplace</h2>
              </div>
              <Link href="/development/readiness" className="text-sm font-semibold text-[#1F487C]">Open readiness view</Link>
            </div>
            <div className="mt-6">
              <DevelopmentChecklist />
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Readiness at a glance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Sprint 1 implementation is complete and the repo is now reduced to the minimum active baseline.</h2>
              <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                <p><strong className="text-slate-900">Status:</strong> {readinessSummary.status}</p>
                <p><strong className="text-slate-900">Build:</strong> {readinessSummary.buildStatus}</p>
                <p><strong className="text-slate-900">Blockers:</strong> {readinessSummary.blockers}</p>
                <p><strong className="text-slate-900">Next:</strong> {sprintFocus.nextAction}</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Non-negotiable ritual</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>• Before coding: check /development, /development/master-plan, /development/readiness, and /development/screens/leads-capture.</li>
                <li>• During coding: stay in Sprint 1 and keep the Capture → Lead → Quote → Order flow intact.</li>
                <li>• After coding: update checklist and readiness in the repo, not in extra markdown or conversation-only notes.</li>
              </ul>
            </section>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
