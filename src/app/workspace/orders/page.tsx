import { redirect } from 'next/navigation';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export const dynamic = 'force-dynamic';

export default function WorkspaceOrdersPage() {
  redirect(PRODUCT_ROUTES.app.orders);
}
