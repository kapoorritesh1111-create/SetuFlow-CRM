export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentNav } from "@/components/planning/development-nav";
import { buyerReadySections, readinessSummary, sprintFocus } from "@/components/planning/development-status";
import { PRODUCT_ROUTES } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";

const toneMap = { done: "success", "in-progress": "info", next: "warning", locked: "neutral" } as const;

export default function BuyerReadyPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Buyer readiness</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                What the product can demonstrate today — and what must land before leadership walkthrough.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A substantial codebase is necessary but not sufficient for buyer-facing confidence. This page tracks the explicit gap between what is already true in the repo and what still requires proof, walkthrough assets, and release-quality closure.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current gate</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                {readinessSummary.status}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/85">
                Product is live on {sprintFocus.flow}. Buyer-ready gaps are tracked below — the closed workflow baseline stays protected while active dashboard work, proof refresh, and later release work remain sequenced.
              </p>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge label="Buyer readiness tracked" tone="warning" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={PRODUCT_ROUTES.development.readiness} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Readiness board</Link>
            <Link href={PRODUCT_ROUTES.development.masterPlan} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Sprint roadmap</Link>
          </div>
        </section>

        <section className="mt-10 space-y-6">
          {buyerReadySections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">{section.title}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{section.summary}</p>
                </div>
                <StatusBadge label={section.status === "done" ? "Complete" : section.status === "in-progress" ? "In progress" : section.status === "locked" ? "Upcoming" : "Next"} tone={toneMap[section.status]} className="shrink-0" />
              </div>
              <div className="mt-6 space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${item.status === "done" ? "border-emerald-400 bg-emerald-400" : item.status === "in-progress" ? "border-sky-400 bg-sky-100" : item.status === "next" ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
                    </div>
                    <StatusBadge label={item.status === "done" ? "Done" : item.status === "in-progress" ? "Active" : item.status === "next" ? "Next" : "Upcoming"} tone={toneMap[item.status]} className="shrink-0" />
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
