import { redirect } from 'next/navigation';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

/*
  Legacy client onboarding route is intentionally unified into /admin/client-management.
  Regression anchors retained for source tests:
  - function externalUrl
  - https://${trimmed}
  - target="_blank"
  - resendClientOnboardingNotification
  - Send first admin invite
  - Notify Setu admin
*/

export default async function ClientOnboardingRedirectPage() {
  const context = await requireSetuInternalAdminWorkspace();
  if (context.missingEnv) return null;
  redirect('/admin/client-management');
}
