export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentNav } from "@/components/planning/development-nav";
import { roadmapMilestones } from "@/components/planning/development-status";
import { LOCKED_PRODUCT_FLOW, PRODUCT_ROUTES, driftGuardrails, } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";
const rules = [
    "Sprint 2 is now formally closed, Sprint 3 is now formally closed, and new work should start only from the next sequenced roadmap phase without changing the locked flow.",
    `Keep the product centered on ${LOCKED_PRODUCT_FLOW.join(" → ")}.`,
    "Do not create new top-level product modules or alternate workflow paths.",
    `Treat ${PRODUCT_ROUTES.development.home}, ${PRODUCT_ROUTES.development.masterPlan}, ${PRODUCT_ROUTES.development.readiness}, ${PRODUCT_ROUTES.development.backlog}, ${PRODUCT_ROUTES.development.product}, ${PRODUCT_ROUTES.development.architecture}, ${PRODUCT_ROUTES.development.uxRules}, ${PRODUCT_ROUTES.development.buyerReady}, and ${PRODUCT_ROUTES.development.screens} as the operating pages.`,
    ...driftGuardrails,
    "Keep backlog and planning inside the HTML development workplace, not in markdown task dumps.",
    "Let future sprints stay visible, but only activate them after the current sprint is formally closed.",
    "Keep mobile and tablet quality as strict as desktop polish.",
];
const references = [
    {
        href: PRODUCT_ROUTES.development.product,
        label: "Product contract",
        body: "The locked product definition that keeps the roadmap tied to one enterprise operating flow.",
    },
    {
        href: PRODUCT_ROUTES.development.architecture,
        label: "Architecture contract",
        body: "The domain and service rules that should govern later sprint implementation depth.",
    },
    {
        href: PRODUCT_ROUTES.development.uxRules,
        label: "UX rules",
        body: "The screen-level decision principles that prevent visual and workflow drift.",
    },
    {
        href: PRODUCT_ROUTES.development.home,
        label: "Development hub",
        body: "The operating surface with the visible checklist, roadmap snapshot, and live readiness summary.",
    },
    {
        href: PRODUCT_ROUTES.development.readiness,
        label: "Readiness board",
        body: "The blunt status view for deployment proof, shell integrity, and the real boundary to sprint signoff.",
    },
    {
        href: PRODUCT_ROUTES.development.buyerReady,
        label: "Buyer ready gap",
        body: "The explicit gap view for what still needs to land from the approved rework before buyer-facing confidence is claimed.",
    },
    {
        href: PRODUCT_ROUTES.development.backlog,
        label: "Sprint backlog",
        body: "The in-app backlog that now shows current and pending sprint work in one controlled place.",
    },
    {
        href: PRODUCT_ROUTES.development.screens,
        label: "Locked screen specs",
        body: "The locked screen reference for Leads and Capture that Sprint 3 must continue to respect.",
    },
    {
        href: PRODUCT_ROUTES.workspace.leads,
        label: "Active flow surfaces",
        body: "The implemented Leads and Capture workspace surfaces plus the app-owned Quotes and Orders routes that carry the locked flow.",
    },
];
const toneMap = {
    done: "success",
    "in-progress": "info",
    next: "warning",
    locked: "neutral",
};
export default function MasterPlanPage() {
    return (<SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
                Master plan
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                The product is still locked to one flow, and the plan now shows
                the deployed baseline, a formally closed Sprint 4
                quote-builder core, and an active Sprint 5 Batch 1 trust lane.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The current baseline is deployed successfully, Sprint 3 is
                formally closed, Sprint 4 quote-builder core remains complete,
                and this plan now opens Sprint 5 Batch 1 through one safe runtime slice while
                preserving the remaining roadmap in order.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                Locked flow
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                {LOCKED_PRODUCT_FLOW.join(" → ")}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/85">
                Every sprint must deepen this path. No alternate structures, no
                detached modules, and no backlog outside the development
                workplace.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <DevelopmentNav />
          </div>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
              Sprint roadmap
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Realigned to current reality without flattening the roadmap or
              weakening the planning model.
            </h2>
            <div className="mt-6 space-y-4">
              {roadmapMilestones.map((milestone) => (<div key={milestone.sprint} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {milestone.sprint}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {milestone.summary}
                      </p>
                    </div>
                    <StatusBadge label={milestone.badgeLabel} tone={toneMap[milestone.status]} className="shrink-0"/>
                  </div>
                </div>))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
              No-drift rules
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {rules.map((rule) => (<li key={rule}>• {rule}</li>))}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">
                Reference map
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Everything active should still be one click away from here.
              </h2>
            </div>
            <Link href={PRODUCT_ROUTES.development.backlog} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">
              Open backlog
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {references.map((item) => (<Link key={item.href} href={item.href} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#1F487C]/20 hover:bg-white">
                <p className="text-base font-semibold text-slate-950">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.body}
                </p>
              </Link>))}
          </div>
        </section>
      </main>
    </SiteShell>);
}
