import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/shell/ServiceWorkerRegistration';
import { LeadsFilterStability } from '@/components/shell/LeadsFilterStability';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

// ─── Structured Data ─────────────────────────────────────────────────────────

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
  sameAs: [
    'https://www.setuflowcrm.com',
  ],
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
    'Trade execution CRM for import-export teams in India, Ireland, UK, Germany and the US. Manage leads, quotes, approvals, orders and shipment execution in one connected system.',
  featureList: [
    'FOB/CIF/Ex-Factory pricing basis',
    'Live FX locked-rate quoting',
    'Quote versioning with approval gate',
    'Business card OCR lead capture',
    'Trade show batch capture',
    'Mobile-ready field workflow',
    'WhatsApp quote delivery',
    'Country compliance checklist',
    'Digital vCard with QR code',
  ],
  areaServed: [
    { '@type': 'Country', name: 'India', sameAs: 'https://www.wikidata.org/wiki/Q668' },
    { '@type': 'Country', name: 'Ireland', sameAs: 'https://www.wikidata.org/wiki/Q27' },
    { '@type': 'Country', name: 'United Kingdom', sameAs: 'https://www.wikidata.org/wiki/Q145' },
    { '@type': 'Country', name: 'Germany', sameAs: 'https://www.wikidata.org/wiki/Q183' },
    { '@type': 'Country', name: 'United States', sameAs: 'https://www.wikidata.org/wiki/Q30' },
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '199',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '199',
        priceCurrency: 'USD',
        unitText: 'MONTH',
      },
    },
    {
      '@type': 'Offer',
      name: 'Growth',
      price: '499',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '499',
        priceCurrency: 'USD',
        unitText: 'MONTH',
      },
    },
  ],
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL('https://www.setuflowcrm.com'),

  title: {
    default: 'Setu Flow — Trade Execution CRM for Import-Export Teams',
    template: '%s | Setu Flow',
  },

  description:
    'Setu Flow is the trade execution CRM built for import-export teams in India, Ireland, UK, Germany and the US. Manage leads, quotes, approvals, orders and shipment execution in one connected system. Operational in under 5 days.',

  keywords: [
    'trade execution CRM',
    'import export CRM',
    'CRM for exporters',
    'CRM for importers',
    'trade operations software',
    'international trade CRM',
    'export management software',
    'B2B trade CRM',
    'quote management CRM',
    'FOB CIF pricing software',
    'trade show lead capture',
    'shipment tracking CRM',
    'FX rate locked quoting',
    'export compliance CRM',
    'approval workflow CRM',
    'trade CRM India',
    'export CRM India',
    'import export software India',
    'CRM for Indian exporters',
    'EXIM CRM India',
    'B2B CRM India',
    'export management India',
    'trade software for SMEs India',
    'trade CRM Ireland',
    'export CRM Ireland',
    'import export software Ireland',
    'CRM for Irish exporters',
    'trade software Ireland',
    'SME export CRM Ireland',
    'trade CRM UK',
    'export management software UK',
    'import export CRM United Kingdom',
    'CRM for UK exporters',
    'trade execution software UK',
    'B2B CRM UK',
    'trade CRM Germany',
    'export management software Germany',
    'import export CRM Deutschland',
    'CRM for German exporters',
    'Handelssoftware exporteur',
    'B2B CRM Germany',
    'trade CRM USA',
    'export management software United States',
    'import export CRM America',
    'CRM for US exporters',
    'trade software United States',
    'B2B trade software USA',
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
      'From first contact to final shipment, Setu Flow runs your entire trade operation in one connected system. Built for teams in India, Ireland, UK, Germany and the US. Operational in days — not months.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Setu Flow — Trade Execution CRM for import-export teams',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Setu Flow — Trade Execution CRM for Import-Export Teams',
    description: 'From first contact to final shipment, Setu Flow runs your entire trade operation in one connected system.',
    images: ['/og-image.png'],
  },

  alternates: {
    canonical: 'https://www.setuflowcrm.com',
  },

  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'SETU Flow', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0c7fff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/vendor/font-awesome/css/font-awesome.min.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c7fff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, softwareSchema]),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <LeadsFilterStability />
        {children}
      </body>
    </html>
  );
}
