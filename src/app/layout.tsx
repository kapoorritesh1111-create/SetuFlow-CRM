import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistration } from '@/components/shell/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'SETU Flow',
  description: 'Trade execution system for import-export sales teams by SETU Groups',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'SETU Flow', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico']
  }
};
export const viewport: Viewport = {
  themeColor: '#0c7fff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/vendor/font-awesome/css/font-awesome.min.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c7fff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
