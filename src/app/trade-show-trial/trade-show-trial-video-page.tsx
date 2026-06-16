import { SiteShell } from '@/components/marketing/site-shell';
import { TradeShowTrialForm } from './trade-show-trial-form';

const tourSteps = [
  ['01', 'Capture', 'Save booth conversations.'],
  ['02', 'Organize', 'Tag buyer interest.'],
  ['03', 'Export', 'Download CSV lists.'],
  ['04', 'Follow up', 'Preview the full CRM.'],
] as const;

const benefits = ['No credit card', 'Instant setup', 'Booth capture', 'Digital card', 'CSV export'];

const lowerSteps = [
  ['Create your workspace', 'Add your event details and we prepare your workspace.'],
  ['Capture at the booth', 'Use scan, type, or voice to capture meaningful lead details.'],
  ['Organize and export', 'Organize by products and interest. Export clean buyer lists instantly.'],
  ['Explore and upgrade', 'Preview the full Setu Flow platform and upgrade when ready.'],
] as const;

export function TradeShowTrialVideoPage() {
  return (
    <SiteShell>
      <main className="bg-white">
        <section className="relative isolate overflow-hidden bg-[#061e34] text-white">
          <video
            className="absolute inset-0 -z-30 h-full w-full object-cover"
            src="/marketing/trade-show-trial-tour.mp4.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(6,30,52,0.93)_0%,rgba(6,30,52,0.80)_44%,rgba(6,30,52,0.45)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(16,132,119,0.24),transparent_34%)]" />

          <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
            <div className="max-w-3xl">
              <h1 className="max-w-3xl text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Capture booth leads in minutes <span className="text-[#20d996]">— not days.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/82 sm:text-lg sm:leading-8">
                Open a focused Setu Flow workspace for trade show capture, contact sharing, CSV export, and upgrade previews.
              </p>

              <div className="mt-7 max-w-2xl rounded-[1.6rem] border border-white/16 bg-[#061e34]/42 p-4 shadow-[0_20px_64px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5">
                <p className="text-sm font-extrabold text-white/92 sm:text-base">Your trial tour</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {tourSteps.map(([number, title, body], index) => (
                    <div key={number} className="relative rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:border-0 sm:bg-transparent sm:p-0">
                      {index < tourSteps.length - 1 ? <span className="hidden text-[#20d996] sm:absolute sm:right-1 sm:top-6 sm:block">&rarr;</span> : null}
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold text-[#20d996] ring-1 ring-white/12">
                        {number}
                      </span>
                      <h2 className="mt-3 text-sm font-extrabold text-white">{title}</h2>
                      <p className="mt-1 text-xs leading-5 text-white/70">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
                {benefits.map((label) => (
                  <span key={label} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.10] px-3 text-center text-xs font-extrabold leading-4 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:text-[0.78rem]">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:justify-self-end">
              <TradeShowTrialForm />
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#108477]">How your trial tour works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#0b2e4a] sm:text-4xl">One workspace. Four clear moves.</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {lowerSteps.map(([title, body]) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_18px_48px_rgba(15,23,42,0.055)] sm:text-center">
                  <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#dff7f2] text-sm font-extrabold text-[#108477]">✓</span>
                  <h3 className="mt-5 text-lg font-extrabold text-[#0b2e4a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
