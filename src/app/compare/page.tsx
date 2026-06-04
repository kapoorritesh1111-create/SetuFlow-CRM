import Link from 'next/link';
import { SiteShell } from '@/components/marketing/site-shell';

const alternatives = [
  {
    name: 'HubSpot',
    position: 'Excellent broad CRM and RevOps platform',
    note: 'Strong for contacts, campaigns, sales automation, service and app ecosystem. Setu Flow wins when the workflow needs trade-specific vCard, events, documents and dispatch continuity.',
  },
  {
    name: 'Zoho CRM',
    position: 'Powerful configurable CRM suite',
    note: 'Strong for customization, automation, sales processes and the broader Zoho ecosystem. Setu Flow wins when teams want a focused import-export execution flow without heavy custom setup.',
  },
  {
    name: 'Pipedrive',
    position: 'Clean visual sales pipeline CRM',
    note: 'Strong for deal visibility, sales activity and pipeline usability. Setu Flow wins after the quote, where documents, order handoff and dispatch readiness matter.',
  },
  {
    name: 'Event capture tools',
    position: 'Useful for trade show scanning and CRM exports',
    note: 'Strong for capturing badge or business-card data. Setu Flow wins by making vCard, event context, ownership and follow-up part of the same trade CRM workflow.',
  },
];

const rows = [
  ['Native digital vCard', 'Usually separate tools or add-ons', 'Built in: QR share card, save contact, copy link, send email and CRM follow-up context'],
  ['Trade event workflow', 'Often a form, import list, campaign object or event-scanning tool export', 'Dedicated event intake tied to owners, source context and next actions'],
  ['Lead follow-up', 'Strong activity tracking, but often generic follow-up queues', 'Trade-specific owner, buyer/source context and follow-up workflow'],
  ['Quote management', 'Often needs CPQ, custom objects, spreadsheets or configuration', 'Quote workflow with terms, buyer context and approval readiness'],
  ['Document manager', 'Commonly attachment storage or external document folders', 'Readiness workflow before operations, handoff and dispatch'],
  ['Order dispatch', 'Usually outside the CRM or handled in operations tools', 'Execution desk for order handoff, documents and dispatch readiness'],
  ['Native AI support', 'General AI for sales, marketing, service or automation', 'Setu Guru supports event leads, quotes, document gaps and dispatch blockers'],
  ['Mobile field workflow', 'Mobile CRM access or separate lead capture apps', 'vCard, event capture and follow-up built around field trade work'],
];

const wins = [
  'More trade-specific than broad CRMs',
  'More execution-focused than pipeline CRMs',
  'More connected than event-capture add-ons',
  'More operational than quote-only workflows',
];

function Button({ href, children, ghost = false }: { href: string; children: React.ReactNode; ghost?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${ghost ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15' : 'bg-teal-600 text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] hover:bg-teal-700'}`}
    >
      {children}<span className="ml-2">→</span>
    </Link>
  );
}

export default function ComparePage() {
  return (
    <SiteShell>
      <main className="overflow-hidden bg-white text-slate-950">
        <section className="bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">Compare</p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[4.5rem]">
                Setu Flow vs broad CRM and event-capture tools.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                HubSpot, Zoho and Pipedrive are strong CRM platforms. Setu Flow is different: it is built for import-export execution from vCard and trade events to quotes, documents, order handoff and dispatch readiness.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/book-demo" className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,148,136,.24)] transition hover:-translate-y-0.5 hover:bg-teal-700">Book a Demo →</Link>
                <Link href="/platform" className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-50">Explore Platform →</Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {wins.map((win) => (
                <div key={win} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">✓</div>
                  <p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{win}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">Alternatives</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Not weaker tools — different jobs.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                The point is not that HubSpot, Zoho or Pipedrive are bad. They are excellent broad CRM tools. Setu Flow is built for the trade execution work those systems usually need add-ons, custom objects or external processes to cover.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {alternatives.map((alt) => (
                <article key={alt.name} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,.05)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Compared with</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{alt.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-teal-700">{alt.position}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-500">{alt.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-200">Detailed comparison</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                Where Setu Flow is native.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65">
                Generic CRMs can be strong. Trade execution usually requires a different chain of work: acquisition, commercial control, document readiness, operations handoff and dispatch.
              </p>
            </div>
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,.18)]">
              <div className="overflow-x-auto">
                <table className="min-w-[940px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                      <th className="px-5 py-4">Capability</th>
                      <th className="px-5 py-4">HubSpot / Zoho / Pipedrive</th>
                      <th className="px-5 py-4 text-teal-200">Setu Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row[0]} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4 font-semibold text-white">{row[0]}</td>
                        <td className="px-5 py-4 text-white/48">{row[1]}</td>
                        <td className="px-5 py-4 font-semibold text-teal-50">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-950 px-7 py-8 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-200">Best-fit walkthrough</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">See where Setu Flow fits against your current CRM stack.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">We can map what should stay in your CRM, what currently sits in spreadsheets, and where Setu Flow can become the execution layer.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/book-demo">Book a Demo</Button>
                <Button href="/pricing" ghost>Pricing</Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
