import type { Metadata } from 'next';
import { InvestorOverviewPage } from '@/components/marketing/investor-overview-page';

export const metadata: Metadata = {
  title: 'Investor Overview — Setu Flow Pre-Seed',
  description:
    'Setu Flow investor overview for the pre-seed round: trade execution CRM for SMB import-export teams, live traction, market thesis, and ML roadmap.',
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
