'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getProductDetail } from '@/features/products/api/get-product-detail';
import { ProductDetailDrawer, type DrawerTab } from '@/features/products/components/product-detail-drawer';
import type { ProductDetailResponse } from '@/types/products';

export function ProductPricingDeepLinkDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = pathname === '/products' ? searchParams.get('productId') : null;
  const variantId = pathname === '/products' ? searchParams.get('variantId') : null;
  const requestedTab = searchParams.get('tab');
  const initialTab: DrawerTab = requestedTab === 'variants' ? 'variants' : 'pricing';

  const [detail, setDetail] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getProductDetail(productId));
    } catch (loadError) {
      setDetail(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to open the selected product.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('productId');
    params.delete('variantId');
    params.delete('tab');
    const query = params.toString();
    router.replace(query ? `/products?${query}` : '/products', { scroll: false });
    setDetail(null);
    setError(null);
  };

  if (!productId) return null;

  return (
    <ProductDetailDrawer
      open
      productId={productId}
      detail={detail}
      loading={loading}
      error={error}
      onClose={close}
      onSaved={(updated) => setDetail(updated)}
      initialTab={initialTab}
      focusedVariantId={variantId}
    />
  );
}
