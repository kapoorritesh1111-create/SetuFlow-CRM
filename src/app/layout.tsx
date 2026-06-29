import './globals.css';
import './marketing-hero-tuning.css';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/shell/ServiceWorkerRegistration';
import { LeadsFilterStability } from '@/components/shell/LeadsFilterStability';
import { OfflineStatusBanner } from '@/components/shell/OfflineStatusBanner';
import { DocumentsUiPolish } from '@/components/shell/DocumentsUiPolish';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Setu Groups',
  url: 'https://www.setuflowcrm.com',
  logo: 'https://www.setuflowcrm.com/logos/setu-flow-logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'help@setugroups.com',
    contactType: 'customer support',
    areaServed: ['IN', 'IE', 'GB', 'DE', 'US'],
    availableLanguage: 'English',
  },
  sameAs: ['https://www.setuflowcrm.com'],
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Setu Flow',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'CRM',
  operatingSystem: 'Web, iOS, Android',
  url: 'https://www.setuflowcrm.com',
  description:
    'Trade execution CRM for import-export teams. Manage leads, quotes, approvals, documents, orders and shipment execution in one connected system.',
  featureList: [
    'Visual product walkthroughs',
    'Lead capture and follow-up workflows',
    'Quote workflow and approval readiness',
    'Order execution and shipment readiness',
    'Mobile-ready field workflow',
    'Setu Guru AI assistant with operator approval',
    'Document tracking and workflow visibility',
    'Trade team collaboration',
  ],
  areaServed: ['India', 'Ireland', 'United Kingdom', 'Germany', 'United States'],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.setuflowcrm.com'),
  title: {
    default: 'Setu Flow — Trade Execution CRM for Import-Export Teams',
    template: '%s | Setu Flow',
  },
  description:
    'Setu Flow is the trade execution CRM built for import-export teams. Explore visual product walkthroughs for lead capture, quote control, approvals, documents, orders and shipment readiness.',
  keywords: [
    'trade execution CRM',
    'import export CRM',
    'CRM for exporters',
    'CRM for importers',
    'trade operations software',
    'international trade CRM',
    'quote management CRM',
    'trade show lead capture',
    'shipment tracking CRM',
    'approval workflow CRM',
  ],
  authors: [{ name: 'Setu Groups', url: 'https://www.setuflowcrm.com' }],
  creator: 'Setu Groups',
  publisher: 'Setu Groups',
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    alternateLocale: ['en_US', 'en_IN', 'en_DE'],
    url: 'https://www.setuflowcrm.com',
    siteName: 'Setu Flow',
    title: 'Setu Flow — Trade Execution CRM for Import-Export Teams',
    description:
      'Explore visual product walkthroughs of how trade teams manage leads, quotes, approvals, documents, orders and shipment readiness in one connected system.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Setu Flow — Trade Execution CRM for import-export teams' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Setu Flow — Trade Execution CRM for Import-Export Teams',
    description: 'Visual product walkthroughs of trade execution workflows for import-export teams.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://www.setuflowcrm.com' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'SETU Flow', statusBarStyle: 'black-translucent', startupImage: ['/api/workspace/favicon'] },
  icons: {
    icon: [{ url: '/api/workspace/favicon' }, { url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/api/workspace/favicon', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/api/workspace/favicon'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0c7fff',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <html lang="en" dir="ltr" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c7fff" />
        <meta name="google" content="notranslate" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="SETU Flow" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationSchema, softwareSchema]) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <LeadsFilterStability />
        <OfflineStatusBanner />
        <DocumentsUiPolish />
        {children}
      </body>
    </html>
  );
}
