import type { Metadata } from 'next';
import { SiteShell } from '@/components/marketing/site-shell';
import { RoiCalculatorClient } from './roi-calculator-client';

export const metadata: Metadata = {
  title: 'ROI Calculator — Setu Flow',
  description:
    'Estimate the monthly impact of missed follow-ups, lost trade leads, and manual lead-chasing work with the Setu Flow ROI calculator.',
  alternates: {
    canonical: 'https://www.setuflowcrm.com/roi-calculator',
  },
};

export default function RoiCalculatorPage() {
  return (
    <SiteShell>
      <RoiCalculatorClient />
    </SiteShell>
  );
}
