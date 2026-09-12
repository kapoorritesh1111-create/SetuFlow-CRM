import type { Metadata } from 'next';

export const SETU_MAIL_APP_METADATA: Metadata = {
  applicationName: 'SETU Mail',
  title: {
    default: 'SETU Mail',
    template: '%s | SETU Mail',
  },
  description: 'Mail, calendar and people for SETU Flow.',
  manifest: '/setu-mail-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'SETU Mail',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/setu-mail-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/setu-mail-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icons/setu-mail-apple-touch.png', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/icons/setu-mail-192.png'],
  },
};
