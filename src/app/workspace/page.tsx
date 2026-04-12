import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { redirect } from 'next/navigation';

export default function WorkspaceIndexPage() {
  redirect(PRODUCT_ROUTES.workspace.leads);
}
