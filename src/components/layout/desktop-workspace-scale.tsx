'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function DesktopWorkspaceScale({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <div
      data-setu-desktop-density={desktop ? '80' : '100'}
      style={desktop ? { zoom: 0.8, width: '125%', minHeight: '125vh' } : undefined}
    >
      {children}
    </div>
  );
}
