export const dynamic = 'force-dynamic';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';

const principles = [
  ['One screen = one decision', 'Every screen needs a dominant job. If it tries to do three jobs, it fails.'],
  ['Guided beats flexible', 'Setu Flow should move people through controlled operating paths, not force them to configure every decision.'],
  ['Reduce surface count', 'No return to the command-center overload pattern.'],
  ['Make the next action obvious', 'Leads should push toward Create Quote. Quotes should push toward Review, Approve, or Send.'],
  ['Hide system complexity', 'The product can be smart without exposing users to internal workflow noise.'],
  ['Enterprise confidence over visual drama', 'The interface must look expensive because it is disciplined, not because it is crowded.'],
];

export default function UxRulesPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">UX rules</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">The interface must be trainable, predictable, and safe for enterprise adoption.</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">This page exists to stop visual and workflow drift. Good-looking chaos is still chaos.</p>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {principles.map(([title, body]) => (
            <div key={title} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
              <p className="text-lg font-semibold text-slate-950">{title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Red flag list</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <li>• Multiple rails, drawers, and workflow lanes competing on the same screen.</li>
            <li>• Duplicate ways to create or manage the same object.</li>
            <li>• Too many optional branches inside a core flow.</li>
            <li>• Passive dashboards with no obvious next action.</li>
            <li>• Complex forms that expose system logic instead of business decisions.</li>
          </ul>
        </section>
      </main>
    </SiteShell>
  );
}
