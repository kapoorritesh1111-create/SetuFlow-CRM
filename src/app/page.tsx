import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { SiteShell } from '@/components/marketing/site-shell';

const platformCards = [
  {
    title: 'Capture messy trade inputs',
    body: 'Turn business cards, vCards, buyer documents, RFQs, and shared contact details into structured commercial records without forcing teams into manual re-entry.'
  },
  {
    title: 'Move from lead to quote fast',
    body: 'Guide teams through qualification, pricing, terms, approvals, and sending so quotes are faster, cleaner, and easier to trust.'
  },
  {
    title: 'Give management real visibility',
    body: 'Use a practical dashboard with next actions, pipeline health, and geographic trade intelligence so leaders can see where business is moving.'
  }
];

const industries = [
  'Food and agriculture export',
  'Industrial sourcing and distribution',
  'Chemicals, ingredients, and commodities',
  'Consumer goods import and export',
  'Private label and contract manufacturing',
  'Multi-country trading operations'
];

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(53,159,145,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(31,72,124,0.16),transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex rounded-full border border-[#1F487C]/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#1F487C] shadow-sm">
                Built for import-export sales teams
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Setu Flow is the trade execution system that turns messy commercial work into a usable operating flow.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Setu Flow helps import-export companies capture inbound opportunities, convert them into structured leads, move them through quote creation, and manage execution with more control, speed, and confidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/client-login" className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(31,72,124,0.24)] transition hover:translate-y-[-1px]">
                  Client login
                </Link>
                <Link href={PRODUCT_ROUTES.development.home} className="rounded-full border border-[#1F487C]/15 bg-white px-6 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">
                  View development work and plans
                </Link>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-white/90 p-5 shadow-[0_18px_45px_rgba(31,72,124,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Core flow</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Capture → Lead → Quote → Order</p>
                </div>
                <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-white/90 p-5 shadow-[0_18px_45px_rgba(31,72,124,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Buyer confidence</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Approvals, audit trail, and control</p>
                </div>
                <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-white/90 p-5 shadow-[0_18px_45px_rgba(31,72,124,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Differentiator</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Trade map and smart capture</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_28px_80px_rgba(31,72,124,0.12)] sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Setu Flow workspace preview</p>
                  <p className="text-sm text-slate-500">A cleaner commercial operating system for global trade teams</p>
                </div>
                <span className="rounded-full bg-[#359F91]/10 px-3 py-1 text-xs font-semibold text-[#279491]">Live product direction</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1F487C]">Action first dashboard</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">See what needs attention now</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• Quotes waiting for approval</li>
                    <li>• Leads needing follow-up</li>
                    <li>• Country-level trade movement</li>
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1F487C]">Guided quote flow</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Move from inquiry to commercial send-out</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• Product and quantity capture</li>
                    <li>• Pricing and terms structure</li>
                    <li>• Versioning and send controls</li>
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1F487C]">Market gap</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Most CRMs stop at contact tracking. Setu Flow is built for how import-export teams actually work.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Instead of forcing teams to stitch together email, spreadsheets, pricing logic, RFQ files, and commercial follow-up manually, Setu Flow connects those steps into a practical, auditable operating flow.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">What we offer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">A SaaS platform for import-export companies that need more than a basic CRM.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Setu Flow is designed to work across industries because the operating pain is the same: commercial inputs arrive in messy formats, follow-up is manual, quoting is slow, and visibility breaks once teams jump between tools.</p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {platformCards.map((card) => (
              <div key={card.title} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
                <p className="text-lg font-semibold text-slate-900">{card.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-[2.25rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,rgba(31,72,124,0.06)_0%,rgba(53,159,145,0.08)_100%)] p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Industry fit</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Built to work across trade businesses, not one narrow niche.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">The workflow can serve any import-export company because it is centered around capture, commercial qualification, quoting, and execution control rather than one product category alone.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {industries.map((industry) => (
                  <div key={industry} className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 text-sm font-medium text-slate-700 shadow-sm">
                    {industry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
