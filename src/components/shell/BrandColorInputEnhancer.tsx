'use client';

import { useEffect } from 'react';

export function BrandColorInputEnhancer() {
  useEffect(() => {
    // Long-term branding controls are now server-rendered in the organization profile.
    // This shell enhancer is intentionally kept as a no-op for backward compatibility.
  }, []);

  return null;
}
