import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';

const domains = [
  ['Leads', 'Qualification, activity, and the path to Create Quote.'],
  ['Quotes', 'Quote drafting, pricing decisions, approvals, send flow, and locking.'],
  ['Orders', 'Accepted quote snapshots, execution, documents, and compliance.'],
  ['Catalog', 'Product and pricing input data.'],
  ['Admin', 'Users, organization setup, reporting, integrations, and governance.'],
];

const rules = [
  'No business logic inside presentational components.',
  'No giant actions.ts or giant queries.ts files.',
  'One action per file.',
  'One query per file or tightly-related query set.',
  'Services own shared logic. Domains own domain behavior.',
  'Architecture must reduce confusion and coupling over time.',
];

export default function ArchitecturePage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Architecture contract</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Build discipline that keeps Setu Flow from collapsing into route sprawl and logic chaos.</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">The target architecture is intentionally simple: clear domains, clear services, clear platform rules, and no excuse for god files or cross-surface drift.</p>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-lg font-semibold text-slate-950">Target domains</p>
            <div className="mt-5 space-y-4">
              {domains.map(([title, body]) => (
                <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-lg font-semibold text-slate-950">Non-negotiable rules</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              {rules.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Migration order</p>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <li>1. Simplify navigation and visible product surfaces.</li>
            <li>2. Promote Quotes into a true first-class module.</li>
            <li>3. Fold capture into Leads as a unified intake capability.</li>
            <li>4. Create Orders as a first-class post-quote object.</li>
            <li>5. Centralize approvals, audit, and progression rules.</li>
            <li>6. Break up legacy god files and tighten domain ownership.</li>
          </ol>
        </section>
      </main>
    </SiteShell>
  );
}
