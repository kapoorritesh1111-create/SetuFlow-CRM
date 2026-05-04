export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';
import { hasSupabaseEnv } from '@/lib/env';

const valueCards = [
  { label: 'Command Center', title: 'See every market, follow-up, quote and blocker before the day starts.' },
  { label: 'Quote Control', title: 'Move from inquiry to governed quote without spreadsheet drift.' },
  { label: 'Digital vCard', title: 'Share your profile, QR and phone-ready contact details from the field.' },
];

export default function ClientLoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(53,159,145,0.18),transparent_28%),linear-gradient(180deg,#f5fbfb_0%,#eef6fb_52%,#ffffff_100%)] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[#061c2e] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(53,159,145,0.34),transparent_30%),radial-gradient(circle_at_88%_25%,rgba(12,127,255,0.20),transparent_36%),linear-gradient(140deg,#061c2e_0%,#0b2e4a_62%,#0f5b67_100%)]" />
          <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:58px_58px]" />
          <div className="relative">
            <Link href="/" className="inline-flex rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={220} height={78} className="h-14 w-auto" priority />
            </Link>
            <p className="mt-12 max-w-2xl text-[3.35rem] font-semibold leading-[1.02] tracking-[-0.055em] xl:text-[4.25rem]">
              Enter the trade execution workspace.
            </p>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/72">
              Capture opportunities, govern quotes, share your digital vCard, and keep execution moving from the same command layer.
            </p>
          </div>

          <div className="relative grid gap-4 xl:grid-cols-3">
            {valueCards.map((card) => (
              <article key={card.label} className="rounded-[1.6rem] border border-white/10 bg-white/[0.08] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7de2d2]">{card.label}</p>
                <p className="mt-3 text-sm leading-6 text-white/78">{card.title}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-[36rem] rounded-[2.2rem] border border-[#1F487C]/10 bg-white/95 p-6 shadow-[0_32px_90px_rgba(31,72,124,0.14)] ring-1 ring-white sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Link href="/">
                  <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={190} height={66} className="h-12 w-auto" priority />
                </Link>
              </div>
              <Link href="/" className="ml-auto rounded-full border border-[#1F487C]/10 px-4 py-2 text-sm font-semibold text-[#1F487C] transition hover:bg-[#eef6fb]">Back to site</Link>
            </div>

            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">Secure workspace login</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">Access your Setu Flow command center</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">Sign in to manage leads, quotes, orders, follow-ups and your shareable digital vCard inside the same trade execution workspace.</p>

            {!hasSupabaseEnv ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Sign-in is not available right now. Please contact help@setugroups.com.
              </div>
            ) : null}

            <div className="mt-7 rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_14px_34px_rgba(31,72,124,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Client workspace</p>
                  <p className="mt-1 text-xs text-slate-500">Role-aware access for commercial teams and leadership</p>
                </div>
                <span className="rounded-full bg-[#359F91]/10 px-3 py-1 text-xs font-semibold text-[#108477]">Protected</span>
              </div>
              <div className="mt-5">
                <LoginForm next={next} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[['Leads', 'Capture faster'], ['Quotes', 'Govern terms'], ['vCard', 'Share contact']].map(([label, detail]) => (
                <div key={label} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(31,72,124,0.04)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#108477]">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
