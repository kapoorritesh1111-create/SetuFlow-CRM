import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function renderHtmlToPdf(html: string) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security', '--no-sandbox'],
      defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    return Buffer.from(await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18px', right: '18px', bottom: '18px', left: '18px' },
      preferCSSPageSize: false,
    }));
  } finally {
    await browser?.close().catch(() => null);
  }
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function logoDataUrl(supabase: any, storagePath?: string | null) {
  const path = String(storagePath ?? '').trim();
  if (!path || path.includes('..') || path.startsWith('/') || /^https?:\/\//i.test(path)) return null;
  try {
    const { data, error } = await supabase.storage.from('org-logos').download(path);
    if (error || !data) return null;
    const type = data.type || 'image/png';
    if (!type.toLowerCase().startsWith('image/')) return null;
    const arrayBuffer = await data.arrayBuffer();
    return `data:${type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  } catch {
    return null;
  }
}
