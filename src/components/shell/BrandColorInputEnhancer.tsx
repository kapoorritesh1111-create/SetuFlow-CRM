'use client';

import { useEffect } from 'react';

const BRAND_COLOR_NAMES = ['primary_color', 'secondary_color', 'accent_color'];
const COUNTRY_TO_ISO2: Record<string, string> = {
  india: 'IN',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  ireland: 'IE',
  'united arab emirates': 'AE',
  uae: 'AE',
  canada: 'CA',
  australia: 'AU',
  japan: 'JP',
  china: 'CN',
  singapore: 'SG',
  'saudi arabia': 'SA',
  qatar: 'QA',
  kuwait: 'KW',
  oman: 'OM',
  bahrain: 'BH',
  nepal: 'NP',
  ghana: 'GH',
  lebanon: 'LB',
};

function flagFromIso2(iso2: string) {
  const safe = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(safe)) return '';
  return safe.split('').map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
}

function validHex(value?: string | null) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(text) ? text : null;
}

function isVisibleBrandInput(input: HTMLInputElement) {
  if (input.type === 'hidden' || input.hidden) return false;
  if (input.closest('[hidden]')) return false;
  return input.offsetParent !== null;
}

function createColorPicker(input: HTMLInputElement, compact = false) {
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.value = validHex(input.value) ?? '#0B2E4A';
  picker.setAttribute('aria-label', `${input.name.replace('_', ' ')} picker`);
  picker.className = compact
    ? 'h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1'
    : 'mt-1 h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 align-middle';
  picker.addEventListener('input', () => {
    input.value = picker.value.toUpperCase();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  return picker;
}

function enhanceInput(input: HTMLInputElement) {
  if (!isVisibleBrandInput(input)) return;
  if (input.dataset.brandColorEnhanced === 'true') return;
  input.dataset.brandColorEnhanced = 'true';
  input.classList.add('font-mono');
  input.parentElement?.insertBefore(createColorPicker(input), input);
}

function addSecondaryColorCard(input: HTMLInputElement) {
  if (input.dataset.secondaryColorCard === 'true') return;
  input.dataset.secondaryColorCard = 'true';
  const form = input.closest('form');
  if (!form) return;
  const sidebarTheme = form.querySelector<HTMLElement>('select[name="sidebar_theme"]')?.closest('label');
  const card = document.createElement('div');
  card.className = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm';

  const label = document.createElement('p');
  label.className = 'text-[10px] font-black uppercase tracking-[0.16em] text-slate-400';
  label.textContent = 'Secondary color';

  const help = document.createElement('p');
  help.className = 'mt-1 text-[11px] font-semibold text-slate-500';
  help.textContent = 'Used for sidebar depth and dark workspace gradients.';

  const row = document.createElement('div');
  row.className = 'mt-2 flex items-center gap-3';
  row.appendChild(createColorPicker(input, true));

  const value = document.createElement('span');
  value.className = 'font-mono text-xs font-black text-slate-800';
  value.textContent = validHex(input.value) ?? '#061C2E';
  input.addEventListener('change', () => {
    value.textContent = validHex(input.value) ?? '#061C2E';
  });
  row.appendChild(value);

  card.appendChild(label);
  card.appendChild(help);
  card.appendChild(row);

  if (sidebarTheme?.parentElement) sidebarTheme.parentElement.insertBefore(card, sidebarTheme);
  else form.appendChild(card);
}

function enhanceAdminBrandColors() {
  if (!window.location.pathname.includes('/admin/organization')) return;
  for (const name of BRAND_COLOR_NAMES) {
    document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
      if (name === 'secondary_color' && input.type === 'hidden') addSecondaryColorCard(input);
      else enhanceInput(input);
    });
  }
}

function enhanceLeadCountryFlags() {
  if (!window.location.pathname.includes('/leads')) return;
  document.querySelectorAll<HTMLElement>('p').forEach((element) => {
    if (element.dataset.countryFlagEnhanced === 'true') return;
    const text = element.textContent ?? '';
    if (!text.includes(' · ')) return;
    for (const [country, iso2] of Object.entries(COUNTRY_TO_ISO2)) {
      const flag = flagFromIso2(iso2);
      const titleCountry = country.replace(/\b\w/g, (char) => char.toUpperCase());
      for (const candidate of [titleCountry, country.toUpperCase(), country]) {
        const token = ` · ${candidate}`;
        if (!text.includes(token) || text.includes(` · ${flag}`)) continue;
        element.textContent = text.replace(token, ` · ${flag} ${candidate}`);
        element.dataset.countryFlagEnhanced = 'true';
        return;
      }
    }
  });
}

export function BrandColorInputEnhancer() {
  useEffect(() => {
    function run() {
      enhanceAdminBrandColors();
      enhanceLeadCountryFlags();
    }
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
