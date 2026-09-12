import type { Metadata } from 'next';

const SETU_MAIL_ICON = '/icons/setu-mail-source.png';

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
    icon: [{ url: SETU_MAIL_ICON, type: 'image/png', sizes: '1254x1254' }],
    apple: [{ url: SETU_MAIL_ICON, type: 'image/png', sizes: '1254x1254' }],
    shortcut: [SETU_MAIL_ICON],
  },
};
