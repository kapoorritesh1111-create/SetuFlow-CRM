import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/marketing/site-shell';
import { TradeShowTrialForm } from './trade-show-trial-form';

export const metadata: Metadata = {
  title: 'Instant Trade Show Trial | Setu Flow CRM',
  description:
    'Start a guided Setu Flow trade show trial with phone/WhatsApp, trade show context, vCard setup, and export-ready permissions.',
};

const steps = [
  ['01', 'Sign up', 'Name, company, email, phone / WhatsApp, and trade show name.'],
  ['02', 'Workspace opens', 'Your trial org, membership, trade event, and vCard context are provisioned.'],
  ['03', 'Capture-ready', 'Your setup is ready for trade-show capture, product context, and CSV export expansion.'],
];

const includes = ['No credit card', 'No approval wait', 'Trade show context', 'vCard foundation', 'Export-ready entitlement'];

export default function TradeShowTrialPage() {
  return (
    <SiteShell>
      <main className="bg-[radial-gradient(circle_at_top_left,#dff7f2,transparent_36%),linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)]">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-18">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#108477]/20 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#108477] shadow-sm">
              Instant Trade Show Trial
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-[#06263f] sm:text-5xl lg:text-6xl">
              Open a booth-ready Setu Flow workspace before the show floor gets busy.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Launch a focused trial for trade-show lead capture with the required contact fields, default event setup, vCard context, and export-ready permissions. Keep the premium CRM modules controlled until upgrade.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {includes.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map(([number, title, body]) => (
                <div key={number} className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.20em] text-[#108477]">{number}</p>
                  <h2 className="mt-3 text-lg font-black text-[#06263f]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-[#1F487C]/10 bg-white/75 p-5 text-sm leading-7 text-slate-600 shadow-sm">
              Already have access?{' '}
              <Link href="/client-login" className="font-bold text-[#108477] underline-offset-4 hover:underline">
                Enter your workspace
              </Link>{' '}
              and continue from your active organization.
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-4 rounded-3xl border border-[#1F487C]/10 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-bold text-[#06263f]">Required setup fields</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Phone / WhatsApp and trade show name are required so the trial can start with booth-ready context.
              </p>
            </div>
            <TradeShowTrialForm />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
