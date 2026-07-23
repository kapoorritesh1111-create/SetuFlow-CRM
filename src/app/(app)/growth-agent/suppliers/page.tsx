import { SupplierComparisonTable } from '@/features/setu-guru/supplier-comparison-table';
import { compareSuppliers } from '@/lib/setu-guru/supplier-comparison';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function SupplierComparisonPage() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  const suppliers = organizationId ? await compareSuppliers(organizationId) : [];

  return <SupplierComparisonTable suppliers={suppliers} />;
}
