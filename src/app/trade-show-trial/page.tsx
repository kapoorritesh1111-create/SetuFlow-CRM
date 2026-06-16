import type { Metadata } from 'next';
import Link from 'next/link';

import BoomerangVideoBg from '@/components/marketing/boomerang-video-bg';
import { SiteShell } from '@/components/marketing/site-shell';
import { TradeShowTrialForm } from './trade-show-trial-form';

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4';

export const metadata: Metadata = {
  title: 'Instant Trade Show Trial | Setu Flow CRM',
  description:
    'Start a focused Setu Flow trade show workspace with booth capture, digital contact sharing, and CSV export access.',
};

type IconName = 'card' | 'bolt' | 'person' | 'badge' | 'download' | 'screen' | 'chart' | 'scan' | 'folder' | 'arrow';

type Benefit = {
  label: string;
  icon: IconName;
};

type TourStep = {
  number: string;
  title: string;
  body: string;
  icon: IconName;
};

const tourSteps: TourStep[] = [
  { number: '01', title: 'Capture', body: 'Scan, type, or dictate booth conversations.', icon: 'scan' },
  { number: '02', title: 'Organize', body: 'Tag products and interest in real time.', icon: 'folder' },
  { number: '03', title: 'Export', body: 'Send clean buyer lists to CSV.', icon: 'download' },
  { number: '04', title: 'Follow up', body: 'Preview the full CRM and next steps.', icon: 'chart' },
];

const benefits: Benefit[] = [
  { label: 'No credit card', icon: 'card' },
  { label: 'Instant workspace', icon: 'bolt' },
  { label: 'Booth capture', icon: 'person' },
  { label: 'Digital contact card', icon: 'badge' },
  { label: 'CSV export', icon: 'download' },
];

const lowerSteps: TourStep[] = [
  { number: '01', title: 'Create your workspace', body: "Add your event details and we'll prepare your workspace.", icon: 'person' },
  { number: '02', title: 'Capture at the booth', body: 'Use scan, type, or voice to capture every meaningful conversation.', icon: 'scan' },
  { number: '03', title: 'Organize & export', body: 'Organize by products and interest. Export clean buyer lists instantly.', icon: 'folder' },
  { number: '04', title: 'Explore & upgrade', body: 'Preview the full Setu Flow platform and upgrade when ready.', icon: 'badge' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
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

  if (name === 'scan') {
    return (
      <svg {...common}>
        <path d="M7 3H5a2 2 0 0 0-2 2v2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (name === 'folder') {
    return (
      <svg {...common}>
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
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
          <BoomerangVideoBg src={BG_VIDEO} showCrmOverlay={false} className="absolute inset-0 -z-20 h-full w-full" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,30,52,0.96)_0%,rgba(6,30,52,0.82)_42%,rgba(6,30,52,0.56)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(16,132,119,0.45),transparent_32%),radial-gradient(circle_at_78%_4%,rgba(133,171,139,0.2),transparent_30%)]" />

          <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-10">
            <div className="max-w-3xl">
              <div className="inline-flex w-fit items-center rounded-full border border-[#85AB8B]/35 bg-[#108477]/30 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#baf4da] shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:text-xs">
                Instant Trade Show Trial
              </div>

              <h1 className="mt-7 max-w-4xl text-[2.6rem] font-black leading-[0.96] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                Capture booth leads in minutes <span className="text-[#20d996]">— not days.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/86 sm:text-lg sm:leading-8">
                Open a focused Setu Flow workspace for trade show capture, digital contact sharing, CSV export, and guided upgrade previews.
              </p>

              <div className="mt-8 max-w-3xl rounded-[1.8rem] border border-white/18 bg-white/[0.08] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
                <p className="text-sm font-black text-white sm:text-base">Your trial tour in 4 simple steps</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {tourSteps.map((step, index) => (
                    <div key={step.number} className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:border-0 sm:bg-transparent sm:p-0">
                      <div className="flex items-center gap-3 sm:block">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#20d996] ring-1 ring-white/12">
                          <Icon name={step.icon} className="h-5 w-5" />
                        </span>
                        {index < tourSteps.length - 1 ? <span className="hidden text-[#20d996] sm:absolute sm:right-2 sm:top-5 sm:block">→</span> : null}
                        <div>
                          <p className="text-sm font-black text-[#20d996] sm:mt-4">{step.number}</p>
                          <h2 className="mt-1 text-sm font-black text-white sm:text-base">{step.title}</h2>
                          <p className="mt-1 text-xs leading-5 text-white/75 sm:text-sm">{step.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {benefits.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.10] px-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:px-4"
                  >
                    <Icon name={item.icon} className="h-5 w-5 shrink-0 text-[#20d996]" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="mb-4 flex items-start gap-4 rounded-[1.7rem] border border-white/70 bg-white/92 p-4 text-[#06263f] shadow-[0_20px_70px_rgba(0,0,0,0.20)] backdrop-blur-xl sm:p-5">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dff7f2] text-[#108477]">
                  <Icon name="badge" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-lg font-black">Quick setup</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    We prepare your trade show workspace with the right event and contact details.
                  </p>
                </div>
              </div>
              <TradeShowTrialForm />
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#108477]">How your trial tour works</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#06263f] sm:text-4xl">One workspace. Four clear moves.</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {lowerSteps.map((step) => (
                <div key={step.number} className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dff7f2] text-[#108477]">
                    <Icon name={step.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-[#06263f]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
