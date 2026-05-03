export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';
import { hasSupabaseEnv } from '@/lib/env';

export default function ClientLoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';

  return (
    <div className="grid min-h-screen bg-[linear-gradient(180deg,#f5fbfb_0%,#eef6fb_50%,#f8fbff_100%)] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden border-r border-[#1F487C]/10 bg-[linear-gradient(180deg,#1F487C_0%,#193769_60%,#359F91_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div>
          <Link href="/">
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={220} height={78} className="h-16 w-auto rounded-md bg-white/10 p-2" priority />
          </Link>
          <p className="mt-10 max-w-2xl text-4xl font-semibold leading-tight xl:text-5xl">
            Log in to the workspace built for live import-export execution.
          </p>
          <p className="mt-4 max-w-xl text-base text-white/80">
            Manage leads, move through structured quoting, monitor global trade activity, and keep commercial work controlled inside one operating system.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">What clients get</p>
            <p className="mt-3 text-lg font-semibold">A buyer-ready commercial workspace</p>
            <p className="mt-2 text-sm text-white/80">Capture, leads, quotes, orders, and visibility designed for trade teams instead of generic CRM usage.</p>
          </div>
          <div className="rounded-[2rem] bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Why it matters</p>
            <p className="mt-3 text-lg font-semibold">Faster quoting with more control</p>
            <p className="mt-2 text-sm text-white/80">Reduce manual work, improve follow-through, and give leadership a clearer view of the business across countries.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_24px_70px_rgba(31,72,124,0.12)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Link href="/">
                <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={200} height={70} className="h-14 w-auto" priority />
              </Link>
            </div>
            <Link href="/" className="ml-auto text-sm font-semibold text-[#1F487C] hover:text-[#193769]">Back to site</Link>
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#359F91]">Client login</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Access your Setu Flow workspace</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Use your company credentials to continue into the platform. This login is presented as the branded front door for clients evaluating or using Setu Flow.</p>
          {!hasSupabaseEnv ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Sign-in is not available right now. Please contact your workspace administrator.
            </div>
          ) : null}
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Customer portal</p>
                <p className="text-xs text-slate-500">Live access for commercial teams and leadership</p>
              </div>
              <span className="rounded-full bg-[#1F487C]/5 px-3 py-1 text-xs font-semibold text-[#1F487C]">Secure sign in</span>
            </div>
            <div className="mt-4">
              <LoginForm next={next} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Leads</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Capture and qualify faster</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Quotes</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Send with structure and control</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Dashboard</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">See where trade is moving</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
