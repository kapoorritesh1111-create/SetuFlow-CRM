export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentNav } from "@/components/planning/development-nav";
import { backlogSections, readinessSummary, sprintFocus, sprintProgress } from "@/components/planning/development-status";
import { PRODUCT_ROUTES } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";

const toneMap = { done: "success", current: "info", planned: "warning", locked: "neutral" } as const;

export default function DevelopmentBacklogPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Sprint backlog</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Every scheduled item in one place — sequenced, tracked, and tied to the commercial flow.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Work is sequenced along the {sprintFocus.flow} path. Items not on this page are not scheduled. Sprints 1-8 are now closed, Sprint 9 is the active cleanup/hardening lane, and Sprint 10 remains the final demo/release proof lane before April 21.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current baseline</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">{sprintFocus.sprint}</p>
              <p className="mt-4 text-sm leading-7 text-white/85">{sprintProgress.percentLabel}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/20">
                  <div className="h-1.5 rounded-full bg-white" style={{ width: `${sprintProgress.percent}%` }} />
                </div>
                <span className="text-xs font-semibold text-white/80">{sprintProgress.percent}%</span>
              </div>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge label={sprintProgress.percentLabel} tone="info" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={PRODUCT_ROUTES.development.masterPlan} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Sprint roadmap</Link>
            <Link href={PRODUCT_ROUTES.development.readiness} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Readiness board</Link>
          </div>
        </section>

        <section className="mt-10 space-y-6">
          {backlogSections.map((section) => (
            <div key={section.sprint} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">{section.sprint}</p>
                    <StatusBadge label={section.badgeLabel} tone={toneMap[section.status]} />
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{section.heading}</h2>
                  <p className="mt-2 text-base leading-7 text-slate-600">{section.description}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <StatusBadge label={item.stateLabel} tone={toneMap[item.status]} className="shrink-0" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{item.note}</p>
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
