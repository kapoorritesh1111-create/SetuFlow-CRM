'use client';

import { useEffect } from 'react';

const BRAND_COLOR_NAMES = ['primary_color', 'secondary_color', 'accent_color'];

function isVisibleBrandInput(input: HTMLInputElement) {
  if (input.type === 'hidden' || input.hidden) return false;
  if (input.closest('[hidden]')) return false;
  return input.offsetParent !== null;
}

function enhanceInput(input: HTMLInputElement) {
  if (!isVisibleBrandInput(input)) return;
  if (input.dataset.brandColorEnhanced === 'true') return;
  input.dataset.brandColorEnhanced = 'true';
  const current = /^#[0-9a-fA-F]{6}$/.test(input.value) ? input.value : '#0B2E4A';
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.value = current;
  picker.setAttribute('aria-label', `${input.name.replace('_', ' ')} picker`);
  picker.className = 'mt-1 h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 align-middle';
  input.classList.add('font-mono');
  input.parentElement?.insertBefore(picker, input);
  picker.addEventListener('input', () => {
    input.value = picker.value.toUpperCase();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export function BrandColorInputEnhancer() {
  useEffect(() => {
    function run() {
      if (!window.location.pathname.includes('/admin/organization')) return;
      for (const name of BRAND_COLOR_NAMES) {
        document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach(enhanceInput);
      }
    }
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
