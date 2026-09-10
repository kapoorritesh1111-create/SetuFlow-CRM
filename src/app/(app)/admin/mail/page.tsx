import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { MailAdminWorkspace } from '@/features/mail/components/mail-admin-workspace';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function AdminMailPage() {
  const { organization } = await requireAdminWorkspace();

  return (
    <AdminSettingsShell
      active="mail"
      organizationName={organization?.name ?? 'Setu Flow'}
      sectionTitle="Setu Mail"
    >
      <MailAdminWorkspace />
    </AdminSettingsShell>
  );
}
