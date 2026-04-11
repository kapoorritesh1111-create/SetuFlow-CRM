import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentChecklist } from '@/components/planning/development-checklist';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { readinessSummary, roadmapMilestones, sprintFocus, sprintProgress } from '@/components/planning/development-status';
import { StatusBadge } from '@/components/ui/status-badge';

const pinned = [
  {
    title: 'Product contract',
    href: '/development/product',
    body: 'The locked product definition that prevents side-module drift and keeps every sprint tied to the core commercial flow.',
  },
  {
    title: 'Architecture contract',
    href: '/development/architecture',
    body: 'The domain and service rules that preserve maintainability as the remaining sprints get built.',
  },
  {
    title: 'UX rules',
    href: '/development/ux-rules',
    body: 'The trainability and enterprise-safety rules that stop good-looking chaos from returning.',
  },
  {
    title: 'Master plan',
    href: '/development/master-plan',
    body: 'The single source of truth for the locked flow, current sprint state, and the roadmap for the remaining sprints.',
  },
  {
    title: 'Readiness',
    href: '/development/readiness',
    body: 'Live implementation status for the active sprint, the real validation state, and the blunt signal for when signoff is real.',
  },
  {
    title: 'Sprint backlog',
    href: '/development/backlog',
    body: 'The in-product backlog that shows active Sprint 2 work plus the sequenced work for later sprints without bringing markdown clutter back.',
  },
  {
    title: 'Locked screen specs',
    href: '/development/screens/leads-capture',
    body: 'Desktop, tablet, and mobile blueprints for the locked Leads and Capture implementation path.',
  },
  {
    title: 'Active workspace previews',
    href: '/workspace/leads',
    body: 'The current Leads, Capture, and Quote surfaces that stay aligned to Capture → Lead → Quote → Order.',
  },
];

const roadmapTone = {
  done: 'success',
  'in-progress': 'info',
  next: 'warning',
  locked: 'neutral',
} as const;

export default function DevelopmentPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Development workplace</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Setu Flow is in Sprint 2, and the workplace now reflects the real state without drifting from the product operating system.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">This page is the operating surface for the locked build. Sprint 1 stays complete, Sprint 2 stays active, and the backlog keeps the remaining roadmap visible without dragging later scope into today’s implementation.</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current focus</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">{sprintFocus.sprint} · planning restored · compile validated</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Flow remains locked to {sprintFocus.flow}. Sprint 2 is the only active delivery lane while later sprints stay visible but inactive.</p>
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
            <Link href="/development/backlog" className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open backlog</Link>
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Roadmap alignment</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Sprint 1 is complete, Sprint 2 is active, and the remaining sprints stay visible without becoming active too early.</h2>
              <div className="mt-6 space-y-4">
                {roadmapMilestones.map((milestone) => (
                  <div key={milestone.sprint} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{milestone.sprint}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{milestone.summary}</p>
                      </div>
                      <StatusBadge label={milestone.badgeLabel} tone={roadmapTone[milestone.status]} className="shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Non-negotiable ritual</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>• Before coding: check /development, /development/master-plan, /development/readiness, /development/backlog, /development/product, /development/architecture, /development/ux-rules, and /development/screens/leads-capture.</li>
                <li>• During coding: build only what belongs to the active sprint and keep the Capture → Lead → Quote → Order flow intact.</li>
                <li>• After coding: update checklist, readiness, and backlog state in the repo-backed development workplace, not in extra markdown or conversation-only notes.</li>
              </ul>
            </section>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
