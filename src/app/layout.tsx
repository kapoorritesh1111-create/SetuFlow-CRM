import './globals.css';
import './marketing-hero-tuning.css';
import './s47-lead-guru-tuning.css';
import './action-contrast-safety.css';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/shell/ServiceWorkerRegistration';
import { LeadsFilterStability } from '@/components/shell/LeadsFilterStability';
import { OfflineStatusBanner } from '@/components/shell/OfflineStatusBanner';
import { ProductsUiPolish } from '@/components/shell/ProductsUiPolish';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

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
  applicationSubCategory: 'Trade Execution OS and Import Export CRM',
  operatingSystem: 'Web, iOS, Android',
  url: 'https://www.setuflowcrm.com',
  description:
    'AI-powered Trade Execution OS for importers, exporters, manufacturers and distributors. Connect market discovery, buyer and supplier CRM, quotations, approvals, documents, orders and dispatch in one platform.',
  featureList: [
    'Growth Center and market opportunity discovery',
    'Buyer and supplier CRM workflows',
    'Quote workflow, pricing and approval readiness',
    'Document compliance and order execution',
    'Production, fulfilment and shipment readiness',
    'Mobile-ready field workflow',
    'Setu Guru contextual trade intelligence with operator approval',
    'Growth, commercial and execution analytics',
  ],
  areaServed: ['India', 'Ireland', 'United Kingdom', 'Germany', 'United States'],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.setuflowcrm.com'),
  title: {
    default: 'Setu Flow — AI-Powered Trade Execution OS',
    template: '%s | Setu Flow',
  },
  description:
    'Setu Flow is the AI-powered Trade Execution OS for importers, exporters, manufacturers and distributors. Manage growth intelligence, buyers, suppliers, quotations, documents, orders and dispatch in one connected platform.',
  keywords: [
    'trade execution OS',
    'trade execution software',
    'import export CRM',
    'CRM for exporters',
    'CRM for importers',
    'export management software',
    'international trade management platform',
    'buyer supplier CRM',
    'quote management software',
    'trade show lead capture',
    'document compliance software',
    'shipment readiness software',
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
    alternateLocale: ['en_US', 'en_IN', 'de_DE'],
    url: 'https://www.setuflowcrm.com',
    siteName: 'Setu Flow',
    title: 'Setu Flow — AI-Powered Trade Execution OS',
    description:
      'Find opportunities, win buyers and execute every order through one connected platform for growth intelligence, Trade CRM, commercial operations and execution.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Setu Flow — AI-Powered Trade Execution OS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Setu Flow — AI-Powered Trade Execution OS',
    description: 'One connected operating system from market opportunity to final dispatch.',
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
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#061e34',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      </head>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        <LeadsFilterStability />
        <OfflineStatusBanner />
        <ProductsUiPolish />
        {children}
      </body>
    </html>
  );
}
