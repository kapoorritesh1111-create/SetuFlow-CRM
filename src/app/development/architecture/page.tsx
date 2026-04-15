export const dynamic = 'force-dynamic';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';

const domains = [
  ['Leads', 'Commercial qualification, buyer context, activity tracking, and the gateway to quote creation. Every revenue relationship starts here.'],
  ['Quotes', 'Pricing decisions, approval gates, version control, and the send flow that moves commercial proposals to buyers. The most complex domain.'],
  ['Orders', 'Accepted quote snapshots carried into execution — documents, compliance, and contract status visible per order without leaving the surface.'],
  ['Catalog', 'Product and pricing input data that feeds the quote builder. Managed centrally so pricing stays consistent across all quotes.'],
  ['Admin', 'User management, organization configuration, audit log, AI analytics, and system governance.'],
];

const rules = [
  'No business logic inside presentational components.',
  'No giant queries files — related queries stay together, unrelated ones get their own files.',
  'One server action per logical operation.',
  'Services own shared logic. Domains own domain behavior.',
  'Every DB write goes through a server action with audit logging.',
  'Architecture decisions reduce confusion and coupling over time — not just in the moment.',
];

const migration = [
  'Simplify navigation and visible product surfaces.',
  'Deepen Quotes inside the current app-owned route without reintroducing preview leakage.',
  'Fold capture into Leads as a unified intake capability.',
  'Deepen Orders inside the current app-owned route — documents, compliance, contracts per order.',
  'Centralise approvals, audit, and progression rules into shared services.',
  'Retire legacy surfaces and large utility files as domains mature.',
];

export default function ArchitecturePage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Architecture</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Clear domains, clean services, and no tolerance for coupling or god files.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            The target architecture is intentionally simple. As the product deepens, the rules here prevent the codebase from collapsing into route sprawl and logic entanglement. Complexity belongs inside domain services — not in page-level components or giant utility files.
          </p>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Product domains</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Five domains, each with a clear commercial purpose</h2>
            <div className="mt-6 space-y-4">
              {domains.map(([title, body]) => (
                <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Non-negotiable rules</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">What every sprint must respect</h2>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {rules.map((rule) => <li key={rule}>• {rule}</li>)}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Migration order</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Deepening in sequence</h2>
              <ol className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {migration.map((step, i) => <li key={step}>{i + 1}. {step}</li>)}
              </ol>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
