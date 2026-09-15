'use client';

import { useEffect } from 'react';

function whatsappContactUrl(rawHref: string) {
  const rawNumber = decodeURIComponent(rawHref.replace(/^tel:/i, '')).split(/[;,]/)[0] ?? '';
  const digits = rawNumber.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export function StarkWhatsAppCallInterceptor({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = whatsappContactUrl(anchor.getAttribute('href') ?? '');
      if (!url) return;

      event.preventDefault();
      event.stopPropagation();
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.assign(url);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [enabled]);

  return null;
}
