'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BODY_CLASS = 'setu-products-ui-polish';
const STYLE_ID = 'setu-products-ui-polish-style';

const polishCss = `
body.${BODY_CLASS} {
  background: #f4f7fb !important;
  color: #172033 !important;
}

body.${BODY_CLASS} [style] {
  font-family: var(--font-jakarta), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  letter-spacing: normal !important;
}

body.${BODY_CLASS} header[style] {
  border-bottom-color: rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04) !important;
}

body.${BODY_CLASS} h1,
body.${BODY_CLASS} h2,
body.${BODY_CLASS} h3,
body.${BODY_CLASS} h4,
body.${BODY_CLASS} [style*="font-weight: 800"],
body.${BODY_CLASS} [style*="fontWeight:800"],
body.${BODY_CLASS} [style*="fontWeight: 800"] {
  font-weight: 650 !important;
}

body.${BODY_CLASS} [style*="font-weight: 700"],
body.${BODY_CLASS} [style*="fontWeight:700"],
body.${BODY_CLASS} [style*="fontWeight: 700"] {
  font-weight: 600 !important;
}

body.${BODY_CLASS} [style*="font-size: 24px"],
body.${BODY_CLASS} [style*="fontSize:24px"],
body.${BODY_CLASS} [style*="fontSize: 24px"] {
  font-size: 22px !important;
  line-height: 1.1 !important;
}

body.${BODY_CLASS} [style*="font-size: 16px"],
body.${BODY_CLASS} [style*="fontSize:16px"],
body.${BODY_CLASS} [style*="fontSize: 16px"] {
  font-size: 15px !important;
}

body.${BODY_CLASS} button[style],
body.${BODY_CLASS} select[style],
body.${BODY_CLASS} input[style],
body.${BODY_CLASS} textarea[style] {
  border-color: rgba(148, 163, 184, 0.22) !important;
  box-shadow: none !important;
}

body.${BODY_CLASS} button[style] {
  border-radius: 999px !important;
  font-weight: 580 !important;
}

body.${BODY_CLASS} select[style],
body.${BODY_CLASS} input[style],
body.${BODY_CLASS} textarea[style] {
  background: rgba(248, 250, 252, 0.72) !important;
  color: #172033 !important;
  font-size: 12px !important;
}

body.${BODY_CLASS} [style*="text-transform: uppercase"],
body.${BODY_CLASS} [style*="textTransform:uppercase"],
body.${BODY_CLASS} [style*="textTransform: uppercase"] {
  letter-spacing: 0.08em !important;
  font-weight: 600 !important;
}

body.${BODY_CLASS} [style*="border-radius: 16px"],
body.${BODY_CLASS} [style*="borderRadius:16px"],
body.${BODY_CLASS} [style*="borderRadius: 16px"] {
  border-radius: 20px !important;
}

body.${BODY_CLASS} [style*="box-shadow"],
body.${BODY_CLASS} [style*="boxShadow"] {
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.045) !important;
}

body.${BODY_CLASS} [style*="border: 1px solid #e2e8f0"],
body.${BODY_CLASS} [style*="border:'1px solid #e2e8f0'"],
body.${BODY_CLASS} [style*="border-color: rgb(226, 232, 240)"] {
  border-color: rgba(148, 163, 184, 0.2) !important;
}

body.${BODY_CLASS} [style*="background: white"],
body.${BODY_CLASS} [style*="background:'white'"],
body.${BODY_CLASS} [style*="background-color: white"] {
  background: rgba(255, 255, 255, 0.92) !important;
}

body.${BODY_CLASS} [style*="background: #f8fafc"],
body.${BODY_CLASS} [style*="background:'#f8fafc'"],
body.${BODY_CLASS} [style*="background-color: rgb(248, 250, 252)"] {
  background: rgba(248, 250, 252, 0.72) !important;
}

body.${BODY_CLASS} [style*="color: #0c7fff"],
body.${BODY_CLASS} [style*="color:'#0c7fff'"],
body.${BODY_CLASS} [style*="color: rgb(12, 127, 255)"] {
  color: #176b87 !important;
}

body.${BODY_CLASS} [style*="color: #0f172a"],
body.${BODY_CLASS} [style*="color:'#0f172a'"],
body.${BODY_CLASS} [style*="color: rgb(15, 23, 42)"] {
  color: #172033 !important;
}

body.${BODY_CLASS} [style*="color: #94a3b8"],
body.${BODY_CLASS} [style*="color:'#94a3b8'"],
body.${BODY_CLASS} [style*="color: rgb(148, 163, 184)"] {
  color: #7b8aa0 !important;
}

body.${BODY_CLASS} [style*="background: #0b2e4a"],
body.${BODY_CLASS} [style*="background:'#0b2e4a'"],
body.${BODY_CLASS} [style*="background-color: rgb(11, 46, 74)"] {
  background: linear-gradient(135deg, #0b2e4a, #0f766e) !important;
}

body.${BODY_CLASS} [style*="background: #0c7fff"],
body.${BODY_CLASS} [style*="background:'#0c7fff'"],
body.${BODY_CLASS} [style*="background-color: rgb(12, 127, 255)"] {
  background: #0f766e !important;
}

body.${BODY_CLASS} [style*="grid-template-columns: repeat(5"],
body.${BODY_CLASS} [style*="gridTemplateColumns:repeat(5"],
body.${BODY_CLASS} [style*="gridTemplateColumns: repeat(5"] {
  gap: 12px !important;
  padding-top: 14px !important;
}

body.${BODY_CLASS} [style*="grid-template-columns: 28px 1fr"],
body.${BODY_CLASS} [style*="gridTemplateColumns:'28px 1fr"],
body.${BODY_CLASS} [style*="gridTemplateColumns: 28px 1fr"] {
  grid-template-columns: 26px minmax(260px, 1fr) 112px 64px 92px 92px 92px 118px 80px !important;
}

body.${BODY_CLASS} [style*="min-width: 860px"],
body.${BODY_CLASS} [style*="minWidth:'860px'"],
body.${BODY_CLASS} [style*="minWidth: 860px"] {
  min-width: 940px !important;
}

body.${BODY_CLASS} [style*="border-bottom: 1px solid #f8fafc"],
body.${BODY_CLASS} [style*="borderBottom:'1px solid #f8fafc'"],
body.${BODY_CLASS} [style*="border-bottom-color: rgb(248, 250, 252)"] {
  border-bottom-color: rgba(226, 232, 240, 0.72) !important;
}

body.${BODY_CLASS} span[style*="border-radius: 999px"],
body.${BODY_CLASS} span[style*="borderRadius:999px"],
body.${BODY_CLASS} span[style*="borderRadius: 999px"] {
  font-weight: 560 !important;
  padding-inline: 8px !important;
}

body.${BODY_CLASS} [style*="padding: 11px 14px"],
body.${BODY_CLASS} [style*="padding:'11px 14px'"],
body.${BODY_CLASS} [style*="padding: 11px 16px"],
body.${BODY_CLASS} [style*="padding:'11px 16px'"] {
  padding-top: 9px !important;
  padding-bottom: 9px !important;
}

body.${BODY_CLASS} [style*="padding: 9px 14px"],
body.${BODY_CLASS} [style*="padding:'9px 14px'"] {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

body.${BODY_CLASS} [style*="max-width: 220px"],
body.${BODY_CLASS} [style*="maxWidth:'220px'"],
body.${BODY_CLASS} [style*="maxWidth: 220px"] {
  max-width: 300px !important;
}

body.${BODY_CLASS} [class*="rounded-"][class*="border"][class*="shadow"] {
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05) !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
}

body.${BODY_CLASS} [class*="font-extrabold"],
body.${BODY_CLASS} [class*="font-bold"] {
  font-weight: 650 !important;
}

body.${BODY_CLASS} [class*="font-semibold"] {
  font-weight: 600 !important;
}

body.${BODY_CLASS} [class*="uppercase"] {
  letter-spacing: 0.08em !important;
}
`;

export function ProductsUiPolish() {
  const pathname = usePathname();

  useEffect(() => {
    const isProductsPage = pathname === '/products' || pathname.startsWith('/products/');
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (isProductsPage && !style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = polishCss;
      document.head.appendChild(style);
    }

    document.body.classList.toggle(BODY_CLASS, isProductsPage);

    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, [pathname]);

  return null;
}
