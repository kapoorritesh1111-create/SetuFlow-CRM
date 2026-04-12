import { redirect } from 'next/navigation';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function DeprecatedRouteRedirect() {
  redirect(`${PRODUCT_ROUTES.app.dashboard}?mode=suppliers`);
}
