'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function routeKind(pathname: string) {
  if (/^\/leads\/[^/]+\/quote/.test(pathname)) return 'quote';
  if (/^\/leads\/[^/]+/.test(pathname)) return 'lead';
  return 'other';
}

export function S47FinalUiPolish() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.s47Route = routeKind(pathname);

    const synchronizeCatalogMode = (event: MouseEvent) => {
      if (pathname !== '/products') return;
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (!button) return;
      const label = (button.textContent ?? '').trim().toLowerCase();
      if (label === 'pricing view' || label === 'pricing calculator') {
        event.preventDefault();
        window.location.href = '/products?mode=pricing';
      }
      if (label === 'products') {
        const url = new URL(window.location.href);
        if (url.searchParams.get('mode') === 'pricing') {
          event.preventDefault();
          window.location.href = '/products?mode=products';
        }
      }
    };

    document.addEventListener('click', synchronizeCatalogMode, true);
    return () => {
      delete document.body.dataset.s47Route;
      document.removeEventListener('click', synchronizeCatalogMode, true);
    };
  }, [pathname]);

  return (
    <style jsx global>{`
      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 {
        background: linear-gradient(135deg, #0b2e4a 0%, #0f4c5c 56%, #0c7fff 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.16) !important;
        box-shadow: 0 18px 44px rgba(11, 46, 74, 0.18) !important;
      }

      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 h1,
      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 p,
      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 span,
      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 a {
        color: #ffffff !important;
        opacity: 1 !important;
      }

      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 a {
        background: rgba(255, 255, 255, 0.12) !important;
        border-color: rgba(255, 255, 255, 0.34) !important;
      }

      body[data-s47-route='quote'] section.rounded-panel.bg-gradient-to-r.from-surface-app.via-surface-1.to-blue-700 a:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }

      body[data-s47-route='lead'] main .rounded-hero,
      body[data-s47-route='lead'] main .rounded-panel {
        color: #0f172a;
      }

      body[data-s47-route='lead'] main .rounded-hero h1,
      body[data-s47-route='lead'] main .rounded-hero h2,
      body[data-s47-route='lead'] main .rounded-panel h1,
      body[data-s47-route='lead'] main .rounded-panel h2,
      body[data-s47-route='lead'] main .rounded-panel h3 {
        color: #0f172a !important;
        letter-spacing: -0.015em;
      }

      body[data-s47-route='lead'] main .text-slate-400 {
        color: #64748b !important;
      }

      body[data-s47-route='lead'] main .text-slate-500,
      body[data-s47-route='lead'] main .text-slate-600 {
        color: #475569 !important;
      }

      body[data-s47-route='lead'] main input,
      body[data-s47-route='lead'] main select,
      body[data-s47-route='lead'] main textarea {
        color: #1e293b !important;
        background-color: #ffffff !important;
      }

      @media (prefers-reduced-motion: reduce) {
        #setu-growth-center-topbar-host a {
          transition: none !important;
          transform: none !important;
        }
      }
    `}</style>
  );
}
