import { redirect } from 'next/navigation';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export default async function AdminModulesRedirectPage() {
  const context = await requireSetuInternalAdminWorkspace();
  if (context.missingEnv) return null;
  redirect('/admin/client-management');
}
