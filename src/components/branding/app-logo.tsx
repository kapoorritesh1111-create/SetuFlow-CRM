import Image from 'next/image';
import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export function AppLogo() {
  return (
    <Link href={PRODUCT_ROUTES.app.dashboard} className="inline-flex items-center" aria-label="SETU Flow home">
      <Image src="/logos/setu-flow-logo.svg" alt="SETU Flow" width={196} height={64} className="h-12 w-auto sm:h-14" priority />
    </Link>
  );
}
