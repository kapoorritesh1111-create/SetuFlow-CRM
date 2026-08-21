import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.setuflowcrm.com';

const publicRoutes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/platform', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/solutions', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/solutions/import-export-crm', priority: 1, changeFrequency: 'weekly' },
  { path: '/solutions/export-management-software', priority: 1, changeFrequency: 'weekly' },
  { path: '/features/export-quote-management', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features/trade-show-lead-capture', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/compare', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/compare/crm-for-exporters', priority: 1, changeFrequency: 'weekly' },
  { path: '/resources/export-compliance-checklist', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/setu-guru-ai', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/field-mobile', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/book-demo', priority: 0.9, changeFrequency: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
