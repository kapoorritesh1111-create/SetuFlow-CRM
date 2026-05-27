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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex items-start gap-4">
            <img src="/logos/setu-flow-logo.png" alt="Setu Flow" width={48} height={48} className="mt-0.5 rounded-2xl flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-600">Setu Flow · Client Onboarding</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Create your workspace</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Takes about 3 minutes. No login required. Our team reviews every request and provisions your workspace before sending the first admin invite.
              </p>
            </div>
          </div>
        </header>

        {/* Notice */}
        {noticeCopy && (
          <NoticeToast title={noticeCopy.title} description={noticeCopy.description} tone={noticeCopy.tone} />
        )}

        {/* Wizard */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <OnboardingWizard />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          Already invited?{' '}
          <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/client-login">
            Open client login →
          </Link>
        </p>
      </div>
    </main>
  );
}
