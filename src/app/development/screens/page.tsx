import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { redirect } from 'next/navigation';

export default function DevelopmentScreensIndexPage() {
  redirect(PRODUCT_ROUTES.development.screens);
}
