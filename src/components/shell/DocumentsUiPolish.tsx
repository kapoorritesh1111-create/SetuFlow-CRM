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
