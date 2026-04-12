import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const modules = ['Leads', 'Quotes', 'Orders', 'Dashboard', 'Admin'];
const hiddenSystems = ['Capture / intake', 'Pricing engine', 'RFQ parsing', 'Compliance', 'Documents', 'Contracts', 'AI assist', 'My Card / share contact'];

export default function ProductContractPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Product contract</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Setu Flow is a trade execution system for import-export sales teams.</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">This is the locked product definition. If a future feature, route, or workflow does not reinforce this identity, it is drift. The current cleanup keeps this visible without recreating repo clutter.</p>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Core flow</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Capture → Lead → Quote → Order</h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
              <li>• Capture turns messy real-world inputs into structured commercial context.</li>
              <li>• Leads qualify the opportunity and push toward quote creation.</li>
              <li>• Quotes structure pricing, terms, approvals, and send flow.</li>
              <li>• Orders carry accepted quotes into execution, documents, and compliance.</li>
            </ul>
          </div>
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Enterprise promise</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">Reduce manual commercial chaos without losing control.</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">Setu Flow must feel credible to a multinational buyer evaluating whether to replace spreadsheet-driven commercial execution with one disciplined operating system.</p>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-lg font-semibold text-slate-950">Locked modules</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {modules.map((item) => <span key={item} className="rounded-full bg-[#1F487C]/5 px-4 py-2 text-sm font-semibold text-[#1F487C]">{item}</span>)}
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-lg font-semibold text-slate-950">Supporting systems that stay behind the scenes</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              {hiddenSystems.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Anti-drift rule</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">No new top-level product area gets added just because a feature is important.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">Important does not mean top-level. Many enterprise capabilities matter deeply but still belong inside the flow rather than beside it.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href={PRODUCT_ROUTES.development.backlog} className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Open sprint backlog</Link>
            <Link href={PRODUCT_ROUTES.workspace.leads} className="rounded-full border border-[#1F487C]/15 px-5 py-3 text-sm font-semibold text-[#1F487C]">See product views</Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
