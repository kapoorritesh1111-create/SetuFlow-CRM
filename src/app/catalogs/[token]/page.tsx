import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { ExternalLink, FileDown, MessageCircle, Phone } from 'lucide-react';
import { notFound } from 'next/navigation';

import { catalogQuoteMessage, loadPublicCatalog, phoneDigits } from '@/features/catalog-brochures/public-catalog';

export const dynamic = 'force-dynamic';

function safeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const catalog = await loadPublicCatalog(params.token);
  if (!catalog) return { title: 'Catalog' };
  return {
    title: `${catalog.brochure.name} | ${catalog.organization.displayName}`,
    description: catalog.brochure.description || `Product catalog from ${catalog.organization.displayName}`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientCatalogPage({ params }: { params: { token: string } }) {
  const catalog = await loadPublicCatalog(params.token);
  if (!catalog) notFound();

  const { brochure, organization, share } = catalog;
  const contactPhone = organization.contactPhone;
  const whatsappDigits = phoneDigits(organization.whatsappPhone);
  const website = safeWebsite(organization.website);
  const quoteHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(catalogQuoteMessage(brochure.name))}`
    : null;
  const primary = organization.primaryColor || '#0b2e4a';
  const secondary = organization.secondaryColor || '#061c2e';
  const accent = organization.accentColor || '#0c7fff';
  const brandStyle = {
    '--catalog-primary': primary,
    '--catalog-secondary': secondary,
    '--catalog-accent': accent,
  } as CSSProperties;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8" style={brandStyle}>
      <div className="mx-auto max-w-7xl overflow-hidden rounded-hero border border-slate-200 bg-white shadow-hero">
        <header className="px-5 py-5 text-white sm:px-8 sm:py-6" style={{ background: `linear-gradient(135deg, ${secondary}, ${primary})` }}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              {organization.logoStoragePath ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-2 shadow-sm sm:h-16 sm:w-16">
                  <img src={`/catalogs/${share.token}/logo`} alt={organization.logoAltText} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white ring-1 ring-white/20 sm:h-16 sm:w-16">
                  {organization.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{organization.displayName}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{brochure.name}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
                  {brochure.description || `Explore this catalog from ${organization.displayName}.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {contactPhone ? (
                <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
                  <Phone className="h-4 w-4" /> Contact us
                </a>
              ) : null}
              {quoteHref ? (
                <a href={quoteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}>
                  <MessageCircle className="h-4 w-4" /> Request a quote
                </a>
              ) : null}
              <a href={`/catalogs/${share.token}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100">
                <FileDown className="h-4 w-4" /> Open PDF
              </a>
            </div>
          </div>
        </header>

        <section className="bg-slate-50 p-2 sm:p-4">
          <iframe
            title={brochure.name}
            src={`/catalogs/${share.token}/file`}
            className="h-[74vh] min-h-[620px] w-full rounded-2xl border border-slate-200 bg-white"
          />
        </section>

        <section className="border-t border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">Interested in this product range?</p>
              <p className="mt-1 text-sm text-slate-600">Speak with {organization.displayName} or send a quote request on WhatsApp.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {contactPhone ? (
                <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                  <Phone className="h-4 w-4" /> Contact us
                </a>
              ) : null}
              {quoteHref ? (
                <a href={quoteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}>
                  <MessageCircle className="h-4 w-4" /> Request a quote
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs text-slate-500 sm:px-8">
          <span>{organization.contactPhone || organization.contactEmail || organization.displayName}</span>
          {website ? (
            <a href={website.toString()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-950">
              {website.hostname.replace(/^www\./, '')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
