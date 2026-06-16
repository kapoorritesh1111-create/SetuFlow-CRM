import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/marketing/site-shell';
import { TradeShowTrialForm } from './trade-show-trial-form';

export const metadata: Metadata = {
  title: 'Instant Trade Show Trial | Setu Flow CRM',
  description:
    'Start a focused Setu Flow trade show workspace with booth capture, digital contact sharing, and CSV export access.',
};

type Benefit = {
  label: string;
  icon: 'card' | 'bolt' | 'person' | 'badge' | 'download';
};

type Step = {
  number: string;
  title: string;
  body: string;
  icon: 'person' | 'screen' | 'chart' | 'badge' | 'download';
};

const steps: Step[] = [
  { number: '01', title: 'Capture', body: 'Save booth conversations.', icon: 'screen' },
  { number: '02', title: 'Organize', body: 'Tag buyer interest.', icon: 'badge' },
  { number: '03', title: 'Export', body: 'Download CSV lists.', icon: 'download' },
  { number: '04', title: 'Follow up', body: 'Preview the full CRM.', icon: 'chart' },
];

const includes: Benefit[] = [
  { label: 'No credit card', icon: 'card' },
  { label: 'Instant setup', icon: 'bolt' },
  { label: 'Booth capture', icon: 'person' },
  { label: 'Digital card', icon: 'badge' },
  { label: 'CSV export', icon: 'download' },
];

const lowerSteps: Step[] = [
  { number: '01', title: 'Create your workspace', body: 'Add your event details and we prepare your workspace.', icon: 'person' },
  { number: '02', title: 'Capture at the booth', body: 'Use scan, type, or voice to capture every meaningful conversation.', icon: 'screen' },
  { number: '03', title: 'Organize and export', body: 'Organize by products and interest. Export clean buyer lists instantly.', icon: 'badge' },
  { number: '04', title: 'Explore and upgrade', body: 'Preview the full Setu Flow platform and upgrade when ready.', icon: 'download' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: Benefit['icon'] | Step['icon']; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'card') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === 'bolt') {
    return (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    );
  }

  if (name === 'person') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.6-4 4.3-6 8-6s6.4 2 8 6" />
      </svg>
    );
  }

  if (name === 'badge') {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 8h6" />
        <path d="M9 12h3" />
        <path d="M14 15h1" />
      </svg>
    );
  }

  if (name === 'download') {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === 'screen') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 16v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 20V10" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
    </svg>
  );
}

export default function TradeShowTrialPage() {
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
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(16,132,119,0.26),transparent_32%),radial-gradient(circle_at_76%_8%,rgba(133,171,139,0.12),transparent_32%)]" />

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
                  {steps.map((step, index) => (
                    <div key={step.number} className="relative rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:border-0 sm:bg-transparent sm:p-0">
                      <div className="flex items-center gap-3 sm:block">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#20d996] ring-1 ring-white/12">
                          <Icon name={step.icon} className="h-5 w-5" />
                        </span>
                        {index < steps.length - 1 ? <span className="hidden text-[#20d996] sm:absolute sm:right-1 sm:top-5 sm:block">&rarr;</span> : null}
                        <div>
                          <p className="text-xs font-extrabold text-[#20d996] sm:mt-3">{step.number}</p>
                          <h2 className="mt-1 text-sm font-extrabold text-white">{step.title}</h2>
                          <p className="mt-1 text-xs leading-5 text-white/70">{step.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
                {includes.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.10] px-3 text-center text-xs font-extrabold leading-4 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:text-[0.78rem]"
                  >
                    <Icon name={item.icon} className="h-4 w-4 shrink-0 text-[#20d996]" />
                    {item.label}
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
              {lowerSteps.map((step) => (
                <div key={step.number} className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_18px_48px_rgba(15,23,42,0.055)] sm:text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dff7f2] text-[#108477]">
                    <Icon name={step.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-[#0b2e4a]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
