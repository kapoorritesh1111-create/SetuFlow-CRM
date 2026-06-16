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
  icon: 'person' | 'screen' | 'chart';
};

const steps: Step[] = [
  { number: '01', title: 'Sign up', body: 'Add your company and event details.', icon: 'person' },
  { number: '02', title: 'Workspace opens', body: 'Your capture workspace is ready.', icon: 'screen' },
  { number: '03', title: 'Capture & follow up', body: 'Collect leads and prep next steps.', icon: 'chart' },
];

const includes: Benefit[] = [
  { label: 'No credit card', icon: 'card' },
  { label: 'Instant setup', icon: 'bolt' },
  { label: 'Booth capture', icon: 'person' },
  { label: 'Digital card', icon: 'badge' },
  { label: 'CSV export', icon: 'download' },
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
      <main className="bg-[radial-gradient(circle_at_top_left,#dff7f2,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#ffffff_76%)]">
        <section className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_0.86fr] lg:gap-12 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#108477]/20 bg-white/85 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#108477] shadow-[0_10px_26px_rgba(15,23,42,0.06)] sm:text-xs">
              Instant Trade Show Trial
            </div>
            <h1 className="max-w-3xl text-[2.45rem] font-black leading-[0.98] tracking-[-0.045em] text-[#06263f] sm:text-5xl lg:text-6xl">
              Open your trade show capture workspace in minutes.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Capture booth leads, organize buyer interest, and start follow-up fast. Upgrade to the full platform when your team is ready.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {includes.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-[#06263f] shadow-[0_12px_26px_rgba(15,23,42,0.06)] sm:px-4"
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0 text-[#108477]" />
                  {item.label}
                </span>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/85 shadow-[0_18px_42px_rgba(15,23,42,0.07)] backdrop-blur sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-4 sm:border-0 sm:bg-transparent sm:shadow-none">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0 sm:block sm:rounded-3xl sm:border sm:border-white/70 sm:bg-white/85 sm:p-5 sm:shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:backdrop-blur"
                >
                  <div className="flex items-center gap-4 sm:gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dff7f2] text-sm font-black text-[#108477] sm:h-12 sm:w-12">
                      {step.number}
                    </span>
                    <Icon name={step.icon} className="hidden h-8 w-8 text-[#1F487C]/75 sm:block" />
                  </div>
                  <div>
                    <h2 className={index === 0 ? 'text-lg font-black text-[#06263f] sm:mt-4' : 'text-lg font-black text-[#06263f] sm:mt-4'}>{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-3xl border border-[#1F487C]/10 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-[0_16px_38px_rgba(15,23,42,0.06)] sm:mt-8 sm:p-5 sm:text-base">
              <span>
                Already have access?{' '}
                <Link href="/client-login" className="font-black text-[#108477] underline-offset-4 hover:underline">
                  Enter your workspace
                </Link>
              </span>
              <span className="text-2xl font-black text-[#108477]" aria-hidden>
                ›
              </span>
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-4 flex items-start gap-4 rounded-[1.7rem] border border-[#1F487C]/10 bg-white/75 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dff7f2] text-[#108477]">
                <Icon name="badge" className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-black text-[#06263f]">Quick setup</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  We prepare your trade show workspace with the right event and contact details.
                </p>
              </div>
            </div>
            <TradeShowTrialForm />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
