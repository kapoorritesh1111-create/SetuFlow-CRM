import Link from 'next/link';
import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { PreviewPanel, StatCard } from '@/components/previews/ui';

const actions = [
  { title: 'Send revised quote to Al Noor Foods', note: 'Margin approved. Buyer waiting since yesterday.', cta: 'Open quote' },
  { title: 'Follow up with Nairobi sourcing lead', note: 'Trade show capture has no next meeting yet.', cta: 'Schedule follow-up' },
  { title: 'Review Germany shipment readiness', note: 'Order documents are 2 of 4 complete.', cta: 'Check order' }
];

const countries = [
  { name: 'UAE', flow: 'Active quotes · 12', products: 'Dates, spices, snacks' },
  { name: 'Kenya', flow: 'New leads · 5', products: 'Private label foods' },
  { name: 'Germany', flow: 'Orders in progress · 3', products: 'Ingredients, powders' },
  { name: 'Saudi Arabia', flow: 'Negotiation · 4', products: 'Jaggery, fruit chips' }
];

export default function WorkspaceDashboardPage() {
  return (
    <WorkspaceShell
      eyebrow="Product view · dashboard"
      title="Dashboard built for action first, not vanity analytics"
      description="This is the branded dashboard direction: today’s actions on top, pipeline health in the middle, and trade-map visibility as the differentiator. It is designed to help reps act fast and help leadership see where business is actually moving."
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <PreviewPanel title="Today’s actions" subtitle="Every card should lead to a direct action inside the system." badge="Priority queue">
            <div className="space-y-4">
              {actions.map((action) => (
                <div key={action.title} className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{action.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{action.note}</p>
                  </div>
                  <button className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(31,72,124,0.18)]">{action.cta}</button>
                </div>
              ))}
            </div>
          </PreviewPanel>

          <PreviewPanel title="Global trade map" subtitle="Country visibility becomes useful only when it drills down into leads, quotes, and orders." badge="Differentiator">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[radial-gradient(circle_at_top,rgba(53,159,145,0.14),transparent_30%),linear-gradient(180deg,#f8fcfe_0%,#eef7fb_100%)] p-6">
                <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-[#1F487C]/20 bg-white/70 text-center">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1F487C]">Interactive country layer</p>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">Replace static map decoration with clickable country intelligence: active leads, quote volume, order readiness, and top product clusters by market.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {countries.map((country) => (
                  <div key={country.name} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-slate-900">{country.name}</p>
                      <span className="rounded-full bg-[#1F487C]/5 px-3 py-1 text-xs font-semibold text-[#1F487C]">Drill down</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{country.flow}</p>
                    <p className="mt-1 text-sm text-slate-500">{country.products}</p>
                  </div>
                ))}
              </div>
            </div>
          </PreviewPanel>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard label="Open leads" value="48" hint="14 require follow-up in the next 48 hours." />
            <StatCard label="Quotes in motion" value="21" hint="6 are waiting on manager approval." />
            <StatCard label="Orders live" value="9" hint="3 have document blockers to resolve." />
          </div>
          <PreviewPanel title="Why this dashboard is sellable" subtitle="This page exists to improve decisions, not fill space with charts.">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li>• Reps know what to do next without opening five modules.</li>
              <li>• Managers can see stalled work and cross-country movement fast.</li>
              <li>• The map becomes a real market-intelligence surface, not decoration.</li>
              <li>• Every widget points back to a lead, quote, or order action.</li>
            </ul>
            <div className="mt-5 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#1F487C]/5 p-4 text-sm text-slate-700">
              Link the dashboard to <Link href="/workspace/leads" className="font-semibold text-[#1F487C]">Leads</Link>, <Link href="/workspace/quotes" className="font-semibold text-[#1F487C]">Quote Builder</Link>, and <Link href="/workspace/orders" className="font-semibold text-[#1F487C]">Orders</Link> so the page feels operational, not passive.
            </div>
          </PreviewPanel>
        </div>
      </div>
    </WorkspaceShell>
  );
}
