import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SETU Flow',
  description: 'Trade execution system for import-export sales teams by SETU Groups',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/vendor/font-awesome/css/font-awesome.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
