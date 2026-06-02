import Link from 'next/link';
import { NoticeToast } from '@/components/ui/notice-toast';
import { OnboardingWizard } from './OnboardingWizard';

export const metadata = {
  title: 'Setu Flow — Create your workspace',
  description: 'Set up your Setu Flow trade CRM workspace. Takes 3 minutes.',
};

const NOTICE_COPY: Record<string, { title: string; description: string; tone: 'warning' | 'success' | 'neutral' }> = {
  'missing-required': { title: 'Required fields missing', description: 'Company name and primary admin email are required to continue.', tone: 'warning' },
  'too-many-submissions': { title: 'Too many submissions', description: 'Please wait a few minutes before submitting again.', tone: 'warning' },
  'storage-pending': { title: 'Setup required', description: 'Apply the onboarding database migration before production intake.', tone: 'neutral' },
};

export default function ClientOnboardingPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const notice = searchParams?.notice;
  const noticeCopy = notice ? NOTICE_COPY[notice] : null;

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(53,159,145,0.14),transparent_30%),linear-gradient(180deg,#f8fcff_0%,#eef6fb_100%)] px-3 py-4 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1240px] space-y-4">
        <header className="sticky top-3 z-30 rounded-[1.5rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logos/setu-flow-logo.png" alt="Setu Flow" width={44} height={44} className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xl font-extrabold tracking-tight text-brand-primary">SetuFlow</p>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-brand-primary">CRM</span>
                </div>
                <p className="hidden text-xs font-semibold text-slate-500 sm:block">Your growth, our flow</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 sm:inline-flex">Setup Progress</span>
              <Link href="/client-login" className="hidden text-sm font-extrabold text-slate-700 hover:text-brand-primary sm:inline-flex">Help Center</Link>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-teal text-xs font-extrabold text-white shadow-[0_12px_24px_rgba(31,72,124,0.20)]">AD</span>
            </div>
          </div>
        </header>

        {noticeCopy && <NoticeToast title={noticeCopy.title} description={noticeCopy.description} tone={noticeCopy.tone} />}

        <OnboardingWizard />

        <p className="pb-2 text-center text-sm text-slate-500">
          Already invited?{' '}
          <Link className="font-extrabold text-brand-primary hover:text-brand-dark" href="/client-login">
            Open client login →
          </Link>
        </p>
      </div>
    </main>
  );
}
