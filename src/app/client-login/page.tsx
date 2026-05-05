import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';
import { hasSupabaseEnv } from '@/lib/env';

// ─── SEO metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Sign In — Setu Flow Trade Execution Workspace',
  description:
    'Access your Setu Flow trade execution workspace. Manage leads, quotes, approvals and orders for import-export operations. Active across India, Ireland, UK, Germany and the United States.',
  keywords: [
    'Setu Flow login', 'trade CRM login', 'Setu Flow workspace',
    'trade execution CRM access', 'import export CRM sign in',
  ],
  openGraph: {
    title: 'Sign In to Setu Flow — Trade Execution CRM',
    description:
      'Access your private trade execution workspace for leads, quotes, orders, compliance and digital vCard sharing.',
    url: 'https://www.setuflowcrm.com/client-login',
    siteName: 'Setu Flow',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Setu Flow — Trade Execution CRM' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In to Setu Flow',
    description: 'Access your private trade execution workspace.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://www.setuflowcrm.com/client-login' },
};

// ─── Feature points ───────────────────────────────────────────────────────────
const points = [
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/>
      </svg>
    ),
    label: 'Command Center',
    text: 'Live pipeline, market map, blocked revenue and follow-up queue in one view.',
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h6"/>
        <path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
      </svg>
    ),
    label: 'Quote Control',
    text: 'Move from inquiry to governed quote with FOB pricing, FX and approval gates.',
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/>
        <path d="M14 14h2"/><path d="M18 14h2v2"/><path d="M14 18h6"/><path d="M14 20h2"/>
      </svg>
    ),
    label: 'Digital vCard',
    text: 'Share your profile, QR and contact details. Leads flow back into your workspace.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientLoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';

  return (
    <main
      className="min-h-screen bg-[#061c2e] text-slate-950"
      style={{ fontFamily: "'Plus Jakarta Sans', var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1fr_1.12fr]">

        {/* ═══════════════════════════════════════════════════════
            LEFT — brand panel (dark, full height)
        ═══════════════════════════════════════════════════════ */}
        <section className="relative flex flex-col overflow-hidden bg-[#061c2e] text-white">

          {/* Background — dramatic directional gradient, no grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(53,159,145,0.40),transparent_52%),radial-gradient(ellipse_60%_50%_at_100%_10%,rgba(12,127,255,0.22),transparent_48%),linear-gradient(170deg,#061c2e_0%,#08314e_55%,#061c2e_100%)]" />

          {/* Thin luminous top edge */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7de2d2]/50 to-transparent" />

          {/* ── Top nav row ── */}
          <div className="relative flex items-center justify-between px-7 pb-0 pt-7 sm:px-10 lg:px-10">
            <Link href="/" className="flex items-center" aria-label="Setu Flow — go to homepage">
              <Image
                src="/logos/setu-flow-logo.png"
                alt="Setu Flow"
                width={180}
                height={56}
                className="h-[46px] w-auto brightness-0 invert"
                priority
              />
            </Link>
            {/* Back to site — shown on mobile only (desktop gets it in the form card) */}
            <Link
              href="/"
              className="rounded-full border border-white/18 px-4 py-2 text-[13px] font-semibold text-white/72 transition hover:bg-white/10 lg:hidden"
            >
              ← Back to site
            </Link>
          </div>

          {/* ── Hero copy ── */}
          <div className="relative flex-1 px-7 pb-6 pt-10 sm:px-10 sm:pt-12 lg:px-10 lg:pt-16">

            {/* Category pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7de2d2]/28 bg-[#7de2d2]/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#7de2d2]">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 17c2.5-4 5.2-6 8-6s5.5 2 8 6"/><path d="M4 17h16"/>
                <path d="M7 17v-4"/><path d="M12 17v-6"/><path d="M17 17v-4"/>
              </svg>
              Trade Execution CRM
            </div>

            {/* Headline */}
            <h1 className="mt-5 text-[2.4rem] font-bold leading-[0.97] tracking-[-0.045em] sm:text-[3.2rem] lg:text-[3.8rem]">
              Enter your trade<br />command center.
            </h1>

            {/* Subline */}
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/62 sm:text-base">
              Sign in to manage leads, quotes, execution, and your share-ready digital vCard from one workspace.
            </p>

            {/* Dashboard mini preview — desktop only */}
            <div className="relative mt-10 hidden lg:block">
              <div className="absolute -inset-3 rounded-[1.4rem] bg-[#7de2d2]/8 blur-xl" />
              <div className="relative overflow-hidden rounded-[1.2rem] border border-white/14 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.40)]">
                {/* Mini browser bar */}
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
                  {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
                    <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, opacity: 0.8 }} />
                  ))}
                  <span className="ml-2 text-[9px] font-medium text-white/30">Command Center · Live</span>
                </div>
                <Image
                  src="/marketing/dashboard-command-center.png"
                  alt="Setu Flow command center dashboard"
                  width={1628}
                  height={963}
                  className="h-[140px] w-full object-cover object-top opacity-60"
                />
                {/* Overlay gradient on preview */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#061c2e]/80 via-transparent to-transparent" />
                {/* Stats overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  {[['46','Open Leads'],['$1.05M','Pipeline'],['34','Follow-ups']].map(([v,l]) => (
                    <div key={l}>
                      <p className="text-[15px] font-bold text-[#7de2d2]">{v}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-white/45">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── Feature cards — desktop bottom of left panel ── */}
          <div className="relative hidden gap-3 px-10 pb-9 lg:grid lg:grid-cols-3">
            {points.map(card => (
              <div key={card.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.065] p-4 backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/10 text-[#7de2d2]">
                  {card.icon}
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7de2d2]">{card.label}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-white/62">{card.text}</p>
              </div>
            ))}
          </div>

          {/* Markets strip — bottom of left panel */}
          <div className="relative border-t border-white/[0.07] px-7 py-4 sm:px-10 lg:px-10">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.20em] text-white/28">Active in</span>
              {['India','Ireland','United Kingdom','Germany','United States'].map((m,i,a) => (
                <span key={m} className="flex items-center gap-1">
                  <span className="text-[12px] font-medium text-white/42">{m}</span>
                  {i < a.length-1 && <span className="text-white/18 text-[12px]">·</span>}
                </span>
              ))}
            </div>
          </div>

        </section>

        {/* ═══════════════════════════════════════════════════════
            RIGHT — form panel
            Mobile: sits below the dark brand section
            Desktop: full-height white/light panel, centered form
        ═══════════════════════════════════════════════════════ */}
        <section className="flex flex-col bg-[#f0f6fb] px-4 py-8 sm:px-8 sm:py-10 lg:items-center lg:justify-center lg:px-12 lg:py-12">

          {/* Form card */}
          <div className="w-full max-w-[26rem] rounded-[1.75rem] border border-[#1F487C]/10 bg-white shadow-[0_24px_80px_rgba(31,72,124,0.12),0_0_0_1px_rgba(31,72,124,0.04)]">

            {/* Card top bar — logo (mobile) + back to site (desktop) */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              {/* Logo — only shown on mobile (desktop has it in left panel) */}
              <div className="lg:hidden">
                <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={140} height={44} className="h-9 w-auto" />
              </div>
              {/* Spacer for desktop so back-link goes to the right */}
              <div className="hidden lg:block" />
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-full border border-[#1F487C]/12 px-4 py-2 text-[12px] font-semibold text-[#1F487C] transition hover:bg-[#eef6fb]"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
                </svg>
                Back to site
              </Link>
            </div>

            {/* Form body */}
            <div className="px-6 pb-6 pt-5 sm:px-7 sm:pb-7">

              {/* Eyebrow */}
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#108477]">Secure login</p>

              {/* Title */}
              <h2 className="mt-3 text-[1.7rem] font-bold leading-[1.1] tracking-[-0.04em] text-slate-950 sm:text-[1.9rem]">
                Access your workspace
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                Your private command center for trade leads, quotes, execution and vCard sharing.
              </p>

              {/* Supabase unavailable warning */}
              {!hasSupabaseEnv && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Sign-in is not available right now. Please contact{' '}
                  <a href="mailto:help@setugroups.com" className="font-semibold underline">help@setugroups.com</a>.
                </div>
              )}

              {/* Workspace indicator */}
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">Client workspace</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Protected access for your team</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#359F91]/12 px-3 py-1 text-[11px] font-bold text-[#108477]">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                    <path d="m9 12 2 2 4-5"/>
                  </svg>
                  Protected
                </span>
              </div>

              {/* Form */}
              <div className="mt-5">
                <LoginForm next={next} />
              </div>

            </div>

            {/* Card footer — quick-access pills */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
              {[['Leads', 'Capture'], ['Quotes', 'Control'], ['vCard', 'Share']].map(([label, detail]) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#108477]">{label}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-slate-700">{detail}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Below-card note */}
          <p className="mt-5 max-w-[26rem] text-center text-[12px] leading-5 text-slate-400">
            Don&apos;t have a workspace? Contact your trade team admin or{' '}
            <a href="mailto:help@setugroups.com" className="font-semibold text-[#1F487C] underline-offset-2 hover:underline">
              reach us at help@setugroups.com
            </a>
          </p>

        </section>

      </div>
    </main>
  );
}
