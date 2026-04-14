export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { buyerReadySections, readinessSummary, sprintFocus } from '@/components/planning/development-status';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { StatusBadge } from '@/components/ui/status-badge';

const toneMap = {
  done: 'success',
  'in-progress': 'info',
  next: 'warning',
  locked: 'neutral',
} as const;

export default function BuyerReadyPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Buyer ready gap view</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">The build is deployed successfully and Sprint 3 is now formally closed. This page shows what is already true, what is still missing from the approved rework, and what must land before the product is buyer ready.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">Use this tab to keep buyer-facing readiness honest. A successful deployment proves the baseline is live; it does not by itself mean the rework is complete enough for buyer walkthroughs, signoff, or external confidence.</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current gate</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">Deployment is verified. Buyer readiness is still a tracked post-Sprint-3 gap.</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Keep the product locked to {sprintFocus.flow} and finish the remaining approved rework in order before claiming buyer-facing completion.</p>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge label="Buyer readiness gap tracked" tone="warning" />
            <StatusBadge label="Approved rework sequencing preserved" tone="neutral" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={PRODUCT_ROUTES.development.readiness} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Open readiness</Link>
            <Link href={PRODUCT_ROUTES.development.backlog} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open backlog</Link>
            <Link href={PRODUCT_ROUTES.development.masterPlan} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open master plan</Link>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {buyerReadySections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">{section.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{section.summary}</p>
                </div>
                <StatusBadge label={section.status === 'done' ? 'Done' : section.status === 'in-progress' ? 'In progress' : section.status === 'next' ? 'Next' : 'Locked'} tone={toneMap[section.status]} className="shrink-0" />
              </div>
              <div className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <StatusBadge label={item.status === 'done' ? 'Done' : item.status === 'in-progress' ? 'In progress' : item.status === 'next' ? 'Next' : 'Locked'} tone={toneMap[item.status]} className="shrink-0" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </SiteShell>
  );
}
