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

body.${BODY_CLASS} section > div.divide-y.divide-slate-100 {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  padding: 12px !important;
  background: #f6f8fb !important;
}

body.${BODY_CLASS} section > div.divide-y.divide-slate-100 > details {
  overflow: hidden !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
  border-radius: 22px !important;
  background: rgba(255, 255, 255, 0.98) !important;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.045) !important;
}

body.${BODY_CLASS} section > div.divide-y.divide-slate-100 > details > summary {
  border-bottom-color: rgba(226, 232, 240, 0.78) !important;
  background: linear-gradient(90deg, #ffffff 0%, #f8fafc 100%) !important;
}

body.${BODY_CLASS} section > div.divide-y.divide-slate-100 > details + details {
  border-top-width: 1px !important;
}

body.${BODY_CLASS} section > div.divide-y.divide-slate-100 > details svg {
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
