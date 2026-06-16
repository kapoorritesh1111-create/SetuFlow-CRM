import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/marketing/site-shell';

export const metadata: Metadata = {
  title: 'Trade Show Trial Started | Setu Flow CRM',
  description: 'Your Setu Flow trade show trial workspace has been created.',
};

export default function TradeShowTrialSuccessPage({
  searchParams,
}: {
  searchParams?: { email?: string; existing?: string };
}) {
  const email = searchParams?.email;
  const existing = searchParams?.existing === '1';

  return (
    <SiteShell>
      <main className="bg-[radial-gradient(circle_at_top_left,#dff7f2,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#ffffff_80%)]">
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#108477] text-3xl font-black text-white shadow-[0_24px_54px_rgba(16,132,119,0.28)]">
            ✓
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#108477]">Trial workspace created</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#06263f] sm:text-5xl">
            Your Trade Show Trial is ready.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            We created your booth-ready workspace with trade show context, capture tools, vCard setup, export permissions, and guided upgrade previews.
          </p>

          {email && (
            <div className="mt-8 rounded-3xl border border-[#1F487C]/10 bg-white/80 px-6 py-5 text-left shadow-sm">
              <p className="text-sm font-bold text-[#06263f]">Signup email</p>
              <p className="mt-1 text-sm text-slate-600">{email}</p>
              {existing && (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  This email already has a Setu Flow account. Sign in with your existing credentials to enter the new trial workspace.
                </p>
              )}
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/client-login"
              className="rounded-full bg-[#06263f] px-7 py-3 text-sm font-bold text-white shadow-[0_18px_42px_rgba(6,38,63,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a]"
            >
              Enter workspace
            </Link>
            <Link
              href="/trade-show-trial"
              className="rounded-full border border-[#108477]/25 bg-white px-7 py-3 text-sm font-bold text-[#108477] transition hover:-translate-y-0.5 hover:bg-teal-50"
            >
              Start another trial
            </Link>
          </div>

          <p className="mt-8 max-w-xl text-sm leading-7 text-slate-500">
            Start capturing booth conversations now, organize product interest as you go, and review the full Setu Flow platform experience when you are ready to upgrade.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
