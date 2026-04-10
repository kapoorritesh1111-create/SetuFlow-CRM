import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';

const sprintMap = [
  ['Sprint 1', 'Clean repo baseline, locked development workplace, reusable UI foundations, and Leads/Capture/Quote alignment.'],
  ['Current gate', 'Run the full production build and deployment validation in the complete workspace before marking Sprint 1 Complete.'],
];

const rules = [
  'Stay inside Sprint 1 until complete-workspace validation is confirmed.',
  'Keep the product centered on Capture, Lead, Quote, and Order.',
  'Do not create new top-level product modules or alternate workflow paths.',
  'Treat /development, /development/master-plan, /development/readiness, /development/backlog, and /development/screens/leads-capture as the active operating pages for Sprint 1.',
  'Keep planning inside the HTML development workplace, with backlog in /development/backlog and no scattered markdown files.',
  'Keep mobile and tablet quality as strict as desktop polish.',
];

const references = [
  { href: '/development', label: 'Development hub', body: 'The operating surface with the visible checklist and live readiness summary.' },
  { href: '/development/readiness', label: 'Readiness board', body: 'The blunt status view for the clean Sprint 1 baseline and the remaining validation gate.' },
  { href: '/development/backlog', label: 'Sprint backlog', body: 'The in-app backlog that decides what is active, what is next, and what is parked.' },
  { href: '/development/screens/leads-capture', label: 'Locked screen specs', body: 'The Sprint 1 screen reference for Leads and Capture.' },
  { href: '/workspace/leads', label: 'Active workspace previews', body: 'The implemented Leads, Capture, and Quote surfaces that reflect the locked flow.' },
];

export default function MasterPlanPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Locked master plan</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">One visible source of truth for the locked flow, minimal repo baseline, and Sprint 1 completion gate.</h1>
              <p className="mt-5 text-base leading-8 text-slate-600">This page is the permanent repo contract for what stays active: one development workplace, one locked flow, one screen-spec path, and one final validation gate before Sprint 1 is marked complete.</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-6 text-white lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Locked product identity</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">Trade execution system for import-export sales teams</p>
              <p className="mt-4 text-sm leading-7 text-white/85">Core flow: Capture → Lead → Quote → Order</p>
            </div>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Active product focus</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {['Capture', 'Lead', 'Quote', 'Order'].map((item) => (
                <span key={item} className="rounded-full bg-[#1F487C]/5 px-4 py-2 text-sm font-semibold text-[#1F487C]">{item}</span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">Everything else supports this flow. Importance does not automatically earn a new source-of-truth page or extra repo documentation.</p>
          </div>
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Clean repo baseline</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>• Keep active app code, shared foundations, config, public assets, and only the essential docs.</li>
              <li>• Remove iteration notes, prompt dumps, archived planning packs, and validation scratch files.</li>
              <li>• Keep the HTML development workplace as the live planning layer.</li>
              <li>• Do not rebuild repo clutter while Sprint 1 is still being validated.</li>
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Sprint mapping</p>
            <div className="mt-5 space-y-3">
              {sprintMap.map(([title, body]) => (
                <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">No-drift rules</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {rules.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Reference map</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Everything active should be one click away from here.</h2>
            </div>
            <Link href="/development/screens/leads-capture" className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Open locked screen specs</Link>
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
