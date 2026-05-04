export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';
import { hasSupabaseEnv } from '@/lib/env';

const points = [
  { label: 'Command center', text: 'One place for leads, quotes, orders, and follow-ups.' },
  { label: 'Quote control', text: 'Move from inquiry to governed quote with less manual work.' },
  { label: 'Digital vCard', text: 'Share your profile, QR, phone, and contact details from the field.' },
];

export default function ClientLoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';

  return (
    <main className="min-h-screen bg-[#f4fafb] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden bg-[#061c2e] px-6 py-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-10 xl:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(53,159,145,0.34),transparent_32%),radial-gradient(circle_at_86%_30%,rgba(12,127,255,0.18),transparent_35%),linear-gradient(145deg,#061c2e_0%,#0b2e4a_58%,#0f5b67_100%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:60px_60px]" />

          <div className="relative flex items-center justify-between">
            <Link href="/" className="inline-flex rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={180} height={64} className="h-12 w-auto" priority />
            </Link>
            <Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/10 lg:hidden">
              Back to site
            </Link>
          </div>

          <div className="relative mt-14 max-w-2xl pb-10 lg:mt-0 lg:pb-0">
            <p className="text-[2.8rem] font-semibold leading-[1.02] tracking-[-0.055em] sm:text-[4rem] lg:text-[4.4rem] xl:text-[5rem]">
              Enter your trade command center.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              Sign in to manage leads, quotes, execution, and your share-ready digital vCard from one polished workspace.
            </p>
          </div>

          <div className="relative hidden gap-4 pb-2 lg:grid xl:grid-cols-3">
            {points.map((card) => (
              <article key={card.label} className="rounded-[1.35rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7de2d2]">{card.label}</p>
                <p className="mt-3 text-sm leading-6 text-white/76">{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-start justify-center px-4 py-6 sm:px-6 sm:py-10 lg:items-center lg:px-10">
          <div className="w-full max-w-[34rem] rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_28px_80px_rgba(31,72,124,0.13)] ring-1 ring-white sm:p-7 lg:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={170} height={60} className="h-11 w-auto" priority />
              </div>
              <Link href="/" className="ml-auto rounded-full border border-[#1F487C]/10 px-4 py-2 text-sm font-semibold text-[#1F487C] transition hover:bg-[#eef6fb]">
                Back to site
              </Link>
            </div>

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">Secure login</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[2.45rem]">
              Access your Setu Flow workspace
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Continue to your private workspace for trade leads, quotes, execution, and vCard sharing.
            </p>

            {!hasSupabaseEnv ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Sign-in is not available right now. Please contact help@setugroups.com.
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_14px_34px_rgba(31,72,124,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Client workspace</p>
                  <p className="mt-1 text-xs text-slate-500">Protected access for your team</p>
                </div>
                <span className="rounded-full bg-[#359F91]/10 px-3 py-1 text-xs font-semibold text-[#108477]">Protected</span>
              </div>
              <div className="mt-5">
                <LoginForm next={next} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[['Leads', 'Capture'], ['Quotes', 'Control'], ['vCard', 'Share']].map(([label, detail]) => (
                <div key={label} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(31,72,124,0.04)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#108477]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
