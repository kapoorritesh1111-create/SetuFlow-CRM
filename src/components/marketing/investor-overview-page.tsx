const INVEST_EMAIL = 'invest@setugroups.com';
const INVEST_MAILTO = `mailto:${INVEST_EMAIL}?subject=Setu%20Flow%20Pre-Seed%20Deck%20Request`;

const navLinks = [
  ['#problem', 'Problem'],
  ['#market', 'Market'],
  ['#competitive', 'Landscape'],
  ['#traction', 'Traction'],
  ['#round', 'Round'],
] as const;

const problemCards = [
  ['80% still run on Excel + WhatsApp', 'Business cards from trade shows are entered days later. Follow-ups get missed. Deals go cold with no system of record.'],
  ['Compliance blockers kill shipments', 'A lapsed certificate discovered at port can delay an order for weeks. The buyer relationship absorbs the damage.'],
  ['Generic CRMs do not understand trade', 'HubSpot and Zoho were not built around FOB/CIF logic, HS-code fields, freight calculations, or approval gates.'],
  ['Enterprise tools are out of reach', 'SAP GTM and Oracle TM exist, but the implementation cost and timeline price out the SMB exporter entirely.'],
  ['Every wrong quote costs margin', 'FX-rate errors, wrong freight assumptions, and unapproved discounts create silent leakage without a governed workflow.'],
] as const;

const marketStats = [
  ['$2.8B', 'Trade management software market today'],
  ['$5.7B', 'Market by 2032 · 10.6% CAGR'],
  ['250k+', 'SMB trading companies with no purpose-built system'],
  ['$1T', "India's export mission by 2030"],
] as const;

const tractionStats = [
  ['5', 'Paying clients'],
  ['<50', 'Active users'],
  ['<$200', 'Founder-led CAC'],
  ['10+', 'Modules shipped'],
  ['<5 days', 'Time to value'],
  ['100%', 'Actions audit-logged'],
] as const;

const compCols = ['Excel + WhatsApp', 'HubSpot / Zoho', 'SAP / E2open', 'Setu Flow'] as const;
const compRows = [
  ['FOB/CIF pricing + freight calc', 'No', 'No', 'ERP module', 'Native'],
  ['Live FX locked at quote time', 'No', 'No', 'Treasury module', 'Native'],
  ['WhatsApp quote delivery', 'No', 'No', 'No', 'Native'],
  ['9-point Stage Move Readiness', 'No', 'No', 'No', 'Native'],
  ['Mobile-native field capture', 'No', 'Partial', 'No', 'Native'],
  ['Business-card OCR to lead', 'No', 'Partial', 'No', 'Native'],
  ['Country compliance by destination', 'No', 'No', 'Enterprise', 'Native'],
  ['AI priority, risk, delay scoring', 'No', 'No', 'No', 'Native'],
  ['Time to value for 20-person team', 'Never', '2-4 weeks', '3-6 months', '<5 days'],
] as const;

const mlRoadmap = [
  ['Quote Intelligence', 'Win-probability and margin-safe price suggestions per market, learned from quote history, FX locks, and approval outcomes already captured in Setu Flow.'],
  ['Predictive Lead Scoring', 'Upgrades the shipped rule-based lead health model into learned conversion scoring from source, response latency, and buyer signals.'],
  ['Dispatch Risk Prediction', 'Predicts order delays and shipment blockers from document readiness, compliance history, and Stage Move Readiness data.'],
  ['Document Intelligence', 'OCR-driven extraction, certificate-expiry forecasting, and missing-document detection per destination country.'],
] as const;

const pricingTiers = [
  ['Starter', '$199', '/mo · up to 5 users', 'Pipeline + lead management · Quote builder · vCard + QR + OCR capture · Mobile app'],
  ['Growth', '$499', '/mo · up to 10 users', 'AI Assist · WhatsApp quote delivery · Document workspace · Product catalog + market pricing'],
  ['Enterprise', 'Custom', 'multi-team · dedicated support', 'Unlimited users · custom roles · ERP integrations · dedicated onboarding + SLA'],
] as const;

const useOfFunds = [
  [45, 'ML capabilities', 'Four-model roadmap on data already captured'],
  [25, 'Sales funnel', 'Trade shows, WhatsApp-first outreach, inbound content'],
  [20, 'Engineering uplifts', 'Scaling, API integrations, mobile + PWA hardening'],
  [10, 'Operations', 'Legal, finance, and runway discipline'],
] as const;

function Logo() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#1f2a1d]/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/setu-flow-logo.png" alt="Setu Flow" className="h-8 w-8 object-contain" />
      </span>
      <span className="text-lg font-bold tracking-tight text-[#1f2a1d] sm:text-xl">
        Setu Flow<sup className="ml-0.5 text-[9px] font-semibold">TM</sup>
      </span>
    </span>
  );
}

