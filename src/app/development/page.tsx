export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentChecklist } from "@/components/planning/development-checklist";
import { DevelopmentNav } from "@/components/planning/development-nav";
import {
  readinessSummary,
  roadmapMilestones,
  sprintFocus,
  sprintProgress,
} from "@/components/planning/development-status";
import { PRODUCT_ROUTES, PRODUCT_SHELL_LABELS } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";

const pinned = [
  { title: "Product contract", href: PRODUCT_ROUTES.development.product, body: "The locked commercial flow and module boundaries that prevent scope creep and keep every sprint tied to the core trade execution story." },
  { title: "Architecture contract", href: PRODUCT_ROUTES.development.architecture, body: "Domain and service rules that maintain clean separation as the product deepens, preventing god files and cross-surface coupling." },
  { title: "UX rules", href: PRODUCT_ROUTES.development.uxRules, body: "Screen-level design principles that keep the interface trainable, predictable, and credible to enterprise buyers." },
  { title: "Master plan", href: PRODUCT_ROUTES.development.masterPlan, body: "Sprint roadmap and completion status — the single source of truth for what has shipped, what is active, and what comes next." },
  { title: "Readiness", href: PRODUCT_ROUTES.development.readiness, body: "Live deployment status, build confidence, and the honest signal for when a sprint is ready for signoff." },
  { title: "Buyer ready", href: PRODUCT_ROUTES.development.buyerReady, body: "Gap analysis between what has shipped and what must land before the product is ready for buyer-facing walkthroughs and leadership signoff." },
  { title: "Sprint backlog", href: PRODUCT_ROUTES.development.backlog, body: "The in-product backlog showing the closed Sprint 6 baseline and the next sequenced sprint work tied to the locked commercial flow." },
  { title: "Screen specifications", href: PRODUCT_ROUTES.development.screens, body: "Desktop, tablet, and mobile layout specifications for the Leads and Capture surfaces." },
  { title: "Live product", href: PRODUCT_ROUTES.workspace.leads, body: "The active Leads, Quotes, and Orders workspaces in the Sprint 6 deployed baseline." },
];

const roadmapTone = { done: "success", "in-progress": "info", next: "warning", locked: "neutral" } as const;

export default function DevelopmentPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Product development</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Setu Flow — trade execution platform for import-export sales teams.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                This workspace tracks sprint delivery, product readiness, and the gap between current capability and buyer-facing confidence. Every page reflects the live state of the product — not aspirational planning.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Current baseline</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">{sprintFocus.sprint}</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Core flow: {sprintFocus.flow}. Every sprint deepens this path.</p>
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
            <Link href={PRODUCT_ROUTES.development.readiness} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Readiness status</Link>
            <Link href={PRODUCT_ROUTES.development.buyerReady} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Buyer-ready gap</Link>
            <Link href={PRODUCT_ROUTES.app.leads} className="rounded-full border border-[#1F487C]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Live product</Link>
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Implementation checklist</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Verified against the shipped baseline</h2>
              </div>
              <Link href={PRODUCT_ROUTES.development.readiness} className="text-sm font-semibold text-[#1F487C]">Full readiness view</Link>
            </div>
            <div className="mt-6"><DevelopmentChecklist /></div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Sprint roadmap</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Delivered sprints closed. Current baseline tracked. Upcoming work sequenced.</h2>
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">{PRODUCT_SHELL_LABELS.ritualHeading}</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>• {PRODUCT_SHELL_LABELS.ritualBeforeCoding}</li>
                <li>• {PRODUCT_SHELL_LABELS.ritualDuringCoding}</li>
                <li>• {PRODUCT_SHELL_LABELS.ritualAfterCoding}</li>
              </ul>
            </section>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
