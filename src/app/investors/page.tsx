import type { Metadata } from 'next';
import { InvestorOverviewPage } from '@/components/marketing/investor-overview-page';

export const metadata: Metadata = {
  title: 'Setu Flow — Investor Overview | Pre-Seed',
  description:
    'Setu Flow is the trade execution CRM for the 250,000+ SMB import-export teams stuck between Excel and SAP. 5 paying clients, CAC under $200. Raising a $250K–$500K pre-seed.',
  alternates: { canonical: '/investors' },
  openGraph: {
    title: 'Investor Overview — Setu Flow Pre-Seed',
    description:
      'The missing operating layer for SMB import-export teams stuck between Excel and enterprise trade software.',
    url: '/investors',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Setu Flow investor overview' }],
  },
};

export default function InvestorsPage() {
  return <InvestorOverviewPage />;
}
