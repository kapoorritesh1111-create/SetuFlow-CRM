import { IcpSetupWizard } from '@/features/setu-guru/icp-setup-wizard';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function IcpSetupPage() {
  await requireWorkspace();

  return <IcpSetupWizard />;
}
