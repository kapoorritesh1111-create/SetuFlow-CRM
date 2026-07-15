import { ProductOverviewExperience } from '@/components/marketing/product-overview-experience';
import { ProductOverviewLanding } from '@/components/marketing/product-overview-landing';

export const metadata = {
  title: 'Product Overview | Setu Flow CRM',
  description:
    'Explore the complete Setu Flow trade execution journey from opportunity discovery and lead capture through quotes, orders, shipment execution, and growth.',
};

type ProductOverviewPageProps = {
  searchParams?: {
    page?: string;
  };
};

export default function ProductOverviewPage({ searchParams }: ProductOverviewPageProps) {
  const selectedPage = searchParams?.page;

  if (!selectedPage || selectedPage === 'welcome') {
    return <ProductOverviewLanding />;
  }

  return <ProductOverviewExperience />;
}
