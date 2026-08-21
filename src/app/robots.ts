import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/smc/',
          '/api/',
          '/dashboard/',
          '/workspace/',
          '/settings/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://www.setuflowcrm.com/sitemap.xml',
    host: 'https://www.setuflowcrm.com',
  };
}
