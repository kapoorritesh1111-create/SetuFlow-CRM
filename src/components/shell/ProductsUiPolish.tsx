'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BODY_CLASS = 'setu-products-ui-polish';
const STYLE_ID = 'setu-products-ui-polish-style';

const polishCss = `
body.${BODY_CLASS} {
  background: #f6f8fb !important;
  color: #172033 !important;
}

body.${BODY_CLASS} [aria-label="Global workspace filter"] {
  display: none !important;
}

body.${BODY_CLASS} [style] {
  font-family: var(--font-jakarta), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

body.${BODY_CLASS} header[style] {
  border-bottom-color: rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035) !important;
}

body.${BODY_CLASS} h1,
body.${BODY_CLASS} h2,
body.${BODY_CLASS} h3,
body.${BODY_CLASS} h4,
body.${BODY_CLASS} [class*="font-extrabold"],
body.${BODY_CLASS} [class*="font-bold"],
body.${BODY_CLASS} [style*="font-weight: 800"],
body.${BODY_CLASS} [style*="fontWeight:800"],
body.${BODY_CLASS} [style*="fontWeight: 800"] {
  font-weight: 650 !important;
}

body.${BODY_CLASS} [class*="font-semibold"],
body.${BODY_CLASS} [style*="font-weight: 700"],
body.${BODY_CLASS} [style*="fontWeight:700"],
body.${BODY_CLASS} [style*="fontWeight: 700"] {
  font-weight: 600 !important;
}

body.${BODY_CLASS} [class*="uppercase"],
body.${BODY_CLASS} [style*="text-transform: uppercase"],
body.${BODY_CLASS} [style*="textTransform:uppercase"],
body.${BODY_CLASS} [style*="textTransform: uppercase"] {
  letter-spacing: 0.06em !important;
  font-weight: 600 !important;
}

body.${BODY_CLASS} [style*="font-size: 24px"],
body.${BODY_CLASS} [style*="fontSize:24px"],
body.${BODY_CLASS} [style*="fontSize: 24px"] {
  font-size: 21px !important;
  line-height: 1.12 !important;
}

body.${BODY_CLASS} [style*="font-size: 16px"],
body.${BODY_CLASS} [style*="fontSize:16px"],
body.${BODY_CLASS} [style*="fontSize: 16px"] {
  font-size: 14px !important;
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

body.${BODY_CLASS} [style*="box-shadow"],
body.${BODY_CLASS} [style*="boxShadow"],
body.${BODY_CLASS} [class*="shadow"] {
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035) !important;
}

body.${BODY_CLASS} [style*="border: 1px solid #e2e8f0"],
body.${BODY_CLASS} [style*="border:'1px solid #e2e8f0'"],
body.${BODY_CLASS} [style*="border-color: rgb(226, 232, 240)"],
body.${BODY_CLASS} [class*="border-slate-200"] {
  border-color: rgba(148, 163, 184, 0.22) !important;
}

body.${BODY_CLASS} [style*="background: white"],
body.${BODY_CLASS} [style*="background:'white'"],
body.${BODY_CLASS} [style*="background-color: white"] {
  background: rgba(255, 255, 255, 0.96) !important;
}

body.${BODY_CLASS} [style*="background: #f8fafc"],
body.${BODY_CLASS} [style*="background:'#f8fafc'"],
body.${BODY_CLASS} [style*="background-color: rgb(248, 250, 252)"] {
  background: rgba(248, 250, 252, 0.76) !important;
}

body.${BODY_CLASS} [style*="linear-gradient"][style*="border-radius"],
body.${BODY_CLASS} [style*="linear-gradient"][style*="borderRadius"] {
  background: rgba(255, 255, 255, 0.96) !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04) !important;
}

body.${BODY_CLASS} [style*="padding: 28px"],
body.${BODY_CLASS} [style*="padding:'28px"],
body.${BODY_CLASS} [style*="padding: 24px"],
body.${BODY_CLASS} [style*="padding:'24px"] {
  padding: 18px !important;
}

body.${BODY_CLASS} [style*="padding: 16px 24px"],
body.${BODY_CLASS} [style*="padding:'16px 24px"],
body.${BODY_CLASS} [style*="padding: 14px 24px"],
body.${BODY_CLASS} [style*="padding:'14px 24px"] {
  padding: 12px 18px !important;
}

body.${BODY_CLASS} [style*="padding: 11px 14px"],
body.${BODY_CLASS} [style*="padding:'11px 14px'"],
body.${BODY_CLASS} [style*="padding: 11px 16px"],
body.${BODY_CLASS} [style*="padding:'11px 16px'"] {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

body.${BODY_CLASS} [style*="padding: 9px 14px"],
body.${BODY_CLASS} [style*="padding:'9px 14px'"] {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

body.${BODY_CLASS} [style*="border-radius: 16px"],
body.${BODY_CLASS} [style*="borderRadius:16px"],
body.${BODY_CLASS} [style*="borderRadius: 16px"] {
  border-radius: 18px !important;
}

body.${BODY_CLASS} span[style*="border-radius: 999px"],
body.${BODY_CLASS} span[style*="borderRadius:999px"],
body.${BODY_CLASS} span[style*="borderRadius: 999px"] {
  font-weight: 560 !important;
  padding-inline: 8px !important;
}

body.${BODY_CLASS} [style*="background: #0b2e4a"],
body.${BODY_CLASS} [style*="background:'#0b2e4a'"],
body.${BODY_CLASS} [style*="background-color: rgb(11, 46, 74)"] {
  background: #101827 !important;
}

body.${BODY_CLASS} [style*="background: #0c7fff"],
body.${BODY_CLASS} [style*="background:'#0c7fff'"],
body.${BODY_CLASS} [style*="background-color: rgb(12, 127, 255)"] {
  background: #0f766e !important;
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

body.${BODY_CLASS} [style*="background: #ecfdf5"],
body.${BODY_CLASS} [style*="background:'#ecfdf5'"],
body.${BODY_CLASS} [style*="background-color: rgb(236, 253, 245)"],
body.${BODY_CLASS} [style*="background: #fff7ed"],
body.${BODY_CLASS} [style*="background:'#fff7ed'"],
body.${BODY_CLASS} [style*="background-color: rgb(255, 247, 237)"],
body.${BODY_CLASS} [style*="background: #fff1f2"],
body.${BODY_CLASS} [style*="background:'#fff1f2'"],
body.${BODY_CLASS} [style*="background-color: rgb(255, 241, 242)"],
body.${BODY_CLASS} [style*="background: #f5f3ff"],
body.${BODY_CLASS} [style*="background:'#f5f3ff'"],
body.${BODY_CLASS} [style*="background-color: rgb(245, 243, 255)"] {
  background: rgba(255, 255, 255, 0.94) !important;
}

body.${BODY_CLASS} [style*="grid-template-columns: repeat(6"],
body.${BODY_CLASS} [style*="gridTemplateColumns:repeat(6"],
body.${BODY_CLASS} [style*="gridTemplateColumns: repeat(6"],
body.${BODY_CLASS} [style*="grid-template-columns: repeat(5"],
body.${BODY_CLASS} [style*="gridTemplateColumns:repeat(5"],
body.${BODY_CLASS} [style*="gridTemplateColumns: repeat(5"] {
  gap: 10px !important;
  padding-top: 12px !important;
}

body.${BODY_CLASS} [style*="grid-template-columns: 28px 1fr"],
body.${BODY_CLASS} [style*="gridTemplateColumns:'28px 1fr"],
body.${BODY_CLASS} [style*="gridTemplateColumns: 28px 1fr"] {
  grid-template-columns: 26px minmax(300px, 1.25fr) 118px 62px 96px 96px 96px 120px 110px !important;
}

body.${BODY_CLASS} [style*="min-width: 860px"],
body.${BODY_CLASS} [style*="minWidth:'860px'"],
body.${BODY_CLASS} [style*="minWidth: 860px"] {
  min-width: 980px !important;
}

body.${BODY_CLASS} [style*="border-bottom: 1px solid #f8fafc"],
body.${BODY_CLASS} [style*="borderBottom:'1px solid #f8fafc'"],
body.${BODY_CLASS} [style*="border-bottom-color: rgb(248, 250, 252)"] {
  border-bottom-color: rgba(226, 232, 240, 0.72) !important;
}

body.${BODY_CLASS} [style*="max-width: 220px"],
body.${BODY_CLASS} [style*="maxWidth:'220px'"],
body.${BODY_CLASS} [style*="maxWidth: 220px"] {
  max-width: 330px !important;
}

body.${BODY_CLASS} section.grid.gap-3 span.rounded-full {
  min-width: 34px !important;
  height: 34px !important;
  display: inline-grid !important;
  place-items: center !important;
  font-size: 15px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] {
  max-width: 820px !important;
  background: #f7f9fc !important;
  box-shadow: -24px 0 60px rgba(15, 23, 42, 0.22) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] header {
  padding: 18px 22px !important;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
  border-bottom-color: rgba(148, 163, 184, 0.18) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] h2 {
  font-size: 24px !important;
  letter-spacing: -0.035em !important;
  font-weight: 650 !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] header [class*="h-[104px]"] {
  height: 88px !important;
  width: 88px !important;
  border-radius: 20px !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="sm:grid-cols-4"] > div {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="border-teal-200"][class*="from-cyan-50"] {
  border-color: rgba(20, 184, 166, 0.28) !important;
  background: linear-gradient(135deg, rgba(240, 253, 250, 0.95), rgba(255, 255, 255, 0.98)) !important;
  box-shadow: 0 12px 30px rgba(20, 184, 166, 0.08) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="overflow-x-auto"] button {
  border-radius: 12px !important;
  padding: 7px 13px !important;
  font-weight: 650 !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] section {
  border-radius: 22px !important;
  border-color: rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.04) !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] section [class*="bg-slate-50"] {
  background: #f8fafc !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="font-black"] {
  font-weight: 650 !important;
}

body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="tracking-[0.16em]"],
body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="tracking-[0.14em]"],
body.${BODY_CLASS} aside[class*="max-w-[860px]"] [class*="tracking-[0.22em]"] {
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
