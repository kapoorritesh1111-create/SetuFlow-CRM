export const dynamic = 'force-dynamic';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';

const principles = [
  ['One screen, one decision', 'Every screen has a dominant job. If a surface tries to do three things simultaneously, it fails at all three. Setu Flow keeps each surface focused on moving the operator to the next clear commercial action.'],
  ['Guided over flexible', 'The product moves people through controlled operating paths rather than requiring configuration at every step. Enterprise operators need speed and confidence — not infinite options.'],
  ['Reduce surface count', 'Fewer surfaces, done well, outperform many surfaces done partially. Every new surface added must retire or absorb an old one.'],
  ['Make the next action obvious', 'Leads push toward Create Quote. Quotes push toward Review, Approve, or Send. Orders show execution readiness. At every stage, the dominant next action is immediately clear.'],
  ['Hide system complexity', 'Approval gates, audit trails, compliance checks, and lock states are all real — but the product exposes them as clear commercial signals, not internal system noise.'],
  ['Enterprise confidence over visual drama', 'The interface looks credible because it is disciplined and purposeful. Density is fine when it serves the operator. Decoration that does not carry commercial meaning is removed.'],
];

const redFlags = [
  'Multiple workflow lanes competing for attention on the same screen.',
  'Duplicate paths to create or manage the same commercial object.',
  'Optional branches inside a core flow that most operators never use.',
  'Passive dashboards with counts and charts but no obvious next action.',
  'Complex forms that expose internal system logic instead of business decisions.',
  'Confirmation dialogs that repeat what the button already said.',
  'Status labels that require training to interpret.',
];

export default function UxRulesPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">UX principles</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Trainable, predictable, and safe for enterprise adoption.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            These principles exist to prevent the interface from drifting back toward complexity that looks impressive but slows down commercial execution. A sales team using Setu Flow in a live buyer conversation needs confidence, not configuration.
          </p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Design red flags</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Patterns that indicate drift — address before they compound</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2 text-sm leading-7 text-slate-600">
            {redFlags.map((flag) => (
              <li key={flag} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-rose-400" />
                {flag}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </SiteShell>
  );
}
