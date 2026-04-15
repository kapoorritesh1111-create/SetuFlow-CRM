export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentNav } from "@/components/planning/development-nav";
import {
  backlogSections,
  readinessSummary,
  sprintFocus,
  sprintProgress,
} from "@/components/planning/development-status";
import { PRODUCT_ROUTES } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";

const toneMap = {
  done: "success",
  "in-progress": "info",
  next: "warning",
  locked: "neutral",
} as const;

export default function DevelopmentBacklogPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
                Sprint backlog
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                One backlog surface inside the development workplace, with
                Sprint 3 formally closed on a deployed baseline, Sprint 4
                quote-builder core formally closed, and Sprint 5 Batch 1 trust runtime
                now visible ahead of later buyer-ready work.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Backlog stays in the HTML workplace instead of extra repo files.
                Every item must support the locked {sprintFocus.flow} path,
                respect the confirmed shipped baseline, and improve readiness
                without recreating structural drift.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                Backlog rule
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                If work is not on this page, it is not scheduled work.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/85">
                Sprint 3 is now closed. Sprint 4 quote-builder core is now formally complete, and Sprint 5 Batch 1 is active here through one safe runtime slice: keep approval gate, audit-event map, and lock-state visibility explicit without reopening closed simplification work, changing the live builder behavior, or opening deeper trust enforcement yet.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <DevelopmentNav />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge
              label={`Build · ${readinessSummary.buildStatus}`}
              tone="info"
            />
            <StatusBadge label="Backlog is repo-backed" tone="neutral" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={PRODUCT_ROUTES.development.readiness}
              className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white"
            >
              Open readiness
            </Link>
            <Link
              href={PRODUCT_ROUTES.development.masterPlan}
              className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5"
            >
              Open master plan
            </Link>
            <Link
              href={PRODUCT_ROUTES.development.buyerReady}
              className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5"
            >
              Open buyer ready
            </Link>
            <Link
              href={PRODUCT_ROUTES.development.screens}
              className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5"
            >
              Open locked screen specs
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {backlogSections.map((section) => (
            <div
              key={section.title}
              className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
                    {section.title}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {section.heading}
                  </h2>
                </div>
                <StatusBadge
                  label={section.badgeLabel}
                  tone={toneMap[section.status]}
                  className="shrink-0"
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {section.summary}
              </p>
              <div className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.note}
                        </p>
                      </div>
                      <StatusBadge
                        label={item.stateLabel}
                        tone={toneMap[item.status]}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
              Operating rule
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Use the backlog to decide what gets built next, not just what gets
              remembered.
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
              <li>
                • Before coding: open backlog, readiness, and locked screen
                specs together.
              </li>
              <li>
                • During coding: build only active-sprint work that reinforces
                Capture → Lead → Quote → Order.
              </li>
              <li>
                • After coding: update backlog state only if sprint scope
                changes, and always update checklist + readiness in the same
                commit.
              </li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
              Why backlog stays here
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                <strong className="text-slate-900">Single source:</strong>{" "}
                planning stays in the product-facing development workplace
                instead of scattered files.
              </p>
              <p>
                <strong className="text-slate-900">No-drift gate:</strong> only
                items on this page can become active implementation work.
              </p>
              <p>
                <strong className="text-slate-900">Real continuity:</strong>{" "}
                later sprints stay visible so the team does not feel like
                progress was reset back to the beginning.
              </p>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
