import { MailAdminWorkspace } from '@/features/mail/components/mail-admin-workspace';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function AdminMailPage() {
  await requireAdminWorkspace();
  return <MailAdminWorkspace />;
}