function CTA({ light = false, children = 'Request the Deck' }: { light?: boolean; children?: React.ReactNode }) {
  return (
    <a
      href={INVEST_MAILTO}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${
        light ? 'bg-white text-[#1f2a1d] hover:bg-white/90' : 'bg-[#1f2a1d] text-white hover:bg-[#2a3827]'
      }`}
    >
      {children}
    </a>
  );
}

function SectionHeading({ eyebrow, title, accent, body, light = false }: { eyebrow: string; title: string; accent: string; body?: string; light?: boolean }) {
  return (
    <div>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#85AB8B]">{eyebrow}</p>
      <h2 className={`max-w-3xl text-3xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-4xl md:text-5xl ${light ? 'text-white' : 'text-[#336443]'}`}>
        {title} <span className="text-[#85AB8B]">{accent}</span>
      </h2>
      {body ? <p className={`mt-5 max-w-2xl text-sm leading-relaxed sm:text-base ${light ? 'text-white/72' : 'text-[#4b5b47]'}`}>{body}</p> : null}
    </div>
  );
}

export function InvestorOverviewPage() {
  return (
    <main className="min-h-screen bg-white text-[#1f2a1d]">
      <section className="relative min-h-screen overflow-hidden bg-[#f6f7f4]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(133,171,139,0.28),transparent_35%),linear-gradient(180deg,rgba(246,247,244,0.78),rgba(246,247,244,1))]" />
        <nav className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 md:px-10 md:py-6">
          <a href="/" aria-label="Setu Flow home"><Logo /></a>
          <div className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/75 py-1 pl-5 pr-1 shadow-sm backdrop-blur lg:flex">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-2 text-sm font-semibold text-[#4b5b47] transition hover:bg-white hover:text-[#1f2a1d]">{label}</a>
            ))}
            <CTA>Request Deck</CTA>
          </div>
          <div className="hidden items-center gap-5 text-sm font-bold text-[#2d3a2a] md:flex">
            <a href="/">Product Site</a>
            <a href={INVEST_MAILTO}>{INVEST_EMAIL}</a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col items-center justify-center px-4 pb-32 pt-16 text-center sm:px-6">
          <span className="mb-5 inline-flex rounded-full border border-[#1f2a1d]/10 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#3d5638] backdrop-blur">
            Investor Overview · Pre-Seed
          </span>
          <h1 className="max-w-5xl text-[2.7rem] font-semibold leading-[0.92] tracking-[-0.065em] text-[#336443] sm:text-6xl md:text-7xl lg:text-8xl">
            The missing operating layer <span className="text-[#85AB8B]">for the $10T trade economy</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-[#4b5b47] sm:text-lg">
            Setu Flow is the trade execution CRM for the 250,000+ SMB import-export teams stuck between Excel and SAP. Live product. Paying clients. Now raising.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <CTA />
            <a href="#traction" className="rounded-full border border-[#1f2a1d]/15 bg-white/65 px-6 py-3 text-sm font-bold text-[#1f2a1d] backdrop-blur transition hover:bg-white">See traction</a>
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 z-10 mx-auto grid max-w-6xl gap-4 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur md:grid-cols-4 md:p-5">
          {tractionStats.slice(0, 4).map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/60 p-4">
              <div className="text-2xl font-semibold tracking-[-0.04em] text-[#336443]">{value}</div>
              <div className="mt-1 text-xs font-semibold text-[#4b5b47]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="problem" className="bg-white px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="The Problem" title="250,000+ trading companies." accent="Zero purpose-built software." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {problemCards.map(([title, body]) => (
              <article key={title} className="h-full rounded-3xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-7 shadow-sm">
                <h3 className="text-lg font-bold text-[#1f2a1d]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4b5b47]">{body}</p>
              </article>
            ))}
            <article className="h-full rounded-3xl bg-[#1f2a1d] p-7 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#85AB8B]">The Gap</p>
              <p className="mt-4 text-sm leading-relaxed text-white/82">Between free spreadsheets and enterprise implementations, Setu Flow owns the missing middle for SMB trade operators.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="market" className="bg-[#f6f7f4] px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Market · Why Now" title="$2.8B today. $5.7B by 2032." accent="No dominant player for SMB traders." body="Post-COVID digitization is only half-done, India's export mission needs faster quoting, and assistive AI with operator approval is finally enterprise-safe." />
          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {marketStats.map(([value, label]) => (
              <div key={label} className="h-full rounded-3xl border border-[#1f2a1d]/10 bg-white p-7 shadow-sm">
                <div className="text-4xl font-semibold tracking-[-0.06em] text-[#336443]">{value}</div>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-[#4b5b47]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="competitive" className="bg-[#1f2a1d] px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Competitive Landscape" title="Generic CRMs sell pipelines." accent="Trade teams need execution." light />
          <div className="mt-10 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className="py-4 pr-4 text-left text-xs font-bold uppercase tracking-wider text-white/45">Capability</th>
                  {compCols.map((col, index) => (
                    <th key={col} className={`px-3 py-4 text-center text-xs font-bold ${index === compCols.length - 1 ? 'rounded-t-2xl bg-[#85AB8B]/10 text-[#85AB8B]' : 'text-white/55'}`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compRows.map(([cap, ...cells]) => (
                  <tr key={cap} className="border-t border-white/10">
                    <td className="py-4 pr-4 text-sm font-medium text-white/82">{cap}</td>
                    {cells.map((cell, index) => (
                      <td key={`${cap}-${cell}-${index}`} className={`px-3 py-4 text-center text-xs font-bold ${index === cells.length - 1 ? 'bg-[#85AB8B]/10 text-[#85AB8B]' : 'text-white/55'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="traction" className="bg-white px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Traction" title="Live numbers," accent="not projections." body="Every early client was won founder-led, at trade events, with no paid acquisition — capital-efficient validation for early trade software." />
          <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3">
            {tractionStats.map(([value, label]) => (
              <div key={label} className="h-full rounded-3xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-7 shadow-sm">
                <div className="text-4xl font-semibold tracking-[-0.06em] text-[#336443] sm:text-5xl">{value}</div>
                <p className="mt-3 text-xs font-semibold text-[#4b5b47]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-7">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#3d5638]">Clients & active pilots across</p>
            <div className="flex flex-wrap gap-3">
              {['India', 'UAE', 'Ireland', 'United Kingdom', 'Germany', 'United States'].map((country) => (
                <span key={country} className="rounded-full border border-[#1f2a1d]/10 bg-white px-4 py-2 text-sm font-bold text-[#1f2a1d]">{country}</span>
              ))}
            </div>
            <p className="mt-6 text-xs text-[#4b5b47]/75">Revenue detail, cohort data, and the full data room are available with the deck.</p>
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-[#f6f7f4] px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="ML Roadmap" title="The data is already captured." accent="Now it learns." body="Setu Flow audit-logs quotes, approvals, document states, and stage gates. That governed event stream creates training data generic CRMs do not have." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {mlRoadmap.map(([title, body], index) => (
              <article key={title} className="h-full rounded-3xl border border-[#1f2a1d]/10 bg-white p-7 shadow-sm">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#336443]/10 text-lg font-black text-[#336443]">{index + 1}</div>
                <h3 className="text-xl font-bold text-[#1f2a1d]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4b5b47]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="model" className="bg-white px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Business Model" title="SaaS subscription. No implementation fee." accent="High gross margin." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pricingTiers.map(([name, price, cadence, features], index) => (
              <article key={name} className={`h-full rounded-3xl border p-7 shadow-sm ${index === 1 ? 'border-[#1f2a1d] bg-[#1f2a1d] text-white' : 'border-[#1f2a1d]/10 bg-[#f6f7f4] text-[#1f2a1d]'}`}>
                <h3 className="text-xl font-bold">{name}</h3>
                <div className={`mt-5 text-4xl font-semibold tracking-[-0.06em] ${index === 1 ? 'text-[#85AB8B]' : 'text-[#336443]'}`}>{price}</div>
                <p className={`mt-1 text-xs font-semibold ${index === 1 ? 'text-white/58' : 'text-[#4b5b47]'}`}>{cadence}</p>
                <p className={`mt-5 text-sm leading-relaxed ${index === 1 ? 'text-white/78' : 'text-[#4b5b47]'}`}>{features}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="round" className="bg-[#1f2a1d] px-4 py-20 sm:px-6 sm:py-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="The Round" title="Pre-Seed ·" accent="$250K-$500K" light body="Twelve months of execution: scale founder-led traction into a repeatable sales funnel and convert governed trade data into ML capabilities." />
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {useOfFunds.map(([pct, label, detail]) => (
              <div key={label}>
                <div className="mb-2 flex items-end justify-between gap-5"><span className="text-sm font-bold text-white">{label}</span><span className="text-2xl font-semibold tracking-[-0.05em] text-[#85AB8B]">{pct}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#85AB8B]" style={{ width: `${pct}%` }} /></div>
                <p className="mt-2 text-xs text-white/58">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <CTA light>Request the Deck & Data Room</CTA>
            <span className="text-sm text-white/58">{INVEST_EMAIL} · full materials for accredited investors</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#1f2a1d] px-4 py-8 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="text-sm font-bold text-white/82">Setu Flow<sup className="text-[9px]">TM</sup></span>
          <div className="flex flex-wrap items-center gap-6 text-xs text-white/52">
            <a href="/" className="transition hover:text-white/80">setuflowcrm.com</a>
            <a href={INVEST_MAILTO} className="transition hover:text-white/80">{INVEST_EMAIL}</a>
            <span>Confidential — for accredited investors only · June 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
