export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteShell } from "@/components/marketing/site-shell";
import { DevelopmentNav } from "@/components/planning/development-nav";
import { roadmapMilestones } from "@/components/planning/development-status";
import { LOCKED_PRODUCT_FLOW, PRODUCT_ROUTES, driftGuardrails } from "@/lib/product-contract";
import { StatusBadge } from "@/components/ui/status-badge";

const rules = [
  `The locked commercial flow is ${LOCKED_PRODUCT_FLOW.join(" → ")}. Every sprint must deepen this path.`,
  "No new top-level product modules or alternate workflow paths are introduced without explicit approval.",
  "Later sprints remain visible in the roadmap but are not activated until the current sprint is formally closed.",
  "Backlog stays inside this development workspace — not in markdown files or external task systems.",
  "Mobile and tablet quality are held to the same standard as desktop.",
  ...driftGuardrails,
];

const references = [
  { href: PRODUCT_ROUTES.development.product, label: "Product contract", body: "The locked commercial definition — what Setu Flow is, what it is not, and what modules are primary." },
  { href: PRODUCT_ROUTES.development.architecture, label: "Architecture contract", body: "Domain boundaries, service rules, and the file discipline that prevents coupling and god files." },
  { href: PRODUCT_ROUTES.development.uxRules, label: "UX rules", body: "Screen-level principles that keep the interface predictable and enterprise-credible." },
  { href: PRODUCT_ROUTES.development.readiness, label: "Readiness", body: "Deployment proof, build status, and the honest criteria for sprint signoff." },
  { href: PRODUCT_ROUTES.development.buyerReady, label: "Buyer-ready gap", body: "What has shipped versus what must land before leadership walkthroughs and buyer-facing demos." },
  { href: PRODUCT_ROUTES.development.backlog, label: "Sprint backlog", body: "Active and upcoming sprint items tied to the locked commercial flow." },
  { href: PRODUCT_ROUTES.development.screens, label: "Screen specifications", body: "Locked screen blueprints for Leads and Capture." },
  { href: PRODUCT_ROUTES.workspace.leads, label: "Live product", body: "The active Leads, Quotes, and Orders workspaces." },
];

const toneMap = { done: "success", "in-progress": "info", next: "warning", locked: "neutral" } as const;

export default function MasterPlanPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Master plan</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Sprint-by-sprint delivery toward a buyer-ready trade execution system.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Setu Flow is built in disciplined sprints, each one deepening the core commercial flow without adding scope outside it. Closed baseline work stays closed. The repo is now aligned to Sprints 1-7 closed, Sprint 8 ready in development, and queued cleanup/release work behind that sequence.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Locked commercial flow</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">{LOCKED_PRODUCT_FLOW.join(" → ")}</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Every sprint must strengthen this path. No alternate structures, no detached modules, and no scope outside this sequence becomes a primary destination.</p>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Sprint roadmap</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Delivery status by sprint</h2>
            <div className="mt-6 space-y-4">
              {roadmapMilestones.map((milestone) => (
                <div key={milestone.sprint} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{milestone.sprint}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{milestone.summary}</p>
                      {milestone.status !== "locked" && milestone.outcomes?.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {milestone.outcomes.map((o: string) => (
                            <li key={o} className="text-xs leading-5 text-slate-500">· {o}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <StatusBadge label={milestone.badgeLabel} tone={toneMap[milestone.status]} className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Operating rules</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">What keeps the product on track</h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
              {rules.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Reference surfaces</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">One click from the plan to the detail</h2>
            </div>
            <Link href={PRODUCT_ROUTES.development.backlog} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Open sprint backlog</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {references.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#1F487C]/20 hover:bg-white">
                <p className="text-base font-semibold text-slate-950">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
