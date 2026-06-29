'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BODY_CLASS = 'setu-documents-ui-polish';
const STYLE_ID = 'setu-documents-ui-polish-style';

const polishCss = `
body.${BODY_CLASS} [aria-label="Global workspace filter"] {
  display: none !important;
}

body.${BODY_CLASS} header[style] {
  border-bottom-color: rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035) !important;
}

body.${BODY_CLASS} [style*="font-weight: 800"],
body.${BODY_CLASS} [style*="fontWeight:800"],
body.${BODY_CLASS} [style*="fontWeight: 800"],
body.${BODY_CLASS} [class*="font-extrabold"],
body.${BODY_CLASS} [class*="font-bold"] {
  font-weight: 650 !important;
}

body.${BODY_CLASS} [class*="uppercase"] {
  letter-spacing: 0.08em !important;
}

body.${BODY_CLASS} main div.space-y-5,
body.${BODY_CLASS} main div.space-y-4 {
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(1) {
  order: 2 !important;
  max-height: 1px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(2) {
  order: 2 !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) {
  order: 1 !important;
  padding: 12px !important;
  border-radius: 24px !important;
  background: linear-gradient(90deg, #ffffff 0%, #f8fafc 52%, #ffffff 100%) !important;
  box-shadow: 0 12px 30px rgba(15,23,42,0.045) !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(4) {
  order: 3 !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) form input,
body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) form select,
body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) form button,
body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) form a {
  height: 40px !important;
  border-radius: 14px !important;
  font-size: 12px !important;
  box-shadow: 0 8px 18px rgba(15,23,42,0.04) !important;
}

body.${BODY_CLASS} main div.space-y-5 > section:nth-of-type(3) > div:last-child {
  margin-top: 10px !important;
  border: 1px solid rgba(226,232,240,0.95) !important;
  background: #f8fafc !important;
}

body.${BODY_CLASS} main section.space-y-4 {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

body.${BODY_CLASS} main details {
  border-radius: 22px !important;
  border-color: rgba(148,163,184,0.22) !important;
  box-shadow: 0 14px 34px rgba(15,23,42,0.045) !important;
}

body.${BODY_CLASS} main details summary {
  background: linear-gradient(90deg, #ffffff 0%, #f8fafc 100%) !important;
}

body.${BODY_CLASS} main svg {
  width: 1.08em !important;
  height: 1.08em !important;
}
`;

export function DocumentsUiPolish() {
  const pathname = usePathname();

  useEffect(() => {
    const isDocumentsPage = pathname === '/documents' || pathname.startsWith('/documents/');
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (isDocumentsPage && !style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = polishCss;
      document.head.appendChild(style);
    }

    document.body.classList.toggle(BODY_CLASS, isDocumentsPage);

    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, [pathname]);

  return null;
}
