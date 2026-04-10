import type { ReactNode } from 'react';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminWorkspace();
  return children;
}
